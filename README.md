# Reto de Ahorro · Dashboard

Una **app de dashboard web autocontenida** que convierte un libro de Excel con macros VBA (`ahorro.xlsm`) en una interfaz profesional — sin Excel, sin dependencias, sin paso de build.

> Un solo archivo (`index.html`) que podés abrir en cualquier navegador moderno.

## Ruta rápida

1. Abrí `index.html` en tu navegador (o servilo, ver abajo).
2. Al primer arranque verás el estado real del Excel: objetivo **u$s 100.000**, 100 cuotas, **cuota 25 ya pagada** y su registro en el historial.
3. Pagá más cuotas desde el botón **Pagar cuotas** (abre un modal, igual que el `UserForm1` de Excel). Cambiá la **cotización dólar** y los totales se recalculan en vivo.
4. Todo se guarda solo en tu navegador (`localStorage`); al recargar sigue igual.

```bash
# opcional: servirlo
cd ahorro-dashboard
python3 -m http.server 4321
# → http://127.0.0.1:4321/index.html
```

## De qué se trata

Un **desafío de ahorro triangular**: definís un **Total Objetivo** y un **Nº de Depósitos**, y la app reparte el monto en cuotas crecientes (`cuota n = k·n + per`, `k = objetivo / Σ(1..n)`). A medida que pagás las cuotas, el dashboard lleva el progreso (ahorrado vs. restante) y **acumula cada pago en un historial** con fecha, cotización dólar y montos en u$s / $.

## Qué refactoriza del Excel

| En Excel (VBA) | En el dashboard |
|---|---|
| Hoja **Ahorro** (objetivo, Nº depósitos, cuotas) | KPIs + grilla de cuotas |
| Hoja **backup** (copia de seguridad) | Autoguardado en `localStorage` + **Exportar/Importar JSON** |
| Hoja **historial** (9 columnas, acumula pagos) | Tabla **Historial de pagos** con las 9 columnas |
| Macro `Resetear()` (recalcula + separador en historial) | **Recalcular** con modal de confirmación + separador "NUEVO PLAN" |
| `UserForm1` (modal "tildá las que pagaste") | **Modal "Pagar cuotas"** (checkboxes + cotización + Comprar) |
| `CommandButton1_Click` (registra pagos, recalcula después) | `registrarPagos()` — 9 columnas, restante/acumulado post-pago |
| `ContarPendientes()` | KPI en vivo + badge en la navbar |

## Columnas del historial

Igual que tu hoja Excel:

| Fecha | N.º cuota | Cotización u$s | Cuota u$s | Cuota $ | Restante u$s | Acumulado u$s | Restante $ | Acumulado $ |
|---|---|---|---|---|---|---|---|---|

- **Restante** (u$s / $) en rojo · **Acumulado** (u$s / $) en verde.
- Cada pago appenda una fila con el estado **después** de pagar esa cuota.
- Los recálculos dejan un separador **`--- NUEVO PLAN ---`** (barra azul).

## Fórmula del calendario

```
tri   = n · (n + 1) / 2
k     = round(objetivo / tri)
diff  = objetivo − k·tri
per   = Fix(diff / n)          ' trunc hacia cero
cuota_n = k · n + per          ' el último absorbe el resto
```

## Diseño

Dashboard de nivel agencia, construido con las skills `high-end-visual-design` + `impeccable`:

- **Vibe:** Ethereal Glass (OLED oscuro + mesh radial esmeralda).
- **Layout:** Asymmetrical Bento + **modales** glass (overlay con `backdrop-blur`).
- **Craft:** Double-Bezel, Button-in-Button, eyebrow tags, curvas `cubic-bezier(0.32,0.72,0,1)`, scroll-reveal con `IntersectionObserver`, animaciones solo `transform`/`opacity`.
- **Tipografías:** Plus Jakarta Sans + Space Grotesk (números). Íconos SVG ultra-ligeros hechos a mano.

## Estructura del repo

```
ahorro-dashboard/
├── index.html      # la app completa (HTML + CSS + JS en un archivo)
├── README.md       # este archivo
└── AGENTS.md       # instrucciones para agentes de IA que trabajen acá
```

El archivo `ahorro.xlsm` original no se versiona (es binario grande y es la fuente, no el producto).

## Datos persistentes

| Clave | Contenido |
|---|---|
| `reto-ahorro-dashboard/v2` | `{objetivo, numDep, dolar, cuotas[], historial[], ts}` |

Usá **Exportar JSON** para respaldar y **Importar JSON** para restaurar en otra máquina/navegador.

## Verificación

- ✅ Calendario triangular coincide con el Excel (n=2 → 4M/8M; n=5 → 800K/4M; n=100 → 10…1990, total 100.000).
- ✅ Pagar cuota registra en historial con las 9 columnas; restante/acumulado recalculados después.
- ✅ Recalcular con confirmación + separador "NUEVO PLAN".
- ✅ Backup automático + restauración al recargar + export/import JSON.
- ✅ Modales abren/cierran (click, Esc, click-fuera); 0 errores de consola.

## Próximos pasos

- [ ] Export del historial a **CSV** (para re-abrirlo en Excel).
- [ ] **Gráfico** de progreso acumulado.
- [ ] Importar estado directamente desde un `.xlsm` nuevo.

---

Convertido desde `ahorro.xlsm` por Julio Cesar Corbaz · [@corbaz](https://github.com/corbaz)
