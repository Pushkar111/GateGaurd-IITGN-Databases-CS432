// src/utils/shardRouter.js
//
// Hash-based shard router for GateGuard Assignment 4.
// Mirrors the logic in Module_A/database/shard_router.py.
//
// Rule: shard_id = id % NUM_SHARDS
//   id % 3 = 0  ->  shard_0
//   id % 3 = 1  ->  shard_1
//   id % 3 = 2  ->  shard_2

const NUM_SHARDS = parseInt(process.env.NUM_SHARDS || '3', 10);

function getShard(memberId) {
  // parseInt guard because query params come in as strings
  return parseInt(memberId, 10) % NUM_SHARDS;
}

function memberTable(memberId) {
  return `shard_${getShard(memberId)}_member`;
}

function visitTable(memberId) {
  return `shard_${getShard(memberId)}_personvisit`;
}

function allVisitTables() {
  return Array.from({ length: NUM_SHARDS }, (_, i) => `shard_${i}_personvisit`);
}

function allMemberTables() {
  return Array.from({ length: NUM_SHARDS }, (_, i) => `shard_${i}_member`);
}

module.exports = { getShard, memberTable, visitTable, allVisitTables, allMemberTables, NUM_SHARDS };
