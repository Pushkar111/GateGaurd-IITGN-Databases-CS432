'use strict';
require('dotenv').config();
const { Client } = require('pg');

function dbConfig(applicationName) {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'gateguard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    application_name: applicationName,
  };
}

function parseId(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const requestedMemberId = parseId(process.argv[2]);
  const attackerAppName = process.argv[3] || 'ManualSqlClient';

  const actor = new Client(dbConfig(attackerAppName));

  try {
    await actor.connect();

    const memberQuery = requestedMemberId
      ? 'SELECT memberid FROM member WHERE memberid = $1 LIMIT 1'
      : 'SELECT memberid FROM member ORDER BY memberid ASC LIMIT 1';
    const memberParams = requestedMemberId ? [requestedMemberId] : [];

    const memberRes = await actor.query(memberQuery, memberParams);
    if (!memberRes.rows[0]) {
      throw new Error('No member row found to run guard test. Seed data first.');
    }

    const targetMemberId = memberRes.rows[0].memberid;

    // Harmless write: touches updatedat with same value while still firing UPDATE trigger.
    await actor.query(
      'UPDATE member SET updatedat = updatedat WHERE memberid = $1',
      [targetMemberId]
    );

    const alertRes = await actor.query(
      `SELECT alertid, tablename, action, applicationname, reason, createdat
         FROM directdbwritealert
        WHERE tablename = 'member' AND action = 'UPDATE'
        ORDER BY alertid DESC
        LIMIT 1`
    );

    const auditRes = await actor.query(
      `SELECT logid, username, endpoint, action, tablename, createdat
         FROM auditlog
        WHERE username = 'UNAUTHORIZED_DIRECT_DB'
          AND endpoint = 'DIRECT_DB_WRITE'
          AND tablename = 'member'
          AND action = 'UPDATE'
        ORDER BY logid DESC
        LIMIT 1`
    );

    const alert = alertRes.rows[0] || null;
    const audit = auditRes.rows[0] || null;

    const pass = Boolean(
      alert &&
      audit &&
      String(alert.applicationname || '') === attackerAppName
    );

    const summary = {
      test: 'direct-write-guard',
      pass,
      attackerApplicationName: attackerAppName,
      memberId: targetMemberId,
      alert,
      audit,
      checks: {
        alertFound: Boolean(alert),
        auditFound: Boolean(audit),
        applicationNameMatched: Boolean(alert && String(alert.applicationname || '') === attackerAppName),
      },
    };

    console.log(JSON.stringify(summary, null, 2));

    if (!pass) process.exitCode = 1;
  } finally {
    await actor.end();
  }
}

main().catch((err) => {
  console.error('Guard test failed:', err.message);
  process.exit(1);
});
