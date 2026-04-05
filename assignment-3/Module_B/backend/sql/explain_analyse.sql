--1. Member search by name
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT m.memberid AS "MemberID", m.name AS "Name", m.email AS "Email", mt.typename AS "TypeName"
FROM member m
JOIN membertype mt ON mt.typeid = m.typeid
WHERE m.name ILIKE 'member%'
ORDER BY m.name
LIMIT 20;

-- 2. Active person visits
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT pv.visitid AS "VisitID", m.name AS "Name", eg.name AS "EntryGate", pv.entrytime AS "EntryTime"
FROM personvisit pv
JOIN member m ON m.memberid = pv.personid
JOIN gate eg ON eg.gateid = pv.entrygateid
WHERE pv.exittime IS NULL
ORDER BY pv.entrytime DESC;

-- 3.Person visits by time
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT pv.visitid AS "VisitID", m.name AS "Name", pv.entrytime AS "EntryTime", pv.exittime AS "ExitTime"
FROM personvisit pv
JOIN member m ON m.memberid = pv.personid
ORDER BY pv.entrytime DESC
LIMIT 50;


-- 4. Dashboard occupancy join
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT g.gateid AS "GateID", g.name AS "Name", go.occupancycount AS "OccupancyCount"
FROM gate g
JOIN gateoccupancy go ON go.gateid = g.gateid;

-- 5. Login by username
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.userid AS "UserID", u.username AS "Username", u.passwordhash AS "PasswordHash", r.rolename AS "RoleName"
FROM "User" u
JOIN role r ON r.roleid = u.roleid
WHERE u.username = 'superadmin';

-- 6. Audit filter query
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM auditlog
WHERE userid = 1 AND action = 'UPDATE'
ORDER BY createdat DESC
LIMIT 30;


-- 7. Active vehicle visits
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT vv.visitid AS "VisitID", v.licenseplate AS "RegistrationNumber", eg.name AS "EntryGate", vv.entrytime AS "EntryTime"
FROM vehiclevisit vv
JOIN vehicle v ON v.vehicleid = vv.vehicleid
JOIN gate eg ON eg.gateid = vv.entrygateid
WHERE vv.exittime IS NULL
ORDER BY vv.entrytime DESC;

-- 8. Vehicle search by plate
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT v.vehicleid AS "VehicleID", v.licenseplate AS "RegistrationNumber", vt.typename AS "TypeName"
FROM vehicle v
JOIN vehicletype vt ON vt.typeid = v.typeid
WHERE v.licenseplate ILIKE 'gj01%'
LIMIT 20;

