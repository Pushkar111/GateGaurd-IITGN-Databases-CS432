import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EntityCombobox({
  value,
  label,
  onChange,
  options,
  loading,
  search,
  setSearch,
  placeholder = 'Select item...',
  emptyText = 'No records found',
  getId,
  getPrimaryText,
  getSecondaryText,
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="input-field flex items-center justify-between text-left">
          <span className={label ? 'text-white/90' : 'text-white/30'}>{label || placeholder}</span>
          <ChevronDown size={14} className="text-white/30" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[250] w-[320px] rounded-xl border border-white/10 bg-[hsl(228_40%_8%)] shadow-2xl overflow-hidden"
        >
          <div className="p-2 border-b border-white/[0.06]">
            <input
              className="input-field text-sm"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-white/40 text-sm">
                <Loader2 size={14} className="animate-spin" /> Loading...
              </div>
            ) : options.length === 0 ? (
              <p className="text-center text-white/30 text-xs py-6">{emptyText}</p>
            ) : (
              options.map((item) => {
                const id = getId(item);
                const primary = getPrimaryText(item);
                const secondary = getSecondaryText ? getSecondaryText(item) : '';
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChange(id, primary)}
                    className={cn(
                      'w-full px-3 py-2.5 text-left hover:bg-indigo-500/10 transition-colors',
                      String(value) === String(id) ? 'text-indigo-300' : 'text-white/75'
                    )}
                  >
                    <p className="text-sm font-medium truncate">{primary}</p>
                    {secondary ? <p className="text-[10px] text-white/30 truncate">{secondary}</p> : null}
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
