// Optional physical shards: one PostgreSQL instance per shard (e.g. docker-compose 5433/5434/5435).
// Main DB (db.js pool) stays source of truth for member SERIAL, base personvisit, auth, gates, etc.
// Shard tables shard_N_member / shard_N_personvisit live ONLY on the matching shard host.

const { Pool } = require('pg');
const logger = require('../utils/logger');

let shardPools = null;

function physicalShardsEnabled() {
  const v = (process.env.USE_PHYSICAL_SHARDS || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function createShardPools() {
  if (!physicalShardsEnabled()) return null;
  const pools = [0, 1, 2].map((i) => new Pool({
    host:     process.env[`SHARD_${i}_HOST`] || 'localhost',
    port:     parseInt(process.env[`SHARD_${i}_PORT`] || String(5433 + i), 10),
    database: process.env[`SHARD_${i}_DB`]   || `gateguard_shard_${i}`,
    user:     process.env[`SHARD_${i}_USER`] || 'postgres',
    password: process.env[`SHARD_${i}_PASSWORD`] || 'shard_root',
    max:      parseInt(process.env.SHARD_POOL_MAX || '8', 10),
    application_name: 'GateGuardAPI',
  }));
  logger.info('[shardDb] Physical shard pools enabled (3 PostgreSQL targets)');
  return pools;
}

function getPools() {
  if (!physicalShardsEnabled()) return null;
  if (!shardPools) shardPools = createShardPools();
  return shardPools;
}

async function queryShard(shardId, text, params) {
  const pools = getPools();
  if (!pools) {
    throw new Error('queryShard used while USE_PHYSICAL_SHARDS is off');
  }
  const id = Number(shardId);
  if (!Number.isInteger(id) || id < 0 || id > 2) {
    throw new Error(`Invalid shard id: ${shardId}`);
  }
  return pools[id].query(text, params);
}

async function endShardPools() {
  if (!shardPools) return;
  await Promise.all(shardPools.map((p) => p.end().catch(() => {})));
  shardPools = null;
  logger.info('[shardDb] Shard pools closed');
}

module.exports = {
  physicalShardsEnabled,
  queryShard,
  getPools,
  endShardPools,
};
