"""
GateGuard Assignment 4 --> Docker Shard Migration Script
========================================================

What this does (plain English):
  Reads your main GateGuard database (port 5432) and pushes the
  right rows into each of the 3 Docker shard containers.

  After running this:
    Shard 0 (port 5433) --> shard_0_member (1666 rows), shard_0_personvisit (~16664 rows)
    Shard 1 (port 5434) --> shard_1_member (1667 rows), shard_1_personvisit (~16673 rows)
    Shard 2 (port 5435) --> shard_2_member (1667 rows), shard_2_personvisit (~16677 rows)

  You can then open pgAdmin, connect to localhost:5433 / 5434 / 5435
  and browse each shard's tables independently.

How to run:
  cd assignment-4/Module_A
  python migrate_to_docker_shards.py

Prerequisites:
  - Docker containers must be running: docker compose up
  - .env file must have correct LOCAL_DB_PASSWORD and SHARD passwords
"""

import os
import sys
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# load .env from the same directory as this script
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# connection configs (read from .env)
LOCAL = dict(
    host=os.getenv("LOCAL_DB_HOST", "localhost"),
    port=int(os.getenv("LOCAL_DB_PORT", 5432)),
    dbname=os.getenv("LOCAL_DB_NAME", "gateguard"),
    user=os.getenv("LOCAL_DB_USER", "postgres"),
    password=os.getenv("LOCAL_DB_PASSWORD", "root"),
)

SHARDS = [
    dict(
        host=os.getenv(f"SHARD_{i}_HOST", "localhost"),
        port=int(os.getenv(f"SHARD_{i}_PORT", 5432 + i + 1)),
        dbname=os.getenv(f"SHARD_{i}_DB", f"gateguard_shard_{i}"),
        user=os.getenv(f"SHARD_{i}_USER", "postgres"),
        password=os.getenv(f"SHARD_{i}_PASSWORD", "shard_root"),
    )
    for i in range(3)
]

# DDL for each shard container
# Each container gets lookup tables (gate, membertype) with ALL rows,
# plus its own shard_N_member and shard_N_personvisit with only its rows.
# Column names and types match the ACTUAL source database exactly.

def get_ddl_statements(shard_id):
    """Return individual DDL statements as a list - no semicolons inside, no comments.
    Splitting by ';' was breaking because comment lines without ';' merged with the next
    statement. This approach returns a clean list instead.
    """
    s = shard_id
    return [
        # wipe any stale tables from a previous failed run
        f"DROP TABLE IF EXISTS shard_{s}_personvisit CASCADE",
        f"DROP TABLE IF EXISTS shard_{s}_member CASCADE",
        f"DROP TABLE IF EXISTS gate CASCADE",
        f"DROP TABLE IF EXISTS membertype CASCADE",
        # lookup tables - all rows on every shard
        """CREATE TABLE membertype (
            typeid   SERIAL PRIMARY KEY,
            typename VARCHAR(255) NOT NULL
        )""",
        """CREATE TABLE gate (
            gateid   SERIAL PRIMARY KEY,
            name     VARCHAR(255),
            location VARCHAR(255)
        )""",
        # shard member table
        f"""CREATE TABLE shard_{s}_member (
            memberid      SERIAL PRIMARY KEY,
            name          VARCHAR(255)        NOT NULL,
            email         VARCHAR(255) UNIQUE NOT NULL,
            contactnumber VARCHAR(20),
            image         BYTEA,
            age           INT,
            department    VARCHAR(255),
            typeid        INT REFERENCES membertype(typeid),
            createdat     TIMESTAMP DEFAULT NOW(),
            updatedat     TIMESTAMP DEFAULT NOW()
        )""",
        # shard personvisit table
        f"""CREATE TABLE shard_{s}_personvisit (
            visitid     SERIAL PRIMARY KEY,
            personid    INT NOT NULL REFERENCES shard_{s}_member(memberid),
            entrygateid INT REFERENCES gate(gateid),
            entrytime   TIMESTAMP DEFAULT NOW(),
            exitgateid  INT REFERENCES gate(gateid),
            exittime    TIMESTAMP,
            vehicleid   INT,
            createdat   TIMESTAMP DEFAULT NOW(),
            updatedat   TIMESTAMP DEFAULT NOW()
        )""",
        # indexes
        f"CREATE INDEX idx_s{s}_member_email  ON shard_{s}_member (email)",
        f"CREATE INDEX idx_s{s}_member_typeid ON shard_{s}_member (typeid)",
        f"CREATE INDEX idx_s{s}_pv_personid   ON shard_{s}_personvisit (personid)",
        f"CREATE INDEX idx_s{s}_pv_entrytime  ON shard_{s}_personvisit (entrytime)",
        f"CREATE INDEX idx_s{s}_pv_exittime   ON shard_{s}_personvisit (exittime)",
    ]


# helpers
def banner(msg):
    print(f"\n{'='*65}")
    print(f"  {msg}")
    print("=" * 65)


def connect(cfg, label):
    try:
        conn = psycopg2.connect(**cfg)
        conn.autocommit = True
        print(f"  [OK]   Connected --> {label}  ({cfg['host']}:{cfg['port']}/{cfg['dbname']})")
        return conn
    except Exception as e:
        print(f"  [FAIL] Cannot connect to {label}: {e}")
        sys.exit(1)


def fetch(conn, sql, params=None):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params or ())
        return cur.fetchall()


def run(conn, sql, params=None):
    with conn.cursor() as cur:
        cur.execute(sql, params or ())


def count(conn, table):
    with conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        return cur.fetchone()[0]


# migration steps
def setup_schema(shard_conn, shard_id):
    print(f"\n  [1] Creating schema on shard_{shard_id}...")
    with shard_conn.cursor() as cur:
        for stmt in get_ddl_statements(shard_id):
            cur.execute(stmt)
    print(f"      Tables, foreign keys, and indexes created.")


def copy_membertype(local_conn, shard_conn, shard_id):
    rows = fetch(local_conn, "SELECT typeid, typename FROM membertype ORDER BY typeid")
    for r in rows:
        run(shard_conn,
            "INSERT INTO membertype (typeid, typename) VALUES (%s,%s) ON CONFLICT (typeid) DO NOTHING",
            (r["typeid"], r["typename"]))
    print(f"  [2] membertype  : {len(rows)} rows copied (all lookup rows on every shard)")


def copy_gate(local_conn, shard_conn, shard_id):
    rows = fetch(local_conn, "SELECT gateid, name, location FROM gate ORDER BY gateid")
    for r in rows:
        run(shard_conn,
            "INSERT INTO gate (gateid, name, location) VALUES (%s,%s,%s) ON CONFLICT (gateid) DO NOTHING",
            (r["gateid"], r["name"], r["location"]))
    print(f"  [3] gate        : {len(rows)} rows copied (all lookup rows on every shard)")


def copy_members(local_conn, shard_conn, shard_id):
    rows = fetch(
        local_conn,
        "SELECT memberid, name, email, contactnumber, age, department, typeid, createdat, updatedat "
        "FROM member WHERE memberid %% 3 = %s ORDER BY memberid",
        (shard_id,)
    )
    params = [
        (r["memberid"], r["name"], r["email"], r["contactnumber"],
         r["age"], r["department"], r["typeid"], r["createdat"], r["updatedat"])
        for r in rows
    ]
    with shard_conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            f"INSERT INTO shard_{shard_id}_member "
            f"(memberid, name, email, contactnumber, image, age, department, typeid, createdat, updatedat) "
            f"VALUES %s ON CONFLICT (memberid) DO NOTHING",
            # inject NULL for image in each row tuple
            [(r[0], r[1], r[2], r[3], None, r[4], r[5], r[6], r[7], r[8]) for r in params],
            page_size=500
        )
    print(f"  [4] member      : {len(rows)} rows --> shard_{shard_id}_member  (memberid % 3 = {shard_id})")
    return len(rows)


def copy_visits(local_conn, shard_conn, shard_id):
    rows = fetch(
        local_conn,
        "SELECT visitid, personid, entrygateid, entrytime, exitgateid, exittime, vehicleid, createdat, updatedat "
        "FROM personvisit WHERE personid %% 3 = %s ORDER BY visitid",
        (shard_id,)
    )
    params = [
        (r["visitid"], r["personid"], r["entrygateid"], r["entrytime"],
         r["exitgateid"], r["exittime"], r["vehicleid"], r["createdat"], r["updatedat"])
        for r in rows
    ]
    with shard_conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            f"INSERT INTO shard_{shard_id}_personvisit "
            f"(visitid, personid, entrygateid, entrytime, exitgateid, exittime, vehicleid, createdat, updatedat) "
            f"VALUES %s ON CONFLICT (visitid) DO NOTHING",
            params,
            page_size=500
        )
    print(f"  [5] personvisit : {len(rows)} rows --> shard_{shard_id}_personvisit  (personid % 3 = {shard_id})")
    return len(rows)


def verify(shard_conn, shard_id):
    m  = count(shard_conn, f"shard_{shard_id}_member")
    v  = count(shard_conn, f"shard_{shard_id}_personvisit")

    with shard_conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM shard_{shard_id}_member WHERE memberid % 3 != {shard_id}")
        m_wrong = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM shard_{shard_id}_personvisit WHERE personid % 3 != {shard_id}")
        v_wrong = cur.fetchone()[0]

    ok = (m_wrong == 0 and v_wrong == 0)
    status = "PASSED" if ok else "FAILED"
    print(f"\n  Verification:")
    print(f"    shard_{shard_id}_member      : {m:6d} rows  (wrong-shard rows: {m_wrong})")
    print(f"    shard_{shard_id}_personvisit : {v:6d} rows  (wrong-shard rows: {v_wrong})")
    print(f"    Result: {status}")
    return ok


# main
def main():
    banner("GateGuard Assignment 4 - Docker Shard Migration")

    print("\nConnecting to local source database (port 5432)...")
    local_conn = connect(LOCAL, "local DB (source)")

    total_m = count(local_conn, "member")
    total_v = count(local_conn, "personvisit")
    print(f"  Source has {total_m} members and {total_v} visits ready to distribute.")

    if total_m == 0:
        print("\nERROR: member table is empty. Seed the database first.")
        sys.exit(1)

    all_ok = True
    member_totals = []
    visit_totals  = []

    for shard_id in range(3):
        banner(f"Shard {shard_id}  -->  port {SHARDS[shard_id]['port']}  ({SHARDS[shard_id]['dbname']})")
        shard_conn = connect(SHARDS[shard_id], f"shard_{shard_id}")

        setup_schema(shard_conn, shard_id)
        copy_membertype(local_conn, shard_conn, shard_id)
        copy_gate(local_conn, shard_conn, shard_id)
        m = copy_members(local_conn, shard_conn, shard_id)
        v = copy_visits(local_conn, shard_conn, shard_id)

        ok = verify(shard_conn, shard_id)
        all_ok = all_ok and ok
        member_totals.append(m)
        visit_totals.append(v)
        shard_conn.close()

    banner("Migration Summary")
    print(f"  {'Shard':<10} {'Members':>10} {'Share':>8}   {'Visits':>10} {'Share':>8}")
    print(f"  {'-'*55}")
    for i in range(3):
        mp = member_totals[i] / total_m * 100
        vp = visit_totals[i]  / total_v * 100
        print(f"  shard_{i}     {member_totals[i]:>10,}  {mp:>7.2f}%   {visit_totals[i]:>10,}  {vp:>7.2f}%")
    print(f"  {'-'*55}")
    print(f"  {'Total':<10} {sum(member_totals):>10,}  {'100.00%':>8}   {sum(visit_totals):>10,}  {'100.00%':>8}")

    print()
    if all_ok:
        print("  ALL 3 SHARDS: PASSED")
        print()
        print("  Next steps:")
        print("    1. Open pgAdmin")
        print("    2. Add connection:  localhost:5433  db=gateguard_shard_0  user=postgres  pwd=shard_root")
        print("    3. Add connection:  localhost:5434  db=gateguard_shard_1  user=postgres  pwd=shard_root")
        print("    4. Add connection:  localhost:5435  db=gateguard_shard_2  user=postgres  pwd=shard_root")
        print("    5. Browse shard_0_member on each to see different row counts")
        print("    6. Run test_sharding.ipynb to see the routing proof")
    else:
        print("  Some shards FAILED. Check the output above.")

    local_conn.close()


if __name__ == "__main__":
    main()
