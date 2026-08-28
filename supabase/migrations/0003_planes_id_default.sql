-- ============================================================
-- Reto de Ahorro — default para planes.id
-- ============================================================
-- En 0002 la PK pasó a id (uuid), pero quedó NOT NULL sin default.
-- Sin esto, el insert desde la app (que no manda id) falla con
-- "null value in column id violates not-null constraint".
-- Damos un default uuid v4 para que se autocomplete.
alter table public.planes alter column id set default gen_random_uuid();
