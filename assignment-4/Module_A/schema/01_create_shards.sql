-- GateGuard Assignment 4: Sharding
-- Script 01: Create shard tables for member and personvisit
--
-- Strategy: LIKE ... INCLUDING ALL copies the full column definition,
-- constraints, defaults and indexes from the original table.
-- Foreign keys are intentionally left out -- each shard is shared-nothing,
-- so cross-shard FK enforcement does not exist by design.
--
-- Shard placement rule: shard_id = memberid % 3
--   memberid % 3 = 0  ->  shard_0
--   memberid % 3 = 1  ->  shard_1
--   memberid % 3 = 2  ->  shard_2

-- member shards
CREATE TABLE IF NOT EXISTS shard_0_member (LIKE member INCLUDING ALL);
CREATE TABLE IF NOT EXISTS shard_1_member (LIKE member INCLUDING ALL);
CREATE TABLE IF NOT EXISTS shard_2_member (LIKE member INCLUDING ALL);

-- personvisit shards
-- personvisit uses personid (same values as memberid) for routing
CREATE TABLE IF NOT EXISTS shard_0_personvisit (LIKE personvisit INCLUDING ALL);
CREATE TABLE IF NOT EXISTS shard_1_personvisit (LIKE personvisit INCLUDING ALL);
CREATE TABLE IF NOT EXISTS shard_2_personvisit (LIKE personvisit INCLUDING ALL);
