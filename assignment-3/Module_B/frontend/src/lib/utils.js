// src/lib/utils.js
// Shared utility functions used throughout the frontend

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, differenceInMinutes, differenceInHours } from 'date-fns';

/**
 * Merge Tailwind classes safely — handles conflicts, conditional classes.
 * Usage: cn('text-base', isActive && 'text-primary', className)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string or Date object.
 * @param {string|Date} date
 * @param {string} fmt — date-fns format string (default: 'dd MMM yyyy, HH:mm')
 */
export function formatDate(date, fmt = 'dd MMM yyyy, HH:mm') {
  if (!date) return '--';
  try {
    return format(new Date(date), fmt);
  } catch {
    return '--';
  }
}

/**
 * Human-readable duration between two timestamps.
 * e.g. "2h 15m" or "45m" or "3d 4h"
 */
export function formatDuration(start, end) {
  if (!start) return '--';
  const endDate  = end ? new Date(end) : new Date();
  const startDate = new Date(start);
  const totalMins = differenceInMinutes(endDate, startDate);

  if (totalMins < 1) return '< 1m';
  if (totalMins < 60) return `${totalMins}m`;

  const hours = Math.floor(totalMins / 60);
  const mins  = totalMins % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/**
 * Relative time like "2 minutes ago", "3 hours ago".
 */
export function formatRelativeTime(date) {
  if (!date) return '--';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '--';
  }
}

/**
 * Format bytes into readable size.
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Get initials from a full name.
 * "Rajesh Kumar" → "RK", "Alice" → "A"
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * Returns Tailwind color classes for a given role string.
 */
export function getRoleColor(role) {
  const map = {
    Guard:      { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30' },
    Admin:      { bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30' },
    SuperAdmin: { bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30' },
  };
  return map[role] || { bg: 'bg-white/10', text: 'text-white/70', border: 'border-white/20' };
}

/**
 * Returns a color class based on active status.
 */
export function getStatusColor(isActive) {
  return isActive
    ? { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/15' }
    : { dot: 'bg-white/30',    text: 'text-white/50',    bg: 'bg-white/5' };
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str, length = 40) {
  if (!str) return '';
  return str.length > length ? `${str.slice(0, length)}...` : str;
}
