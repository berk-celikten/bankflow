CREATE SEQUENCE bf_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE TABLE bf_users (
  id NUMBER(19) PRIMARY KEY,
  username VARCHAR2(80 CHAR) NOT NULL UNIQUE,
  password_hash VARCHAR2(100 CHAR) NOT NULL,
  full_name VARCHAR2(120 CHAR) NOT NULL,
  roles VARCHAR2(40 CHAR) NOT NULL,
  customer_id VARCHAR2(40 CHAR) NOT NULL UNIQUE
);
CREATE TABLE bf_accounts (
  id NUMBER(19) PRIMARY KEY,
  owner_id NUMBER(19) NOT NULL REFERENCES bf_users(id),
  account_number VARCHAR2(40 CHAR) NOT NULL UNIQUE,
  name VARCHAR2(80 CHAR) NOT NULL,
  balance NUMBER(19,2) NOT NULL,
  currency VARCHAR2(3 CHAR) DEFAULT 'TRY' NOT NULL,
  CONSTRAINT ck_account_balance CHECK (balance >= 0),
  CONSTRAINT ck_account_currency CHECK (currency = 'TRY')
);
CREATE INDEX ix_account_owner ON bf_accounts(owner_id);
CREATE TABLE bf_beneficiaries (
  id NUMBER(19) PRIMARY KEY,
  owner_id NUMBER(19) NOT NULL REFERENCES bf_users(id),
  target_id NUMBER(19) NOT NULL REFERENCES bf_accounts(id),
  label VARCHAR2(80 CHAR) NOT NULL,
  CONSTRAINT uq_beneficiary UNIQUE (owner_id, target_id)
);
CREATE TABLE bf_transfers (
  id NUMBER(19) PRIMARY KEY,
  reference VARCHAR2(40 CHAR) NOT NULL UNIQUE,
  source_id NUMBER(19) NOT NULL REFERENCES bf_accounts(id),
  target_id NUMBER(19) NOT NULL REFERENCES bf_accounts(id),
  created_by NUMBER(19) NOT NULL REFERENCES bf_users(id),
  decided_by NUMBER(19) REFERENCES bf_users(id),
  amount NUMBER(19,2) NOT NULL,
  description VARCHAR2(240 CHAR),
  idempotency_key VARCHAR2(128 CHAR) NOT NULL,
  content_hash VARCHAR2(64 CHAR) NOT NULL,
  status VARCHAR2(24 CHAR) NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
  decided_at TIMESTAMP(6) WITH TIME ZONE,
  decision_reason VARCHAR2(240 CHAR),
  CONSTRAINT uq_transfer_key UNIQUE (created_by, idempotency_key),
  CONSTRAINT ck_transfer_amount CHECK (amount > 0),
  CONSTRAINT ck_transfer_accounts CHECK (source_id <> target_id),
  CONSTRAINT ck_transfer_status CHECK (status IN ('COMPLETED','PENDING_APPROVAL','REJECTED'))
);
CREATE INDEX ix_transfer_source ON bf_transfers(source_id);
CREATE INDEX ix_transfer_target ON bf_transfers(target_id);
CREATE TABLE bf_ledger (
  id NUMBER(19) PRIMARY KEY,
  account_id NUMBER(19) NOT NULL REFERENCES bf_accounts(id),
  transfer_id NUMBER(19) NOT NULL REFERENCES bf_transfers(id),
  type VARCHAR2(6 CHAR) NOT NULL,
  amount NUMBER(19,2) NOT NULL,
  balance_after NUMBER(19,2) NOT NULL,
  description VARCHAR2(240 CHAR),
  created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
  CONSTRAINT ck_ledger_type CHECK (type IN ('DEBIT','CREDIT')),
  CONSTRAINT ck_ledger_amount CHECK (amount > 0),
  CONSTRAINT ck_ledger_balance CHECK (balance_after >= 0),
  CONSTRAINT uq_ledger_transfer UNIQUE (transfer_id, account_id)
);
CREATE INDEX ix_ledger_account ON bf_ledger(account_id);
CREATE TABLE bf_audit (
  id NUMBER(19) PRIMARY KEY,
  event_type VARCHAR2(40 CHAR) NOT NULL,
  actor_name VARCHAR2(80 CHAR) NOT NULL,
  reference VARCHAR2(40 CHAR) NOT NULL,
  details VARCHAR2(400 CHAR) NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);
