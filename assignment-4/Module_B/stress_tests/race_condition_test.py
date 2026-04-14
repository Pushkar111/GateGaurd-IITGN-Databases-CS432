"""
race_condition_test.py: testing concurrent entry race for GateGuard API
GateGuard Assignment-3 Module B, IIT Gandhinagar CS432

INVARIANT UNDER TEST
---------------------
A member can have at most ONE active (no exittime) PersonVisit at any moment.

SCENARIO
--------
N threads all fire POST /api/person-visits/entry for the SAME member at exactly
the same instant.

EXPECTED RESULT (with SELECT FOR UPDATE fix applied)
-----------------------------------------------------
  - Exactly 1 request returns HTTP 201 (Created)
  - All other N-1 requests return HTTP 400 (Conflict)
  - DB query confirms: exactly 1 active visit row for that member


USAGE
-----
  python race_condition_test.py

Environment variables (optional, defaults shown):
  GATEGUARD_API_URL  = http://localhost:5000/api
  RACE_MEMBER_ID     = 1           (must exist with no active visit)
  RACE_GATE_ID       = 1           (must exist)
  RACE_THREADS       = 50

Author: GateGuard Team
"""

import threading
import time
import json
import os
from collections import Counter
from utils.api_client import APIClient
from utils.db_check   import assert_single_active_visit, get_all_visits_for_member

# -- Configuration -------------------------------------------------------------
MEMBER_ID   = int(os.getenv("RACE_MEMBER_ID", "1"))
GATE_ID     = int(os.getenv("RACE_GATE_ID",   "1"))
N_THREADS   = int(os.getenv("RACE_THREADS",   "50"))
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
RESULTS_OUT = os.path.join(RESULTS_DIR, "race_results.json")


def _make_payload() -> dict:
    return {"memberId": MEMBER_ID, "entryGateId": GATE_ID}


def run_race_test() -> dict:
    print("\n" + "=" * 50)
    print(f"  running race condition test...")
    print(f"  using member: {MEMBER_ID}, gate: {GATE_ID}, threads: {N_THREADS}")
    print("=" * 50)

    # Pre-check: member must not already have an active visit
    pre_active = assert_single_active_visit(MEMBER_ID, "pre-race-check")
    if pre_active == 1:
        print(f"\n[Warning] Member {MEMBER_ID} already has an active visit.")
        print("   Close (exit) the visit first, then run this test again.")
        return {"skipped": True, "reason": "existing_active_visit"}

    results: list[dict] = []
    barrier = threading.Barrier(N_THREADS)  # all threads fire simultaneously

    # authenticate ONCE here and share the token across all threads
    # so we dont smash the login endpoint with 50 concurrent requests
    shared_client = APIClient()
    shared_token  = shared_client.token

    def _fire(thread_id: int):
        # each thread gets its own session but reuses the same token
        client         = APIClient.__new__(APIClient)
        client.base_url = shared_client.base_url
        import requests as _req
        client.session  = _req.Session()
        client.token    = shared_token
        client.session.headers.update({"Authorization": f"Bearer {shared_token}"})

        payload = _make_payload()
        barrier.wait()                 # hold... release all at once!
        t0 = time.perf_counter()
        try:
            resp    = client.post("/person-visits/entry", payload)
            latency = (time.perf_counter() - t0) * 1000
            results.append({
                "thread":      thread_id,
                "status_code": resp.status_code,
                "body":        resp.json(),
                "latency_ms":  round(latency, 2),
            })
        except Exception as exc:
            results.append({
                "thread":      thread_id,
                "error":       str(exc),
                "status_code": None,
                "latency_ms":  -1,
            })

    threads = [threading.Thread(target=_fire, args=(i,), daemon=True)
               for i in range(N_THREADS)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)

    # -- Analysis ----------------------------------------------------------
    status_counts = Counter(r.get("status_code") for r in results)
    successes     = [r for r in results if r.get("status_code") == 201]
    conflicts     = [r for r in results if r.get("status_code") == 400]
    errors        = [r for r in results if r.get("status_code") not in (201, 400)]
    latencies     = [r["latency_ms"] for r in results if (r.get("latency_ms") or 0) > 0]
    avg_latency   = sum(latencies) / max(len(latencies), 1)

    print(f"\n  Status code distribution : {dict(status_counts)}")
    print(f"  201 Successes            : {len(successes)}")
    print(f"  400 Conflicts            : {len(conflicts)}")
    print(f"  Other errors             : {len(errors)}")
    print(f"  Average latency          : {avg_latency:.1f} ms")

    # DB-level invariant check
    active_count = assert_single_active_visit(MEMBER_ID, "after race check")
    all_visits   = get_all_visits_for_member(MEMBER_ID)
    invariant_ok = (len(successes) == 1 and active_count == 1)

    print(f"\n  active visits right now: {active_count}")
    print(f"  total visits created: {len(all_visits)}")

    if invariant_ok:
        print(f"\n  nice! invariant holds. exactly 1 success and 1 active visit.")
    else:
        print(f"\n  uh oh, invariant violated :( {len(successes)} success(es), {active_count} active visit(s) in DB.")
        for v in all_visits:
            print(f"     VisitID={v['visitid']}  entry={v['entrytime']}  exit={v['exittime']}")

    summary = {
        "test":                   "race_condition",
        "member_id":              MEMBER_ID,
        "gate_id":                GATE_ID,
        "num_threads":            N_THREADS,
        "status_counts":          dict(status_counts),
        "successes":              len(successes),
        "conflicts":              len(conflicts),
        "other_errors":           len(errors),
        "avg_latency_ms":         round(avg_latency, 1),
        "active_visits_post_race": active_count,
        "invariant_ok":           invariant_ok,
        "all_visit_rows":         all_visits,
        "raw_results":            results,
    }

    os.makedirs(RESULTS_DIR, exist_ok=True)
    with open(RESULTS_OUT, "w") as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"\n  Results saved → {RESULTS_OUT}")
    return summary


if __name__ == "__main__":
    run_race_test()
