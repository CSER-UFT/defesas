# Agenda de defesas de TCC

Página única (`index.html`) para agendar defesas de TCC 1 e TCC 2, de segunda a sexta, das 08:00 às 18:00, com início de 15 em 15 minutos e duração livre. Não usa servidor nem banco de dados: os dados ficam em um arquivo JSON no seu computador.

## Como usar

1. Abra a página (GitHub Pages ou o `index.html` direto no navegador).
2. Em **Arquivo**, escolha **Novo arquivo** ou **Abrir arquivo** (o JSON da agenda).
3. Ative **Modo edição** para criar, arrastar e editar defesas. No Chrome e no Edge a gravação no arquivo é automática; no Firefox e no Safari o arquivo é baixado ao salvar.

## Recursos

- Fase automática: o aluno passa para TCC 2 no dia seguinte à defesa de TCC 1, com ajuste manual e defesa combinada (TCC 1 e 2).
- Conflitos de banca, sala e indisponibilidade sinalizados em vermelho, e horários livres em comum entre professores.
- Card de divulgação em PNG (1080x1080) com paleta sorteada.
- Atas e fichas de avaliação em PDF, em um ZIP, para uma defesa ou para um período.
- Impressão em planilha e exportação em CSV.
- Calendário assinável: o botão **Calendário** copia o endereço do `.ics` (de um professor, ou de todas as defesas) para assinar no Google Agenda (Outras agendas, +, Do URL), Outlook ou celular. Os calendários são gerados a cada publicação e o aplicativo de agenda atualiza sozinho.
- Link de uma defesa: no card de divulgação, **Copiar link** gera `d/<id>.html`, que mostra aluno, data e local na prévia do WhatsApp e abre a agenda com o card da defesa.
- No celular, a semana aparece como lista por dia, com os horários livres do professor filtrado.
- Agenda de um professor por link: escolha **Agenda de ...** na tela e clique em **Copiar link**. O link tem a forma `?prof=tiago_almeida` (nome curto do professor), abre só as defesas dele com os horários livres em verde, e a impressão, o CSV e o ZIP passam a seguir o mesmo filtro.

## Publicação

`./publicar.sh` copia o arquivo de trabalho para `agenda.json` sem o log e sem o motivo das indisponibilidades, valida com `build.py --verificar` e faz o push. A Action roda `build.py`, que valida de novo e monta o site em `_site/` com os calendários (`ics/`) e as páginas de cada defesa (`d/`). Se a agenda tiver algum problema (defesa fora do horário, em fim de semana, professor inexistente, log não vazio), nada é publicado.

## Privacidade

O JSON da agenda tem nomes de alunos, títulos e bancas. Ele não deve ser publicado: o `.gitignore` já ignora `*.json`. Os dados que vêm na página são apenas fictícios, para teste.

## Licença e créditos

CSER UFT. A biblioteca pdf-lib (MIT) e o logo das atas ficam em `pdflib_recursos.js`, carregado só quando um PDF é gerado; os PDFs continuam saindo sem depender da internet, desde que o arquivo esteja na mesma pasta do `index.html`.
