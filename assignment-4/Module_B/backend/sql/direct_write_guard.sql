-- =============================================
-- Guardrail: Flag direct DB writes that bypass API
-- =============================================
-- Idea:
--   - API pool uses application_name = 'GateGuardAPI'
--   - Any INSERT/UPDATE/DELETE from another source is flagged
--     in DirectDbWriteAlert + AuditLog as unauthorized direct write

CREATE TABLE IF NOT EXISTS DirectDbWriteAlert (
  AlertID         BIGSERIAL PRIMARY KEY,
  TableName       VARCHAR(63) NOT NULL,
  Action          VARCHAR(10) NOT NULL,
  ApplicationName TEXT,
  DatabaseUser    TEXT,
  Reason          TEXT NOT NULL,
  OldValue        JSONB,
  NewValue        JSONB,
  CreatedAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_direct_alert_table_created
  ON DirectDbWriteAlert(TableName, CreatedAt DESC);

CREATE OR REPLACE FUNCTION flag_direct_db_write()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  app_name TEXT := current_setting('application_name', true);
  is_allowed_source BOOLEAN := app_name IN (
    'GateGuardAPI',
    'GateGuardSetup',
    'GateGuardSeeder',
    'GateGuardExplain',
    'GateGuardHealthCheck'
  );
BEGIN
  IF NOT is_allowed_source THEN
    INSERT INTO DirectDbWriteAlert(
      TableName,
      Action,
      ApplicationName,
      DatabaseUser,
      Reason,
      OldValue,
      NewValue
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      COALESCE(app_name, 'UNKNOWN_APP'),
      current_user,
      'Write did not originate from session-validated API connection',
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END
    );

    -- Mirror into AuditLog for centralized security review.
    INSERT INTO AuditLog(
      UserID, Username, Role, Method, Endpoint,
      TableName, RecordID, Action, OldValue, NewValue,
      IPAddress, StatusCode
    ) VALUES (
      NULL,
      'UNAUTHORIZED_DIRECT_DB',
      'SYSTEM',
      TG_OP,
      'DIRECT_DB_WRITE',
      TG_TABLE_NAME,
      NULL,
      TG_OP,
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END,
      'LOCAL_DB',
      0
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Apply to mutation-heavy project tables.
DROP TRIGGER IF EXISTS trg_direct_write_member       ON member;
DROP TRIGGER IF EXISTS trg_direct_write_vehicle      ON vehicle;
DROP TRIGGER IF EXISTS trg_direct_write_gate         ON gate;
DROP TRIGGER IF EXISTS trg_direct_write_personvisit  ON personvisit;
DROP TRIGGER IF EXISTS trg_direct_write_vehiclevisit ON vehiclevisit;
DROP TRIGGER IF EXISTS trg_direct_write_user         ON "User";

CREATE TRIGGER trg_direct_write_member
AFTER INSERT OR UPDATE OR DELETE ON member
FOR EACH ROW EXECUTE FUNCTION flag_direct_db_write();

CREATE TRIGGER trg_direct_write_vehicle
AFTER INSERT OR UPDATE OR DELETE ON vehicle
FOR EACH ROW EXECUTE FUNCTION flag_direct_db_write();

CREATE TRIGGER trg_direct_write_gate
AFTER INSERT OR UPDATE OR DELETE ON gate
FOR EACH ROW EXECUTE FUNCTION flag_direct_db_write();

CREATE TRIGGER trg_direct_write_personvisit
AFTER INSERT OR UPDATE OR DELETE ON personvisit
FOR EACH ROW EXECUTE FUNCTION flag_direct_db_write();

CREATE TRIGGER trg_direct_write_vehiclevisit
AFTER INSERT OR UPDATE OR DELETE ON vehiclevisit
FOR EACH ROW EXECUTE FUNCTION flag_direct_db_write();

CREATE TRIGGER trg_direct_write_user
AFTER INSERT OR UPDATE OR DELETE ON "User"
FOR EACH ROW EXECUTE FUNCTION flag_direct_db_write();
