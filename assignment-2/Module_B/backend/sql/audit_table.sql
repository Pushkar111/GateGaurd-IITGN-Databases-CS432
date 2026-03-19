-- =============================================
-- GateGuard AuditLog Table + Indexes
-- Run this AFTER the main schema.sql
-- =============================================

CREATE TABLE IF NOT EXISTS AuditLog (
  LogID       SERIAL PRIMARY KEY,
  UserID      INTEGER REFERENCES "User"(UserID) ON DELETE SET NULL,
  Username    VARCHAR(50),
  Role        VARCHAR(50),
  Method      VARCHAR(10)  NOT NULL,
  Endpoint    VARCHAR(255) NOT NULL,
  TableName   VARCHAR(50),
  RecordID    INTEGER,
  Action      VARCHAR(20)  NOT NULL, -- CREATE, READ, UPDATE, DELETE
  OldValue    JSONB,
  NewValue    JSONB,
  IPAddress   VARCHAR(45),
  StatusCode  INTEGER,
  CreatedAt   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_user     ON AuditLog(UserID);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON AuditLog(Action);
CREATE INDEX IF NOT EXISTS idx_audit_table    ON AuditLog(TableName);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON AuditLog(CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON AuditLog(UserID, Action);
