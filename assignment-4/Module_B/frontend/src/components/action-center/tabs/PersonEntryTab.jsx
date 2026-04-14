import { useEffect, useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import * as membersApi from '@/api/members.api';
import * as gatesApi from '@/api/gates.api';
import * as visitsApi from '@/api/visits.api';
import EntityCombobox from '@/components/action-center/shared/EntityCombobox';
import GateSelectField from '@/components/action-center/shared/GateSelectField';

export default function PersonEntryTab({ onSubmitted }) {
  const [memberId, setMemberId] = useState('');
  const [memberLabel, setMemberLabel] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [gateId, setGateId] = useState('');
  const [gates, setGates] = useState([]);
  const [loadingGates, setLoadingGates] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const debouncedMemberSearch = useDebounce(memberSearch, 250);

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
    setLoadingMembers(true);
    membersApi
      .getAll({ search: debouncedMemberSearch || undefined, limit: 12 })
      .then((res) => {
        if (!mounted) return;
        const rows = res?.data?.members ?? res?.data ?? [];
        setMembers(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!mounted) return;
        setMembers([]);
      })
      .finally(() => {
        if (mounted) setLoadingMembers(false);
      });

    return () => {
      mounted = false;
    };
  }, [debouncedMemberSearch]);

  const canSubmit = !!memberId && !!gateId && !submitting;

  const handleSubmit = async () => {
    if (!memberId || !gateId) {
      toast.error('Select member and gate');
      return;
    }

    setSubmitting(true);
    try {
      await visitsApi.recordPersonEntry({
        memberId: Number(memberId),
        entryGateId: Number(gateId),
      });
      toast.success('Person entry recorded');
      setMemberId('');
      setMemberLabel('');
      setMemberSearch('');
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
        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Member</p>
        <EntityCombobox
          value={memberId}
          label={memberLabel}
          onChange={(id, label) => {
            setMemberId(id);
            setMemberLabel(label);
          }}
          options={members}
          loading={loadingMembers}
          search={memberSearch}
          setSearch={setMemberSearch}
          placeholder="Search member..."
          emptyText="No members found"
          getId={(m) => m.MemberID || m.memberid}
          getPrimaryText={(m) => m.Name || m.name || 'Unknown'}
          getSecondaryText={(m) => m.Email || m.email || ''}
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
            <LogIn size={15} /> Record Person Entry
          </>
        )}
      </button>
    </div>
  );
}
