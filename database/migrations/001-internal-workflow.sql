CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY);
CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160)
);
CREATE TABLE app_users (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager','attendant')),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (tenant_id,id)
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id),
  csrf_token text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE customers (
  tenant_id uuid NOT NULL REFERENCES organizations(id),
  id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
  contact text NOT NULL DEFAULT '',
  PRIMARY KEY (tenant_id,id)
);
CREATE TABLE vehicles (
  tenant_id uuid NOT NULL REFERENCES organizations(id),
  id uuid NOT NULL,
  customer_id uuid NOT NULL,
  model text NOT NULL CHECK (length(trim(model)) BETWEEN 1 AND 160),
  serial_number text NOT NULL DEFAULT '',
  battery_serial text NOT NULL DEFAULT '',
  PRIMARY KEY (tenant_id,id),
  UNIQUE (tenant_id,id,customer_id),
  FOREIGN KEY (tenant_id,customer_id) REFERENCES customers(tenant_id,id)
);
CREATE TABLE cases (
  tenant_id uuid NOT NULL REFERENCES organizations(id),
  id uuid NOT NULL,
  customer_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  state jsonb NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,vehicle_id,customer_id) REFERENCES vehicles(tenant_id,id,customer_id),
  CHECK (state->>'tenantId' = tenant_id::text),
  CHECK (state->>'id' = id::text),
  CHECK ((state->>'version')::integer = version)
);
CREATE TABLE case_events (
  tenant_id uuid NOT NULL,
  case_id uuid NOT NULL,
  id uuid NOT NULL,
  actor_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,case_id) REFERENCES cases(tenant_id,id),
  FOREIGN KEY (tenant_id,actor_id) REFERENCES app_users(tenant_id,id)
);
CREATE INDEX case_queue ON cases (tenant_id, (state->>'dueAt'));
CREATE INDEX case_history ON case_events (tenant_id,case_id,occurred_at);
CREATE INDEX session_expiry ON sessions (expires_at);

-- Restricted role used only inside authenticated data transactions.
CREATE ROLE rodiva_data NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT rodiva_data TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO rodiva_data;
GRANT SELECT, INSERT ON customers, vehicles TO rodiva_data;
GRANT SELECT, INSERT, UPDATE ON cases TO rodiva_data;
GRANT SELECT, INSERT ON case_events TO rodiva_data;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles FORCE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases FORCE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events FORCE ROW LEVEL SECURITY;
CREATE POLICY customer_tenant ON customers TO rodiva_data USING (tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY vehicle_tenant ON vehicles TO rodiva_data USING (tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY case_tenant ON cases TO rodiva_data USING (tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY event_tenant ON case_events TO rodiva_data USING (tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid);
INSERT INTO schema_migrations (version) VALUES (1);
