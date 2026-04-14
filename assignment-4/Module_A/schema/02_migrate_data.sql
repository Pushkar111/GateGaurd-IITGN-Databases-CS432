-- GateGuard Assignment 4: Sharding
-- Script 02: Migrate existing data into shard tables
--
-- Hash function: shard_id = id % 3
-- member uses memberid, personvisit uses personid (same underlying value).
--
-- Run 01_create_shards.sql before this script.
-- Safe to re-run after TRUNCATE on each shard table if needed.

-- migrate member rows
INSERT INTO shard_0_member SELECT * FROM member WHERE memberid % 3 = 0;
INSERT INTO shard_1_member SELECT * FROM member WHERE memberid % 3 = 1;
INSERT INTO shard_2_member SELECT * FROM member WHERE memberid % 3 = 2;

-- migrate personvisit rows (routed by personid which equals memberid)
INSERT INTO shard_0_personvisit SELECT * FROM personvisit WHERE personid % 3 = 0;
INSERT INTO shard_1_personvisit SELECT * FROM personvisit WHERE personid % 3 = 1;
INSERT INTO shard_2_personvisit SELECT * FROM personvisit WHERE personid % 3 = 2;
