-- GateGuard Assignment 4: Sharding
-- Script 04: Add indexes on shard tables
--
-- Without these, every query on a shard table is a sequential scan
-- across the full shard partition. These mirror the indexes that exist
-- on the original member and personvisit tables.
--
-- Run this after 02_migrate_data.sql.

-- indexes on shard_0_member
CREATE INDEX IF NOT EXISTS idx_shard_0_member_memberid
    ON shard_0_member (memberid);
CREATE INDEX IF NOT EXISTS idx_shard_0_member_email
    ON shard_0_member (email);
CREATE INDEX IF NOT EXISTS idx_shard_0_member_typeid
    ON shard_0_member (typeid);

-- indexes on shard_1_member
CREATE INDEX IF NOT EXISTS idx_shard_1_member_memberid
    ON shard_1_member (memberid);
CREATE INDEX IF NOT EXISTS idx_shard_1_member_email
    ON shard_1_member (email);
CREATE INDEX IF NOT EXISTS idx_shard_1_member_typeid
    ON shard_1_member (typeid);

-- indexes on shard_2_member
CREATE INDEX IF NOT EXISTS idx_shard_2_member_memberid
    ON shard_2_member (memberid);
CREATE INDEX IF NOT EXISTS idx_shard_2_member_email
    ON shard_2_member (email);
CREATE INDEX IF NOT EXISTS idx_shard_2_member_typeid
    ON shard_2_member (typeid);

-- indexes on shard_0_personvisit
CREATE INDEX IF NOT EXISTS idx_shard_0_pv_personid
    ON shard_0_personvisit (personid);
CREATE INDEX IF NOT EXISTS idx_shard_0_pv_entrytime
    ON shard_0_personvisit (entrytime);
CREATE INDEX IF NOT EXISTS idx_shard_0_pv_exittime
    ON shard_0_personvisit (exittime);

-- indexes on shard_1_personvisit
CREATE INDEX IF NOT EXISTS idx_shard_1_pv_personid
    ON shard_1_personvisit (personid);
CREATE INDEX IF NOT EXISTS idx_shard_1_pv_entrytime
    ON shard_1_personvisit (entrytime);
CREATE INDEX IF NOT EXISTS idx_shard_1_pv_exittime
    ON shard_1_personvisit (exittime);

-- indexes on shard_2_personvisit
CREATE INDEX IF NOT EXISTS idx_shard_2_pv_personid
    ON shard_2_personvisit (personid);
CREATE INDEX IF NOT EXISTS idx_shard_2_pv_entrytime
    ON shard_2_personvisit (entrytime);
CREATE INDEX IF NOT EXISTS idx_shard_2_pv_exittime
    ON shard_2_personvisit (exittime);
