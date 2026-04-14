import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, RefreshCw, User, Car, LogOut, ListChecks, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import PersonEntryTab from '@/components/action-center/tabs/PersonEntryTab';
import PersonExitTab from '@/components/action-center/tabs/PersonExitTab';
import VehicleEntryTab from '@/components/action-center/tabs/VehicleEntryTab';
import VehicleExitTab from '@/components/action-center/tabs/VehicleExitTab';
import LiveQueueTab from '@/components/action-center/tabs/LiveQueueTab';
import IncidentTab from '@/components/action-center/tabs/IncidentTab';
import { formatDate } from '@/lib/utils';

export default function ActionCenter({ open, onOpenChange, onActionCompleted }) {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('person-entry');
  const [lastSyncAt, setLastSyncAt] = useState(new Date());

  const canUseIncidentTab = hasRole('Admin', 'SuperAdmin');

  const tabItems = [
    { value: 'person-entry', label: 'Person Entry', icon: User },
    { value: 'person-exit', label: 'Person Exit', icon: LogOut },
    { value: 'vehicle-entry', label: 'Vehicle Entry', icon: Car },
    { value: 'vehicle-exit', label: 'Vehicle Exit', icon: LogOut },
    { value: 'live-queue', label: 'Live Queue', icon: ListChecks },
    ...(canUseIncidentTab ? [{ value: 'incident', label: 'Incident', icon: ShieldAlert }] : []),
  ];

  const refreshNow = () => {
    setLastSyncAt(new Date());
    if (onActionCompleted) onActionCompleted();
  };

  const subtitle = useMemo(() => formatDate(lastSyncAt, 'dd MMM yyyy, HH:mm:ss'), [lastSyncAt]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[160] bg-black/55 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <div className="fixed inset-0 z-[170] flex items-end md:items-stretch md:justify-end pointer-events-none">
                <motion.div
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 40, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="pointer-events-auto w-full md:max-w-[520px] h-[88vh] md:h-full rounded-t-2xl md:rounded-none
                             bg-[hsl(228_40%_7%)] border-t md:border-t-0 md:border-l border-white/[0.08]
                             shadow-2xl flex flex-col"
                >
                  <div className="p-4 border-b border-white/[0.08] flex items-center gap-2">
                    <div>
                      <Dialog.Title className="text-base font-bold text-white">Action Center</Dialog.Title>
                      <p className="text-[11px] text-white/35">Last sync: {subtitle}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <button onClick={refreshNow} className="icon-rail-btn" title="Refresh">
                        <RefreshCw size={16} />
                      </button>
                      <Dialog.Close className="icon-rail-btn" title="Close">
                        <X size={17} />
                      </Dialog.Close>
                    </div>
                  </div>

                  <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <Tabs.List className="p-2 border-b border-white/[0.08] flex gap-1 overflow-x-auto no-scrollbar">
                      {tabItems.map((tab) => {
                        const Icon = tab.icon;
                        const active = tab.value === activeTab;
                        return (
                          <Tabs.Trigger
                            key={tab.value}
                            value={tab.value}
                            className={
                              `relative whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ` +
                              (active ? 'text-white bg-indigo-500/20 border border-indigo-500/30' : 'text-white/45 hover:text-white/75 hover:bg-white/[0.06]')
                            }
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Icon size={13} /> {tab.label}
                            </span>
                          </Tabs.Trigger>
                        );
                      })}
                    </Tabs.List>

                    <div className="flex-1 overflow-y-auto p-4">
                      <Tabs.Content value="person-entry" className="focus:outline-none">
                        <PersonEntryTab
                          onSubmitted={() => {
                            setLastSyncAt(new Date());
                            if (onActionCompleted) onActionCompleted();
                          }}
                        />
                      </Tabs.Content>

                      <Tabs.Content value="person-exit" className="focus:outline-none">
                        <PersonExitTab
                          onSubmitted={() => {
                            setLastSyncAt(new Date());
                            if (onActionCompleted) onActionCompleted();
                          }}
                        />
                      </Tabs.Content>
                      <Tabs.Content value="vehicle-entry" className="focus:outline-none">
                        <VehicleEntryTab
                          onSubmitted={() => {
                            setLastSyncAt(new Date());
                            if (onActionCompleted) onActionCompleted();
                          }}
                        />
                      </Tabs.Content>
                      <Tabs.Content value="vehicle-exit" className="focus:outline-none">
                        <VehicleExitTab
                          onSubmitted={() => {
                            setLastSyncAt(new Date());
                            if (onActionCompleted) onActionCompleted();
                          }}
                        />
                      </Tabs.Content>
                      <Tabs.Content value="live-queue" className="focus:outline-none">
                        <LiveQueueTab />
                      </Tabs.Content>

                      {canUseIncidentTab ? (
                        <Tabs.Content value="incident" className="focus:outline-none">
                          <IncidentTab
                            onSubmitted={() => {
                              setLastSyncAt(new Date());
                              if (onActionCompleted) onActionCompleted();
                            }}
                          />
                        </Tabs.Content>
                      ) : null}
                    </div>
                  </Tabs.Root>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
