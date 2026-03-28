"""
api_client.py: thin HTTP wrapper for GateGuard API stress tests
GateGuard Assignment-3 Module B | IIT Gandhinagar CS432

Handles:
  - Auth token acquisition via POST /api/auth/login
  - Bearer token injection on every request
  - Configurable base URL and credentials via environment variables

Author: GateGuard Team
"""

import os
import requests
from typing import Optional

BASE_URL     = os.getenv("GATEGUARD_API_URL", "http://localhost:5000/api")
DEFAULT_USER = os.getenv("TEST_USERNAME", "admin")
DEFAULT_PASS = os.getenv("TEST_PASSWORD", "admin123")


class APIClient:
    """
    Per-thread authenticated API client.

    Each instance maintains its own requests.Session with the auth token
    attached, so multiple threads can call the API independently without
    sharing session state.

    Usage:
        client = APIClient()
        resp   = client.post("/person-visits/entry", {"memberId": 1, "entryGateId": 1})
        print(resp.status_code, resp.json())
    """

    def __init__(
        self,
        base_url: str = BASE_URL,
        username: str = DEFAULT_USER,
        password: str = DEFAULT_PASS,
    ):
        self.base_url = base_url.rstrip("/")
        self.session  = requests.Session()
        self.token: Optional[str] = None
        self._login(username, password)

    def _login(self, username: str, password: str):
        """Authenticate and store the Bearer token."""
        resp = self.session.post(
            f"{self.base_url}/auth/login",
            json={"username": username, "password": password},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        # Support both { token: "..." } and { data: { accessToken: "..." } } shapes
        d = data.get("data", {})
        self.token = (data.get("token")
                      or data.get("accessToken")
                      or d.get("token")
                      or d.get("accessToken"))
        if not self.token:
            raise ValueError(f"Login succeeded but no token in response: {data}")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})

    # -- HTTP helpers ----------------------------------------------------

    def post(self, path: str, body: dict, timeout: int = 10) -> requests.Response:
        return self.session.post(f"{self.base_url}{path}", json=body, timeout=timeout)

    def get(self, path: str, params: dict = None, timeout: int = 10) -> requests.Response:
        return self.session.get(f"{self.base_url}{path}", params=params, timeout=timeout)

    def patch(self, path: str, body: dict, timeout: int = 10) -> requests.Response:
        return self.session.patch(f"{self.base_url}{path}", json=body, timeout=timeout)

    def put(self, path: str, body: dict, timeout: int = 10) -> requests.Response:
        return self.session.put(f"{self.base_url}{path}", json=body, timeout=timeout)

    def delete(self, path: str, timeout: int = 10) -> requests.Response:
        return self.session.delete(f"{self.base_url}{path}", timeout=timeout)
