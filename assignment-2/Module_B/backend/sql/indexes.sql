-- =============================================
-- GateGuard Performance Optimization Indexes
-- Run AFTER schema.sql and seed.sql
-- Use EXPLAIN ANALYZE to compare before/after
-- =============================================

-- Member indexes
CREATE INDEX IF NOT EXISTS idx_member_name  ON member(name);
CREATE INDEX IF NOT EXISTS idx_member_email ON member(email);

-- Vehicle indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_plate ON vehicle(licenseplate);

-- Person visit indexes (partial index for active visits — only rows where ExitTime IS NULL)
CREATE INDEX IF NOT EXISTS idx_person_visit_active     ON personvisit(exittime) WHERE exittime IS NULL;
CREATE INDEX IF NOT EXISTS idx_person_visit_entry_time ON personvisit(entrytime DESC);

-- Vehicle visit indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_visit_active     ON vehiclevisit(exittime) WHERE exittime IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_visit_entry_time ON vehiclevisit(entrytime DESC);

-- Audit log indexes (already in audit_table.sql, here for reference)
CREATE INDEX IF NOT EXISTS idx_audit_user        ON auditlog(userid);
CREATE INDEX IF NOT EXISTS idx_audit_action      ON auditlog(action);
CREATE INDEX IF NOT EXISTS idx_audit_table       ON auditlog(tablename);
CREATE INDEX IF NOT EXISTS idx_audit_created     ON auditlog(createdat DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON auditlog(userid, action);

-- User lookup index
CREATE INDEX IF NOT EXISTS idx_user_username ON "User"(username);
