"""
consistency.py: B+ Tree <=> Table consistency verifier
GateGuard Assignment-3 Module A

Verifies that the B+ Tree index inside each Table is internally consistent.

What "consistency" means here
-------------------------------
Our Table class stores ALL data exclusively inside the B+ Tree (table.index).
There is no separate backing store. Consistency therefore means:

  1. table.count()   == len(table.select_all())
     → index._size matches the actual number of leaf entries.

  2. For every record returned by select_all() (which walks the leaf linked list),
     table.select(key) via the standard search path also returns that record.
     → Every key reachable via leaf scan is reachable via root-to-leaf search.

  3. No record returned by select_all() is missing its primary key field.

These checks catch:
  - Off-by-one errors in _size after rollback/recovery
  - Keys that exist in the linked list but were orphaned from the tree structure
  - Corrupted values where the dict is missing the primary key column

Run this checker:
  - After every committed transaction in test cells (ground truth check)
  - After every rollback (must show pre-transaction state)
  - After startup recovery (must show recovered state)

Author: GateGuard Team, IIT Gandhinagar CS432
"""

from .db_manager import DatabaseManager


class ConsistencyChecker:
    """
    Runs consistency checks on all tables in a DatabaseManager.

    Usage:
        cc = ConsistencyChecker(db)
        result = cc.check_all()       # checks every table, prints report
        assert result["overall_ok"]
    """

    def __init__(self, db: DatabaseManager):
        self._db = db

    # -- Per-table check ---------------------------------------------------

    def check_table(self, table_name: str) -> dict:
        """
        Check a single table.

        Returns
        -------
        {
            "table"        : str,
            "ok"           : bool,
            "record_count" : int,
            "issues"       : list[str],
        }
        """
        issues = []
        table  = self._db.get_table(table_name)
        pk     = table.primary_key

        # Leaf-scan: the ground truth
        all_records = table.select_all()    # uses index.get_all() → leaf linked list
        count       = table.count()         # uses index._size

        # Check 1: _size vs actual leaf count
        if len(all_records) != count:
            issues.append(
                f"Size mismatch: index._size={count} but leaf scan returned {len(all_records)} records"
            )

        # Check 2 & 3: per-record verification
        for rec in all_records:
            key = rec.get(pk)

            # Check 3: primary key column present
            if key is None:
                issues.append(
                    f"Record is missing primary key field '{pk}': {rec}"
                )
                continue

            # Check 2: search path returns the same record
            found = table.select(key)
            if found is None:
                issues.append(
                    f"key={key} visible in leaf scan but NOT findable via search()"
                )
            elif found != rec:
                issues.append(
                    f"key={key}: search() returns a different value than leaf scan "
                    f"(search={found}, scan={rec})"
                )

        return {
            "table":        table_name,
            "ok":           len(issues) == 0,
            "record_count": count,
            "issues":       issues,
        }

    # -- All-table check ---------------------------------------------------

    def check_all(self, verbose: bool = True) -> dict:
        """
        Run check_table() for every table in the database.

        Returns
        -------
        {
            "overall_ok" : bool,
            "tables"     : { table_name: check_table() result, ... },
        }
        """
        results  = {}
        overall  = True

        if verbose:
            print("\n" + "=" * 58)
            print("  CONSISTENCY CHECK")
            print("=" * 58)
            print(f"  {'Table':<26} {'Records':>8}  {'Status'}")
            print(f"  {'-'*56}")

        for table_name in self._db.list_tables():
            result = self.check_table(table_name)
            results[table_name] = result

            status = "OK" if result["ok"] else "FAIL"

            if verbose:
                print(f"  {table_name:<26} {result['record_count']:>8}  {status}")
                for issue in result["issues"]:
                    print(f"    [Warning] {issue}")

            if not result["ok"]:
                overall = False

        if verbose:
            print("=" * 58)
            over_str = "OVERALL PASS" if overall else "OVERALL FAIL"
            print(f"  {over_str}")
            print("=" * 58 + "\n")

        return {"overall_ok": overall, "tables": results}

    # -- Cross-table relational check --------------------------------------

    def check_referential_integrity(self, child_table: str, fk_col: str,
                                    parent_table: str, pk_col: str) -> dict:
        """
        Verify that every foreign-key value in child_table.fk_col
        exists as a primary key in parent_table.pk_col.

        Example:
            cc.check_referential_integrity("PersonVisit", "MemberID", "Member", "MemberID")

        Returns
        -------
        {
            "ok"       : bool,
            "orphans"  : list of (child_pk, fk_value) pairs that have no matching parent
        }
        """
        child   = self._db.get_table(child_table)
        parent  = self._db.get_table(parent_table)
        orphans = []

        for rec in child.select_all():
            fk_val = rec.get(fk_col)
            if fk_val is None:
                continue   # nullable FK - skip
            if parent.select(fk_val) is None:
                orphans.append((rec.get(child.primary_key), fk_val))

        ok = len(orphans) == 0
        if not ok:
            print(f"  [Warning] Referential integrity FAIL: {child_table}.{fk_col} -> {parent_table}.{pk_col}")
            for (cpk, fk) in orphans[:10]:   # show first 10 orphans max
                print(f"    Orphan: child pk={cpk}  fk_val={fk} not in {parent_table}")

        return {"ok": ok, "orphans": orphans}
