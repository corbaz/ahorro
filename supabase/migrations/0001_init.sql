-- ============================================================
-- Reto de Ahorro — schema + RLS para Supabase
-- ============================================================
-- Cada usuario guarda SU propio plan de ahorro (objetivo,
-- cuotas, historial de pagos). Nadie ve los datos de otro.

-- 1) Tabla de planes (1 fila por usuario = su plan activo)
create table if not exists public.planes (
  user_id    uuid not null references auth.users(id) on delete cascade primary key,
  objetivo   numeric not null default 100000,
  num_dep    integer not null default 100,
  dolar      numeric not null default 1,
  fecha_inicio timestamptz default now(),
  fecha_fin   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Tabla de cuotas (las 100 cuotas del plan de cada usuario)
create table if not exists public.cuotas (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  n         integer not null,          -- N.º de cuota (1..num_dep)
  monto     numeric not null,          -- monto en u$s
  paid      boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, n)
);

-- 3) Tabla de historial (registro de cada pago + separadores de plan)
create table if not exists public.historial (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  tipo       text not null check (tipo in ('pago','plan')),
  fecha      timestamptz not null default now(),
  n          integer,                   -- N.º cuota (solo pagos)
  rate       numeric,                  -- cotización u$s (solo pagos)
  monto_usd  numeric,                  -- cuota u$s (solo pagos)
  monto_ars  numeric,                  -- cuota $   (solo pagos)
  rest_usd  numeric,                  -- restante u$s después del pago
  acum_usd  numeric,                  -- acumulado u$s después del pago
  rest_ars  numeric,                  -- restante $ después del pago
  acum_ars  numeric,                  -- acumulado $ después del pago
  texto      text                     -- separador "NUEVO PLAN" (solo tipo plan)
);

-- Índices
create index if not exists idx_cuotas_user on public.cuotas(user_id);
create index if not exists idx_historial_user on public.historial(user_id, fecha desc);

-- ============================================================
-- RLS (Row Level Security) — cada usuario ve SOLO sus datos
-- ============================================================
alter table public.planes    enable row level security;
alter table public.cuotas   enable row level security;
alter table public.historial enable row level security;

-- Policies: SELECT/INSERT/UPDATE/DELETE solo si auth.uid() = user_id
-- Planes
create policy "planes_select_own"  on public.planes for select using (auth.uid() = user_id);
create policy "planes_insert_own" on public.planes for insert with check (auth.uid() = user_id);
create policy "planes_update_own" on public.planes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "planes_delete_own" on public.planes for delete using (auth.uid() = user_id);

-- Cuotas
create policy "cuotas_select_own"  on public.cuotas for select using (auth.uid() = user_id);
create policy "cuotas_insert_own" on public.cuotas for insert with check (auth.uid() = user_id);
create policy "cuotas_update_own" on public.cuotas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cuotas_delete_own" on public.cuotas for delete using (auth.uid() = user_id);

-- Historial
create policy "historial_select_own"  on public.historial for select using (auth.uid() = user_id);
create policy "historial_insert_own" on public.historial for insert with check (auth.uid() = user_id);
create policy "historial_delete_own" on public.historial for delete using (auth.uid() = user_id);
