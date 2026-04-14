-- auth_tables.sql
-- Run: psql -U postgres -d gateguard -f sql/auth_tables.sql
-- All identifiers are lowercase per project convention

-- ── Add columns to User table ──────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS failedattempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lockeduntil TIMESTAMP,
  ADD COLUMN IF NOT EXISTS mustchangepassword BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lastloginat TIMESTAMP;

-- Set emails for existing demo users
UPDATE "User" SET email = 'superadmin@iitgn.ac.in' WHERE username = 'superadmin';
UPDATE "User" SET email = 'admin@iitgn.ac.in'      WHERE username = 'admin';
UPDATE "User" SET email = 'guard@iitgn.ac.in'       WHERE username = 'guard';

-- ── Password Reset Token table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS passwordresettoken (
  tokenid   SERIAL PRIMARY KEY,
  userid    INTEGER REFERENCES "User"(userid) ON DELETE CASCADE,
  otp       VARCHAR(6),
  token     VARCHAR(255) UNIQUE,
  expiresat TIMESTAMP NOT NULL,
  used      BOOLEAN DEFAULT FALSE,
  createdat TIMESTAMP DEFAULT NOW()
);

-- ── Refresh Token table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refreshtoken (
  tokenid   SERIAL PRIMARY KEY,
  userid    INTEGER REFERENCES "User"(userid) ON DELETE CASCADE,
  token     VARCHAR(500) UNIQUE NOT NULL,
  expiresat TIMESTAMP NOT NULL,
  revoked   BOOLEAN DEFAULT FALSE,
  createdat TIMESTAMP DEFAULT NOW()
);

-- ── Token Blacklist table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokenblacklist (
  tokenid   SERIAL PRIMARY KEY,
  token     VARCHAR(500) UNIQUE NOT NULL,
  expiresat TIMESTAMP NOT NULL,
  createdat TIMESTAMP DEFAULT NOW()
);

-- ── Login History table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loginhistory (
  historyid  SERIAL PRIMARY KEY,
  userid     INTEGER REFERENCES "User"(userid) ON DELETE SET NULL,
  ipaddress  VARCHAR(45),
  useragent  VARCHAR(255),
  success    BOOLEAN NOT NULL,
  failreason VARCHAR(100),
  createdat  TIMESTAMP DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prt_userid ON passwordresettoken(userid);
CREATE INDEX IF NOT EXISTS idx_prt_token  ON passwordresettoken(token);
CREATE INDEX IF NOT EXISTS idx_rt_userid  ON refreshtoken(userid);
CREATE INDEX IF NOT EXISTS idx_rt_token   ON refreshtoken(token);
CREATE INDEX IF NOT EXISTS idx_tb_token   ON tokenblacklist(token);
CREATE INDEX IF NOT EXISTS idx_lh_userid  ON loginhistory(userid);
