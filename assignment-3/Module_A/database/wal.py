"""
wal.py — Write-Ahead Log (WAL) for GateGuard Assignment-3 Module A

Every mutation is persisted to disk BEFORE it touches the in-memory B+ Tree.
Format: JSONL (append-only). One JSON object per line. Never overwrite.

Record types
------------
  BEGIN   — transaction started
  INSERT  — new key inserted into a table
  UPDATE  — existing key's value changed
  DELETE  — key removed from a table
  COMMIT  — transaction committed successfully
  ABORT   — transaction rolled back (rollback completed)

Author: GateGuard Team — IIT Gandhinagar CS432
"""

import json
import os
import threading
from datetime import datetime, timezone


# Module-level lock — protects concurrent appends (defensive; Module A is
# single-threaded in practice, but the lock makes the WAL safe if used in
# a multi-threaded context later).
_WAL_LOCK = threading.Lock()


# ---------------------------------------------------------------------------
# WALWriter
# ---------------------------------------------------------------------------

class WALWriter:
    """
    Appends structured log records to a JSONL WAL file.

    One WALWriter instance is shared across the entire DatabaseManager session.
    Every write is flushed and fsync'd for durability: if the process crashes
    after log_commit() returns, the COMMIT record is guaranteed to be on disk.
    """

    def __init__(self, path: str = "gateguard_wal.log"):
        self.path = path
        self._seq = self._read_highest_seq()

    # ── Internal helpers ────────────────────────────────────────────────

    def _read_highest_seq(self) -> int:
        """Scan existing WAL for the highest sequence number."""
        if not os.path.exists(self.path):
            return 0
        highest = 0
        with open(self.path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                    highest = max(highest, rec.get("seq", 0))
                except json.JSONDecodeError:
                    pass   # corrupted tail — skip silently
        return highest

    def _next_seq(self) -> int:
        self._seq += 1
        return self._seq

    @staticmethod
    def _ts() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _append(self, record: dict):
        """
        Serialize `record` to JSONL and fsync to disk before returning.

        This guarantees that if the caller crashes immediately after
        _append() returns, the record is still present on disk.
        """
        record["seq"] = self._next_seq()
        with _WAL_LOCK:
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, default=str) + "\n")
                f.flush()
                os.fsync(f.fileno())

    # ── Public log methods ────────────────────────────────────────────────

    def log_begin(self, txn_id: str):
        """Record the start of a transaction."""
        self._append({"txn_id": txn_id, "type": "BEGIN", "ts": self._ts()})

    def log_insert(self, txn_id: str, table: str, key, new_val: dict):
        """Record an INSERT operation — includes the full new value."""
        self._append({
            "txn_id": txn_id,
            "type":   "INSERT",
            "table":  table,
            "key":    key,
            "new_val": new_val,
        })

    def log_update(self, txn_id: str, table: str, key,
                   old_val: dict, new_val: dict):
        """Record an UPDATE — includes before-image (old_val) and after-image (new_val)."""
        self._append({
            "txn_id":  txn_id,
            "type":    "UPDATE",
            "table":   table,
            "key":     key,
            "old_val": old_val,
            "new_val": new_val,
        })

    def log_delete(self, txn_id: str, table: str, key, old_val: dict):
        """Record a DELETE — includes the full before-image for undo."""
        self._append({
            "txn_id":  txn_id,
            "type":    "DELETE",
            "table":   table,
            "key":     key,
            "old_val": old_val,
        })

    def log_commit(self, txn_id: str):
        """Write the COMMIT marker. After this returns, the txn is durable."""
        self._append({"txn_id": txn_id, "type": "COMMIT", "ts": self._ts()})

    def log_abort(self, txn_id: str):
        """Write the ABORT marker after a successful rollback."""
        self._append({"txn_id": txn_id, "type": "ABORT", "ts": self._ts()})

    def file_path(self) -> str:
        return self.path


# ---------------------------------------------------------------------------
# WALReader
# ---------------------------------------------------------------------------

class WALReader:
    """
    Reads and parses a JSONL WAL file for crash recovery.

    Provides helpers to:
      - Read all valid records in order.
      - Group records by txn_id.
      - Identify committed and uncommitted transaction sets.
    """

    def __init__(self, path: str = "gateguard_wal.log"):
        self.path = path

    def read_all(self) -> list:
        """Return all valid WAL records in append order."""
        records = []
        if not os.path.exists(self.path):
            return records
        with open(self.path, "r", encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    print(f"[WAL] Warning: corrupted record at line {lineno} — skipping.")
        return records

    def group_by_transaction(self) -> dict:
        """Return {txn_id: [ordered records]} for all txn_ids in the log."""
        groups: dict = {}
        for rec in self.read_all():
            tid = rec.get("txn_id", "__unknown__")
            groups.setdefault(tid, []).append(rec)
        return groups

    def committed_txn_ids(self) -> set:
        """Return set of txn_ids that have a COMMIT record."""
        committed = set()
        for rec in self.read_all():
            if rec.get("type") == "COMMIT":
                committed.add(rec["txn_id"])
        return committed

    def uncommitted_txn_ids(self) -> set:
        """
        Return txn_ids that have a BEGIN but no COMMIT and no ABORT.
        These are the transactions that crashed mid-flight.
        """
        begun, committed, aborted = set(), set(), set()
        for rec in self.read_all():
            t   = rec.get("type")
            tid = rec.get("txn_id", "")
            if t == "BEGIN":
                begun.add(tid)
            elif t == "COMMIT":
                committed.add(tid)
            elif t == "ABORT":
                aborted.add(tid)
        return begun - committed - aborted
