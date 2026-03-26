// src/components/shared/DataTable.jsx
// Full-featured table wrapper using @tanstack/react-table
// Props: data, columns, loading, pagination, onPageChange, onSearch,
//        searchPlaceholder, emptyMessage, onRowClick

import { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

// ── Skeleton rows ──────────────────────────────────────────────────────
function SkeletonRows({ colCount = 4, rowCount = 5 }) {
  return Array.from({ length: rowCount }).map((_, ri) => (
    <tr key={ri} className="border-b border-white/[0.04]">
      {Array.from({ length: colCount }).map((_, ci) => (
        <td key={ci} className="px-4 py-3">
          <div className={cn('skeleton h-4 rounded', ci === 0 ? 'w-8' : 'w-full max-w-[180px]')} />
        </td>
      ))}
    </tr>
  ));
}

// ── Sort icon ─────────────────────────────────────────────────────────
function SortIcon({ sorted }) {
  if (sorted === 'asc')  return <ChevronUp size={13} className="text-indigo-400" />;
  if (sorted === 'desc') return <ChevronDown size={13} className="text-indigo-400" />;
  return <ChevronsUpDown size={13} className="text-white/20" />;
}

export default function DataTable({
  data             = [],
  columns          = [],
  loading          = false,
  pagination       = null,
  onPageChange,
  onSearch,
  searchValue: controlledSearchValue,
  onSearchValueChange,
  sorting: controlledSorting,
  onSortingChange,
  searchPlaceholder = 'Search...',
  emptyMessage       = 'No records found.',
  onRowClick,
}) {
  const [searchValue, setSearchValue] = useState('');
  const [sorting,     setSorting]     = useState([]);

  const effectiveSearchValue = controlledSearchValue !== undefined ? controlledSearchValue : searchValue;
  const effectiveSorting = controlledSorting !== undefined ? controlledSorting : sorting;

  const updateSearchValue = (value) => {
    if (onSearchValueChange) onSearchValueChange(value);
    if (controlledSearchValue === undefined) setSearchValue(value);
  };

  const updateSorting = (valueOrUpdater) => {
    const next = typeof valueOrUpdater === 'function'
      ? valueOrUpdater(effectiveSorting)
      : valueOrUpdater;

    if (onSortingChange) onSortingChange(next);
    if (controlledSorting === undefined) setSorting(next);
  };

  const debounced = useDebounce(effectiveSearchValue, 300);

  // propagate debounced search up
  useEffect(() => {
    if (onSearch) onSearch(debounced);
  }, [debounced, onSearch]);

  const table = useReactTable({
    data,
    columns,
    state:              { sorting: effectiveSorting },
    onSortingChange:    updateSorting,
    getCoreRowModel:    getCoreRowModel(),
    getSortedRowModel:  getSortedRowModel(),
    manualPagination:   !!pagination,
    manualSorting:      false,
  });

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 1;

  return (
    <div className="glass-card overflow-hidden">
      {/* Search bar */}
      {onSearch !== undefined && (
        <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
          <Search size={14} className="text-white/30 flex-shrink-0" />
          <input
            className="input-field !bg-transparent !border-none !p-0 !shadow-none text-sm"
            placeholder={searchPlaceholder}
            value={effectiveSearchValue}
            onChange={(e) => updateSearchValue(e.target.value)}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-white/[0.06]">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      'px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-white/40',
                      header.column.getCanSort() && 'cursor-pointer hover:text-white/70 select-none'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon sorted={header.column.getIsSorted()} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {loading ? (
              <SkeletonRows colCount={columns.length || 4} />
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-white/30">
                    <Inbox size={36} strokeWidth={1.2} />
                    <span className="text-sm">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'border-b border-white/[0.04] transition-colors duration-100',
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]',
                    onRowClick && 'cursor-pointer hover:bg-indigo-500/[0.06]'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-white/75">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3
                        border-t border-white/[0.06] text-xs text-white/40">
          <span>
            {pagination.total} record{pagination.total !== 1 ? 's' : ''}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 text-white/60 font-medium">
              {pagination.page} / {totalPages || 1}
            </span>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasNextPage && pagination.page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
