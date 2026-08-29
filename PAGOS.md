# PAGOS — reglas de la app

> Ejemplo de referencia: **objetivo u$s 1.000 · 100 cuotas · 200 días**.
> Sirve de guía simple (no verbosa) de qué hace cada acción/botón. Las notas de UI (colores, light/dark) se agregan después sobre cada regla.

## Fórmulas base

- **Montos (calendario triangular):** la cuota `i` vale `k·i`, con `k = objetivo / Σ(1..n)`.
  - Σ(1..100) = 5.050 → k ≈ 0,198 → cuota 1 ≈ $0,20 … cuota 100 ≈ $19,80 (suma = $1.000). Las cuotas **crecen**.
- **Fechas (cadencia):** cuota 1 = día de creación · cuota 100 = fecha final.
  - Cadencia = 200 / (100−1) ≈ **2,02 días** entre cuotas.
- **Ritmo ideal:** 1 cuota cada ~2 días (en pantalla se redondea a **2 días**).
- **Balance:** `pagadas − esperadas`. **+** = adelantado (verde) · **−** = atrasado (rojo). Día 0 sin pagar = **0**.
- **"vence":** en cuotas **pendientes** muestra `vence <fecha> · faltan X días` (recalculado con el día actual). En **pagadas** muestra `Pagada · <fecha del pago>`.

## Tabla de acciones

| Acción (botón) | Cuotas | Fechas | Historial | Guardado |
|---|---|---|---|---|
| **Inicializar / Recalcular** | Regenera las 100 cuotas (todas **pendientes**), montos `k·i` | Cuota 1 = hoy · cuota 100 = fin · resto a cadencia ~2 días | Añade separador `--- NUEVO PLAN ---` | backup + nube |
| **Entrar / abrir cuenta** | Carga las cuotas y su estado (pagada/pendiente) | Si no tienen fecha, asigna cuota 1 = hoy → fin | Carga el historial | — |
| **Pagar 2 cuotas (mismo día)** | Marca esas 2 como **pagadas**; las otras 98 quedan pendientes | Las 98 **impagas se re-esparcen**: `hoy + (i+1)·paso`, con `paso = 200/98 ≈ 2,04 días`; la última queda en fin. Las pagadas **conservan** su fecha | Añade 2 filas `pago` (fecha de hoy, montos, restante, acumulado) | backup + nube |
| **Comprar (modal "Pagar cuotas")** | Igual que Pagar, pero en 3 pasos: 1) pide **cotización del dólar** → 2) **elegís cuotas** → 3) **Comprar** | Idem | Idem | backup + nube |
| **Refrescar (render)** | Recalcula totales: pendientes, ahorrado, %, barra de progreso | Recalcula `faltan X días` y balance con el **día actual** | No toca | — |
| **Reiniciar cuotas** | Las 100 vuelven a **pendiente** (conserva montos) | **No** reasigna fechas (quedan las últimas) | Vacía el historial | backup + nube |
| **Limpiar historial** | Regenera las 100 pendientes (igual que **Recalcular**) | Reasigna cuota 1 = hoy → fin | Vacía el historial | backup + nube |

## Resumen de una línea

- **Recalcular / Limpiar historial** = arrancar de cero (regenera montos y fechas).
- **Reiniciar cuotas** = solo destildar pagos (mantiene montos y fechas).
- **Pagar / Comprar** = tilda pagadas + re-esparce las impagas + suma al historial.
