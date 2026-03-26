import { useEffect, useState } from 'react';
import { Car, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import * as vehiclesApi from '@/api/vehicles.api';
import * as gatesApi from '@/api/gates.api';
import * as visitsApi from '@/api/visits.api';
import EntityCombobox from '@/components/action-center/shared/EntityCombobox';
import GateSelectField from '@/components/action-center/shared/GateSelectField';

export default function VehicleEntryTab({ onSubmitted }) {
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [gateId, setGateId] = useState('');
  const [gates, setGates] = useState([]);
  const [loadingGates, setLoadingGates] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const debouncedVehicleSearch = useDebounce(vehicleSearch, 250);

  useEffect(() => {
    let mounted = true;
    setLoadingGates(true);
    gatesApi
      .getAll()
      .then((res) => {
        if (!mounted) return;
        const rows = res?.data?.data || res?.data?.gates || res?.data || [];
        setGates(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!mounted) return;
        setGates([]);
      })
      .finally(() => {
        if (mounted) setLoadingGates(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoadingVehicles(true);
    vehiclesApi
      .getAll({ search: debouncedVehicleSearch || undefined, limit: 12 })
      .then((res) => {
        if (!mounted) return;
        const rows = res?.data?.vehicles ?? res?.data ?? [];
        setVehicles(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!mounted) return;
        setVehicles([]);
      })
      .finally(() => {
        if (mounted) setLoadingVehicles(false);
      });

    return () => {
      mounted = false;
    };
  }, [debouncedVehicleSearch]);

  const canSubmit = !!vehicleId && !!gateId && !submitting;

  const handleSubmit = async () => {
    if (!vehicleId || !gateId) {
      toast.error('Select vehicle and gate');
      return;
    }

    setSubmitting(true);
    try {
      await visitsApi.recordVehicleEntry({
        vehicleId: Number(vehicleId),
        entryGateId: Number(gateId),
      });
      toast.success('Vehicle entry recorded');
      setVehicleId('');
      setVehicleLabel('');
      setVehicleSearch('');
      if (onSubmitted) onSubmitted();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to record entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Vehicle</p>
        <EntityCombobox
          value={vehicleId}
          label={vehicleLabel}
          onChange={(id, label) => {
            setVehicleId(id);
            setVehicleLabel(label);
          }}
          options={vehicles}
          loading={loadingVehicles}
          search={vehicleSearch}
          setSearch={setVehicleSearch}
          placeholder="Search vehicle..."
          emptyText="No vehicles found"
          getId={(v) => v.VehicleID || v.vehicleid}
          getPrimaryText={(v) => v.RegistrationNumber || v.registrationnumber || 'Unknown'}
          getSecondaryText={(v) => v.Model || v.model || ''}
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Entry Gate</p>
        {loadingGates ? (
          <div className="input-field flex items-center gap-2 text-white/40 text-sm">
            <Loader2 size={14} className="animate-spin" /> Loading gates...
          </div>
        ) : (
          <GateSelectField gates={gates} value={gateId} onChange={setGateId} />
        )}
      </div>

      <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary w-full disabled:opacity-50">
        {submitting ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <LogIn size={15} /> <Car size={15} /> Record Vehicle Entry
          </>
        )}
      </button>
    </div>
  );
}
