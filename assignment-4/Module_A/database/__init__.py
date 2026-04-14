"""
GateGuard Assignment-2 Module A
B+ Tree Package
"""

from .bplustree import BPlusTree, BPlusTreeNode
from .bruteforce import BruteForceDB
from .table import Table
from .db_manager import DatabaseManager

__all__ = ['BPlusTree', 'BPlusTreeNode', 'BruteForceDB', 'Table', 'DatabaseManager']

# assignment-4 sharding exports
from .shard_router import (
    get_shard_id,
    member_table,
    visit_table,
    all_member_tables,
    all_visit_tables,
    lookup_member,
    insert_visit,
    scatter_gather_visits,
    count_active_visits,
    lookup_member_by_email_scatter,
)
from .connection import (
    get_shard_connection,
    get_shard_cursor,
    get_local_connection,
    get_local_cursor,
    close_all_connections,
)

__all__ += [
    'get_shard_id', 'member_table', 'visit_table',
    'all_member_tables', 'all_visit_tables',
    'lookup_member', 'insert_visit',
    'scatter_gather_visits', 'count_active_visits',
    'lookup_member_by_email_scatter',
    'get_shard_connection', 'get_shard_cursor',
    'get_local_connection', 'get_local_cursor',
    'close_all_connections',
]
