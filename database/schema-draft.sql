-- Proposta de modelo; não aplicar em produção. Ver README.md.
BEGIN;
CREATE TABLE tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(trim(name)) > 0)
);
CREATE TABLE customers (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL,
  name text NOT NULL,
  PRIMARY KEY (tenant_id, id)
);
CREATE TABLE vehicles (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL,
  customer_id uuid NOT NULL,
  model text NOT NULL,
  serial_number text,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, customer_id) REFERENCES customers(tenant_id, id)
);
CREATE TABLE batteries (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  serial_number text,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, vehicle_id) REFERENCES vehicles(tenant_id, id)
);
CREATE TABLE cases (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL CHECK (status IN ('opened','awaiting_evidence','awaiting_supplier','awaiting_part','in_service','ready','closed','cancelled')),
  responsible_party text CHECK (responsible_party IN ('store','supplier','service')),
  assignee text,
  next_action text,
  due_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL CHECK (updated_at >= created_at),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, vehicle_id) REFERENCES vehicles(tenant_id, id),
  CHECK (status IN ('closed','cancelled') OR
    (responsible_party IS NOT NULL AND assignee IS NOT NULL AND length(trim(assignee)) > 0
      AND next_action IS NOT NULL AND length(trim(next_action)) > 0 AND due_at IS NOT NULL))
);
CREATE TABLE case_events (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  id uuid NOT NULL,
  case_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, case_id) REFERENCES cases(tenant_id, id)
);
CREATE INDEX cases_queue ON cases (tenant_id, due_at) WHERE status NOT IN ('closed','cancelled');
CREATE INDEX case_timeline ON case_events (tenant_id, case_id, occurred_at);
-- Sem políticas de acesso nesta proposta: falhar fechado para papéis comuns.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles FORCE ROW LEVEL SECURITY;
ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE batteries FORCE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases FORCE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events FORCE ROW LEVEL SECURITY;
COMMIT;
