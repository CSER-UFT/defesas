# Agenda de defesas

Página única (`index.html`) para agendar defesas de TCC 1 e TCC 2, e qualificações e defesas de mestrado e doutorado, de segunda a sexta, das 08:00 às 18:00, com início de 15 em 15 minutos e duração livre. Não usa servidor nem banco de dados: os dados ficam em um arquivo JSON no seu computador.

## Como usar

1. Abra a página (GitHub Pages ou o `index.html` direto no navegador).
2. Em **Arquivo**, escolha **Novo arquivo** ou **Abrir arquivo** (o JSON da agenda).
3. Ative **Modo edição** para criar, arrastar e editar defesas. No Chrome e no Edge a gravação no arquivo é automática; no Firefox e no Safari o arquivo é baixado ao salvar.

## Recursos

- Níveis: cada aluno é de graduação (TCC), mestrado ou doutorado. Na grade, a cor indica o nível (azul TCC, laranja mestrado, roxo doutorado), o selo indica a etapa (T1, T2, T1+2, Q, D) e a borda tracejada marca a primeira etapa (TCC1 ou qualificação). Atas e fichas em PDF, por enquanto, só para TCC.
- Fase automática: o aluno passa para TCC 2 no dia seguinte à defesa de TCC 1, com ajuste manual e defesa combinada (TCC 1 e 2).
- Conflitos de banca, sala e indisponibilidade sinalizados em vermelho, e horários livres em comum entre professores.
- Card de divulgação em PNG (1080x1080) com paleta sorteada.
- Atas e fichas de avaliação em PDF, em um ZIP, para uma defesa ou para um período.
- Impressão em planilha e exportação em CSV.
- Calendário assinável: o botão **Calendário** copia o endereço do `.ics` (de um professor, ou de todas as defesas) para assinar no Google Agenda (Outras agendas, +, Do URL), Outlook ou celular. Os calendários são gerados a cada publicação e o aplicativo de agenda atualiza sozinho.
- Link de uma defesa: no card de divulgação, **Copiar link** gera `d/<id>.html`, que mostra aluno, data e local na prévia do WhatsApp e abre a agenda com o card da defesa.
- Link do local: na aba Salas, cada sala pode ter um link do Meet (sala Remoto) ou do Google Maps (salas físicas). Ele aparece no card da defesa, na lista do celular, no link da defesa e no calendário (o Meet vai como local do evento).
- PDF do trabalho: no diálogo da defesa, **Escolher PDF** copia o arquivo para `trabalhos/AAAAMMDD_nome_do_aluno.pdf` na pasta do repositório (no primeiro uso o navegador pede para escolher essa pasta). O `publicar.sh` envia o PDF junto, e ele fica **público** no site. Mesmo apagado depois, o arquivo continua no histórico do Git.
- No celular, a semana aparece como lista por dia, com os horários livres do professor filtrado.
- Agenda de um professor por link: escolha **Agenda de ...** na tela e clique em **Copiar link**. O link tem a forma `?prof=tiago_almeida` (nome curto do professor), abre só as defesas dele com os horários livres em verde, e a impressão, o CSV e o ZIP passam a seguir o mesmo filtro.

## Publicação

O arquivo de trabalho é o próprio `agenda.json` do repositório. `./publicar.sh` valida a agenda com `build.py --verificar` e faz commit e push do `agenda.json` e dos PDFs em `trabalhos/`. A Action roda `build.py`, que valida de novo e monta o site em `_site/` com os calendários (`ics/`) e as páginas de cada defesa (`d/`). A cópia publicada no site sai sem o log e sem os motivos das indisponibilidades, mas eles ficam visíveis no `agenda.json` do repositório. Se a agenda tiver algum problema (defesa fora do horário, em fim de semana, professor inexistente, PDF ausente), nada é publicado.

## Privacidade

O `agenda.json` tem nomes de alunos, títulos, bancas, o log de alterações e os motivos das indisponibilidades, e fica público no repositório (o site esconde o log e os motivos, o repositório não). Os PDFs em `trabalhos/` também são públicos e permanecem no histórico do Git. Os dados embutidos no `index.html`, usados quando nenhuma agenda é carregada, são fictícios, para teste.

## Licença e créditos

CSER UFT. A biblioteca pdf-lib (MIT) e o logo das atas ficam em `pdflib_recursos.js`, carregado só quando um PDF é gerado; os PDFs continuam saindo sem depender da internet, desde que o arquivo esteja na mesma pasta do `index.html`.
