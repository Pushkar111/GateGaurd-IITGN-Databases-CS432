import { useMemo, useState } from 'react';

function readViews(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeViews(storageKey, views) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(views));
  } catch {
    // ignore storage write failures
  }
}

export function useSavedViews(storageKey) {
  const [views, setViews] = useState(() => readViews(storageKey));

  const saveView = (name, payload) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;

    const next = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed,
        payload,
        createdAt: new Date().toISOString(),
      },
      ...views,
    ].slice(0, 10);

    setViews(next);
    writeViews(storageKey, next);
    return next[0];
  };

  const deleteView = (id) => {
    const next = views.filter((v) => v.id !== id);
    setViews(next);
    writeViews(storageKey, next);
  };

  const updateView = (id, payload) => {
    const next = views.map((v) => (v.id === id ? { ...v, payload } : v));
    setViews(next);
    writeViews(storageKey, next);
  };

  const byId = useMemo(() => {
    const map = new Map();
    for (const view of views) map.set(view.id, view);
    return map;
  }, [views]);

  return {
    views,
    byId,
    saveView,
    deleteView,
    updateView,
  };
}

export default useSavedViews;
