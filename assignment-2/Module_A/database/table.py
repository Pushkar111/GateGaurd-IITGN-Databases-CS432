"""
Table — GateGuard Assignment-2 Module A

A database table abstraction that uses B+ Tree as its primary index.
Keys are the primary key column; values are entire row records (dicts).
"""

from .bplustree import BPlusTree


class Table:
    """
    Represents a single database table backed by a B+ Tree index.

    Attributes:
        name        (str) : Table name.
        columns     (list): Column names.
        primary_key (str) : Column used as the B+ Tree key.
        index    (BPlusTree): The underlying index structure.
    """

    def __init__(self, name: str, columns: list, primary_key: str, order: int = 4):
        if primary_key not in columns:
            raise ValueError(f"primary_key '{primary_key}' must be in columns {columns}")
        self.name = name
        self.columns = columns
        self.primary_key = primary_key
        self.index = BPlusTree(order=order)

    # -----------------------------------------------------------------------
    # CRUD
    # -----------------------------------------------------------------------

    def insert(self, record: dict):
        """
        Insert a record (dict) into the table.
        The primary key value is used as the B+ Tree key.
        Raises KeyError if primary_key column is missing from record.
        """
        if self.primary_key not in record:
            raise KeyError(f"Record must contain primary key column '{self.primary_key}'")
        key = record[self.primary_key]
        self.index.insert(key, record)

    def select(self, key):
        """
        Select a record by its primary key value.
        Returns the record dict or None if not found.
        """
        return self.index.search(key)

    def select_range(self, start_key, end_key):
        """
        Select all records where primary_key is in [start_key, end_key].
        Returns a list of record dicts.
        """
        pairs = self.index.range_query(start_key, end_key)
        return [v for _, v in pairs]

    def select_all(self):
        """
        Return all records sorted by primary key.
        Returns a list of record dicts.
        """
        pairs = self.index.get_all()
        return [v for _, v in pairs]

    def update(self, key, updated_fields: dict):
        """
        Update a record by primary key.
        Merges updated_fields into the existing record.
        Returns True if record was found and updated, False otherwise.
        """
        existing = self.index.search(key)
        if existing is None:
            return False
        merged = {**existing, **updated_fields}
        return self.index.update(key, merged)

    def delete(self, key):
        """
        Delete a record by primary key.
        Returns True if deleted, False if not found.
        """
        return self.index.delete(key)

    # -----------------------------------------------------------------------
    # Aggregations
    # -----------------------------------------------------------------------

    def count(self):
        """Return the number of records in the table."""
        return self.index.count()

    def filter(self, predicate):
        """
        Return all records that satisfy predicate(record) -> bool.
        Linear scan — O(n). Use select_range for key-based queries.
        """
        return [rec for rec in self.select_all() if predicate(rec)]

    # -----------------------------------------------------------------------
    # Visualization
    # -----------------------------------------------------------------------

    def visualize(self, filename: str = None, fmt: str = "png"):
        """
        Render the B+ Tree index as a Graphviz image.
        If filename is provided, saves to disk. Otherwise returns the Digraph.
        """
        dot = self.index.visualize_tree(title=f"Table: {self.name}")
        if filename:
            dot.render(filename, format=fmt, cleanup=True)
            print(f"Tree visualization saved to {filename}.{fmt}")
        return dot

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    def __len__(self):
        return self.count()

    def __repr__(self):
        return (
            f"Table(name='{self.name}', "
            f"primary_key='{self.primary_key}', "
            f"records={self.count()})"
        )

    def describe(self):
        """Print a summary of the table...."""
        print(f"\n{'='*50}")
        print(f"  Table : {self.name}")
        print(f"  Columns: {', '.join(self.columns)}")
        print(f"  Primary Key: {self.primary_key}")
        print(f"  Records: {self.count()}")
        print(f"  B+ Tree Order: {self.index.order}")
        print(f"{'='*50}\n")
