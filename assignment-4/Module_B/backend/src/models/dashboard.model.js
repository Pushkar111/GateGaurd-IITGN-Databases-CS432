// src/models/dashboard.model.js
const { query } = require('../config/db');

/**
 * Core stats — run all 4 counts in parallel for speed.
 */
async function getStats() {
  const [members, activePersonVisits, activeVehicleVisits, gateOccupancy] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM Member', []),
    query('SELECT COUNT(*)::int AS total FROM PersonVisit WHERE ExitTime IS NULL', []),
    query('SELECT COUNT(*)::int AS total FROM VehicleVisit WHERE ExitTime IS NULL', []),
    query(
      `SELECT g.GateID, g.Name, COALESCE(go.OccupancyCount, 0) AS OccupancyCount
         FROM Gate g
         LEFT JOIN GateOccupancy go ON go.GateID = g.GateID
         ORDER BY g.GateID`,
      []
    ),
  ]);

  return {
    totalMembers:        members.rows[0].total,
    activePersonVisits:  activePersonVisits.rows[0].total,
    activeVehicleVisits: activeVehicleVisits.rows[0].total,
    gateOccupancy:       gateOccupancy.rows,
  };
}

/**
 * Visit trend — last 15 days, grouped by date.
 */
async function getVisitTrend() {
  const [personTrend, vehicleTrend] = await Promise.all([
    query(
      `SELECT DATE(EntryTime)::text AS date, COUNT(*)::int AS personVisits
         FROM PersonVisit
        WHERE EntryTime >= NOW() - INTERVAL '15 days'
        GROUP BY DATE(EntryTime)
        ORDER BY date`,
      []
    ),
    query(
      `SELECT DATE(EntryTime)::text AS date, COUNT(*)::int AS vehicleVisits
         FROM VehicleVisit
        WHERE EntryTime >= NOW() - INTERVAL '15 days'
        GROUP BY DATE(EntryTime)
        ORDER BY date`,
      []
    ),
  ]);

  // merge by date (collect all dates from both)
  const dateMap = {};
  for (const r of personTrend.rows)  {
    dateMap[r.date] = { date: r.date, personVisits: r.personvisits, vehicleVisits: 0 };
  }
  for (const r of vehicleTrend.rows) {
    if (dateMap[r.date]) {
      dateMap[r.date].vehicleVisits = r.vehiclevisits;
    } else {
      dateMap[r.date] = { date: r.date, personVisits: 0, vehicleVisits: r.vehiclevisits };
    }
  }

  return Object.values(dateMap).sort((a, b) => (a.date > b.date ? 1 : -1));
}

/**
 * Recent activity — last 10 combined person + vehicle visits.
 */
async function getRecentActivity() {
  const { rows } = await query(
    `SELECT 'person' AS type, pv.visitid AS "VisitID", m.name AS subject,
            eg.name AS gate, pv.entrytime AS time,
            CASE WHEN pv.exittime IS NULL THEN 'active' ELSE 'completed' END AS status
       FROM personvisit pv
       JOIN member m ON m.memberid = pv.personid
       JOIN gate eg ON eg.gateid = pv.entrygateid
     UNION ALL
     SELECT 'vehicle' AS type, vv.visitid AS "VisitID", v.licenseplate AS subject,
            eg.name AS gate, vv.entrytime AS time,
            CASE WHEN vv.exittime IS NULL THEN 'active' ELSE 'completed' END AS status
       FROM vehiclevisit vv
       JOIN vehicle v ON v.vehicleid = vv.vehicleid
       JOIN gate eg ON eg.gateid = vv.entrygateid
     ORDER BY time DESC
     LIMIT 15`,
    []
  );
  return rows;
}

module.exports = { getStats, getVisitTrend, getRecentActivity };
