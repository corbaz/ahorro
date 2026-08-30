-- ============================================================
-- Reto de Ahorro — tipo de plan (sistema de cuotas)
-- ============================================================
-- Cada cuenta (plan) puede usar uno de dos sistemas de cuotas:
--   'progresivo' -> cuotas crecientes (k·i, la de siempre)
--   'iguales'    -> cuota fija (objetivo / n)
-- Default: 'progresivo' para no romper cuentas existentes.
alter table public.planes add column if not exists tipo text not null default 'progresivo';
