#!/bin/bash
# Uso: ./publicar.sh
# Valida o agenda.json do repositório e publica (commit e push) junto com os PDFs em trabalhos/.
# O site não mostra o log nem os motivos das indisponibilidades: o build.py os remove da
# cópia publicada. Eles continuam no agenda.json do repositório.
set -e
cd "$(dirname "$0")"
if [ ! -f agenda.json ]; then echo "agenda.json não encontrado na pasta do repositório."; exit 1; fi
python3 build.py --verificar || { echo "Corrija a agenda e rode de novo. Nada foi publicado."; exit 1; }
git add agenda.json
[ -d trabalhos ] && git add trabalhos
if git diff --cached --quiet; then echo "Sem mudanças para publicar."; exit 0; fi
git commit -m "Atualizar agenda de defesas"
git push
echo "Publicado. O Pages atualiza em cerca de um minuto."
