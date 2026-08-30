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

# asegurar que el hook pre-commit existe y apunta bien a la raíz del repo
mkdir -p "$ROOT/.git/hooks"
cat > "$ROOT/.git/hooks/pre-commit" <<'HOOK'
#!/usr/bin/env bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/scripts/bump-version.sh"
HOOK
chmod +x "$ROOT/.git/hooks/pre-commit"

# stage y commit (el hook estampa la versión automáticamente).
# Si no hay nada nuevo, git commit sale 1 y lo tratamos como "nada para commitear".
git add -A
if ! git commit -m "$MSG"; then
  echo "[push] nada para commitear (¿ya estaba actualizado?)"
  exit 0
fi

# push
git push origin HEAD

echo "[push] listo · ver despliegue en https://ahorro-corbaz.vercel.app"
