"""
locust_gateguard.py: locust load test file for GateGuard API
GateGuard Assignment-3 Module B | IIT Gandhinagar CS432

USAGE
-----
  # Install: pip install locust
  # Run web UI:
  locust -f locust_gateguard.py --host=http://localhost:5000

  # Run headless (CI-friendly):
  locust -f locust_gateguard.py --host=http://localhost:5000 \
         --users=100 --spawn-rate=10 --run-time=2m --headless

TASK WEIGHTS
------------
  record_entry : 3   (most common operation - new person arrives at gate)
  record_exit  : 2   (person leaves)
  list_visits  : 1   (guard checks occupancy)
  get_occupancy: 1   (gate display query)

A shared thread-safe list (_active_visits) holds visit IDs so that exit
tasks can efficiently find a real open visit to close, rather than guessing.

Author: GateGuard Team
"""

import random
import time
import threading
from locust import HttpUser, task, between, events

# Thread-safe shared store for open visit IDs (written by entry tasks, read by exit tasks)
_active_visits: list[int] = []
_visits_lock              = threading.Lock()

# Member / gate range - adjust to match your seeded DB
MEMBER_ID_MIN = 1
MEMBER_ID_MAX = 20
GATE_IDS      = [1, 2, 3]


class GateGuardUser(HttpUser):
    """
    Simulates one concurrent GateGuard user session.

    Each user authenticates on startup, then repeatedly performs realistic
    gate operations weighted by real-world usage frequency.
    """

    host      = "http://localhost:5000"   # default - override with --host if needed
    wait_time = between(0.5, 2.0)   # think time between tasks

    def on_start(self):
        """Authenticate and store Bearer token for all subsequent requests."""
        # small random delay so concurrent user startups dont pile up on bcrypt
        time.sleep(random.uniform(0, 2))
        with self.client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            catch_response=True,
            name="/api/auth/login",
        ) as resp:
            if resp.status_code == 200:
                data  = resp.json()
                d     = data.get("data", {})
                token = (data.get("token")
                         or data.get("accessToken")
                         or d.get("token")
                         or d.get("accessToken"))
                
                if token:
                    self.client.headers.update({"Authorization": f"Bearer {token}"})
                    resp.success()
                else:
                    resp.failure(f"Login valid but no token parsed: {data}")
            else:
                resp.failure(f"Login failed: {resp.status_code}")

        # Each user targets a random member and gate for realistic distribution
        self.member_id = random.randint(MEMBER_ID_MIN, MEMBER_ID_MAX)
        self.gate_id   = random.choice(GATE_IDS)

    # -- Task definitions --------------------------------------------------

    @task(3)
    def record_entry(self):
        """
        POST /api/person-visits/entry : record a new gate entry.
        200 and 400 both treated as success (400 = member already inside).
        """
        with self.client.post(
            "/api/person-visits/entry",
            json={"memberId": self.member_id, "entryGateId": self.gate_id},
            catch_response=True,
            name="/api/person-visits/entry",
        ) as resp:
            if resp.status_code == 201:
                try:
                    visit_id = resp.json()["data"]["VisitID"]
                    with _visits_lock:
                        _active_visits.append(visit_id)
                except (KeyError, TypeError):
                    pass
                resp.success()
            elif resp.status_code == 400:
                resp.success()      # expected: member already has active visit
            else:
                resp.failure(f"Unexpected status {resp.status_code}: {resp.text[:120]}")

    @task(2)
    def record_exit(self):
        """
        PUT /api/person-visits/:id/exit : record departure.
        Picks a known open visit from the shared list.
        """
        with _visits_lock:
            if not _active_visits:
                return
            visit_id = _active_visits.pop(0)

        with self.client.put(
            f"/api/person-visits/{visit_id}/exit",
            json={"exitGateId": self.gate_id},
            catch_response=True,
            name="/api/person-visits/:id/exit",
        ) as resp:
            if resp.status_code in (200, 400):
                resp.success()      # 400 = visit was already closed (race) - still ok
            else:
                resp.failure(f"Unexpected status {resp.status_code}")

    @task(1)
    def list_visits(self):
        """
        GET /api/person-visits?limit=20 : guard console read.
        Expected HTTP 200.
        """
        with self.client.get(
            "/api/person-visits",
            params={"limit": 20},
            catch_response=True,
            name="/api/person-visits (list)",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"List failed: {resp.status_code}")

    @task(1)
    def get_occupancy(self):
        """
        GET /api/gate-occupancy : gate display board query.
        Expected HTTP 200.
        """
        with self.client.get(
            "/api/gate-occupancy",
            catch_response=True,
            name="/api/gate-occupancy",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Occupancy query failed: {resp.status_code}")


# -- Event hooks -------------------

@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    print(f"\n[Locust] Test complete. Active visits remaining in shared list: {len(_active_visits)}")
