-- 1) See active visit(s) for member 2
SELECT visitid, personid, entrygateid, exitgateid, entrytime, exittime
FROM personvisit
WHERE personid = 1
  AND exittime IS NULL
ORDER BY entrytime DESC;

-- 2) Close all active visit(s) for member 2
UPDATE personvisit
SET exittime  = NOW(),
    exitgateid = COALESCE(exitgateid, entrygateid, 1)
WHERE personid = 1
  AND exittime IS NULL
RETURNING visitid, personid, entrygateid, exitgateid, entrytime, exittime;

-- 3) Confirm no active visit remains
SELECT COUNT(*) AS active_left
FROM personvisit
WHERE personid = 1
  AND exittime IS NULL;








BEGIN;

-- ensure at least one member type exists
INSERT INTO membertype (typename)
VALUES ('Student')
ON CONFLICT (typename) DO NOTHING;

-- ensure at least one gate exists
INSERT INTO gate (name, location, createdat, updatedat)
SELECT 'Main Gate', 'Campus Main Entry', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM gate);

-- restore/update member 1
INSERT INTO member (
  memberid, name, email, contactnumber, image, age, department, typeid, createdat, updatedat
)
VALUES (
  1,
  'Member One Restored',
  'member1.restore@iitgn.ac.in',
  '9999999999',
  NULL,
  21,
  'CS',
  (SELECT typeid FROM membertype WHERE typename = 'Student' LIMIT 1),
  NOW(),
  NOW()
)
ON CONFLICT (memberid) DO UPDATE
SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  contactnumber = EXCLUDED.contactnumber,
  age = EXCLUDED.age,
  department = EXCLUDED.department,
  typeid = EXCLUDED.typeid,
  updatedat = NOW();

-- close any already-open visits for member 1 (so we don't end up with multiple active visits)
UPDATE personvisit
SET
  exittime = NOW(),
  exitgateid = COALESCE(exitgateid, entrygateid, (SELECT gateid FROM gate ORDER BY gateid LIMIT 1)),
  updatedat = NOW()
WHERE personid = 1
  AND exittime IS NULL;

-- create one fresh active visit for member 1
INSERT INTO personvisit (
  personid, entrygateid, entrytime, exittime, exitgateid, vehicleid, createdat, updatedat
)
VALUES (
  1,
  (SELECT gateid FROM gate ORDER BY gateid LIMIT 1),
  NOW(),
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
);

-- fix sequences after manual ID insert
SELECT setval(pg_get_serial_sequence('member', 'memberid'),
              COALESCE((SELECT MAX(memberid) FROM member), 1), true);

SELECT setval(pg_get_serial_sequence('personvisit', 'visitid'),
              COALESCE((SELECT MAX(visitid) FROM personvisit), 1), true);

COMMIT;


SELECT memberid, name, email FROM member WHERE memberid = 1;

SELECT visitid, personid, entrygateid, exittime
FROM personvisit
WHERE personid = 1
ORDER BY visitid DESC
LIMIT 5;