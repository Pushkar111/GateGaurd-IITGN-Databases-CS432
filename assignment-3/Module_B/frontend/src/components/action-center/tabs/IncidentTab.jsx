import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import * as gatesApi from '@/api/gates.api';
import GateSelectField from '@/components/action-center/shared/GateSelectField';

const DEFAULT_CAPACITY = 20;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function IncidentTab({ onSubmitted }) {
  const [gates, setGates] = useState([]);
  const [occupancyRows, setOccupancyRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [gateId, setGateId] = useState('');
  const [occupancyCount, setOccupancyCount] = useState('');
  const [capacityLimit, setCapacityLimit] = useState('');
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [incidentNote, setIncidentNote] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchContext = () => {
    setLoading(true);
    Promise.all([gatesApi.getAll(), gatesApi.getAllOccupancy()])
      .then(([gRes, oRes]) => {
        const gateList = gRes?.data?.data || gRes?.data?.gates || gRes?.data || [];
        const occList = oRes?.data?.data || oRes?.data?.occupancy || oRes?.data || [];
        setGates(Array.isArray(gateList) ? gateList : []);
        setOccupancyRows(Array.isArray(occList) ? occList : []);
      })
      .catch(() => {
        setGates([]);
        setOccupancyRows([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContext();
  }, []);

  const selectedGateContext = useMemo(() => {
    if (!gateId) return null;
    const gate = gates.find((g) => String(g.GateID || g.gateid) === String(gateId));
    const occ = occupancyRows.find((o) => String(o.GateID || o.gateid) === String(gateId));
    const currentOccupancy = toNumber(occ?.OccupancyCount ?? occ?.occupancycount ?? gate?.OccupancyCount ?? gate?.occupancycount, 0);
    const currentCapacity = toNumber(occ?.CapacityLimit ?? occ?.capacitylimit ?? gate?.CapacityLimit ?? gate?.capacitylimit, DEFAULT_CAPACITY);
    return {
      name: gate?.Name || gate?.name || `Gate ${gateId}`,
      currentOccupancy,
      currentCapacity,
    };
  }, [gateId, gates, occupancyRows]);

  useEffect(() => {
    if (!selectedGateContext) return;
    setOccupancyCount(String(selectedGateContext.currentOccupancy));
    setCapacityLimit(String(selectedGateContext.currentCapacity));
    setEmergencyOverride(false);
    setIncidentNote('');
  }, [selectedGateContext?.name]);

  const occupancyNumeric = toNumber(occupancyCount, 0);
  const capacityNumeric = toNumber(capacityLimit, DEFAULT_CAPACITY);
  const exceedsSafeLimit = occupancyNumeric > capacityNumeric;

  const isValidCapacity = Number.isInteger(capacityNumeric) && capacityNumeric >= 1 && capacityNumeric <= 500;
  const isValidOccupancy = Number.isInteger(occupancyNumeric) && occupancyNumeric >= 0;

  const requiresOverride = exceedsSafeLimit;
  const hasValidIncidentNote = incidentNote.trim().length >= 8;

  const canSubmit =
    !!gateId &&
    isValidOccupancy &&
    isValidCapacity &&
    !submitting &&
    (!requiresOverride || (emergencyOverride && hasValidIncidentNote));

  const handleSubmit = async () => {
    if (!gateId) {
      toast.error('Select a gate');
      return;
    }
    if (!isValidOccupancy) {
      toast.error('Occupancy must be a non-negative integer');
      return;
    }
    if (!isValidCapacity) {
      toast.error('Capacity limit must be between 1 and 500');
      return;
    }
    if (requiresOverride && !emergencyOverride) {
      toast.error('Enable emergency override for over-capacity updates');
      return;
    }
    if (requiresOverride && !hasValidIncidentNote) {
      toast.error('Incident note must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      await gatesApi.updateOccupancy(gateId, {
        occupancyCount: occupancyNumeric,
        capacityLimit: capacityNumeric,
        emergencyOverride,
        incidentNote: incidentNote.trim(),
      });
      toast.success('Incident update submitted');
      fetchContext();
      if (onSubmitted) onSubmitted();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to submit incident update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
        <p className="text-xs font-semibold text-amber-300 uppercase tracking-widest mb-1">Incident Override Mode</p>
        <p className="text-xs text-white/65">
          Use this tab for occupancy corrections and emergency over-capacity handling. Over-capacity updates require override and an incident note.
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Gate</p>
        {loading ? (
          <div className="input-field flex items-center gap-2 text-white/40 text-sm">
            <Loader2 size={14} className="animate-spin" /> Loading gate context...
          </div>
        ) : (
          <GateSelectField gates={gates} value={gateId} onChange={setGateId} />
        )}
      </div>

      {selectedGateContext ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs text-white/65 space-y-1">
          <p>
            Gate: <span className="text-white/85 font-medium">{selectedGateContext.name}</span>
          </p>
          <p>
            Current Occupancy: <span className="text-white/85">{selectedGateContext.currentOccupancy}</span>
          </p>
          <p>
            Current Safe Capacity: <span className="text-white/85">{selectedGateContext.currentCapacity}</span>
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">New Occupancy</p>
          <input
            type="number"
            min="0"
            className="input-field"
            value={occupancyCount}
            onChange={(e) => setOccupancyCount(e.target.value)}
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Safe Capacity</p>
          <input
            type="number"
            min="1"
            max="500"
            className="input-field"
            value={capacityLimit}
            onChange={(e) => setCapacityLimit(e.target.value)}
          />
        </div>
      </div>

      {requiresOverride ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 space-y-3">
          <div className="flex items-center gap-2 text-red-300 text-xs font-semibold">
            <AlertTriangle size={14} />
            Over-capacity update detected ({occupancyNumeric} &gt; {capacityNumeric})
          </div>

          <label className="flex items-center gap-2 text-xs text-white/75">
            <input
              type="checkbox"
              checked={emergencyOverride}
              onChange={(e) => setEmergencyOverride(e.target.checked)}
            />
            Confirm emergency override
          </label>

          <textarea
            className="input-field min-h-[80px]"
            placeholder="Incident note is required for over-capacity updates"
            value={incidentNote}
            onChange={(e) => setIncidentNote(e.target.value)}
            disabled={!emergencyOverride}
          />
          <p className="text-[10px] text-white/40">Minimum 8 characters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          Update is within safe capacity. Override and incident note are optional.
        </div>
      )}

      <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary w-full disabled:opacity-50">
        {submitting ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <ShieldAlert size={15} /> Submit Incident Update
          </>
        )}
      </button>
    </div>
  );
}
