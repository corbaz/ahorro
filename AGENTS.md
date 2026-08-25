# AGENTS.md — Reto de Ahorro Dashboard

> Instrucciones para cualquier agente de IA (Claude, Codex, Cursor, etc.) que trabaje en este repositorio. Léelo entero antes de tocar código.

## Qué es esto

Conversión del libro de Excel `ahorro.xlsm` (con macros VBA) a una **app web autocontenida** en un único archivo `index.html`, sin dependencias ni paso de build. El objetivo es replicar —y refactorizar— las utilidades de Excel y las macros de VBA en un dashboard profesional.

El archivo origen vive en `/Users/jucorbaz/www/dsh/ahorro.xlsm` y NO se versiona aquí (es binario grande). El dashboard sí.

- **Repo:** https://github.com/corbaz/ahorro
- **Despliegue (Vercel, auto-deploy por Git):** https://ahorro-corbaz.vercel.app

## Estado de la conversión (VBA → JS)

| Macro / hoja VBA | Implementación en el dashboard | Estado |
|---|---|---|
| Hoja **Ahorro** (objetivo, Nº depósitos, cuotas) | Estado `state.objetivo`, `state.numDep`, `state.cuotas[]` | ✅ |
| Hoja **backup** (copia de seguridad) | `hacerBackup()` → `localStorage` + Export/Import JSON | ✅ |
| Hoja **historial** (9 columnas, acumula pagos) | `state.historial[]` + tabla "Historial de pagos" | ✅ |
| `Módulo1.Resetear()` (calendario triangular + separador en historial) | `resetear()` + `recalcular()` con modal de confirmación | ✅ |
| `UserForm1` (modal "tildá las que pagaste") | Modal "Pagar cuotas" (checkboxes + cotización + Comprar) | ✅ |
| `UserForm1.CommandButton1_Click` (registra pagos, recalcula después) | `registrarPagos()` (9 columnas, restante/acumulado post-pago) | ✅ |
| `Módulo1.ContarPendientes()` | KPI en vivo + badge en la navbar | ✅ |
| `Hoja1.Worksheet_Change` (recalc/backup por cambio) | Recalc al confirmar; backup al pagar | ✅ |

## Reglas para modificar

1. **Fidelidad al VBA primero.** Si una lógica parece rara, comparala con el VBA antes de "mejorarla". El calendario triangular (`k = objetivo / Σ(1..n)`, `per = Fix(diff/n)`, último absorbe el resto) es intencional y debe coincidir con el Excel.
2. **Sin build, sin dependencias.** Todo en `index.html`. No agregues npm, bundlers, ni frameworks. Fuentes e íconos van por CDN o inline.
3. **Datos persistentes.** Cualquier cambio de estado que el VBA persistiría (pago, recálculo) debe llamar a `hacerBackup()`. El `state.historial` se persiste junto al resto.
4. **Diseño.** Mantén el lenguaje visual: Ethereal Glass (OLED + esmeralda), Asymmetrical Bento, Double-Bezel, modales glass. Curvas `cubic-bezier(0.32,0.72,0,1)` y `cubic-bezier(0.16,1,0.3,1)`. Solo animar `transform`/`opacity`. `backdrop-filter` solo en nav/modales fijos. Fonts: Plus Jakarta Sans + Space Grotesk. Sin Inter/Roboto/Arial.
5. **i18n.** La UI es en español argentino (`es-AR`), moneda con `toLocaleString("es-AR")`. No traduzcas sin pedirlo.

## Cómo verificar cambios

```bash
cd ahorro-dashboard
python3 -m http.server 4321
# → http://127.0.0.1:4321/index.html
```

Checklist tras tocar JS:

- [ ] `node --check` pasa sobre el bloque `<script>` (extraerlo y validarlo).
- [ ] No hay errores en la consola del navegador.
- [ ] Recalcular regenera las cuotas y deja separador "NUEVO PLAN" en historial.
- [ ] Comprar cuota → appenda registro con las 9 columnas; restante/acumulado reflejan el estado **después** del pago.
- [ ] Recargar la página restaura objetivo, cuotas e historial desde `localStorage`.

## Estructura

```
ahorro-dashboard/
├── index.html             # app completa (HTML + CSS + JS en un archivo)
├── README.md              # documentación para usuarios
├── AGENTS.md              # este archivo
├── push.sh                # helper: bump versión + commit + push (un paso)
├── scripts/
│   └── bump-version.sh    # estampa v.YYMMDD.HHMM (GMT-3 BA) en index.html
└── .git/hooks/pre-commit  # corre bump-version en cada commit (no se versiona)
```

El archivo `ahorro.xlsm` original NO se versiona (origen binario, fuera del repo).

## Versión de build

El dashboard muestra arriba a la derecha un badge con la versión, formato **`v.YYMMDD.HHMM`** en hora de **Buenos Aires (GMT-3)**. Se actualiza **automáticamente en cada push**:

- El hook `pre-commit` corre `scripts/bump-version.sh`, que estampa la hora actual de BA en `const APP_VERSION` (y el badge `navVer`) dentro de `index.html` y lo incluye en el commit.
- Cada commit / push lleva entonces una versión fresca.

Para pushear con versión nueva en un paso: `./push.sh "mensaje"` (o `./push.sh` para mensaje auto). Manual: `git add -A && git commit -m "..." && git push` (el hook igual estampa).

## Despliegue (Vercel)

El repo está conectado a **Vercel** con auto-deploy por Git: cada push a `master` despliega automáticamente a **https://ahorro-corbaz.vercel.app**. El dominio viejo `ahorro-mu.vercel.app` fue eliminado.

## Keys de localStorage

| Clave | Contenido |
|---|---|
| `reto-ahorro-dashboard/v2` | `{objetivo, numDep, dolar, cuotas[], historial[], ts}` |

Al cambiar el schema del estado, subí la versión de la clave (`/v3`) para no mezclar datos viejos.

## Supabase (login + sync nube)

- **Migración SQL**: `supabase/migrations/0001_init.sql` — tablas `planes`, `cuotas`, `historial` + RLS (`auth.uid() = user_id`)
- **SDK JS**: `supabase-sync.js` — carga `@supabase/supabase-js` UMD por CDN, login Google, sync por usuario
- **Config local**: `supabase/config.json` (NO se versiona, está en .gitignore) — `{projectUrl, anonKey}`
- Si `config.json` tiene valores placeholder (`XXXXX`), la app queda en modo local (sin login)
- `syncToCloud()` se llama tras cada cambio de estado (pago, recálculo, import) si hay sesión

## Próximos pasos sugeridos

- Export del historial a CSV (para re-abrirlo en Excel).
- Gráfico de progreso acumulado.
- Importar estado directamente desde un `.xlsm` nuevo.
