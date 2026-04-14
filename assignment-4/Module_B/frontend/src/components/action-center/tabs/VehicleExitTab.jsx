import { useEffect, useMemo, useState } from 'react';
import { Car, CheckCircle2, Loader2, LogOut, Search } from 'lucide-react';
import { toast } from 'sonner';
import * as visitsApi from '@/api/visits.api';
import * as gatesApi from '@/api/gates.api';
import { cn, formatRelativeTime } from '@/lib/utils';
import GateSelectField from '@/components/action-center/shared/GateSelectField';

function getVisitId(visit) {
  return String(visit?.VehicleVisitID || visit?.vehiclevisitid || visit?.VisitID || visit?.visitid || '');
}

function getEntryTime(visit) {
  return visit?.EntryTime || visit?.entrytime;
}

function getPlate(visit) {
  return visit?.RegistrationNumber || visit?.registrationnumber || 'UNKNOWN';
}

export default function VehicleExitTab({ onSubmitted }) {
  const [activeVisits, setActiveVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [visitSearch, setVisitSearch] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState('');

  const [gates, setGates] = useState([]);
  const [loadingGates, setLoadingGates] = useState(false);
  const [exitGateId, setExitGateId] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchGates = () => {
    setLoadingGates(true);
    gatesApi
      .getAll()
      .then((res) => {
        const rows = res?.data?.data || res?.data?.gates || res?.data || [];
        setGates(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setGates([]))
      .finally(() => setLoadingGates(false));
  };

  const fetchActiveVisits = () => {
    setLoadingVisits(true);
    visitsApi
      .getVehicleVisits({ active: true, limit: 100 })
      .then((res) => {
        const rows = res?.data?.data || res?.data?.visits || res?.data || [];
        const list = Array.isArray(rows) ? rows : [];

        const dedup = [];
        const seen = new Set();
        for (const row of list) {
          const id = getVisitId(row);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          dedup.push(row);
        }

        setActiveVisits(dedup);
      })
      .catch(() => setActiveVisits([]))
      .finally(() => setLoadingVisits(false));
  };

  useEffect(() => {
    fetchGates();
    fetchActiveVisits();
  }, []);

  const filteredVisits = useMemo(() => {
    const query = visitSearch.trim().toLowerCase();
    if (!query) return activeVisits;
    return activeVisits.filter((v) => {
      const plate = getPlate(v).toLowerCase();
      const id = getVisitId(v).toLowerCase();
      const gate = String(v?.EntryGateName || v?.entrygatename || '').toLowerCase();
      return plate.includes(query) || id.includes(query) || gate.includes(query);
    });
  }, [activeVisits, visitSearch]);

  const canSubmit = !!selectedVisitId && !!exitGateId && !submitting;

  const handleSubmit = async () => {
    if (!selectedVisitId || !exitGateId) {
      toast.error('Select active visit and exit gate');
      return;
    }

    setSubmitting(true);
    try {
      await visitsApi.recordVehicleExit(Number(selectedVisitId), { exitGateId: Number(exitGateId) });
      toast.success('Vehicle exit recorded');
      setSelectedVisitId('');
      fetchActiveVisits();
      if (onSubmitted) onSubmitted();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to record exit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Active Visit</p>
        <div className="input-field flex items-center gap-2 text-sm mb-2">
          <Search size={14} className="text-white/35" />
          <input
            className="w-full bg-transparent outline-none text-white/80 placeholder:text-white/30"
            value={visitSearch}
            onChange={(e) => setVisitSearch(e.target.value)}
            placeholder="Search by plate, gate, or visit ID..."
          />
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] max-h-56 overflow-y-auto">
          {loadingVisits ? (
            <div className="flex items-center justify-center gap-2 py-6 text-white/40 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading active visits...
            </div>
          ) : filteredVisits.length === 0 ? (
            <p className="text-center text-white/35 text-xs py-6">No active vehicle visits found</p>
          ) : (
            <div className="p-2 space-y-2">
              {filteredVisits.map((visit) => {
                const id = getVisitId(visit);
                const selected = String(selectedVisitId) === String(id);
                const plate = getPlate(visit);
                const gate = visit?.EntryGateName || visit?.entrygatename || 'Unknown gate';
                const entryTime = getEntryTime(visit);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedVisitId(id)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                      selected
                        ? 'border-indigo-500/40 bg-indigo-500/10'
                        : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center">
                        <Car size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono font-semibold text-white/85 truncate">{plate}</p>
                        <p className="text-[10px] text-white/35 truncate">
                          Entered {formatRelativeTime(entryTime)} via {gate}
                        </p>
                      </div>
                      {selected ? <CheckCircle2 size={15} className="text-indigo-400 flex-shrink-0" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Exit Gate</p>
        {loadingGates ? (
          <div className="input-field flex items-center gap-2 text-white/40 text-sm">
            <Loader2 size={14} className="animate-spin" /> Loading gates...
          </div>
        ) : (
          <GateSelectField gates={gates} value={exitGateId} onChange={setExitGateId} />
        )}
      </div>

      <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary w-full disabled:opacity-50">
        {submitting ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <LogOut size={15} /> Record Vehicle Exit
          </>
        )}
      </button>
    </div>
  );
}
