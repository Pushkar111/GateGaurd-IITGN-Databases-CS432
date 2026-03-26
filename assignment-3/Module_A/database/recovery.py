"""
recovery.py — WAL-based crash recovery for GateGuard Assignment-3 Module A

Called ONCE at database startup, before serving any new requests.

Recovery algorithm (Undo + Redo WAL)
-------------------------------------
  1. Read all records from the WAL file.
  2. Identify COMMITTED transaction IDs   (have a COMMIT record).
  3. Identify UNCOMMITTED transaction IDs (have BEGIN but no COMMIT/ABORT).
  4. For each COMMITTED txn, replay INSERT/UPDATE/DELETE in forward seq order.
       → If the record is already present and matches, skip (idempotent).
  5. UNCOMMITTED txns are ignored:
       → If the process was alive when they failed, rollback() already ran.
       → If the process crashed, their mutations may be partially applied;
         but because we WAL-first (disk before memory), any record that made
         it to memory was either fully applied or not at all from the B+ Tree
         perspective. We leave them absent — they never committed.
  6. Print a human-readable summary.

Idempotency
-----------
Running recovery twice produces the same result as running it once.
Each redo operation checks the current state before applying.

Author: GateGuard Team — IIT Gandhinagar CS432
"""

from .wal        import WALReader
from .db_manager import DatabaseManager


class RecoveryManager:
    """
    Replays committed WAL transactions into a (freshly created) DatabaseManager.

    The DatabaseManager passed in should be empty (just created via
    create_gateguard_db()) — recovery populates it from the WAL.
    """

    def __init__(self, db: DatabaseManager, wal_path: str = "gateguard_wal.log"):
        self._db     = db
        self._reader = WALReader(wal_path)

    # ── Public API ────────────────────────────────────────────────────────

    def recover(self) -> dict:
        """
        Execute full WAL recovery.

        Returns
        -------
        {
            "committed_txns"   : int,
            "uncommitted_txns" : int,
            "records_replayed" : int,
            "records_skipped"  : int,
            "errors"           : list[str],
        }
        """
        print("\n" + "=" * 62)
        print("  [RECOVERY] Scanning WAL for crash recovery...")

        all_records = self._reader.read_all()

        if not all_records:
            print("  [RECOVERY] WAL is empty — nothing to recover.")
            print("=" * 62 + "\n")
            return {
                "committed_txns":   0,
                "uncommitted_txns": 0,
                "records_replayed": 0,
                "records_skipped":  0,
                "errors":           [],
            }

        committed_ids   = self._reader.committed_txn_ids()
        uncommitted_ids = self._reader.uncommitted_txn_ids()
        groups          = self._reader.group_by_transaction()

        replayed = 0
        skipped  = 0
        errors   = []

        print(f"  WAL records       : {len(all_records)}")
        print(f"  Committed txns    : {len(committed_ids)}")
        print(f"  Uncommitted txns  : {len(uncommitted_ids)}")

        if uncommitted_ids:
            print(f"  ⚠  Uncommitted txns (will be skipped): {uncommitted_ids}")

        print()

        # ── Redo pass: replay all committed transactions ─────────────────
        for txn_id in committed_ids:
            records = sorted(
                groups.get(txn_id, []),
                key=lambda r: r.get("seq", 0)
            )
            print(f"  Replaying txn_id={txn_id} ({len(records)} records)...")

            for rec in records:
                rtype = rec.get("type")
                if rtype not in ("INSERT", "UPDATE", "DELETE"):
                    continue   # skip BEGIN / COMMIT / ABORT markers

                table_name = rec.get("table")
                key        = rec.get("key")

                # Guard: table must exist in the schema
                if table_name not in self._db.list_tables():
                    msg = f"Recovery: table '{table_name}' not found in DB — skipping record."
                    errors.append(msg)
                    print(f"    ⚠  {msg}")
                    skipped += 1
                    continue

                table = self._db.get_table(table_name)

                try:
                    result = self._apply_record(table, rtype, key, rec)
                    if result == "replayed":
                        replayed += 1
                        print(f"    ↻  REDO {rtype:<7} table={table_name} key={key}")
                    else:
                        skipped += 1

                except Exception as exc:
                    msg = f"Error replaying {rtype} key={key} in {table_name}: {exc}"
                    errors.append(msg)
                    print(f"    ✖  {msg}")

        summary = {
            "committed_txns":   len(committed_ids),
            "uncommitted_txns": len(uncommitted_ids),
            "records_replayed": replayed,
            "records_skipped":  skipped,
            "errors":           errors,
        }

        print()
        print(f"  Recovery complete")
        print(f"    Replayed : {replayed}")
        print(f"    Skipped  : {skipped}  (already present or no-op)")
        print(f"    Errors   : {len(errors)}")
        print("=" * 62 + "\n")
        return summary

    # ── Internal helpers ─────────────────────────────────────────────────

    def _apply_record(self, table, rtype: str, key, rec: dict) -> str:
        """
        Apply a single WAL record to the in-memory table.

        Returns "replayed" if the operation was applied,
                "skipped"  if the state already matches (idempotent skip).
        """
        if rtype == "INSERT":
            existing = table.select(key)
            if existing is not None:
                return "skipped"   # already present — idempotent
            table.insert(rec["new_val"])
            return "replayed"

        elif rtype == "UPDATE":
            existing = table.select(key)
            if existing == rec["new_val"]:
                return "skipped"   # already at the target state
            if existing is None:
                # Record was deleted after commit — unusual but handle gracefully
                table.insert(rec["new_val"])
            else:
                table.index.update(key, rec["new_val"])
            return "replayed"

        elif rtype == "DELETE":
            existing = table.select(key)
            if existing is None:
                return "skipped"   # already absent
            table.delete(key)
            return "replayed"

        return "skipped"
