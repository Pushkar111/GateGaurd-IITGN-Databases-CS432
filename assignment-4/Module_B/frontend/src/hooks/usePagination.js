// src/hooks/usePagination.js
// Manages page + limit state for paginated list pages

import { useState, useCallback } from 'react';

/**
 * @param {number} initialPage  — starting page (default 1)
 * @param {number} initialLimit — page size (default 20)
 */
export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page,  setPage]  = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  // when limit changes, always reset to page 1
  const changeLimit = useCallback((newLimit) => {
    setLimit(Number(newLimit));
    setPage(1);
  }, []);

  return {
    page,
    limit,
    setPage,
    setLimit: changeLimit,
    reset,
    // convenience: the query params object to pass to API calls
    queryParams: { page, limit },
  };
}

export default usePagination;
