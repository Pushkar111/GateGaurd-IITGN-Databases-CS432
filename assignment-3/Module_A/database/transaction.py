"""
transaction.py: TransactionManager for GateGuard Assignment-3 Module A

Wraps DatabaseManager with full ACID transaction semantics built
on top of the WAL (Write-Ahead Log) in wal.py.

Design
------
  Atomicity  : in-memory undo stack applied in reverse on rollback
  Durability : WAL COMMIT record is fsync'd before commit() returns
  Consistency: guards against duplicate inserts & non-existent updates
  Isolation  : single active transaction at a time (Module A scope)

Usage
-----
    db  = DatabaseManager.create_gateguard_db()
    wal = WALWriter("gateguard_wal.log")
    tm  = TransactionManager(db, wal)

    # Context-manager style (recommended - auto-rollback on exception):
    with tm.transaction("add_member_visit") as txn:
        txn.insert("Member",      { ... })
        txn.insert("PersonVisit", { ... })
    # Commits if no exception; rolls back automatically if any exception.

    # Manual style (for full control in notebooks):
    txn = tm.begin("manual_test")
    txn.insert("Member", { ... })
    txn.commit()   # or txn.rollback()

Author: GateGuard Team, IIT Gandhinagar CS432
"""

import uuid
from contextlib import contextmanager

from .wal        import WALWriter
from .db_manager import DatabaseManager


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------

class TransactionError(Exception):
    """Raised when a transactional operation cannot proceed due to a logic error."""


# ---------------------------------------------------------------------------
# Transaction - one active unit of work
# ---------------------------------------------------------------------------

class Transaction:
    """
    Represents a single active transaction.

    Do NOT instantiate directly - always use TransactionManager.begin()
    or the TransactionManager.transaction() context manager.

    Internal undo stack format
    --------------------------
    Each entry is a tuple:
        (operation, table_name, key, before_value)

    Where:
        operation    : "INSERT" | "UPDATE" | "DELETE"
        table_name   : str - e.g., "Member"
        key          : primary-key value used in the B+ Tree
        before_value : dict (old record) or None (for INSERT, nothing to restore)

    On rollback() we walk the undo stack in REVERSE order:
        INSERT  → table.delete(key)
        UPDATE  → table.index.update(key, before_value)
        DELETE  → table.insert(before_value)
    """

    def __init__(self, txn_id: str, db: DatabaseManager, wal: WALWriter):
        self.txn_id     = txn_id
        self._db        = db
        self._wal       = wal
        self._undo_stack: list = []   # list of (op, table_name, key, before_val)
        self._active    = True
        self._committed = False

        # WAL-first: log BEGIN before anything else
        self._wal.log_begin(txn_id)
        print(f"starting txn: {txn_id}...")

    # -- Mutation interface ------------------------------------------------

    def insert(self, table_name: str, record: dict):
        """
        Insert a new record into `table_name`.

        Sequence:
          1. Guard - reject duplicates (fail early, no log written).
          2. WAL log_insert - disk first.
          3. Push undo entry (INSERT → undo via DELETE).
          4. Apply to B+ Tree.
        """
        self._assert_active("insert")
        table = self._db.get_table(table_name)
        key   = record.get(table.primary_key)

        if key is None:
            raise TransactionError(
                f"INSERT into '{table_name}': record missing primary key "
                f"column '{table.primary_key}'."
            )

        # Guard against silent upsert - we treat inserts as strictly new
        if table.select(key) is not None:
            raise TransactionError(
                f"INSERT into '{table_name}': key={key} already exists. "
                f"Use txn.update() to modify existing records."
            )

        # WAL before memory
        self._wal.log_insert(self.txn_id, table_name, key, record)

        # Undo: to reverse an INSERT, we DELETE the key
        self._undo_stack.append(("INSERT", table_name, key, None))

        # Apply
        table.insert(record)
        print(f"  -> inserting into {table_name} with key {key}")

    def update(self, table_name: str, key, updated_fields: dict):
        """
        Update an existing record's fields via merge.

        Captures the full before-image so rollback can restore the exact
        previous state, not just the changed fields.
        """
        self._assert_active("update")
        table      = self._db.get_table(table_name)
        before_val = table.select(key)

        if before_val is None:
            raise TransactionError(
                f"UPDATE in '{table_name}': key={key} not found."
            )

        # Compute the merged new value
        new_val = {**before_val, **updated_fields}

        # WAL before memory
        self._wal.log_update(self.txn_id, table_name, key, before_val, new_val)

        # Undo: restore the exact before_val
        self._undo_stack.append(("UPDATE", table_name, key, before_val))

        # Apply directly to B+ Tree update (bypasses Table.update merge to set exact dict)
        table.index.update(key, new_val)
        print(f"  -> updating {table_name} with key {key}")

    def delete(self, table_name: str, key):
        """
        Delete a record by primary key.

        Captures the full record as before-image so it can be re-inserted
        on rollback.
        """
        self._assert_active("delete")
        table      = self._db.get_table(table_name)
        before_val = table.select(key)

        if before_val is None:
            raise TransactionError(
                f"DELETE from '{table_name}': key={key} not found."
            )

        # WAL before memory
        self._wal.log_delete(self.txn_id, table_name, key, before_val)

        # Undo: to reverse a DELETE, we INSERT the old record back
        self._undo_stack.append(("DELETE", table_name, key, before_val))

        # Apply
        table.delete(key)
        print(f"  -> deleting from {table_name} with key {key}")

    # -- Lifecycle --------------------------------------------------------

    def commit(self):
        """
        Commit the transaction.

        Writes the COMMIT record to the WAL (with fsync) before marking
        the transaction as settled. After this call returns, all mutations
        are considered durable.
        """
        self._assert_active("commit")

        # COMMIT goes to disk - durability guarantee
        self._wal.log_commit(self.txn_id)

        self._active    = False
        self._committed = True
        print(f"committed txn {self.txn_id} yay!")

    def rollback(self):
        """
        Roll back all operations in this transaction in reverse order.

        After this call: the B+ Tree state is exactly as it was before
        begin() was called. The WAL records an ABORT marker.
        """
        if not self._active:
            # Already settled - idempotent, no-op
            return

        n = len(self._undo_stack)
        print(f"uh oh rolling back txn {self.txn_id}! undoing {n} things..")

        for op, table_name, key, before_val in reversed(self._undo_stack):
            table = self._db.get_table(table_name)
            try:
                if op == "INSERT":
                    # Undo insert -> delete the key we added
                    table.delete(key)
                    print(f"  -> undoing insert on {table_name}")

                elif op == "UPDATE":
                    # Undo update -> restore exact old record
                    table.index.update(key, before_val)
                    print(f"  -> undoing update on {table_name}")

                elif op == "DELETE":
                    # Undo delete -> re-insert the old record
                    table.insert(before_val)
                    print(f"  -> undoing delete on {table_name}")

            except Exception as exc:
                # Log the undo failure but continue undoing remaining ops
                print(f"  -> oops error while undoing: {exc}")

        # Record the abort in WAL
        self._wal.log_abort(self.txn_id)
        self._active = False
        print(f"txn aborted: {self.txn_id}")

    # -- Helpers ----------------------------------------------------------

    def _assert_active(self, op_name: str):
        """Raise TransactionError if the transaction is no longer active."""
        if not self._active:
            state = "committed" if self._committed else "rolled back"
            raise TransactionError(
                f"Cannot call {op_name}(): transaction '{self.txn_id}' is already {state}. "
                f"Start a new transaction via TransactionManager.begin()."
            )

    @property
    def is_active(self) -> bool:
        return self._active

    @property
    def is_committed(self) -> bool:
        return self._committed

    def __repr__(self):
        state = "ACTIVE" if self._active else ("COMMITTED" if self._committed else "ABORTED")
        return f"Transaction(id={self.txn_id!r}, state={state}, ops={len(self._undo_stack)})"


# ---------------------------------------------------------------------------
# TransactionManager - the public entry point
# ---------------------------------------------------------------------------

class TransactionManager:
    """
    Coordinates transactions over an existing DatabaseManager.

    Rules enforced
    --------------
    - Only ONE active transaction at a time (single-threaded Module A model).
    - Every mutation goes through this manager so WAL is always written first.
    - The context-manager API (with tm.transaction(...) as txn) is the
      recommended style - it guarantees rollback on any exception including
      KeyboardInterrupt.

    Example
    -------
    db  = DatabaseManager.create_gateguard_db()
    wal = WALWriter("gateguard_wal.log")
    tm  = TransactionManager(db, wal)

    with tm.transaction("member_entry") as txn:
        txn.insert("Member",      { "MemberID": 1, ... })
        txn.insert("PersonVisit", { "VisitID": 1, ... })
    # auto-commits here on clean exit

    # Or cause a rollback:
    try:
        with tm.transaction("bad_op") as txn:
            txn.insert("Member", { "MemberID": 2, ... })
            raise RuntimeError("disk full!")   # triggers auto-rollback
    except RuntimeError:
        pass   # Member 2 is gone - never committed
    """

    def __init__(self, db: DatabaseManager, wal: WALWriter):
        self._db          = db
        self._wal         = wal
        self._current_txn: Transaction | None = None

    def begin(self, name: str = "") -> Transaction:
        """
        Start a new transaction and return the Transaction object.

        Args:
            name: Optional human-readable label. Included in the txn_id
                  for readability in WAL logs and print output.

        Raises:
            TransactionError: if another transaction is still active.
        """
        if self._current_txn is not None and self._current_txn.is_active:
            raise TransactionError(
                f"TransactionManager already has an active transaction "
                f"('{self._current_txn.txn_id}'). "
                f"Commit or rollback the current transaction first."
            )

        slug    = f"{name}-" if name else ""
        txn_id  = f"txn-{slug}{uuid.uuid4().hex[:8]}"
        txn     = Transaction(txn_id, self._db, self._wal)
        self._current_txn = txn
        return txn

    @contextmanager
    def transaction(self, name: str = ""):
        """
        Context manager for safe, automatic commit/rollback.

        On clean exit from the `with` block → commit().
        On any exception             → rollback(), then re-raise.

        Usage:
            with tm.transaction("label") as txn:
                txn.insert(...)
                txn.update(...)
            # committed here automatically
        """
        txn = self.begin(name)
        try:
            yield txn
            if txn.is_active:
                txn.commit()
        except Exception as exc:
            print(f"\\noops transaction crashed: {exc}")
            print(f"auto rolling back now...")
            txn.rollback()
            raise   # re-raise so the caller knows about the failure

    @property
    def current_transaction(self) -> Transaction | None:
        return self._current_txn
