#!/usr/bin/env bash
# bump-version.sh — estampa la versión de build en index.html
# Formato: v.YYMMDD.HHMM  (hora de Buenos Aires, GMT-3)
# Se invoca desde el hook pre-commit (.git/hooks/pre-commit) o desde push.sh,
# de modo que cada commit/push lleva la versión fresca de build.
set -euo pipefail

# resolver la ruta del repo aunque se llame desde .git/hooks
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HTML="$ROOT/index.html"

if [[ ! -f "$HTML" ]]; then
  echo "[bump-version] no se encontró index.html en $HTML" >&2
  exit 0  # no romper el commit si el archivo no está
fi

# versión en hora de Buenos Aires (GMT-3) → America/Argentina/Buenos_Aires
VER="v.$(TZ='America/Argentina/Buenos_Aires' date +%y%m%d.%H%M)"

# reemplazar la constante APP_VERSION (línea con const APP_VERSION = "...";)
if grep -qE 'const APP_VERSION = "v\.' "$HTML"; then
  # macOS sed: usar archivo temporal explícito
  sed -i '' -E "s/const APP_VERSION = \"v\.[0-9]+\.[0-9]+\";/const APP_VERSION = \"$VER\";/" "$HTML"
else
  echo "[bump-version] no se encontró const APP_VERSION en index.html" >&2
  exit 0
fi

# estampar también en el badge del HTML (por si se renderizara sin JS)
if grep -q 'id="navVer"' "$HTML"; then
  sed -i '' -E "s/(id=\"navVer\"[^>]*)>v\.[0-9]+\.[0-9]+</\1>$VER</" "$HTML"
fi

# incluir el cambio en el commit que se está creando
git add "$HTML"
echo "[bump-version] versión estampada: $VER (Buenos Aires, GMT-3)"
