#!/usr/bin/env bash
# push.sh — bump de versión (hora Buenos Aires) + commit + push
# Uso:
#   ./push.sh                # commitea todos los cambios pendientes con un mensaje auto
#   ./push.sh "mi mensaje"   # commitea con el mensaje indicado
# La versión v.YYMMDD.HHMM se estampa sola vía scripts/bump-version.sh (hook pre-commit).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR" && pwd)"
cd "$ROOT"

MSG="${1:-chore: update dashboard}"

# asegurar que el hook pre-commit existe (se recrea aquí para no depender de .git)
mkdir -p "$ROOT/.git/hooks"
cat > "$ROOT/.git/hooks/pre-commit" <<'HOOK'
#!/usr/bin/env bash
bash "$(git rev-parse --git-common-path 2>/dev/null || echo .git)/../scripts/bump-version.sh"
HOOK
chmod +x "$ROOT/.git/hooks/pre-commit"

# stage y commit (el hook estampa la versión automáticamente)
git add -A
git commit -m "$MSG" || { echo "[push] nada para commitear (¿ya estaba actualizado?)"; }

# push
git push origin HEAD

echo "[push] listo · ver despliegue en https://ahorro-corbaz.vercel.app"
