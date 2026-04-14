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
  application_name: 'GateGuardExplain',
});

// -- 8 benchmark queries -----------------------------------------------
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
    params: ['member_%'],
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
    params: ['gj%'],
  },
];

const RUNS_PER_QUERY = 5;

// -- Parse EXPLAIN ANALYZE output --------------------------------------
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

function averageMs(values) {
  const valid = values.filter((v) => typeof v === 'number');
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function dominantScan(scans) {
  if (!scans.length) return 'Unknown';
  const counts = scans.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

async function runExplainStable(sql, params, runs = RUNS_PER_QUERY) {
  const results = [];

  // warm-up run (discarded from averages)
  await runExplain(sql, params);

  for (let i = 0; i < runs; i++) {
    results.push(await runExplain(sql, params));
  }

  return {
    planningTime: averageMs(results.map((r) => r.planningTime)),
    executionTime: averageMs(results.map((r) => r.executionTime)),
    scanType: dominantScan(results.map((r) => r.scanType)),
    sampleRuns: results.map((r) => ({ planningTime: r.planningTime, executionTime: r.executionTime, scanType: r.scanType })),
    fullPlan: results[results.length - 1]?.fullPlan || null,
  };
}

async function resolveRepresentativeParams() {
  try {
    const { rows: userRows } = await pool.query(`SELECT username FROM "User" ORDER BY userid ASC LIMIT 1`);
    if (userRows[0]?.username) {
      const q = BENCHMARKS.find((b) => b.name === 'loginByUsername');
      if (q) q.params = [userRows[0].username];
    }

    const { rows: memberRows } = await pool.query(`SELECT name FROM member WHERE name IS NOT NULL ORDER BY memberid ASC LIMIT 1`);
    if (memberRows[0]?.name) {
      const prefix = memberRows[0].name.toLowerCase().slice(0, 6);
      const q = BENCHMARKS.find((b) => b.name === 'memberSearch');
      if (q) q.params = [`${prefix}%`];
    }

    const { rows: vehicleRows } = await pool.query(`SELECT licenseplate FROM vehicle WHERE licenseplate IS NOT NULL ORDER BY vehicleid ASC LIMIT 1`);
    if (vehicleRows[0]?.licenseplate) {
      const prefix = vehicleRows[0].licenseplate.toLowerCase().slice(0, 4);
      const q = BENCHMARKS.find((b) => b.name === 'vehicleByPlate');
      if (q) q.params = [`${prefix}%`];
    }

    const { rows: auditRows } = await pool.query(
      `SELECT userid, action FROM auditlog WHERE userid IS NOT NULL ORDER BY createdat DESC LIMIT 1`
    );
    if (auditRows[0]) {
      const q = BENCHMARKS.find((b) => b.name === 'auditLogFilter');
      if (q) q.params = [auditRows[0].userid, auditRows[0].action];
    }
  } catch (err) {
    console.warn(`  WARN  Could not resolve representative params automatically: ${err.message}`);
  }
}

// -- Drop all non-PK indexes (benchmark without indexes) ---------------
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

// -- Re-create indexes from indexes.sql --------------------------------
async function recreateIndexes() {
  const indexSqlPath = path.join(__dirname, '..', 'sql', 'indexes.sql');
  if (!fs.existsSync(indexSqlPath)) {
    console.warn('  WARN  sql/indexes.sql not found — skipping index recreation');
    return;
  }
  const sql = fs.readFileSync(indexSqlPath, 'utf8');
  await pool.query(sql);
}

// -- Print aligned table -----------------------------------------------
function printTable(results) {
  const COL = [38, 14, 14, 18, 18];
  const header = ['Query', 'Before (ms)', 'After (ms)', 'Before scan', 'After scan'];
  const sep = COL.map((w) => '-'.repeat(w)).join('-┬-');
  const sanitize = (value) => String(value ?? '').replace(/[\r\n\t]+/g, ' ');
  const fit = (value, width) => {
    const s = sanitize(value);
    if (s.length <= width) return s.padEnd(width);
    return `${s.slice(0, Math.max(0, width - 1))}…`;
  };
  const row = (cells) => cells.map((c, i) => fit(c, COL[i])).join(' │ ');

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

// -- Main --------------------------------------------------------------
async function main() {
  console.log('\nGateGuard EXPLAIN ANALYZE Benchmark');
  console.log('----------------------------------------\n');
  console.log(`Using ${RUNS_PER_QUERY} measured runs per query (after warm-up).\n`);

  const results = {};

  await resolveRepresentativeParams();

  // Round 1 — Drop indexes, run queries
  console.log('Phase 1: Dropping custom indexes…');
  const dropped = await dropCustomIndexes();
  console.log(`  Dropped ${dropped.length} index(es): ${dropped.join(', ') || 'none'}\n`);

  console.log('Phase 1: Running queries WITHOUT indexes…');
  for (const b of BENCHMARKS) {
    process.stdout.write(`  → ${b.label}… `);
    try {
      const stable = await runExplainStable(b.sql, b.params);
      results[b.name] = { label: b.label, before: stable };
      console.log(`${stable.executionTime !== null ? stable.executionTime.toFixed(3) + ' ms' : 'n/a'}  [${stable.scanType}]`);
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
      const stable = await runExplainStable(b.sql, b.params);
      results[b.name].after = stable;
      console.log(`${stable.executionTime !== null ? stable.executionTime.toFixed(3) + ' ms' : 'n/a'}  [${stable.scanType}]`);
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
      sampleRuns: {
        before: r.before.sampleRuns || [],
        after: r.after?.sampleRuns || [],
      },
      plans: {
        before: r.before.fullPlan || null,
        after: r.after?.fullPlan || null,
      },
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
