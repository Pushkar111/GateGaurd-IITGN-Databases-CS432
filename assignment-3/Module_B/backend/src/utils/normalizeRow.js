// backend/src/utils/normalizeRow.js
// Converts PostgreSQL result row keys to camelCase.
// Handles snake_case (member_id), lowercase (memberid), and PascalCase (MemberID).

'use strict';

/**
 * Convert a single key to camelCase.
 * Works for: snake_case, PascalCase, and all-lowercase (treated as single word).
 */
function toCamelCase(key) {
  // If key contains underscores → split on them
  if (key.includes('_')) {
    return key
      .split('_')
      .map((part, i) => (i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
      .join('');
  }
  // PascalCase → camelCase (lower-first)
  return key.charAt(0).toLowerCase() + key.slice(1);
}

/**
 * Normalize a single result row — all keys converted to camelCase.
 * @param {object} row
 * @returns {object}
 */
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [key, val] of Object.entries(row)) {
    out[toCamelCase(key)] = val;
  }
  return out;
}

/**
 * Normalize an array of result rows.
 * @param {object[]} rows
 * @returns {object[]}
 */
function normalizeRows(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map(normalizeRow);
}

module.exports = { normalizeRow, normalizeRows, toCamelCase };
