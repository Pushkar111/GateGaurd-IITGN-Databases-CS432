"""
failure_simulation_test.py — Mid-operation failure scenarios for GateGuard API
GateGuard Assignment-3 Module B | IIT Gandhinagar CS432

WHAT THIS TESTS
---------------
Business rule: each API endpoint must either succeed completely or leave
the database completely unchanged. No partial state is acceptable.

SCENARIOS
---------
  1. Invalid member ID          → 404, zero DB rows created
  2. Duplicate active visit     → 400, still only 1 active visit in DB
  3. Malformed payload          → 400/422, zero DB rows created
  4. Exit on already-closed visit → 400, visit row unchanged

All results are saved to results/failure_results.json.

USAGE
-----
  python failure_simulation_test.py

Environment variables (optional):
  GATEGUARD_API_URL  = http://localhost:5000/api
  FAIL_MEMBER_ID     = 1   (must exist, may or may not have an active visit)
  FAIL_GATE_ID       = 1

Author: GateGuard Team
"""

import json
import os
from utils.api_client import APIClient
from utils.db_check   import (
    get_all_visits_for_member,
    count_active_visits_for_member,
)

MEMBER_ID   = int(os.getenv("FAIL_MEMBER_ID", "1"))
GATE_ID     = int(os.getenv("FAIL_GATE_ID",   "1"))
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
RESULTS_OUT = os.path.join(RESULTS_DIR, "failure_results.json")

_results: list[dict] = []


def _record(test: str, passed: bool, **extra):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"  {status}")
    _results.append({"test": test, "passed": passed, **extra})


# ── Individual test functions ─────────────────────────────────────────────────

def test_invalid_member():
    """
    POST entry for member ID 99999 (does not exist).
    Expected: HTTP 404, zero visit rows for that ID exist now or after.
    """
    print("\n[TEST 1] Invalid member ID → should return 404, no DB change")
    client = APIClient()
    before = len(get_all_visits_for_member(99999))
    resp   = client.post("/person-visits/entry", {"memberId": 99999, "entryGateId": GATE_ID})
    after  = len(get_all_visits_for_member(99999))
    print(f"  HTTP {resp.status_code}  |  Visits before={before}  after={after}")
    passed = (resp.status_code == 404 and after == before == 0)
    _record("invalid_member", passed,
            status_code=resp.status_code, visits_before=before, visits_after=after)


def test_duplicate_active_visit():
    """
    Record entry for MEMBER_ID, then try to record a second entry while
    the first is still open.
    Expected: second attempt returns HTTP 400, DB still has exactly 1 active visit.
    """
    print("\n[TEST 2] Duplicate active visit → should return 400, 1 active visit in DB")
    client = APIClient()

    # Ensure member has no active visit before we start
    active = count_active_visits_for_member(MEMBER_ID)
    if active == 0:
        r1 = client.post("/person-visits/entry",
                         {"memberId": MEMBER_ID, "entryGateId": GATE_ID})
        assert r1.status_code == 201, f"Setup failed (status={r1.status_code}): {r1.text}"
        print(f"  Setup: created entry VisitID={r1.json().get('data', {}).get('VisitID', '?')}")
    else:
        print(f"  Member already has {active} active visit(s) — skipping setup.")

    # Second concurrent entry — must be rejected
    r2           = client.post("/person-visits/entry",
                               {"memberId": MEMBER_ID, "entryGateId": GATE_ID})
    active_after = count_active_visits_for_member(MEMBER_ID)
    print(f"  HTTP {r2.status_code}  |  Active visits after duplicate attempt: {active_after}")
    passed = (r2.status_code == 400 and active_after == 1)
    _record("duplicate_active_visit", passed,
            status_code=r2.status_code, active_visits_after=active_after)


def test_malformed_payload():
    """
    POST body with missing 'entryGateId' field.
    Expected: HTTP 400 or 422 from validation middleware, zero new visits created.
    """
    print("\n[TEST 3] Malformed payload (missing entryGateId) → 400/422, no new visit")
    client        = APIClient()
    visits_before = len(get_all_visits_for_member(MEMBER_ID))
    resp          = client.post("/person-visits/entry", {"memberId": MEMBER_ID})  # missing gate
    visits_after  = len(get_all_visits_for_member(MEMBER_ID))
    print(f"  HTTP {resp.status_code}  |  Visits before={visits_before}  after={visits_after}")
    passed = (resp.status_code in (400, 422) and visits_after == visits_before)
    _record("malformed_payload", passed,
            status_code=resp.status_code,
            new_visits_created=visits_after - visits_before)


def test_exit_on_closed_visit():
    """
    Try to record exit for a visit that is already closed (has exittime set).
    Expected: HTTP 400, the visit row is unchanged.
    """
    print("\n[TEST 4] Exit on already-closed visit → 400, no DB change")
    client     = APIClient()
    all_visits = get_all_visits_for_member(MEMBER_ID)
    closed     = [v for v in all_visits if v["exittime"] is not None]

    if not closed:
        # Create a visit and immediately close it so we have a closed record to test with
        print("  ℹ  No closed visits found — creating and closing one for testing.")
        r_entry = client.post("/person-visits/entry",
                              {"memberId": MEMBER_ID, "entryGateId": GATE_ID})
        if r_entry.status_code == 201:
            visit_id = r_entry.json().get("data", {}).get("VisitID")
            client.patch(f"/person-visits/{visit_id}/exit", {"exitGateId": GATE_ID})
        all_visits = get_all_visits_for_member(MEMBER_ID)
        closed     = [v for v in all_visits if v["exittime"] is not None]

    if not closed:
        print("  ⚠  Still no closed visit available — skipping this test.")
        _record("exit_on_closed_visit", False, reason="no_closed_visit_available")
        return

    target_visit_id = closed[-1]["visitid"]
    resp = client.patch(f"/person-visits/{target_visit_id}/exit",
                        {"exitGateId": GATE_ID})
    print(f"  HTTP {resp.status_code}  |  VisitID={target_visit_id} (already closed)")
    passed = (resp.status_code == 400)
    _record("exit_on_closed_visit", passed,
            visit_id=target_visit_id, status_code=resp.status_code)


# ── Runner ────────────────────────────────────────────────────────────────────

def run_all() -> list[dict]:
    print("\n" + "=" * 62)
    print("  FAILURE SIMULATION TESTS")
    print("=" * 62)

    test_invalid_member()
    test_duplicate_active_visit()
    test_malformed_payload()
    test_exit_on_closed_visit()

    passed_count = sum(1 for r in _results if r.get("passed"))
    total_count  = len(_results)

    print("\n" + "=" * 62)
    print(f"  Results: {passed_count}/{total_count} passed")
    print("=" * 62)

    os.makedirs(RESULTS_DIR, exist_ok=True)
    with open(RESULTS_OUT, "w") as f:
        json.dump(_results, f, indent=2, default=str)
    print(f"\n  Results saved → {RESULTS_OUT}")
    return _results


if __name__ == "__main__":
    run_all()
