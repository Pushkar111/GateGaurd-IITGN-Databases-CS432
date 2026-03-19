import { useEffect, useMemo, useState } from 'react';
import { Car, Loader2, RefreshCw, User } from 'lucide-react';
import * as visitsApi from '@/api/visits.api';
import { cn, formatRelativeTime, getInitials } from '@/lib/utils';

const OVERSTAY_MS = 8 * 60 * 60 * 1000;

function getEntryTime(visit) {
  return visit?.EntryTime || visit?.entrytime;
}

export default function LiveQueueTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const fetchQueue = ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    Promise.all([
      visitsApi.getPersonVisits({ active: true, limit: 100 }),
      visitsApi.getVehicleVisits({ active: true, limit: 100 }),
    ])
      .then(([pRes, vRes]) => {
        const personsRaw = pRes?.data?.data || pRes?.data?.visits || pRes?.data || [];
        const vehiclesRaw = vRes?.data?.data || vRes?.data?.visits || vRes?.data || [];
        const persons = (Array.isArray(personsRaw) ? personsRaw : []).map((row) => ({ ...row, _kind: 'person' }));
        const vehicles = (Array.isArray(vehiclesRaw) ? vehiclesRaw : []).map((row) => ({ ...row, _kind: 'vehicle' }));
        const merged = [...persons, ...vehicles].sort((a, b) => {
          const ta = new Date(getEntryTime(a) || 0).getTime();
          const tb = new Date(getEntryTime(b) || 0).getTime();
          return ta - tb;
        });
        setItems(merged);
        setLastSyncAt(new Date());
      })
      .catch(() => setItems([]))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    fetchQueue();

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchQueue({ silent: true });
      }
    }, 10000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchQueue({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const summary = useMemo(() => {
    let people = 0;
    let vehicles = 0;
    let overstay = 0;
    const now = Date.now();

    for (const item of items) {
      if (item._kind === 'person') people += 1;
      if (item._kind === 'vehicle') vehicles += 1;
      const entryMs = new Date(getEntryTime(item) || 0).getTime();
      if (entryMs && now - entryMs > OVERSTAY_MS) overstay += 1;
    }

    return { people, vehicles, overstay };
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="badge badge-primary text-[10px]">People: {summary.people}</span>
        <span className="badge text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/25">Vehicles: {summary.vehicles}</span>
        {summary.overstay > 0 ? (
          <span className="badge badge-warning text-[10px]">Overstay: {summary.overstay}</span>
        ) : null}
        <span className="text-[10px] text-white/40 ml-1 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live refresh every 10s
          {lastSyncAt ? ` • synced ${formatRelativeTime(lastSyncAt)}` : ''}
        </span>

        <button onClick={fetchQueue} className="ml-auto btn-ghost text-xs px-2.5 py-1.5">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-sm">
            <Loader2 size={14} className="animate-spin" /> Loading queue...
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-white/35 text-xs py-8">No active visits in queue</p>
        ) : (
          <div className="p-2 space-y-2">
            {items.map((item, idx) => {
              const isPerson = item._kind === 'person';
              const name = isPerson
                ? (item?.MemberName || item?.membername || 'Unknown Member')
                : (item?.RegistrationNumber || item?.registrationnumber || 'UNKNOWN');
              const gate = item?.EntryGateName || item?.entrygatename || 'Unknown gate';
              const entryTime = getEntryTime(item);
              const isOverstay = Date.now() - new Date(entryTime || 0).getTime() > OVERSTAY_MS;

              return (
                <div
                  key={`${item._kind}-${idx}`}
                  className={cn(
                    'rounded-lg border px-3 py-2.5',
                    isOverstay ? 'border-amber-500/35 bg-amber-500/10' : 'border-white/[0.08] bg-white/[0.02]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center',
                      isPerson ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                    )}>
                      {isPerson ? <User size={13} /> : <Car size={13} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm truncate', isPerson ? 'font-medium text-white/85' : 'font-mono font-semibold text-white/85')}>
                        {isPerson ? name : `${name}`}
                      </p>
                      <p className="text-[10px] text-white/35 truncate">
                        Entered {formatRelativeTime(entryTime)} via {gate}
                      </p>
                    </div>
                    {isOverstay ? <span className="badge badge-warning text-[9px]">Overstay</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
