-- =============================================
-- GateGuard Performance Optimization Indexes
-- Run AFTER schema.sql and seed.sql
-- =============================================

-- Member search indexes (case-insensitive prefix searches)
CREATE INDEX IF NOT EXISTS idx_member_name_lower  ON member ((LOWER(name)));
CREATE INDEX IF NOT EXISTS idx_member_email_lower ON member ((LOWER(email)));

-- Vehicle search index (case-insensitive license plate prefix)
CREATE INDEX IF NOT EXISTS idx_vehicle_plate_lower ON vehicle ((LOWER(licenseplate)));

-- Active visit + recency patterns
CREATE INDEX IF NOT EXISTS idx_person_visit_active_entry
	ON personvisit(entrytime DESC)
	WHERE exittime IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_visit_active_entry
	ON vehiclevisit(entrytime DESC)
	WHERE exittime IS NULL;

-- Recency history for visit listing endpoints
CREATE INDEX IF NOT EXISTS idx_person_visit_entry_time ON personvisit(entrytime DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_visit_entry_time ON vehiclevisit(entrytime DESC);

-- Audit filtering patterns used in /api/audit
CREATE INDEX IF NOT EXISTS idx_audit_user_action_created
	ON auditlog(userid, action, createdat DESC);

CREATE INDEX IF NOT EXISTS idx_audit_created ON auditlog(createdat DESC);

-- Login lookup (exact match)
CREATE INDEX IF NOT EXISTS idx_user_username ON "User"(username);
