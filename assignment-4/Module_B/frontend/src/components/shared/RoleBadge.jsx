// src/components/shared/RoleBadge.jsx
// Pill badge that styles itself based on user role
// Props: role ('Guard' | 'Admin' | 'SuperAdmin')

import { Shield, UserCheck, User } from 'lucide-react';
import { getRoleColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

const roleIcons = {
  SuperAdmin: Shield,
  Admin:      UserCheck,
  Guard:      User,
};

export default function RoleBadge({ role }) {
  const colors = getRoleColor(role);
  const Icon   = roleIcons[role] || User;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full',
        'text-xs font-semibold border',
        colors.bg,
        colors.text,
        colors.border
      )}
    >
      <Icon size={11} strokeWidth={2.5} />
      {role || 'Unknown'}
    </span>
  );
}
