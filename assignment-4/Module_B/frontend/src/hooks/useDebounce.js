// src/hooks/useDebounce.js
// Debounce a rapidly-changing value — good for search inputs
// Returns the debounced value after `delay` ms of silence

import { useState, useEffect } from 'react';

/**
 * @param {*}      value — the value to debounce
 * @param {number} delay — delay in ms (default 300)
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
