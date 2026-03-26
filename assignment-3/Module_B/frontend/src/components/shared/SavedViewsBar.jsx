import { useState } from 'react';
import { BookmarkPlus, Trash2 } from 'lucide-react';

export default function SavedViewsBar({
  title = 'Saved Views',
  views = [],
  selectedViewId,
  onSelectView,
  onSaveCurrent,
  onDeleteSelected,
}) {
  const [viewName, setViewName] = useState('');

  return (
    <div className="glass-card p-3 flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{title}</span>

      <select
        className="input-field w-auto min-w-[220px] text-xs"
        value={selectedViewId || ''}
        onChange={(e) => onSelectView?.(e.target.value)}
      >
        <option value="">Select saved view...</option>
        {views.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>

      <input
        className="input-field w-auto min-w-[180px] text-xs"
        placeholder="Name current view..."
        value={viewName}
        onChange={(e) => setViewName(e.target.value)}
      />

      <button
        type="button"
        className="btn-ghost text-xs px-2.5 py-1.5"
        onClick={() => {
          const ok = onSaveCurrent?.(viewName);
          if (ok) setViewName('');
        }}
      >
        <BookmarkPlus size={13} /> Save Current
      </button>

      <button
        type="button"
        className="btn-ghost text-xs px-2.5 py-1.5 ml-auto"
        onClick={() => onDeleteSelected?.()}
        disabled={!selectedViewId}
      >
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}
