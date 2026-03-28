"""
load_profile_runner.py: multi-profile load test for GateGuard API
GateGuard Assignment-3 Module B | IIT Gandhinagar CS432

PROFILES
--------
  low    :  5 concurrent users, 30 seconds
  medium : 20 concurrent users, 60 seconds
  high   : 100 concurrent users, 120 seconds

MEASURED METRICS (per profile)
--------
  - Total requests
  - Throughput (req/s)
  - P50 / P95 / P99 / Mean latency (ms)
  - Success rate (2xx)
  - Server error rate (5xx)
  - Invariant check on a sample of member IDs after each profile

USAGE
-----
  python load_profile_runner.py

Environment variables (optional):
  GATEGUARD_API_URL = http://localhost:5000/api
  MEMBER_ID_MIN     = 1    (first member ID in seeded DB)
  MEMBER_ID_MAX     = 20   (last member ID in seeded DB)

Author: GateGuard Team
"""

import os
import json
import random
import statistics
import threading
import time
from utils.api_client import APIClient
from utils.db_check   import sample_invariant_check

MEMBER_MIN   = int(os.getenv("MEMBER_ID_MIN", "1"))
MEMBER_MAX   = int(os.getenv("MEMBER_ID_MAX", "20"))
GATE_IDS     = [1, 2, 3]
RESULTS_DIR  = os.path.join(os.path.dirname(__file__), "results")
RESULTS_OUT  = os.path.join(RESULTS_DIR, "load_results.json")

PROFILES = [
    {"name": "low",    "threads": 5,   "duration_sec": 30,  "think_time": 1.0},
    {"name": "medium", "threads": 20,  "duration_sec": 60,  "think_time": 0.5},
    {"name": "high",   "threads": 100, "duration_sec": 120, "think_time": 0.1},
]

all_results: list[dict] = []


class _Worker:
    """
    Simulates one realistic user session in a background thread.

    Lifecycle per iteration:
      1. Choose a random member + gate.
      2. POST /person-visits/entry
         - If 201: wait think_time, then PATCH exit
         - If 400 (already inside): wait think_time/2
      3. Occasionally (30% chance): GET /person-visits list

    All requests are recorded as {op, status, latency_ms} tuples.
    """

    def __init__(self, worker_id: int, stop_event: threading.Event, think_time: float):
        self.id         = worker_id
        self._stop      = stop_event
        self._think     = think_time
        self._rng       = random.Random(worker_id)
        self.records: list[dict] = []
        self._client    = APIClient()

    def _rec(self, op: str, status: int, latency_ms: float):
        self.records.append({"op": op, "status": status,
                              "latency_ms": round(latency_ms, 1)})

    def run(self):
        while not self._stop.is_set():
            mid  = self._rng.randint(MEMBER_MIN, MEMBER_MAX)
            gate = self._rng.choice(GATE_IDS)

            # Entry
            t0   = time.perf_counter()
            resp = self._client.post("/person-visits/entry",
                                     {"memberId": mid, "entryGateId": gate})
            self._rec("entry", resp.status_code, (time.perf_counter() - t0) * 1000)

            if resp.status_code == 201:
                visit_id = resp.json().get("data", {}).get("VisitID")
                time.sleep(self._think)
                # Exit
                t1    = time.perf_counter()
                resp2 = self._client.patch(f"/person-visits/{visit_id}/exit",
                                           {"exitGateId": gate})
                self._rec("exit", resp2.status_code, (time.perf_counter() - t1) * 1000)
            else:
                time.sleep(self._think / 2)

            # Random read (30% chance)
            if self._rng.random() < 0.3:
                t2    = time.perf_counter()
                resp3 = self._client.get("/person-visits", {"limit": 10})
                self._rec("list", resp3.status_code, (time.perf_counter() - t2) * 1000)


def _percentile(sorted_vals: list, p: float) -> float:
    if not sorted_vals:
        return 0.0
    idx = int(len(sorted_vals) * p)
    idx = min(idx, len(sorted_vals) - 1)
    return sorted_vals[idx]


def run_profile(profile: dict) -> dict:
    name     = profile["name"]
    n        = profile["threads"]
    duration = profile["duration_sec"]
    think    = profile["think_time"]

    print(f"\n{'='*62}")
    print(f"  LOAD PROFILE: {name.upper()} - {n} users times {duration}s")
    print(f"{'='*62}")

    stop_event = threading.Event()
    workers    = [_Worker(i, stop_event, think) for i in range(n)]
    threads    = [threading.Thread(target=w.run, daemon=True) for w in workers]

    t_start = time.perf_counter()
    for t in threads:
        t.start()
    time.sleep(duration)
    stop_event.set()
    for t in threads:
        t.join(timeout=15)
    elapsed = time.perf_counter() - t_start

    # Aggregate
    all_records = [r for w in workers for r in w.records]
    total       = len(all_records)
    ok          = sum(1 for r in all_records if 200 <= r["status"] < 300)
    srv_err     = sum(1 for r in all_records if r["status"] >= 500)
    latencies   = sorted(r["latency_ms"] for r in all_records)

    throughput = total / elapsed
    p50  = _percentile(latencies, 0.50)
    p95  = _percentile(latencies, 0.95)
    p99  = _percentile(latencies, 0.99)
    mean = statistics.mean(latencies) if latencies else 0

    print(f"  Duration        : {elapsed:.1f}s")
    print(f"  Total requests  : {total}  ({throughput:.1f} req/s)")
    print(f"  Success (2xx)   : {ok}  ({100*ok/max(total,1):.1f}%)")
    print(f"  Server errors   : {srv_err}")
    print(f"  Latency P50     : {p50:.1f} ms")
    print(f"  Latency P95     : {p95:.1f} ms")
    print(f"  Latency P99     : {p99:.1f} ms")
    print(f"  Latency mean    : {mean:.1f} ms")

    # Invariant sample check
    sample = random.sample(range(MEMBER_MIN, MEMBER_MAX + 1),
                           min(5, MEMBER_MAX - MEMBER_MIN + 1))
    inv_ok = sample_invariant_check(sample, context=f"load-{name}")
    print(f"  Invariant check : {'OK' if inv_ok else 'VIOLATED'} (sample={sample})")

    result = {
        "profile":            name,
        "threads":            n,
        "duration_s":         round(elapsed, 1),
        "total_requests":     total,
        "successes":          ok,
        "server_errors":      srv_err,
        "throughput_rps":     round(throughput, 2),
        "latency_p50_ms":     round(p50, 1),
        "latency_p95_ms":     round(p95, 1),
        "latency_p99_ms":     round(p99, 1),
        "latency_mean_ms":    round(mean, 1),
        "invariant_ok":       inv_ok,
        "invariant_sample":   sample,
    }
    return result


def run_all_profiles():
    print("\n" + "=" * 62)
    print("  GATEGUARD LOAD PROFILE RUNNER - Assignment 3 Module B")
    print("=" * 62)

    for profile in PROFILES:
        result = run_profile(profile)
        all_results.append(result)
        if profile != PROFILES[-1]:
            print("\n  Cooling down 10s before next profile...")
            time.sleep(10)

    os.makedirs(RESULTS_DIR, exist_ok=True)
    with open(RESULTS_OUT, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\n  All results saved → {RESULTS_OUT}")

    # Summary table
    print("\n" + "=" * 62)
    print(f"  {'Profile':<10} {'RPS':>8} {'P95 ms':>10} {'Errors':>8} {'Invariant':>12}")
    print(f"  {'-'*58}")
    for r in all_results:
        inv = "[OK]" if r["invariant_ok"] else "[FAIL]"
        print(f"  {r['profile']:<10} {r['throughput_rps']:>8.1f} "
              f"{r['latency_p95_ms']:>10.1f} {r['server_errors']:>8} {inv:>12}")


if __name__ == "__main__":
    run_all_profiles()
