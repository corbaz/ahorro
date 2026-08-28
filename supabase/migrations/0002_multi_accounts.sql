-- ============================================================
-- Reto de Ahorro — cuentas múltiples por usuario
-- ============================================================
-- Un mismo mail (auth.uid) puede tener VARIAS cuentas (planes)
-- que se distinguen por NOMBRE (lo elige el usuario, p. ej. "Casa"
-- y "Auto"). Se pasa de "1 fila en planes por usuario" a "muchas
-- filas por usuario", y cuotas/historial pasan a pertenecer a un
-- plan puntual (plan_id).

-- 1) planes: ahora la PK es id (uuid); user_id deja de ser PK.
alter table public.planes add column if not exists id uuid;
update public.planes set id = gen_random_uuid() where id is null;
alter table public.planes alter column id set not null;
alter table public.planes drop constraint if exists planes_pkey;
alter table public.planes add primary key (id);

-- nombre de la cuenta (lo escribe el usuario). Default por si hay filas viejas.
alter table public.planes add column if not exists nombre text;
update public.planes set nombre = 'Mi plan' where nombre is null;
alter table public.planes alter column nombre set not null;

-- un mismo usuario no puede tener dos cuentas con el mismo nombre
alter table public.planes drop constraint if exists planes_user_nombre_unique;
alter table public.planes add constraint planes_user_nombre_unique unique (user_id, nombre);

-- 2) cuotas e historial pasan a pertenecer a un plan (cuenta) puntual.
alter table public.cuotas add column if not exists plan_id uuid references public.planes(id) on delete cascade;
alter table public.historial add column if not exists plan_id uuid references public.planes(id) on delete cascade;

-- backfill: asociar filas viejas al único plan de su usuario
update public.cuotas c set plan_id = (
  select p.id from public.planes p where p.user_id = c.user_id order by p.created_at, p.id limit 1
) where c.plan_id is null;
update public.historial h set plan_id = (
  select p.id from public.planes p where p.user_id = h.user_id order by p.created_at, p.id limit 1
) where h.plan_id is null;

-- hacer plan_id obligatorio luego del backfill
alter table public.cuotas alter column plan_id set not null;
alter table public.historial alter column plan_id set not null;

-- 3) la unicidad de (user_id, n) en cuotas ya no aplica: dos cuentas
--    del mismo usuario pueden tener el mismo N.º de cuota.
alter table public.cuotas drop constraint if exists cuotas_user_id_n_key;
alter table public.cuotas drop constraint if exists cuotas_plan_n_unique;
alter table public.cuotas add constraint cuotas_plan_n_unique unique (plan_id, n);

-- 4) índices para consultar por plan (cuenta)
create index if not exists idx_cuotas_plan on public.cuotas(plan_id);
create index if not exists idx_historial_plan on public.historial(plan_id, fecha desc);

-- 5) RLS se mantiene igual (auth.uid() = user_id) en las tres tablas:
--    un usuario sigue viendo SOLO sus datos. Las filas de cuotas/historial
--    llevan user_id del dueño (para RLS) y plan_id de la cuenta.
