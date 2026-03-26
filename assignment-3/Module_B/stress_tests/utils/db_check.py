"""
db_check.py — Direct PostgreSQL assertions for Module B correctness validation
GateGuard Assignment-3 Module B | IIT Gandhinagar CS432

Bypasses the API layer and queries the database directly.
Used AFTER stress tests complete to verify invariants at the data layer.

Requires: psycopg2-binary, python-dotenv
Config  : reads from assignment-3/Module_B/backend/.env (same as the backend)

Author: GateGuard Team
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load the backend .env so we reuse the same DB credentials
_ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "backend", ".env")
load_dotenv(dotenv_path=_ENV_PATH)


def _get_connection():
    """Open a fresh psycopg2 connection using backend .env variables."""
    return psycopg2.connect(
        host     = os.getenv("DB_HOST", "localhost"),
        port     = int(os.getenv("DB_PORT", 5432)),
        dbname   = os.getenv("DB_NAME"),
        user     = os.getenv("DB_USER"),
        password = os.getenv("DB_PASSWORD"),
    )


# ── Query helpers ─────────────────────────────────────────────────────────────

def count_active_visits_for_member(member_id: int) -> int:
    """Count PersonVisit rows for a member where exittime IS NULL (active visits)."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT COUNT(*) AS c "
                "FROM personvisit "
                "WHERE personid = %s AND exittime IS NULL",
                (member_id,)
            )
            return int(cur.fetchone()["c"])


def get_all_visits_for_member(member_id: int) -> list[dict]:
    """Return all PersonVisit rows for a member, ordered by visitid."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT visitid, entrytime, exittime "
                "FROM personvisit "
                "WHERE personid = %s "
                "ORDER BY visitid",
                (member_id,)
            )
            return [dict(r) for r in cur.fetchall()]


def count_audit_rows(table_name: str = None, action: str = None) -> int:
    """
    Count rows in the auditlog table.

    Args:
        table_name : filter by tablename column (optional)
        action     : filter by action column — 'INSERT' | 'UPDATE' | 'DELETE' (optional)
    """
    conditions = []
    params     = []
    if table_name:
        conditions.append("tablename = %s")
        params.append(table_name)
    if action:
        conditions.append("action = %s")
        params.append(action.upper())

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT COUNT(*) AS c FROM auditlog {where}", params)
            return int(cur.fetchone()["c"])


# ── Assertion helpers ─────────────────────────────────────────────────────────

def assert_single_active_visit(member_id: int, context: str = "") -> int:
    """
    Assert that a member has at most 1 active (open) visit.
    Raises AssertionError with a diagnostic message if violated.

    Returns the active visit count (0 or 1).
    """
    count = count_active_visits_for_member(member_id)
    if count > 1:
        all_visits = get_all_visits_for_member(member_id)
        raise AssertionError(
            f"INVARIANT VIOLATION [{context}]: Member {member_id} has {count} "
            f"active visits (expected ≤ 1).\n"
            f"Full visit history: {all_visits}"
        )
    return count


def assert_no_active_visit(member_id: int, context: str = ""):
    """Assert that a member has zero active visits (e.g., after a clean exit)."""
    count = count_active_visits_for_member(member_id)
    assert count == 0, (
        f"INVARIANT VIOLATION [{context}]: Member {member_id} still has {count} "
        f"active visit(s) — expected 0 after exit."
    )


def sample_invariant_check(member_ids: list[int], context: str = "") -> bool:
    """
    Run assert_single_active_visit() across a sample of member IDs.

    Returns True if all pass, False if any violation found (does NOT raise).
    Prints violations immediately.
    """
    ok = True
    for mid in member_ids:
        try:
            assert_single_active_visit(mid, context)
        except AssertionError as e:
            print(f"  ❌ {e}")
            ok = False
    return ok
