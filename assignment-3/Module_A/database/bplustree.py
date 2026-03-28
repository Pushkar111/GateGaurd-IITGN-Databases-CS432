"""
B+ Tree Implementation — GateGuard Assignment-2 Module A

A complete B+ Tree from scratch supporting:
  - Insertion with automatic node splitting
  - Deletion with merging and redistribution
  - Exact search
  - Range queries (via leaf linked list)
  - Value storage (key → record)
  - Update existing key's value
  - Get all records in sorted order
  - Graphviz visualization

Author: GateGuard Team — IIT Gandhinagar CS432
"""

import math

try:
    import graphviz
    GRAPHVIZ_AVAILABLE = True
except ImportError:
    GRAPHVIZ_AVAILABLE = False


# ---------------------------------------------------------------------------
# BPlusTreeNode
# ---------------------------------------------------------------------------

class BPlusTreeNode:
    """
    A single node in the B+ Tree.

    Attributes:
        is_leaf  (bool): True for leaf nodes, False for internal nodes.
        keys     (list): Sorted list of keys.
        values   (list): Leaf only — values[i] corresponds to keys[i].
        children (list): Internal only — len(children) == len(keys) + 1.
        next     (BPlusTreeNode|None): Leaf only — pointer to next leaf.
    """

    def __init__(self, is_leaf=False):
        self.is_leaf = is_leaf
        self.keys: list = []
        self.values: list = []       # used only in leaf nodes
        self.children: list = []     # used only in internal nodes
        self.next: 'BPlusTreeNode | None' = None

    def __repr__(self):
        kind = "Leaf" if self.is_leaf else "Internal"
        return f"BPlusTreeNode({kind}, keys={self.keys})"


# ---------------------------------------------------------------------------
# BPlusTree
# ---------------------------------------------------------------------------

class BPlusTree:
    """
    B+ Tree of order `order`.

    Properties:
        - Max keys per node : order - 1
        - Min keys per node : ceil(order / 2) - 1   (root may have fewer)
        - All data (values) stored ONLY in leaf nodes
        - Leaf nodes form a singly-linked list via `.next`
        - Internal nodes hold only routing keys (copies of leaf keys)
    """

    def __init__(self, order: int = 4):
        if order < 3:
            raise ValueError("B+ Tree order must be at least 3")
        self.order = order
        self.max_keys = order - 1                          # max keys per node
        self.min_keys = math.ceil(order / 2) - 1          # min keys (non-root)
        self.root = BPlusTreeNode(is_leaf=True)
        self._size = 0                                     # number of unique keys

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    def search(self, key):
        """
        Search for a key in the B+ Tree.
        Returns the associated value if found, else None.
        Traverses from root to the appropriate leaf node. O(log n).
        """
        leaf = self._find_leaf(key)
        for i, k in enumerate(leaf.keys):
            if k == key:
                return leaf.values[i]
        return None

    def insert(self, key, value):
        """
        Insert key-value pair into the B+ Tree.
        - Handles root splitting if necessary.
        - Maintains sorted order and balance properties.
        - If key already exists, updates the value (upsert).
        """
        # Upsert: if key exists, update value
        if self.update(key, value):
            return

        # Root is full → split root first
        if len(self.root.keys) == self.max_keys:
            old_root = self.root
            new_root = BPlusTreeNode(is_leaf=False)
            new_root.children.append(old_root)
            self._split_child(new_root, 0)
            self.root = new_root

        self._insert_non_full(self.root, key, value)
        self._size += 1

    def delete(self, key):
        """
        Delete key from the B+ Tree.
        - Handles underflow by borrowing from siblings or merging nodes.
        - Updates the root if it becomes empty.
        - Returns True if deletion succeeded, False if key not found.
        """
        if not self._delete(self.root, key):
            return False

        # If root has no keys and is not a leaf, shrink tree
        if not self.root.is_leaf and len(self.root.keys) == 0:
            self.root = self.root.children[0]

        self._size -= 1
        return True

    def update(self, key, new_value):
        """
        Update value associated with an existing key.
        Returns True if key found and updated, False otherwise.
        """
        leaf = self._find_leaf(key)
        for i, k in enumerate(leaf.keys):
            if k == key:
                leaf.values[i] = new_value
                return True
        return False

    def range_query(self, start_key, end_key):
        """
        Return all (key, value) pairs where start_key <= key <= end_key.
        Traverses leaf nodes using .next pointers for efficient range scans.
        O(log n + k) where k is the number of results.
        """
        if start_key > end_key:
            return []

        result = []
        # Descend to the leaf containing start_key
        leaf = self._find_leaf(start_key)

        # Walk the linked list
        current = leaf
        while current is not None:
            for i, k in enumerate(current.keys):
                if k > end_key:
                    return result
                if k >= start_key:
                    result.append((k, current.values[i]))
            current = current.next

        return result

    def get_all(self):
        """
        Return all (key, value) pairs in sorted order.
        Uses the leaf linked list — O(n).
        """
        result = []
        # Find leftmost leaf
        current = self.root
        while not current.is_leaf:
            current = current.children[0]

        # Walk the linked list
        while current is not None:
            for i in range(len(current.keys)):
                result.append((current.keys[i], current.values[i]))
            current = current.next

        return result

    def count(self):
        """Return the number of key-value pairs stored."""
        return self._size

    # -----------------------------------------------------------------------
    # Visualization
    # -----------------------------------------------------------------------

    def visualize_tree(self, title: str = "B+ Tree"):
        """
        Generate a Graphviz representation of the B+ Tree structure.
        Returns a graphviz.Digraph object (call .render() or .view() to display).
        Raises RuntimeError if graphviz package is not installed.
        """
        if not GRAPHVIZ_AVAILABLE:
            raise RuntimeError(
                "graphviz package not installed. Run: pip install graphviz"
            )

        dot = graphviz.Digraph(
            name=title,
            graph_attr={
                'rankdir'  : 'TB',
                'bgcolor'  : '#0d0d1a',
                'fontname' : 'Courier Bold',
                'splines'  : 'polyline',
                'nodesep'  : '0.9',
                'ranksep'  : '1.1',
                'pad'      : '0.5',
                'label'    : title,
                'labelloc' : 't',
                'fontsize' : '18',
                'fontcolor': '#a78bfa',
            },
            node_attr={
                'fontname': 'Courier Bold',
                'fontsize': '13',
                'margin'  : '0.22,0.14',
            },
            edge_attr={
                'fontname': 'Courier',
                'fontsize': '10',
            }
        )

        # Use a shared node-id memo so edges always target the exact nodes
        # created in _add_nodes. Separate memos can miswire edges.
        memo = {}
        self._add_nodes(dot, self.root, node_id=0, is_root=True, memo=memo)
        self._add_edges(dot, self.root, node_id=0, memo=memo)
        return dot

    # -----------------------------------------------------------------------
    # Internal helpers — search
    # -----------------------------------------------------------------------

    def _find_leaf(self, key) -> BPlusTreeNode:
        """Navigate from root to the leaf node where `key` belongs."""
        node = self.root
        while not node.is_leaf:
            i = 0
            while i < len(node.keys) and key >= node.keys[i]:
                i += 1
            node = node.children[i]
        return node

    # -----------------------------------------------------------------------
    # Internal helpers — insert
    # -----------------------------------------------------------------------

    def _insert_non_full(self, node: BPlusTreeNode, key, value):
        """
        Recursive helper to insert into a non-full node.
        Splits child nodes if they become full during insertion.
        """
        if node.is_leaf:
            # Find insertion position (keep keys sorted)
            i = 0
            while i < len(node.keys) and key > node.keys[i]:
                i += 1
            node.keys.insert(i, key)
            node.values.insert(i, value)
        else:
            # Find correct child index
            i = 0
            while i < len(node.keys) and key >= node.keys[i]:
                i += 1
            # If child is full, split it first
            if len(node.children[i].keys) == self.max_keys:
                self._split_child(node, i)
                # After split, decide which of the two children to go into
                if key >= node.keys[i]:
                    i += 1
            self._insert_non_full(node.children[i], key, value)

    def _split_child(self, parent: BPlusTreeNode, index: int):
        """
        Split parent.children[index] which is full (has max_keys keys).

        LEAF split  → COPY middle key up to parent (key stays in leaf too).
        INTERNAL split → PROMOTE middle key up (key removed from child).

        Updates the leaf linked list on leaf splits.
        """
        child = parent.children[index]
        mid = len(child.keys) // 2

        if child.is_leaf:
            # ---------------------------------------------------------------
            # LEAF SPLIT — copy-up
            # ---------------------------------------------------------------
            new_node = BPlusTreeNode(is_leaf=True)
            new_node.keys = child.keys[mid:]
            new_node.values = child.values[mid:]
            child.keys = child.keys[:mid]
            child.values = child.values[:mid]

            # Maintain linked list: child → new_node → child.old_next
            new_node.next = child.next
            child.next = new_node

            # Copy-up: push new_node.keys[0] (the first key of right half) to parent
            parent.keys.insert(index, new_node.keys[0])
            parent.children.insert(index + 1, new_node)

        else:
            # ---------------------------------------------------------------
            # INTERNAL SPLIT — promote-up
            # ---------------------------------------------------------------
            new_node = BPlusTreeNode(is_leaf=False)
            mid_key = child.keys[mid]                    # Key to promote

            new_node.keys = child.keys[mid + 1:]         # Keys AFTER middle
            new_node.children = child.children[mid + 1:] # Children AFTER middle
            child.keys = child.keys[:mid]                # Keys BEFORE middle
            child.children = child.children[:mid + 1]   # Children up to & incl. mid

            # Promote middle key up to parent
            parent.keys.insert(index, mid_key)
            parent.children.insert(index + 1, new_node)

    # -----------------------------------------------------------------------
    # Internal helpers — delete
    # -----------------------------------------------------------------------

    def _delete(self, node: BPlusTreeNode, key) -> bool:
        """
        Recursive helper for deletion.
        Returns True if key was found and deleted, False otherwise.
        """
        if node.is_leaf:
            # Base case: find and remove key from leaf
            if key in node.keys:
                idx = node.keys.index(key)
                node.keys.pop(idx)
                node.values.pop(idx)
                return True
            return False

        # Internal node: find which child to descend into
        i = 0
        while i < len(node.keys) and key >= node.keys[i]:
            i += 1

        # Ensure the child we are about to descend into has > min_keys
        if len(node.children[i].keys) <= self.min_keys:
            self._fill_child(node, i)
            # After fill, the tree structure may have changed (merge shifts indices)
            # Recalculate position
            i = 0
            while i < len(node.keys) and key >= node.keys[i]:
                i += 1

        result = self._delete(node.children[i], key)

        # After deletion, if an internal node's separator key was deleted
        # from a leaf, we may need to update the separator in this node.
        # The separator in an internal node is just a routing guide; as long
        # as the tree invariant holds (left subtree keys < separator), we
        # only need to update if the deleted key was a separator and no copy remains.
        # For correctness we leave separators as-is; they still route correctly
        # because we treat separators as >= boundaries.

        return result

    def _fill_child(self, node: BPlusTreeNode, index: int):
        """
        Ensure child at `index` has more than min_keys keys before descending.
        Try borrowing from left sibling, then right sibling, then merge.
        """
        # If there is only one child, there is nothing to borrow/merge at this level.
        # This can happen temporarily at the root during delete cascades.
        if len(node.children) <= 1:
            return

        # Clamp index defensively so sibling checks don't go out of bounds.
        if index < 0:
            index = 0
        if index >= len(node.children):
            index = len(node.children) - 1

        left_exists = index > 0
        right_exists = index < len(node.children) - 1

        left_has_extra = left_exists and len(node.children[index - 1].keys) > self.min_keys
        right_has_extra = right_exists and len(node.children[index + 1].keys) > self.min_keys

        if left_has_extra:
            self._borrow_from_prev(node, index)
        elif right_has_extra:
            self._borrow_from_next(node, index)
        elif right_exists:
            # Merge with right sibling since it exists
            self._merge(node, index)
        else:
            # Left sibling exists, merge with it
            self._merge(node, index - 1)

    def _borrow_from_prev(self, node: BPlusTreeNode, index: int):
        """
        Borrow a key from the LEFT sibling (children[index - 1])
        to prevent underflow in children[index].
        """
        child = node.children[index]
        left = node.children[index - 1]

        if child.is_leaf:
            # Move last key/value from left to front of child
            child.keys.insert(0, left.keys.pop())
            child.values.insert(0, left.values.pop())
            # Update parent separator: separator is now the first key of this child
            node.keys[index - 1] = child.keys[0]
        else:
            # Bring separator key from parent down to front of child
            child.keys.insert(0, node.keys[index - 1])
            # Move last key from left up to parent separator position
            node.keys[index - 1] = left.keys.pop()
            # Move last child pointer of left to front of child
            if left.children:
                child.children.insert(0, left.children.pop())

    def _borrow_from_next(self, node: BPlusTreeNode, index: int):
        """
        Borrow a key from the RIGHT sibling (children[index + 1])
        to prevent underflow in children[index].
        """
        child = node.children[index]
        right = node.children[index + 1]

        if child.is_leaf:
            # Move first key/value from right to end of child
            child.keys.append(right.keys.pop(0))
            child.values.append(right.values.pop(0))
            # Update parent separator: separator is now first key of right sibling
            node.keys[index] = right.keys[0]
        else:
            # Bring separator key from parent down to end of child
            child.keys.append(node.keys[index])
            # Move first key from right up to parent separator
            node.keys[index] = right.keys.pop(0)
            # Move first child of right to end of child
            if right.children:
                child.children.append(right.children.pop(0))

    def _merge(self, node: BPlusTreeNode, index: int):
        """
        Merge children[index] (left) and children[index + 1] (right) into one.
        The separator key at node.keys[index] is pulled down for internal merges.
        """
        # Defensive bounds checks for transient states during recursive deletes.
        if len(node.children) < 2:
            return
        if index < 0:
            index = 0
        if index >= len(node.children) - 1:
            index = len(node.children) - 2

        left = node.children[index]
        right = node.children[index + 1]

        if left.is_leaf:
            # Merge leaf: append right's keys/values to left, maintain linked list
            left.keys.extend(right.keys)
            left.values.extend(right.values)
            left.next = right.next  # skip over right in linked list
        else:
            # Merge internal: bring separator down, then append right's keys/children
            if index >= len(node.keys):
                return
            left.keys.append(node.keys[index])
            left.keys.extend(right.keys)
            left.children.extend(right.children)

        # Remove separator and right child from parent
        node.keys.pop(index)
        node.children.pop(index + 1)

    # -----------------------------------------------------------------------
    # Internal helpers — visualization
    # -----------------------------------------------------------------------

    def _node_id(self, node: BPlusTreeNode, memo: dict) -> int:
        """Return a stable integer ID for a node (for Graphviz)."""
        nid = id(node)
        if nid not in memo:
            memo[nid] = len(memo)
        return memo[nid]

    # -----------------------------------------------------------------------
    # HTML label helpers
    # -----------------------------------------------------------------------

    @staticmethod
    def _html_escape(val) -> str:
        """Escape a value for safe use inside an HTML-like Graphviz label."""
        if val is None:
            return "None"
        return (str(val)
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;'))

    def _make_html_label(self, node: BPlusTreeNode, is_root: bool) -> str:
        """
        Build an HTML-like label for a node.

        HTML-like labels are used instead of record shapes because Graphviz
        raises 'flat edge between adjacent nodes with record shape' when
        constraint=false edges connect record-shape nodes — a known Windows bug.

        Layout:
          ┌---------------------------------┐
          │  ROOT  (only if root)           │  ← header row (purple/blue/green)
          ├--------┬--------┬---------------┤
          │  key1  │  key2  │  ...          │  ← keys row
          └--------┴--------┴---------------┘
          For leaves each cell shows  key : value
        """
        e = self._html_escape

        if node.is_leaf:
            # -- colours -----------------------------------------------------
            hdr_bg   = "#1a4d36" if not is_root else "#0f3326"
            hdr_fg   = "#4ade80"
            cell_bg  = "#163326"
            cell_fg  = "#86efac"
            border   = "#22c55e"
            hdr_text = "ROOT (leaf)" if is_root else "LEAF"

            # header
            html = (
                f'<<TABLE BORDER="2" CELLBORDER="1" CELLSPACING="0" '
                f'CELLPADDING="6" BGCOLOR="{cell_bg}" COLOR="{border}">'
                f'<TR><TD COLSPAN="{max(1,len(node.keys))}" '
                f'BGCOLOR="{hdr_bg}" '
                f'><FONT COLOR="{hdr_fg}" FACE="Courier Bold" POINT-SIZE="11">'
                f'{hdr_text}</FONT></TD></TR><TR>'
            )
            if node.keys:
                for k, v in zip(node.keys, node.values):
                    cell = f"{e(k)} : {e(v)}"
                    html += (
                        f'<TD BGCOLOR="{cell_bg}">'
                        f'<FONT COLOR="{cell_fg}" FACE="Courier Bold" POINT-SIZE="12">'
                        f'{cell}</FONT></TD>'
                    )
            else:
                html += f'<TD><FONT COLOR="{cell_fg}">∅</FONT></TD>'
            html += '</TR></TABLE>>'

        elif is_root:
            # -- colours -----------------------------------------------------
            hdr_bg   = "#3b1f6e"
            hdr_fg   = "#e9d5ff"
            cell_bg  = "#2d1b4e"
            cell_fg  = "#c4b5fd"
            border   = "#a78bfa"

            html = (
                f'<<TABLE BORDER="2" CELLBORDER="1" CELLSPACING="0" '
                f'CELLPADDING="6" BGCOLOR="{cell_bg}" COLOR="{border}">'
                f'<TR><TD COLSPAN="{max(1,len(node.keys))}" '
                f'BGCOLOR="{hdr_bg}">'
                f'<FONT COLOR="{hdr_fg}" FACE="Courier Bold" POINT-SIZE="11">'
                f'ROOT</FONT></TD></TR><TR>'
            )
            if node.keys:
                for k in node.keys:
                    html += (
                        f'<TD BGCOLOR="{cell_bg}">'
                        f'<FONT COLOR="{cell_fg}" FACE="Courier Bold" POINT-SIZE="13">'
                        f'{e(k)}</FONT></TD>'
                    )
            else:
                html += f'<TD><FONT COLOR="{cell_fg}">∅</FONT></TD>'
            html += '</TR></TABLE>>'

        else:
            # -- ordinary internal node ---------------------------------------
            hdr_bg   = "#252960"
            hdr_fg   = "#c7d2fe"
            cell_bg  = "#17193a"
            cell_fg  = "#a5b4fc"
            border   = "#6366f1"

            html = (
                f'<<TABLE BORDER="2" CELLBORDER="1" CELLSPACING="0" '
                f'CELLPADDING="6" BGCOLOR="{cell_bg}" COLOR="{border}">'
                f'<TR><TD COLSPAN="{max(1,len(node.keys))}" '
                f'BGCOLOR="{hdr_bg}">'
                f'<FONT COLOR="{hdr_fg}" FACE="Courier Bold" POINT-SIZE="11">'
                f'internal</FONT></TD></TR><TR>'
            )
            if node.keys:
                for k in node.keys:
                    html += (
                        f'<TD BGCOLOR="{cell_bg}">'
                        f'<FONT COLOR="{cell_fg}" FACE="Courier Bold" POINT-SIZE="13">'
                        f'{e(k)}</FONT></TD>'
                    )
            else:
                html += f'<TD><FONT COLOR="{cell_fg}">∅</FONT></TD>'
            html += '</TR></TABLE>>'

        return html

    def _add_nodes(self, dot, node: BPlusTreeNode, node_id: int,
                   is_root: bool = False, memo: dict = None):
        """Recursively register every node with an HTML-like label."""
        if memo is None:
            memo = {}

        nid = self._node_id(node, memo)
        label = self._make_html_label(node, is_root)

        dot.node(
            str(nid),
            label=label,
            shape="none",      # HTML labels must use shape="none"
            margin="0",
        )

        if not node.is_leaf:
            for child in node.children:
                child_nid = self._node_id(child, memo)
                self._add_nodes(dot, child, child_nid, is_root=False, memo=memo)

    def _add_edges(self, dot, node: BPlusTreeNode, node_id: int,
                   memo: dict = None):
        """
        Add parent→child edges (solid indigo) and leaf→leaf next-pointer
        edges (dashed green).

        IMPORTANT: do NOT use constraint="false" with record shapes —
        that triggers the Graphviz 'flat edge' crash on Windows.
        We now use shape="none" (HTML labels) so constraint="false" is safe.
        """
        nid = self._node_id(node, memo)

        if not node.is_leaf:
            for child in node.children:
                child_nid = self._node_id(child, memo)
                dot.edge(
                    str(nid), str(child_nid),
                    color="#818cf8",
                    arrowhead="vee",
                    arrowsize="0.9",
                    penwidth="2.0",
                )
                self._add_edges(dot, child, child_nid, memo=memo)
        else:
            if node.next is not None:
                next_nid = self._node_id(node.next, memo)
                dot.edge(
                    str(nid), str(next_nid),
                    style="dashed",
                    color="#4ade80",
                    arrowhead="vee",
                    arrowsize="0.8",
                    constraint="false",   # safe with shape="none"
                    penwidth="1.6",
                    label="  next  ",
                    fontcolor="#4ade80",
                    fontname="Courier",
                    fontsize="10",
                )

    # -----------------------------------------------------------------------
    # Dunder helpers
    # -----------------------------------------------------------------------

    def __len__(self):
        return self._size

    def __contains__(self, key):
        leaf = self._find_leaf(key)
        return key in leaf.keys

    def __repr__(self):
        return f"BPlusTree(order={self.order}, size={self._size})"