// backend/scripts/run-explain.js
// Run with: node scripts/run-explain.js  (from backend directory)
// Benchmarks 8 key queries: before indexes and after indexes.
// Saves results to sql/explain_results.json and prints a summary table.

'use strict';
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'gateguard',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// ── 8 benchmark queries ───────────────────────────────────────────────
const BENCHMARKS = [
  {
    name: 'memberSearch',
    label: 'Member search by name ILIKE',
    sql:  `SELECT m.memberid AS "MemberID", m.name AS "Name", m.email AS "Email", mt.typename AS "TypeName"
           FROM member m
           JOIN membertype mt ON mt.typeid = m.typeid
           WHERE m.name ILIKE $1
           ORDER BY m.name
           LIMIT 20`,
    params: ['%Member_1%'],
  },
  {
    name: 'activePersonVisits',
    label: 'Active person visits (ExitTime IS NULL)',
    sql:  `SELECT pv.visitid AS "VisitID", m.name AS "Name", eg.name AS "EntryGate", pv.entrytime AS "EntryTime"
           FROM personvisit pv
           JOIN member m ON m.memberid = pv.personid
           JOIN gate eg ON eg.gateid = pv.entrygateid
           WHERE pv.exittime IS NULL
           ORDER BY pv.entrytime DESC`,
    params: [],
  },
  {
    name: 'personVisitsByTime',
    label: 'Person visits sorted by EntryTime DESC',
    sql:  `SELECT pv.visitid AS "VisitID", m.name AS "Name", pv.entrytime AS "EntryTime", pv.exittime AS "ExitTime"
           FROM personvisit pv
           JOIN member m ON m.memberid = pv.personid
           ORDER BY pv.entrytime DESC
           LIMIT 50`,
    params: [],
  },
  {
    name: 'dashboardOccupancy',
    label: 'Dashboard gate occupancy JOIN',
    sql:  `SELECT g.gateid AS "GateID", g.name AS "Name", go.occupancycount AS "OccupancyCount"
           FROM gate g
           JOIN gateoccupancy go ON go.gateid = g.gateid`,
    params: [],
  },
  {
    name: 'loginByUsername',
    label: 'Login by username exact match',
    sql:  `SELECT u.userid AS "UserID", u.username AS "Username", u.passwordhash AS "PasswordHash", r.rolename AS "RoleName"
           FROM "User" u
           JOIN role r ON r.roleid = u.roleid
           WHERE u.username = $1`,
    params: ['superadmin'],
  },
  {
    name: 'auditLogFilter',
    label: 'Audit logs filtered by userId + action',
    sql:  `SELECT * FROM auditlog
           WHERE userid = $1 AND action = $2
           ORDER BY createdat DESC
           LIMIT 30`,
    params: [1, 'UPDATE'],
  },
  {
    name: 'activeVehicleVisits',
    label: 'Active vehicle visits (ExitTime IS NULL)',
    sql:  `SELECT vv.visitid AS "VisitID", v.licenseplate AS "RegistrationNumber", eg.name AS "EntryGate", vv.entrytime AS "EntryTime"
           FROM vehiclevisit vv
           JOIN vehicle v ON v.vehicleid = vv.vehicleid
           JOIN gate eg ON eg.gateid = vv.entrygateid
           WHERE vv.exittime IS NULL
           ORDER BY vv.entrytime DESC`,
    params: [],
  },
  {
    name: 'vehicleByPlate',
    label: 'Vehicle by registration number ILIKE',
    sql:  `SELECT v.vehicleid AS "VehicleID", v.licenseplate AS "RegistrationNumber", vt.typename AS "TypeName"
           FROM vehicle v
           JOIN vehicletype vt ON vt.typeid = v.typeid
           WHERE v.licenseplate ILIKE $1
           LIMIT 20`,
    params: ['%GJ05%'],
  },
];

// ── Parse EXPLAIN ANALYZE output ──────────────────────────────────────
function parseExplain(rows) {
  const lines = rows.map((r) => r['QUERY PLAN'] || r[Object.keys(r)[0]]);
  const planText = lines.join('\n');
  const planningMatch  = planText.match(/Planning Time:\s+([\d.]+)\s+ms/);
  const executionMatch = planText.match(/Execution Time:\s+([\d.]+)\s+ms/);
  // Get the first scan type seen
  const scanMatch = planText.match(/(Seq Scan|Index Scan|Index Only Scan|Bitmap Heap Scan|Bitmap Index Scan)/);
  return {
    planningTime:  planningMatch  ? parseFloat(planningMatch[1])  : null,
    executionTime: executionMatch ? parseFloat(executionMatch[1]) : null,
    scanType:      scanMatch      ? scanMatch[1] : 'Unknown',
    fullPlan:      planText,
  };
}

async function runExplain(sql, params) {
  const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`;
  const { rows } = await pool.query(explainSql, params);
  return parseExplain(rows);
}

// ── Drop all non-PK indexes (benchmark without indexes) ───────────────
async function dropCustomIndexes() {
  const { rows } = await pool.query(
    `SELECT indexname, tablename
     FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname NOT LIKE '%_pkey'
       AND indexname NOT LIKE 'pg_%'`
  );
  const dropped = [];
  for (const r of rows) {
    try {
      await pool.query(`DROP INDEX IF EXISTS "${r.indexname}"`);
      dropped.push(r.indexname);
    } catch (e) { /* skip system indexes */ }
  }
  return dropped;
}

// ── Re-create indexes from indexes.sql ────────────────────────────────
async function recreateIndexes() {
  const indexSqlPath = path.join(__dirname, '..', 'sql', 'indexes.sql');
  if (!fs.existsSync(indexSqlPath)) {
    console.warn('  WARN  sql/indexes.sql not found — skipping index recreation');
    return;
  }
  const sql = fs.readFileSync(indexSqlPath, 'utf8');
  await pool.query(sql);
}

// ── Print aligned table ───────────────────────────────────────────────
function printTable(results) {
  const COL = [38, 14, 14, 18, 18];
  const header = ['Query', 'Before (ms)', 'After (ms)', 'Before scan', 'After scan'];
  const sep = COL.map((w) => '─'.repeat(w)).join('─┬─');
  const row = (cells) => cells.map((c, i) => String(c).padEnd(COL[i])).join(' │ ');

  console.log('\n' + sep);
  console.log(row(header));
  console.log(sep);
  for (const [name, r] of Object.entries(results)) {
    console.log(row([
      name,
      r.before.executionTime !== null ? r.before.executionTime.toFixed(3) : 'n/a',
      r.after.executionTime  !== null ? r.after.executionTime.toFixed(3)  : 'n/a',
      r.before.scanType,
      r.after.scanType,
    ]));
  }
  console.log(sep + '\n');
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('\nGateGuard EXPLAIN ANALYZE Benchmark');
  console.log('────────────────────────────────────────\n');

  const results = {};

  // Round 1 — Drop indexes, run queries
  console.log('Phase 1: Dropping custom indexes…');
  const dropped = await dropCustomIndexes();
  console.log(`  Dropped ${dropped.length} index(es): ${dropped.join(', ') || 'none'}\n`);

  console.log('Phase 1: Running queries WITHOUT indexes…');
  for (const b of BENCHMARKS) {
    process.stdout.write(`  → ${b.label}… `);
    try {
      const res = await runExplain(b.sql, b.params);
      results[b.name] = { label: b.label, before: res };
      console.log(`${res.executionTime !== null ? res.executionTime.toFixed(3) + ' ms' : 'n/a'}  [${res.scanType}]`);
    } catch (err) {
      results[b.name] = { label: b.label, before: { executionTime: null, scanType: 'ERROR: ' + err.message } };
      console.log(`ERROR: ${err.message}`);
    }
  }

  // Round 2 — Re-create indexes, run queries again
  console.log('\nPhase 2: Re-creating indexes…');
  await recreateIndexes();
  console.log('  OK Indexes restored\n');

  console.log('Phase 2: Running queries WITH indexes…');
  for (const b of BENCHMARKS) {
    process.stdout.write(`  → ${b.label}… `);
    try {
      const res = await runExplain(b.sql, b.params);
      results[b.name].after = res;
      console.log(`${res.executionTime !== null ? res.executionTime.toFixed(3) + ' ms' : 'n/a'}  [${res.scanType}]`);
    } catch (err) {
      results[b.name].after = { executionTime: null, scanType: 'ERROR: ' + err.message };
      console.log(`ERROR: ${err.message}`);
    }
  }

  // Print summary table
  printTable(results);

  // Save JSON
  const outPath = path.join(__dirname, '..', 'sql', 'explain_results.json');
  const out = {};
  for (const [name, r] of Object.entries(results)) {
    out[name] = {
      label:  r.label,
      before: { planningTime: r.before.planningTime, executionTime: r.before.executionTime, scanType: r.before.scanType },
      after:  { planningTime: r.after?.planningTime, executionTime: r.after?.executionTime, scanType: r.after?.scanType },
    };
  }
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`OK  Results saved to sql/explain_results.json\n`);
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('\nFAIL  run-explain failed:', err.message);
    pool.end();
    process.exit(1);
  });
