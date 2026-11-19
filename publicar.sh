#!/bin/bash
# Uso: ./publicar.sh [caminho/do/agenda.json de trabalho]
# Gera agenda.json público (sem o log de alterações), faz commit e push.
set -e
cd "$(dirname "$0")"
ORIGEM="${1:-$HOME/agenda/agenda_trabalho.json}"
if [ ! -f "$ORIGEM" ]; then echo "Arquivo não encontrado: $ORIGEM"; exit 1; fi
python3 - "$ORIGEM" agenda.json <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
d["log"] = []
json.dump(d, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
PY
git add agenda.json
if git diff --cached --quiet; then echo "Sem mudanças para publicar."; exit 0; fi
git commit -m "Atualizar agenda de defesas"
git push
echo "Publicado. O Pages atualiza em cerca de um minuto."
