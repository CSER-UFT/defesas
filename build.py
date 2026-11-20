#!/usr/bin/env python3
"""Valida o agenda.json público e monta o site em _site/.

Uso:
  python3 build.py              valida e monta _site/ (usado pela Action)
  python3 build.py --verificar  só valida (usado pelo publicar.sh antes do push)

Gera, além dos arquivos da página:
  ics/<professor>.ics  calendário assinável com as defesas de cada professor
  ics/todas.ics        calendário com todas as defesas
  d/<id>.html          link curto de cada defesa, com prévia (título e data) para WhatsApp e afins
  trabalhos/*.pdf      PDFs dos trabalhos referenciados por alguma defesa
"""
import datetime as dt
import html
import json
import os
import re
import shutil
import sys
import unicodedata

URL = "https://cser-uft.github.io/defesas/"
FUSO = dt.timezone(dt.timedelta(hours=-3))  # Palmas (America/Araguaina), sem horário de verão
ARQUIVOS = ["index.html", "agenda.json", "pdflib_recursos.js"]
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]


def slug(t):
    """Igual à função slug() do index.html (precisa gerar o mesmo nome)."""
    t = unicodedata.normalize("NFD", str(t))
    t = re.sub(r"[\u0300-\u036f]", "", t).lower()
    t = re.sub(r"[^a-z0-9]+", "_", t).strip("_")[:40]
    return t or "x"


def id_seguro(i):
    return re.sub(r"[^A-Za-z0-9_]", "_", str(i))


def quando(d):
    dia, mes, ano = map(int, d["data"].split("/"))
    h, m = map(int, d["inicio"].split(":"))
    ini = dt.datetime(ano, mes, dia, h, m, tzinfo=FUSO)
    return ini, ini + dt.timedelta(minutes=int(d["duracao"]))


def verificar(a, base="."):
    erros = []
    if a.get("formato") != "agendatcc":
        erros.append("o arquivo não é uma agenda (campo formato)")
    profs = {p["id"] for p in a.get("professores", [])}
    alunos = {x["id"] for x in a.get("alunos", [])}
    salas = {x["id"] for x in a.get("salas", [])}
    for x in a.get("alunos", []):
        for campo in ("orientadorId", "coorientadorId"):
            if x.get(campo) and x[campo] not in profs:
                erros.append("aluno %s: %s inexistente" % (x["nome"], campo))
    for d in a.get("defesas", []):
        nome = d.get("id")
        try:
            ini, fim = quando(d)
        except Exception:
            erros.append("defesa %s: data ou horário inválido" % nome)
            continue
        if ini.weekday() > 4:
            erros.append("defesa %s: %s não é dia útil" % (nome, d["data"]))
        if ini.minute % 15:
            erros.append("defesa %s: início fora dos passos de 15 minutos" % nome)
        if int(d["duracao"]) < 15:
            erros.append("defesa %s: duração menor que 15 minutos" % nome)
        if ini.hour < 8 or fim.hour * 60 + fim.minute > 18 * 60 or fim.date() != ini.date():
            erros.append("defesa %s: fora da janela das 08:00 às 18:00" % nome)
        if d.get("alunoId") not in alunos:
            erros.append("defesa %s: aluno inexistente" % nome)
        if not d.get("fases") or any(f not in ("TCC1", "TCC2") for f in d["fases"]):
            erros.append("defesa %s: fases inválidas" % nome)
        if not d.get("bancaIds") or any(b not in profs for b in d["bancaIds"]):
            erros.append("defesa %s: banca vazia ou com professor inexistente" % nome)
        if d.get("salaId") and d["salaId"] not in salas:
            erros.append("defesa %s: sala inexistente" % nome)
        pdf = d.get("pdf")
        if pdf:
            if not re.fullmatch(r"trabalhos/[A-Za-z0-9_]+\.pdf", pdf):
                erros.append("defesa %s: nome de PDF inválido (%s)" % (nome, pdf))
            elif not os.path.isfile(os.path.join(base, pdf)):
                erros.append("defesa %s: PDF não encontrado em %s" % (nome, pdf))
            elif os.path.getsize(os.path.join(base, pdf)) > 45 * 1024 * 1024:
                erros.append("defesa %s: %s passa de 45 MB" % (nome, pdf))
    for x in a.get("salas", []):
        if x.get("link") and not x["link"].startswith("https://"):
            erros.append("sala %s: o link precisa começar com https://" % x["nome"])
    return erros


class Agenda:
    def __init__(self, a):
        self.a = a
        self.prof = {p["id"]: p for p in a["professores"]}
        self.aluno = {x["id"]: x for x in a["alunos"]}
        self.sala = {x["id"]: x for x in a["salas"]}

    def nome_prof(self, i):
        p = self.prof.get(i)
        return p["nome"] if p else "?"

    def participa(self, d, pid):
        al = self.aluno.get(d["alunoId"], {})
        return pid in d["bancaIds"] or pid in (al.get("orientadorId"), al.get("coorientadorId"))

    def fase(self, d):
        return "TCC 1 e 2" if len(d["fases"]) == 2 else d["fases"][0].replace("TCC", "TCC ")

    def info(self, d):
        al = self.aluno.get(d["alunoId"], {})
        s = self.sala.get(d.get("salaId") or "", {})
        sala = s.get("nome", "A definir")
        return {
            "aluno": al.get("nome", "?"),
            "titulo": d.get("titulo") or "",
            "orient": self.nome_prof(al.get("orientadorId")),
            "coorient": self.nome_prof(al["coorientadorId"]) if al.get("coorientadorId") else "",
            "banca": ", ".join(self.nome_prof(b) for b in d["bancaIds"]),
            "sala": sala,
            "link": s.get("link", ""),
            "remoto": bool(re.search(r"meet\.google\.com|zoom\.us|teams\.microsoft", s.get("link", ""))),
            "pdf": URL + d["pdf"] if d.get("pdf") else "",
        }


def esc_ics(t):
    return str(t).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def dobrar(linha):
    """Quebra linhas de .ics em até 75 bytes, sem partir caracteres UTF-8."""
    out, atual, n = [], "", 0
    for ch in linha:
        b = len(ch.encode("utf-8"))
        if n + b > (75 if not out else 74):
            out.append(atual)
            atual, n = "", 0
        atual += ch
        n += b
    out.append(atual)
    return "\r\n ".join(out)


def ics(ag, defesas, nome_cal, agora):
    fmt = lambda t: t.astimezone(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CSER UFT//Agenda de defesas//PT",
         "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + esc_ics(nome_cal),
         "X-WR-TIMEZONE:America/Araguaina", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H"]
    for d in defesas:
        ini, fim = quando(d)
        i = ag.info(d)
        desc = ["Aluno: " + i["aluno"]]
        if i["titulo"]:
            desc.append("Título: " + i["titulo"])
        desc.append("Orientador: " + i["orient"])
        if i["coorient"]:
            desc.append("Coorientador: " + i["coorient"])
        desc += ["Banca: " + i["banca"], "Local: " + i["sala"]]
        if i["link"]:
            desc.append(("Videoconferência: " if i["remoto"] else "Mapa: ") + i["link"])
        if i["pdf"]:
            desc.append("Trabalho (PDF): " + i["pdf"])
        desc.append(URL + "d/" + id_seguro(d["id"]) + ".html")
        L += ["BEGIN:VEVENT", "UID:defesa-" + id_seguro(d["id"]) + "@cser-uft.github.io", "DTSTAMP:" + fmt(agora),
              "DTSTART:" + fmt(ini), "DTEND:" + fmt(fim),
              "SUMMARY:" + esc_ics("Defesa de " + ag.fase(d) + ": " + i["aluno"]),
              "LOCATION:" + esc_ics(i["link"] if i["remoto"] else i["sala"]), "DESCRIPTION:" + esc_ics("\n".join(desc)),
              "URL:" + URL + "d/" + id_seguro(d["id"]) + ".html", "END:VEVENT"]
    L.append("END:VCALENDAR")
    return "\r\n".join(dobrar(x) for x in L) + "\r\n"


def pagina_defesa(ag, d):
    ini, _ = quando(d)
    i = ag.info(d)
    titulo = "Defesa de %s: %s" % (ag.fase(d), i["aluno"])
    quando_txt = "%d de %s às %dh%s" % (ini.day, MESES[ini.month - 1], ini.hour, "%02d" % ini.minute if ini.minute else "")
    desc = quando_txt + ", " + i["sala"] + (". " + i["titulo"] if i["titulo"] else "")
    destino = "../?defesa=" + id_seguro(d["id"])
    e = lambda t: html.escape(t, quote=True)
    return """<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>{t}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:type" content="website">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{u}">
<meta name="description" content="{d}">
<meta http-equiv="refresh" content="0; url={r}">
<script>location.replace({rj});</script>
</head><body style="font-family:system-ui,sans-serif;padding:24px">
<p><b>{t}</b><br>{d}</p><p><a href="{r}">Abrir na agenda</a>{x}</p>
</body></html>
""".format(t=e(titulo), d=e(desc), u=e(URL + "d/" + id_seguro(d["id"]) + ".html"), r=e(destino), rj=json.dumps(destino),
               x="".join(' · <a href="%s">%s</a>' % (e(u), e(t)) for t, u in (
                   (("Entrar na videoconferência" if i["remoto"] else "Ver no mapa"), i["link"]), ("Baixar o TCC (PDF)", i["pdf"])) if u))


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(base, "agenda.json"), encoding="utf-8") as f:
        a = json.load(f)
    erros = verificar(a, base)
    if erros:
        print("agenda.json com problemas:")
        for x in erros:
            print("  " + x)
        sys.exit(1)
    print("agenda.json ok: %d defesas, %d alunos, %d professores." % (len(a["defesas"]), len(a["alunos"]), len(a["professores"])))
    if "--verificar" in sys.argv:
        return
    if a.get("log") or any(i.get("motivo") for i in a.get("indisponibilidades", [])):
        print("Aviso: log ou motivo de indisponibilidade no agenda.json; removidos da cópia publicada (use o publicar.sh).")
    a["log"] = []
    for i in a.get("indisponibilidades", []):
        i["motivo"] = ""

    site = os.path.join(base, "_site")
    shutil.rmtree(site, ignore_errors=True)
    os.makedirs(os.path.join(site, "ics"))
    os.makedirs(os.path.join(site, "d"))
    for arq in ARQUIVOS:
        if arq != "agenda.json":
            shutil.copy(os.path.join(base, arq), site)
    usados = {d["pdf"] for d in a["defesas"] if d.get("pdf")}
    if usados:
        os.makedirs(os.path.join(site, "trabalhos"))
        for pdf in usados:
            shutil.copy(os.path.join(base, pdf), os.path.join(site, pdf))
    with open(os.path.join(site, "agenda.json"), "w", encoding="utf-8") as f:
        json.dump(a, f, ensure_ascii=False, indent=1)

    ag = Agenda(a)
    agora = dt.datetime.now(dt.timezone.utc)
    ordem = sorted(a["defesas"], key=lambda d: quando(d)[0])
    for p in a["professores"]:
        ds = [d for d in ordem if ag.participa(d, p["id"])]
        with open(os.path.join(site, "ics", slug(p.get("curto") or p["nome"]) + ".ics"), "w", encoding="utf-8", newline="") as f:
            f.write(ics(ag, ds, "Defesas de TCC: " + (p.get("curto") or p["nome"]), agora))
    with open(os.path.join(site, "ics", "todas.ics"), "w", encoding="utf-8", newline="") as f:
        f.write(ics(ag, ordem, "Defesas de TCC", agora))
    for d in a["defesas"]:
        with open(os.path.join(site, "d", id_seguro(d["id"]) + ".html"), "w", encoding="utf-8") as f:
            f.write(pagina_defesa(ag, d))
    print("Site montado em _site/: %d calendários e %d páginas de defesa." % (len(a["professores"]) + 1, len(a["defesas"])))


if __name__ == "__main__":
    main()
