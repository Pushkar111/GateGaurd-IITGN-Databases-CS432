-- backend/sql/seed_large.sql
-- Large seed dataset for performance benchmarking / EXPLAIN ANALYZE comparison
-- 100 members, 200 vehicles, 4 gates, 500 person visits, 300 vehicle visits
-- Run AFTER: node scripts/setup (db-setup + seed-users + seed-data applied first)
--
-- SCHEMA CONSTRAINTS (from assignment-1/database/schema.sql):
--   membertype.typename  IN ('Resident','Student','Visitor')
--   vehicletype.typename IN ('PrivateCar','Taxi','Bike','Truck','Bus')
--   Gate has NO Status column
--   PersonVisit FK column is PersonID (not MemberID)
--   Vehicle column is LicensePlate (not RegistrationNumber)
--   chk_exitgate_if_exittime: (ExitTime IS NULL AND ExitGateID IS NULL) OR
--                             (ExitTime IS NOT NULL AND ExitGateID IS NOT NULL)

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- MEMBER TYPES (constraint: only these 3 values)
-- ════════════════════════════════════════════════════════════════
INSERT INTO membertype (typename)
VALUES ('Resident'),('Student'),('Visitor')
ON CONFLICT (typename) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- ROLES (lowercase table 'role')
-- ════════════════════════════════════════════════════════════════
INSERT INTO role (rolename)
VALUES ('Guard'),('Admin'),('SuperAdmin')
ON CONFLICT (rolename) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- VEHICLE TYPES (constraint: only these 5 values)
-- ════════════════════════════════════════════════════════════════
INSERT INTO vehicletype (typename)
VALUES ('PrivateCar'),('Taxi'),('Bike'),('Truck'),('Bus')
ON CONFLICT (typename) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 100 MEMBERS
-- ════════════════════════════════════════════════════════════════
INSERT INTO member (name, email, contactnumber, typeid, age, department)
SELECT
  'Member_' || i AS name,
  'member' || i || '@iitgn.ac.in' AS email,
  '9' || LPAD((FLOOR(RANDOM() * 1000000000))::bigint::text, 9, '0') AS contactnumber,
  (SELECT typeid FROM membertype ORDER BY RANDOM() + (s.i*0) LIMIT 1) AS typeid,
  (18 + FLOOR(RANDOM() * 42))::int AS age,
  (ARRAY['CS','ME','EE','CE','CH','MA','HS','BS'])[FLOOR(RANDOM()*8+1)::int] AS department
FROM generate_series(1, 100) AS s(i)
ON CONFLICT (email) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 200 VEHICLES
-- licenseplate UNIQUE + length >= 5
-- ════════════════════════════════════════════════════════════════
INSERT INTO vehicle (licenseplate, typeid, ownerid)
SELECT DISTINCT ON (plate)
  'GJ' || LPAD(i::text, 2, '0') || 'AB' || LPAD(FLOOR(RANDOM()*9000+1000)::text, 4, '0') AS plate,
  (SELECT typeid FROM vehicletype ORDER BY RANDOM() + (s.i*0) LIMIT 1),
  (SELECT memberid FROM member ORDER BY RANDOM() + (s.i*0) LIMIT 1) AS ownerid
FROM generate_series(1, 220) AS s(i)  -- extra to account for duplicates
ON CONFLICT (licenseplate) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- GATES (no Status column in schema)
-- ════════════════════════════════════════════════════════════════
INSERT INTO gate (name, location)
SELECT name, location FROM (VALUES 
  ('Main Gate',    'North Entrance'),
  ('South Gate',   'South Entrance'),
  ('Faculty Gate', 'West Entrance'),
  ('Service Gate', 'East Entrance')
) AS v(name, location)
WHERE NOT EXISTS (SELECT 1 FROM gate g WHERE g.name = v.name);

INSERT INTO gateoccupancy (gateid, occupancycount)
SELECT gateid, FLOOR(RANDOM() * 30)::int
FROM gate
ON CONFLICT (gateid) DO UPDATE SET occupancycount = EXCLUDED.occupancycount;

-- ════════════════════════════════════════════════════════════════
-- 500 PERSON VISITS
-- chk_exitgate_if_exittime: both NULL or both NOT NULL
-- Use a single random value to decide completion status
-- ════════════════════════════════════════════════════════════════
WITH visit_data AS (
  SELECT
    m.memberid AS personid,
    (SELECT gateid FROM gate ORDER BY RANDOM() + (s.i*0) LIMIT 1) AS entrygateid,
    RANDOM() AS completion_roll,
    NOW() - (FLOOR(RANDOM() * 168) || ' hours')::interval AS entrytime,
    (SELECT gateid FROM gate ORDER BY RANDOM() + (s.i*0) LIMIT 1) AS exitgateid_candidate,
    --  vehicle if member owns one
    (SELECT v.vehicleid FROM vehicle v
     WHERE v.ownerid = m.memberid ORDER BY RANDOM() + (s.i*0) LIMIT 1) AS vehicleid,
    RANDOM() AS vehicle_roll
  FROM (SELECT memberid FROM member ORDER BY RANDOM()) m
  CROSS JOIN generate_series(1, 5) AS s(i)
  LIMIT 500
)
INSERT INTO personvisit (personid, entrygateid, exitgateid, vehicleid, entrytime, exittime)
SELECT
  personid,
  entrygateid,
  CASE WHEN completion_roll > 0.15 THEN exitgateid_candidate ELSE NULL END AS exitgateid,
  CASE WHEN vehicle_roll > 0.4 THEN vehicleid ELSE NULL END AS vehicleid,
  entrytime,
  CASE WHEN completion_roll > 0.15
       THEN entrytime + (FLOOR(RANDOM() * 480 + 10) || ' minutes')::interval
       ELSE NULL END AS exittime
FROM visit_data;

-- ════════════════════════════════════════════════════════════════
-- 300 VEHICLE VISITS
-- ════════════════════════════════════════════════════════════════
WITH vvisit_data AS (
  SELECT
    v.vehicleid,
    (SELECT gateid FROM gate ORDER BY RANDOM() + (s.i*0) LIMIT 1) AS entrygateid,
    RANDOM() AS completion_roll,
    NOW() - (FLOOR(RANDOM() * 168) || ' hours')::interval AS entrytime,
    (SELECT gateid FROM gate ORDER BY RANDOM() + (s.i*0) LIMIT 1) AS exitgateid_candidate
  FROM (SELECT vehicleid FROM vehicle ORDER BY RANDOM()) v
  CROSS JOIN generate_series(1, 2) AS s(i)
  LIMIT 300
)
INSERT INTO vehiclevisit (vehicleid, entrygateid, exitgateid, entrytime, exittime)
SELECT
  vehicleid,
  entrygateid,
  CASE WHEN completion_roll > 0.15 THEN exitgateid_candidate ELSE NULL END AS exitgateid,
  entrytime,
  CASE WHEN completion_roll > 0.15
       THEN entrytime + (FLOOR(RANDOM() * 240 + 5) || ' minutes')::interval
       ELSE NULL END AS exittime
FROM vvisit_data;

-- ════════════════════════════════════════════════════════════════
-- Verification counts
-- ════════════════════════════════════════════════════════════════
SELECT 'member'       AS tbl, COUNT(*) FROM member
UNION ALL SELECT 'vehicle',      COUNT(*) FROM vehicle
UNION ALL SELECT 'gate',         COUNT(*) FROM gate
UNION ALL SELECT 'personvisit',  COUNT(*) FROM personvisit
UNION ALL SELECT 'vehiclevisit', COUNT(*) FROM vehiclevisit;

COMMIT;
