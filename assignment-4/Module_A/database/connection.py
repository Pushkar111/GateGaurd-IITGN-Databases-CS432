import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

NUM_SHARDS = int(os.getenv("NUM_SHARDS", 3))

# connection config for each shard read from environment
SHARD_CONFIGS = [
    {
        "host":     os.getenv(f"SHARD_{i}_HOST", "localhost"),
        "port":     int(os.getenv(f"SHARD_{i}_PORT", 5432 + i + 1)),
        "dbname":   os.getenv(f"SHARD_{i}_DB",   f"gateguard_shard_{i}"),
        "user":     os.getenv(f"SHARD_{i}_USER",  "postgres"),
        "password": os.getenv(f"SHARD_{i}_PASSWORD", "shard_root"),
    }
    for i in range(NUM_SHARDS)
]

# local source DB config (used during migration only, read-only)
LOCAL_CONFIG = {
    "host":     os.getenv("LOCAL_DB_HOST",     "localhost"),
    "port":     int(os.getenv("LOCAL_DB_PORT", 5432)),
    "dbname":   os.getenv("LOCAL_DB_NAME",     "gateguard"),
    "user":     os.getenv("LOCAL_DB_USER",     "postgres"),
    "password": os.getenv("LOCAL_DB_PASSWORD", "root"),
}

# holds one open connection per shard so we don't reconnect on every query
_shard_connections = [None] * NUM_SHARDS
_local_connection  = None


def get_shard_connection(shard_id: int):
    global _shard_connections
    cfg = SHARD_CONFIGS[shard_id]
    conn = _shard_connections[shard_id]
    if conn is None or conn.closed:
        conn = psycopg2.connect(**cfg)
        conn.autocommit = False
        _shard_connections[shard_id] = conn
    return conn


def get_local_connection():
    global _local_connection
    if _local_connection is None or _local_connection.closed:
        _local_connection = psycopg2.connect(**LOCAL_CONFIG)
        _local_connection.autocommit = True
    return _local_connection


def get_shard_cursor(shard_id: int):
    conn = get_shard_connection(shard_id)
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def get_local_cursor():
    conn = get_local_connection()
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def close_all_connections():
    global _shard_connections, _local_connection
    for i, conn in enumerate(_shard_connections):
        if conn and not conn.closed:
            conn.close()
            _shard_connections[i] = None
    if _local_connection and not _local_connection.closed:
        _local_connection.close()
        _local_connection = None
