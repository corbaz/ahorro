# PAGOS — reglas de la app

> Fuente de verdad de cómo se mueve la app con su funcionamiento de pagos.
> Ejemplo de referencia: **objetivo u$s 1.000 · 100 cuotas · 200 días**.
> Sirve de guía simple (no verbosa) de qué hace cada acción/botón. Las notas de UI (colores, light/dark) se agregan después sobre cada regla.

## Configuración de reto (obligatoria)

Cada reto, para poder operar, **debe** tener estos 6 datos configurados (sí o sí). Sin ellos no hay plan ni pagos:

| Campo | Qué es | Regla |
|---|---|---|
| **Objetivo** | Total a ahorrar, en u$s | Entero > 0 y **mayor que el Nº de cuotas** |
| **N.º de cuotas** | Cuántas cuotas tiene el plan | Entero > 0 |
| **Tipo de plan** | Sistema de cuotas | `Progresivo` (crecientes) o `Iguales` (fija) |
| **Fecha de inicialización** | Día en que arranca el reto | Editable por el usuario · cuota 1 = este día |
| **Fecha de finalización** | Día objetivo de cierre | Editable por el usuario · cuota N (última) = este día |
| **Cotización del dólar (día de creación)** | Tipo de cambio u$s → ARS del día en que se crea el reto | Entero > 0 (sin decimales) · referencia inicial |

La cotización **no queda congelada**: al pagar, si el dólar cambió, se usa la cotización **del momento de pagar** (ver [Cotización del dólar](#cotización-del-dólar)).

**Validación de objetivo:** el objetivo **siempre debe ser mayor que el Nº de cuotas**. Si no, se muestra un **modal de aviso** y no se permite continuar.

## Fórmulas base

- **Montos (fórmula progresiva / triangular):** la cuota `i` vale `k·i`, con `k = objetivo / Σ(1..n)`.
  - Σ(1..100) = 5.050 → k ≈ 0,198 → cuota 1 ≈ $0,20 … cuota 100 ≈ $19,80 (suma = $1.000, **antes de truncar**). Las cuotas **crecen**.
- **Sin decimales:** la cotización y los valores en dólares y en pesos **no llevan decimales**.
  - Cada cuota `k·i` se **trunca** al entero (redondeo hacia abajo), y **todo valor > 0 y < 1 se fuerza a 1** (nunca queda una cuota en $0).
- **Cierre exacto:** las cuotas **1 a N−1** se truncan; la **última (N) asume todo** el resto: `cuota N = objetivo − Σ(1..N−1)`. Así la suma da **exacta** = objetivo.
- **Fechas (cadencia):** cuota 1 = fecha de inicialización · cuota N = fecha de finalización.
  - Cadencia = días totales / (N−1). Con 200 días y 100 cuotas ≈ **2,02 días** entre cuotas.
- **Ritmo ideal:** 1 cuota cada ~2 días (en pantalla se redondea a **2 días**).
- **Balance:** `pagadas − esperadas`. **+** = adelantado (verde) · **−** = atrasado (rojo). Día 0 sin pagar = **0**.
- **"vence":** en cuotas **pendientes** muestra `vence <fecha> · faltan X días` (recalculado con el día actual). En **pagadas** muestra `Pagada · <fecha del pago>`.

## Tipo de plan (sistema de cuotas)

- **Progresivo** (creciente): la cuota `i` vale `k·i`, con `k = objetivo / Σ(1..n)`. Arrancás pagando poco y terminás pagando más.
- **Iguales** (fijo): `cuota = objetivo / n` truncada. Todas valen lo mismo; la **última absorbe el resto** para cerrar exacto.
- **Cambio a mitad de plan:** si ya pagaste cuotas y cambiás de sistema, **las pagadas quedan intactas** y **solo las pendientes se recalculan** para repartir lo que falta (`objetivo − pagado`). Se deja un aviso `--- CAMBIO DE SISTEMA ---` en el historial.
- **Borde:** si lo que falta por repartir es **menor** que las cuotas pendientes, **no se permite** cambiar (modal de aviso).

**Ejemplo** (objetivo 5.000 · 10 cuotas): **Progresivo** → 90, 181, 272, …, 914 · **Iguales** → 500 × 10.

## Cotización del dólar

- Al **crear** el reto se guarda la cotización del día (referencia inicial), como **número entero**.
- Al **pagar**, la app permite actualizar la cotización: si el dólar cambió, el pago se registra con la cotización **del momento de pagar** (no la de creación).
- La cotización vigente del dashboard **se actualiza a la última pagada**, hasta el próximo pago.
- Cada pago guarda su **propia cotización** (`rate`) en el historial, junto al monto en pesos (`monto u$s × rate`).

## Cadencia y vencimientos

Al **pagar**, se recalcula cuántos días quedan hasta la fecha de finalización y se reparten entre las cuotas que **siguen impagas**:

- **Las pagadas quedan fijas** con su fecha de pago (no se mueven).
- **Nueva cadencia** = días que faltan hasta el fin ÷ cuotas impagas.
- **La próxima impaga** vence `día del pago + 1·cadencia`, la siguiente `+ 2·cadencia`, y así hasta que la **última cae en la fecha de fin** (que no se mueve).
- Pagar de más → las que quedan **respiran más** (más días por cuota). Estar atrasado → menos días por cuota.

**Ejemplo:** objetivo 1.000 · 100 cuotas · inicio 1/ene · fin 20/jul (200 días). Hoy 1/ene pagás las cuotas 1 y 2 → quedan 98 impagas → cadencia = 200/98 ≈ 2,04 días → cuota 3 vence ~3/ene, cuota 4 ~5/ene, … cuota 100 el 20/jul.

## Gráfico circular (ideal vs pagado)

- Un **único gráfico circular** (anillo) muestra el avance contra el **100% del plan**:
  - **Anillo externo (dorado)** = avance **ideal según el día de hoy** (tiempo transcurrido entre inicio y fin).
  - **Anillo interno (verde/rojo)** = cuotas **pagadas**. **Verde** si vas adelantado, **rojo** si vas atrasado.
  - Pagado **mayor** que el ideal → adelantado · **menor** → atrasado.
- Se **refresca siempre**: en cada cambio (pago, recálculo) y en vivo con el paso de los días.

## Tabla de acciones

| Acción (botón) | Cuotas | Fechas | Cotización | Historial | Guardado |
|---|---|---|---|---|---|
| **Inicializar / Recalcular** | Regenera las 100 cuotas (todas **pendientes**), montos `k·i` progresivos truncados, última absorbe el resto | Cuota 1 = fecha de inicialización · cuota 100 = fin · resto a cadencia ~2 días | Guarda la cotización del día (creación) | **Vacía el historial** y añade separador `--- NUEVO PLAN ---` (objetivo u$s y $) | backup + nube |
| **Entrar / abrir reto** | Carga las cuotas y su estado (pagada/pendiente) | Si no tienen fecha, asigna cuota 1 = inicio → fin | Carga la cotización guardada | Carga el historial | — |
| **Pagar 2 cuotas (mismo día)** | Marca esas 2 como **pagadas**; las otras 98 quedan pendientes | Las 98 **impagas se re-esparcen**: la próxima vence `pago + 1·cadencia`, con `cadencia = díasFaltantes/98`; la última queda en fin. Las pagadas **conservan** su fecha | Se actualiza a la cotización del momento de pagar | Añade 2 filas `pago` (fecha, cotización, montos u$s/ARS, restante, acumulado) | backup + nube |
| **Pagar (modal "Pagar cuotas")** | Igual que Pagar, pero en 3 pasos: 1) pide **cotización del dólar** → 2) **elegís cuotas** → 3) **Pagar** | Idem | Si el dólar cambió, se actualiza antes de pagar | Idem | backup + nube |
| **Refrescar (render)** | Recalcula totales: pendientes, ahorrado, %, barra de progreso | Recalcula `faltan X días` y balance con el **día actual** | No toca | No toca | — |
| **Limpiar historial** | Regenera las 100 pendientes (igual que **Recalcular**) | Reasigna cuota 1 = inicio → fin | No toca | **Vacía el historial** y añade separador `--- NUEVO PLAN ---` (igual que Recalcular) | backup + nube |
| **Cambiar sistema** | Recalcula **solo las pendientes** con el nuevo sistema; las pagadas quedan intactas | No toca fechas | No toca | Añade aviso `--- CAMBIO DE SISTEMA ---` | backup + nube |

## Resumen de una línea

- **Configurar reto** = fijar los 6 obligatorios: objetivo, cuotas, tipo de plan (progresivo/iguales), fecha de inicio (editable), fecha de fin (editable) y cotización del día.
- **Montos** = **Progresivo** `k·i` o **Iguales** `objetivo/n`, **sin decimales** (mínimo $1), la **última absorbe el resto** (suma exacta).
- **Cambiar sistema** = recalculá solo las pendientes (las pagadas no se tocan) y deja un aviso en el historial.
- **Recalcular / Limpiar historial** = arrancar de cero (regenera montos y fechas, vacía el historial y deja un separador `NUEVO PLAN`).
- **Pagar** = tilda pagadas + re-esparce las impagas desde el día del pago (nueva cadencia) + suma al historial con la cotización del momento + cierra el modal y vuelve al dashboard.
