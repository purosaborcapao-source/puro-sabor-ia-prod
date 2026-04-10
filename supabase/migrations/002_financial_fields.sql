-- ============================================================
-- Migration 002: Financial Fields and Governance
-- Purpose: Add payment tracking and audit trail to orders
-- ============================================================

-- ============================================================
-- FUNCTION: get_my_role()
-- Returns the role of the current authenticated user
-- ============================================================
create or replace function get_my_role()
returns text
language sql
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'ANONYMOUS'
  )
$$;

-- ============================================================
-- ENUM: Payment Status
-- ============================================================
create type payment_status as enum (
  'SINAL_PENDENTE',
  'SINAL_PAGO',
  'QUITADO',
  'CONTA_CORRENTE'
);

create type payment_confirmation_status as enum (
  'AGUARDANDO_CONFIRMACAO',
  'CONFIRMADO',
  'REJEITADO'
);

create type payment_type as enum (
  'SINAL',
  'SALDO',
  'ANTECIPADO',
  'PARCIAL'
);

-- ============================================================
-- ALTER orders: Add Financial Fields
-- ============================================================
alter table orders
  add column payment_status      payment_status not null default 'SINAL_PENDENTE',
  add column sinal_valor         numeric(10,2) not null default 0,
  add column sinal_confirmado    boolean not null default false,
  add column conta_corrente      boolean not null default false;

-- ============================================================
-- TABLE: payment_entries
-- Tracks each payment received (signal or balance)
-- Operator registers → Admin confirms
-- ============================================================
create table payment_entries (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  type             payment_type not null,
  valor            numeric(10,2) not null,
  registered_by    uuid not null references profiles(id),
  confirmed_by     uuid references profiles(id),
  status           payment_confirmation_status not null default 'AGUARDANDO_CONFIRMACAO',
  notes            text,
  registered_at    timestamptz not null default now(),
  confirmed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- TABLE: order_changes
-- Audit trail for order modifications
-- ============================================================
create table order_changes (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  changed_by   uuid not null references profiles(id),
  field        text not null,
  old_value    text,
  new_value    text,
  reason       text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- RLS: payment_entries
-- ============================================================
alter table payment_entries enable row level security;

-- Authenticated users can view
create policy "payment_entries: authenticated read"
  on payment_entries for select
  using (get_my_role() in ('ADMIN', 'GERENTE', 'ATENDENTE'));

-- Operator (ATENDENTE) and above can register
create policy "payment_entries: atendente insert"
  on payment_entries for insert
  with check (get_my_role() in ('ADMIN', 'GERENTE', 'ATENDENTE'));

-- Only Admin/Manager can confirm
create policy "payment_entries: admin confirm"
  on payment_entries for update
  using (get_my_role() in ('ADMIN', 'GERENTE'));

-- ============================================================
-- RLS: order_changes
-- ============================================================
alter table order_changes enable row level security;

-- Authenticated users can view
create policy "order_changes: authenticated read"
  on order_changes for select
  using (get_my_role() in ('ADMIN', 'GERENTE', 'ATENDENTE'));

-- Authenticated users can insert
create policy "order_changes: authenticated insert"
  on order_changes for insert
  with check (get_my_role() in ('ADMIN', 'GERENTE', 'ATENDENTE'));

-- ============================================================
-- INDEXES for Performance
-- ============================================================
create index idx_payment_entries_order_id on payment_entries(order_id);
create index idx_payment_entries_status on payment_entries(status);
create index idx_order_changes_order_id on order_changes(order_id);
create index idx_order_changes_created_at on order_changes(created_at desc);

-- ============================================================
-- TRIGGER: Update updated_at on payment_entries
-- ============================================================
create or replace function update_payment_entries_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger payment_entries_updated_at
  before update on payment_entries
  for each row
  execute function update_payment_entries_updated_at();
