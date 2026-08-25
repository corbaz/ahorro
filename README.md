# Reto de Ahorro · Dashboard

Una **app web autocontenida** para seguir tu plan de ahorro cuota por cuota — con cuotas crecientes, historial de pagos y conversión a pesos. Sin dependencias, sin paso de build.

> Un solo archivo (`index.html`) que podés abrir en cualquier navegador moderno.

🔗 **Desplegado en vivo:** https://ahorro-corbaz.vercel.app
📦 **Código:** https://github.com/corbaz/ahorro

## Ruta rápida

1. Abrí `index.html` en tu navegador (o servilo, ver abajo).
2. Al primer arranque verás un plan de ejemplo: objetivo **u$s 100.000**, 100 cuotas, **cuota 25 ya pagada** y su registro en el historial.
3. Pagá más cuotas desde el botón **Pagar cuotas** (abre un modal donde tildás las que pagaste). Cambiá la **cotización dólar** y los totales se recalculan en vivo.
4. Todo se guarda solo en tu navegador (`localStorage`); al recargar sigue igual.

```bash
# opcional: servirlo
cd ahorro-dashboard
python3 -m http.server 4321
# → http://127.0.0.1:4321/index.html
```

## De qué se trata

Un **desafío de ahorro**: definís un **Total Objetivo** y un **Nº de Depósitos**, y la app reparte el monto en cuotas crecientes (`cuota n = k·n`, `k = objetivo / Σ(1..n)`). A medida que pagás las cuotas, el dashboard lleva el progreso (ahorrado vs. restante) y **acumula cada pago en un historial** con fecha, cotización dólar y montos en u$s / $.

## Funciones

- **KPIs en vivo**: total objetivo, depósitos, ahorrado y restante (en dólares y pesos).
- **Grilla de cuotas** con filtro Todas / Pendientes / Pagadas.
- **Modal "Pagar cuotas"**: tildás las que pagaste y se registran solas.
- **Historial de pagos** con las 9 columnas (fecha, cuota, cotización, montos en u$s y $, restante y acumulado).
- **Recalcular** el plan con confirmación; queda registrado en el historial.
- **Autoguardado** en el navegador + **exportar/importar** el progreso en JSON.

## Columnas del historial

| Fecha | N.º cuota | Cotización u$s | Cuota u$s | Cuota $ | Restante u$s | Acumulado u$s | Restante $ | Acumulado $ |
|---|---|---|---|---|---|---|---|---|

- **Restante** (u$s / $) en rojo · **Acumulado** (u$s / $) en verde.
- Cada pago agrega una fila con el estado **después** de pagar esa cuota.
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
├── index.html             # la app completa (HTML + CSS + JS en un archivo)
├── README.md              # este archivo
├── AGENTS.md              # instrucciones para agentes de IA que trabajen acá
├── push.sh                # helper: bump versión + commit + push (un paso)
└── scripts/
    └── bump-version.sh    # estampa v.YYMMDD.HHMM (GMT-3 BA) en index.html
```

> Las notas técnicas para desarrolladores (mapeo de origen, reglas de edición) están en `AGENTS.md`.

## Versión de build

El dashboard muestra arriba a la derecha un badge con la versión, formato **`v.YYMMDD.HHMM`** en hora de **Buenos Aires (GMT-3)**. Se actualiza **automáticamente en cada push**:

- El hook `pre-commit` corre `scripts/bump-version.sh`, que estampa la hora actual de BA en `const APP_VERSION` dentro de `index.html` y lo incluye en el commit.
- Por eso cada commit (y cada push) lleva una versión fresca.

Para pushear con versión nueva en un solo paso:

```bash
./push.sh                    # mensaje auto
./push.sh "mi mensaje"       # mensaje propio
```

O manual (el hook igual estampa la versión):

```bash
git add -A && git commit -m "..." && git push
```

## Despliegue (Vercel)

El repo está conectado a **Vercel** (auto-deploy por Git): cada push a `master` despliega automáticamente.

- URL pública: **https://ahorro-corbaz.vercel.app**
- El dominio viejo `ahorro-mu.vercel.app` fue eliminado.

## Datos persistentes

| Clave | Contenido |
|---|---|
| `reto-ahorro-dashboard/v2` | `{objetivo, numDep, dolar, cuotas[], historial[], ts}` |

Usá **Exportar JSON** para respaldar y **Importar JSON** para restaurar en otra máquina/navegador.

## Verificación

- ✅ Calendario de cuotas correcto (n=2 → 4M/8M; n=5 → 800K/4M; n=100 → 10…1990, total 100.000).
- ✅ Pagar cuota registra en historial con las 9 columnas; restante/acumulado recalculados después.
- ✅ Recalcular con confirmación + separador "NUEVO PLAN".
- ✅ Backup automático + restauración al recargar + export/import JSON.
- ✅ Modales abren/cierran (click, Esc, click-fuera); 0 errores de consola.
- ✅ **Login con Google + sync en la nube** (Supabase) — cada usuario ve solo sus datos (RLS).

## Login y sync en la nube (Supabase)

La app funciona **sin cuenta** (modo local, `localStorage`). Para guardar el progreso en la nube y verlo desde cualquier dispositivo:

### Setup (una sola vez)

1. Creá un proyecto free en [supabase.com](https://supabase.com) → obtené **Project URL** y **anon key**
2. Copialos en `supabase/config.json`:
   ```json
   { "projectUrl": "https://xxxxx.supabase.co", "anonKey": "eyJxxxxx" }
   ```
3. Corré la migración de la base de datos:
   ```bash
   supabase db push    # o pegá supabase/migrations/0001_init.sql en el SQL Editor
   ```
4. Configurá **Google OAuth** en Supabase Dashboard → Authentication → Providers → Google
   (necesitás un OAuth Client ID de Google Cloud Console — [guía](https://supabase.com/docs/guides/auth/social-login/auth-google))

### Cómo funciona

- Al hacer click en **Ingresar** → se abre el overlay → **Ingresar con Google**
- Cada usuario logueado ve **solo sus propios datos** (Row Level Security en Postgres)
- Los pagos y recálculos se sincronizan a la nube automáticamente
- Al abrir desde otro dispositivo, tu progreso se descarga solo

### Sin cuenta

Si no configurás Supabase, la app sigue funcionando en modo local (todo en `localStorage`). El botón "Ingresar" no aparece hasta que `supabase/config.json` tenga valores reales.

## Próximos pasos

- [ ] Export del historial a **CSV** (para abrirlo en una hoja de cálculo).
- [ ] **Gráfico** de progreso acumulado.
- [ ] Importar/exportar el progreso entre dispositivos.

---

Reto de Ahorro · por Julio Cesar Corbaz · [@corbaz](https://github.com/corbaz)
