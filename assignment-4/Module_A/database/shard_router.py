import os
from dotenv import load_dotenv
from .connection import (
    get_shard_cursor,
    get_shard_connection,
    NUM_SHARDS,
)

load_dotenv()


def get_shard_id(member_id: int) -> int:
    return member_id % NUM_SHARDS


def member_table(member_id: int) -> str:
    return f"shard_{get_shard_id(member_id)}_member"


def visit_table(member_id: int) -> str:
    return f"shard_{get_shard_id(member_id)}_personvisit"


def all_member_tables() -> list:
    return [f"shard_{i}_member" for i in range(NUM_SHARDS)]


def all_visit_tables() -> list:
    return [f"shard_{i}_personvisit" for i in range(NUM_SHARDS)]


def lookup_member(member_id: int) -> dict:
    """
    Single-shard point lookup by memberid.
    Routing is O(1) -- one hash, one connection, one query.
    """
    shard_id = get_shard_id(member_id)
    table    = member_table(member_id)
    cur      = get_shard_cursor(shard_id)
    cur.execute(f"SELECT * FROM {table} WHERE memberid = %s", (member_id,))
    return cur.fetchone()


def insert_visit(member_id: int, entry_gate_id: int) -> dict:
    """
    Routes a new visit insert to the correct shard.
    Checks for an already-open visit first using SELECT FOR UPDATE
    to preserve the race-condition safety from Assignment 3.
    """
    shard_id = get_shard_id(member_id)
    table    = visit_table(member_id)
    conn     = get_shard_connection(shard_id)
    cur      = conn.cursor()
    cur.execute(
        f"SELECT visitid FROM {table} WHERE personid = %s AND exittime IS NULL FOR UPDATE",
        (member_id,)
    )
    if cur.fetchone():
        conn.rollback()
        raise ValueError(f"member {member_id} already has an open visit on shard_{shard_id}")
    cur.execute(
        f"""
        INSERT INTO {table} (personid, entrygateid, entrytime)
        VALUES (%s, %s, NOW())
        RETURNING *
        """,
        (member_id, entry_gate_id)
    )
    row = cur.fetchone()
    conn.commit()
    return dict(row) if row else None


def scatter_gather_visits(start_dt: str, end_dt: str) -> list:
    """
    Fan-out range query across all three shards.
    Sends the same entrytime BETWEEN query to each shard, collects all rows,
    and merges them sorted by entrytime in the application layer.

    Trade-off: no global snapshot guarantee. A visit inserted on shard_1 just
    before this function starts may not appear if shard_1 is queried last and
    the write hasn't been flushed yet. This is a documented limitation of the
    shared-nothing architecture.
    """
    results = []
    for i, table in enumerate(all_visit_tables()):
        cur = get_shard_cursor(i)
        cur.execute(
            f"SELECT * FROM {table} WHERE entrytime BETWEEN %s AND %s",
            (start_dt, end_dt)
        )
        results.extend(cur.fetchall())
    return sorted(results, key=lambda r: r["entrytime"])


def count_active_visits() -> int:
    """
    Cross-shard aggregation for the campus occupancy dashboard.
    Fetches COUNT from each shard and sums them in Python.
    Accepts a small consistency window -- a visit recorded on shard_2
    between querying shard_0 and shard_2 may be counted or missed.
    """
    total = 0
    for i, table in enumerate(all_visit_tables()):
        cur = get_shard_cursor(i)
        cur.execute(f"SELECT COUNT(*) AS cnt FROM {table} WHERE exittime IS NULL")
        row = cur.fetchone()
        total += row["cnt"] if row else 0
    return total


def lookup_member_by_email_scatter(email: str) -> dict:
    """
    Scatter-gather lookup by email across all three shards.
    Used during login where we don't have the memberid yet.
    Returns the first matching row found, or None.

    This is the documented trade-off for not having a Global Secondary Index.
    Best case: email lives on shard_1 and shard_1 is queried second -- two
    extra queries hit shard_0 and shard_2 and return zero rows each.
    """
    for i in range(NUM_SHARDS):
        table = f"shard_{i}_member"
        cur   = get_shard_cursor(i)
        cur.execute(f"SELECT * FROM {table} WHERE email = %s", (email,))
        row = cur.fetchone()
        if row:
            return dict(row)
    return None
