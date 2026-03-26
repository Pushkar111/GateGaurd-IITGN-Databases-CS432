"""
BruteForceDB — Baseline comparison database for Module A benchmarking.

Uses a simple Python list for O(n) linear operations.
This class is provided in the assignment spec (Appendix B) with minor enhancements.
"""


class BruteForceDB:
    """
    Baseline database using a simple list.
    All operations are O(n) — used to compare against B+ Tree performance.
    """

    def __init__(self):
        self.data = []  # List of (key, value) tuples

    def insert(self, key, value=None):
        """Insert a key-value pair. Overwrites existing key."""
        for i, (k, v) in enumerate(self.data):
            if k == key:
                self.data[i] = (key, value)
                return
        self.data.append((key, value))

    def search(self, key):
        """Search for a key. Returns value if found, else None. O(n)."""
        for k, v in self.data:
            if k == key:
                return v
        return None

    def delete(self, key):
        """Delete a key. Returns True if deleted, False if not found."""
        original_len = len(self.data)
        self.data = [(k, v) for k, v in self.data if k != key]
        return len(self.data) < original_len

    def range_query(self, start, end):
        """Return all (key, value) pairs where start <= key <= end. O(n)."""
        return [(k, v) for k, v in self.data if start <= k <= end]

    def update(self, key, new_value):
        """Update value for an existing key. Returns True if found."""
        for i, (k, v) in enumerate(self.data):
            if k == key:
                self.data[i] = (key, new_value)
                return True
        return False

    def get_all(self):
        """Return all (key, value) pairs sorted by key."""
        return sorted(self.data, key=lambda x: x[0])

    def count(self):
        """Return number of records."""
        return len(self.data)

    def clear(self):
        """Remove all records."""
        self.data = []
