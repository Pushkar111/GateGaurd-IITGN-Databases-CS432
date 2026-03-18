"""
DatabaseManager — GateGuard Assignment-2 Module A

Manages multiple Table objects. Provides a simple interface to create,
access, list, and drop tables — like a mini DBMS.
"""

from .table import Table


class DatabaseManager:
    """
    Manages a collection of Table objects (each backed by its own B+ Tree).

    Usage:
        db = DatabaseManager("GateGuardDB")
        members = db.create_table("members", ["MemberID", "Name", "Email"], "MemberID")
        members.insert({"MemberID": 1, "Name": "Dr. Rajesh Kumar", "Email": "rajesh@iitgn.ac.in"})
        print(members.select(1))
    """

    def __init__(self, name: str = "GateGuardDB"):
        self.name = name
        self._tables: dict[str, Table] = {}

    # -----------------------------------------------------------------------
    # Table management
    # -----------------------------------------------------------------------

    def create_table(
        self,
        name: str,
        columns: list,
        primary_key: str,
        order: int = 4
    ) -> Table:
        """
        Create a new table and register it.
        Raises ValueError if a table with this name already exists.
        """
        if name in self._tables:
            raise ValueError(f"Table '{name}' already exists in database '{self.name}'")
        table = Table(name=name, columns=columns, primary_key=primary_key, order=order)
        self._tables[name] = table
        print(f"[DB] Created table '{name}' (pk='{primary_key}', order={order})")
        return table

    def get_table(self, name: str) -> Table:
        """
        Retrieve a registered table by name.
        Raises KeyError if not found.
        """
        if name not in self._tables:
            raise KeyError(f"Table '{name}' not found in database '{self.name}'")
        return self._tables[name]

    def drop_table(self, name: str):
        """
        Drop (delete) a table and all its data.
        Raises KeyError if not found.
        """
        if name not in self._tables:
            raise KeyError(f"Table '{name}' not found in database '{self.name}'")
        del self._tables[name]
        print(f"[DB] Dropped table '{name}'")

    def list_tables(self) -> list:
        """Return names of all registered tables."""
        return list(self._tables.keys())

    def table_exists(self, name: str) -> bool:
        """Check if a table exists in this database."""
        return name in self._tables

    # -----------------------------------------------------------------------
    # Cross-table utilities
    # -----------------------------------------------------------------------

    def stats(self):
        """Print a summary of all tables and their record counts."""
        print(f"\n{'='*55}")
        print(f"  Database : {self.name}")
        print(f"  Tables   : {len(self._tables)}")
        print(f"  {'Table Name':<25} {'Records':>10}  {'PK':<15}")
        print(f"  {'-'*50}")
        for tname, tbl in self._tables.items():
            print(f"  {tname:<25} {tbl.count():>10}  {tbl.primary_key:<15}")
        print(f"{'='*55}\n")

    # -----------------------------------------------------------------------
    # Convenience: create GateGuard tables
    # -----------------------------------------------------------------------

    @classmethod
    def create_gateguard_db(cls, order: int = 4) -> 'DatabaseManager':
        """
        Factory method: create a DatabaseManager pre-loaded with all
        GateGuard schema tables (mirrors the Assignment 1 PostgreSQL schema).
        Returns the DatabaseManager instance with empty tables.
        """
        db = cls("GateGuardDB")

        db.create_table("MemberType",
            ["TypeID", "TypeName", "Description"],
            "TypeID", order)

        db.create_table("Member",
            ["MemberID", "Name", "Email", "ContactNumber", "Image",
             "Age", "Department", "TypeID", "CreatedAt", "UpdatedAt"],
            "MemberID", order)

        db.create_table("VehicleType",
            ["TypeID", "TypeName", "Description"],
            "TypeID", order)

        db.create_table("Vehicle",
            ["VehicleID", "RegistrationNumber", "Model", "Color",
             "OwnerID", "TypeID", "CreatedAt"],
            "VehicleID", order)

        db.create_table("Gate",
            ["GateID", "Name", "Location", "Status"],
            "GateID", order)

        db.create_table("GateOccupancy",
            ["OccupancyID", "GateID", "OccupancyCount", "UpdatedAt"],
            "OccupancyID", order)

        db.create_table("Role",
            ["RoleID", "RoleName", "Description"],
            "RoleID", order)

        db.create_table("User",
            ["UserID", "Username", "PasswordHash", "RoleID", "CreatedAt"],
            "UserID", order)

        db.create_table("PersonVisit",
            ["VisitID", "MemberID", "EntryGateID", "ExitGateID",
             "EntryTime", "ExitTime", "VehicleID"],
            "VisitID", order)

        db.create_table("VehicleVisit",
            ["VVVisitID", "VehicleID", "EntryGateID", "ExitGateID",
             "EntryTime", "ExitTime"],
            "VVVisitID", order)

        return db

    # -----------------------------------------------------------------------
    # Dunder helpers
    # -----------------------------------------------------------------------

    def __repr__(self):
        return f"DatabaseManager(name='{self.name}', tables={self.list_tables()})"

    def __getitem__(self, name: str) -> Table:
        """Allow dict-style access: db['members']"""
        return self.get_table(name)
