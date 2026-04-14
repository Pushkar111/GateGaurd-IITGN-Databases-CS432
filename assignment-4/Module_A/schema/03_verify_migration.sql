-- GateGuard Assignment 4: Sharding
-- Script 03: Verify migration correctness
--
-- Three checks:
--   1. Total rows in shards must equal total rows in original tables
--   2. No member can appear in more than one shard (zero overlap)
--   3. Distribution across shards must be roughly equal (no hot shard)
--
-- Run this after 02_migrate_data.sql.

-- check 1: row counts must match
SELECT
    'original member count'           AS label,
    COUNT(*)                          AS row_count
FROM member
UNION ALL
SELECT 'shard_0_member',  COUNT(*) FROM shard_0_member
UNION ALL
SELECT 'shard_1_member',  COUNT(*) FROM shard_1_member
UNION ALL
SELECT 'shard_2_member',  COUNT(*) FROM shard_2_member
UNION ALL
SELECT
    'shards total (should equal original)',
    (SELECT COUNT(*) FROM shard_0_member)
    + (SELECT COUNT(*) FROM shard_1_member)
    + (SELECT COUNT(*) FROM shard_2_member);

-- check 2: no memberid in more than one shard (overlap = 0 rows each)
SELECT 'overlap shard_0 vs shard_1' AS check_name,
    COUNT(*) AS overlap_count
FROM shard_0_member m0
INNER JOIN shard_1_member m1 ON m0.memberid = m1.memberid
UNION ALL
SELECT 'overlap shard_1 vs shard_2',
    COUNT(*)
FROM shard_1_member m1
INNER JOIN shard_2_member m2 ON m1.memberid = m2.memberid
UNION ALL
SELECT 'overlap shard_0 vs shard_2',
    COUNT(*)
FROM shard_0_member m0
INNER JOIN shard_2_member m2 ON m0.memberid = m2.memberid;

-- check 3: distribution per shard (should be ~33% each)
SELECT
    'shard_0' AS shard,
    COUNT(*) AS member_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM member), 2) AS pct
FROM shard_0_member
UNION ALL
SELECT 'shard_1', COUNT(*), ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM member), 2)
FROM shard_1_member
UNION ALL
SELECT 'shard_2', COUNT(*), ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM member), 2)
FROM shard_2_member;

-- same distribution check for personvisit
SELECT
    'shard_0' AS shard,
    COUNT(*) AS visit_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM personvisit), 2) AS pct
FROM shard_0_personvisit
UNION ALL
SELECT 'shard_1', COUNT(*), ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM personvisit), 2)
FROM shard_1_personvisit
UNION ALL
SELECT 'shard_2', COUNT(*), ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM personvisit), 2)
FROM shard_2_personvisit;
