// Modelos de card de divulgação (1080x1080) desenhados em canvas.
// Reproduzem a biblioteca de cards em LaTeX/TikZ (cards-defesa-tcc), com as fontes
// JetBrains Mono e IBM Plex Sans embutidas em fontes_cards.js (SIL OFL 1.1).
// Cada modelo recebe os mesmos campos (aluno, título, orientador, coorientador opcional,
// data, local, etapa) e reduz a escala sozinho quando nome ou título são longos.
(function () {
"use strict";

const MONO = '"CardMono", "JetBrains Mono", "DejaVu Sans Mono", monospace';
const SANS = '"CardSans", "IBM Plex Sans", "Segoe UI", Roboto, sans-serif';
const mono = (px, w) => (w || 400) + " " + Math.round(px) + "px " + MONO;
const sans = (px, w) => (w || 400) + " " + Math.round(px) + "px " + SANS;

// ---------- primitivas ----------
function rect(c, x, y, w, h, fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
function caminhoRR(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r); c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
}
function rr(c, x, y, w, h, r, fill, stroke, lw) {
  caminhoRR(c, x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
}
function caixa(c, x, y, w, h, fill, stroke, lw) {
  if (fill) rect(c, x, y, w, h, fill);
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; const o = (lw || 1) % 2 ? .5 : 0; c.strokeRect(x + o, y + o, w, h); }
}
function linha(c, x1, y1, x2, y2, cor, lw, tracejado) {
  c.save(); c.strokeStyle = cor; c.lineWidth = lw || 1; c.setLineDash(tracejado || []);
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
}
function circ(c, x, y, r, fill, stroke, lw) {
  c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
}
function seta(c, x1, y1, x2, y2, cor, lw, tracejado) {
  linha(c, x1, y1, x2, y2 - (y2 > y1 ? 8 : 0), cor, lw, tracejado);
  const a = Math.atan2(y2 - y1, x2 - x1), t = 12;
  c.fillStyle = cor; c.beginPath(); c.moveTo(x2, y2);
  c.lineTo(x2 - t * Math.cos(a - .4), y2 - t * Math.sin(a - .4)); c.lineTo(x2 - t * Math.cos(a + .4), y2 - t * Math.sin(a + .4));
  c.closePath(); c.fill();
}
function T(c, t, x, y, font, cor, alinh) {
  c.font = font; c.fillStyle = cor; c.textAlign = alinh || "left"; c.textBaseline = "alphabetic";
  c.fillText(t, x, y); return c.measureText(t).width;
}
function larg(c, t, font) { c.font = font; return c.measureText(t).width; }
// sequência de trechos [texto, fonte, cor] na mesma linha; devolve o x final
function trechos(c, x, y, partes) {
  partes.forEach(p => { x += T(c, p[0], x, y, p[1], p[2]); });
  return x;
}
// quebra por palavras; palavra maior que a linha é partida por caracteres
function quebrar(c, t, font, maxW) {
  c.font = font;
  const linhas = []; let atual = "";
  String(t).split(/\s+/).filter(Boolean).forEach(p => {
    const tent = atual ? atual + " " + p : p;
    if (c.measureText(tent).width <= maxW) { atual = tent; return; }
    if (atual) linhas.push(atual);
    atual = p;
    while (c.measureText(atual).width > maxW && atual.length > 1) {
      let k = atual.length - 1;
      while (k > 1 && c.measureText(atual.slice(0, k)).width > maxW) k--;
      // em endereços, prefere quebrar depois de / . : ou -
      const j = Math.max(atual.lastIndexOf("/", k - 1), atual.lastIndexOf(".", k - 1), atual.lastIndexOf(":", k - 1), atual.lastIndexOf("-", k - 1));
      if (j > k / 2) k = j + 1;
      linhas.push(atual.slice(0, k)); atual = atual.slice(k);
    }
  });
  if (atual || !linhas.length) linhas.push(atual);
  return linhas;
}
// desenha um bloco quebrado; y é a linha de base da primeira linha; devolve a base da última
function bloco(c, t, x, y, font, cor, maxW, lh, alinh) {
  const ls = quebrar(c, t, font, maxW);
  ls.forEach((l, i) => T(c, l, x, y + i * lh, font, cor, alinh));
  return y + (ls.length - 1) * lh;
}
function nLinhas(c, t, font, maxW) { return quebrar(c, t, font, maxW).length; }
// tamanho que faz uma linha caber em maxW
function caber(c, t, fontFn, maxW, px, min) {
  while (px > (min || 14) && larg(c, t, fontFn(px)) > maxW) px -= 1;
  return px;
}
function cursor(c, x, y, cor) { rect(c, x, y - 24, 14, 28, cor); }
function titulo(c, I, x, y, fontFn, cor, maxW, px) {
  const p = caber(c, I.rotulo, fontFn, maxW || 1080 - 2 * x, px || 64);
  T(c, I.rotulo, x, y, fontFn(p), cor);
}
const orientacao = I => I.coorientador ? [I.orientador, I.coorientador] : [I.orientador];

// ---------- 01 datasheet ----------
function datasheet(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#ffffff");
  rect(c, 0, 0, 1080, 110, "#141414"); rect(c, 0, 110, 1080, 10, "#c8102e");
  T(c, "DEFESA PÚBLICA", 64, 65, mono(22), "#ffffff");
  T(c, I.tagCompacta + " SERIES", 1016, 62, mono(22), "#ffffff", "right");
  titulo(c, I, 60, 197, p => sans(p, 700), "#141414", 960);
  let y = bloco(c, I.titulo, 60, 197 + 61 * s, sans(36 * s, 700), "#141414", 960, 46 * s);
  const regua = y + 29;
  linha(c, 60, regua + .5, 1020, regua + .5, "#141414", 2);
  // coluna de características
  y = regua + 49; T(c, "FEATURES", 60, y, sans(22, 700), "#c8102e");
  const campos = [["AUTOR", I.aluno, sans(36 * s, 700)], ["ORIENTADOR", I.orientador, sans(31 * s)]];
  if (I.coorientador) campos.push(["COORIENTADOR", I.coorientador, sans(31 * s)]);
  y += 36 - 39;
  campos.forEach((f, i) => {
    y += i ? 45 * s : 39;
    T(c, f[0], 60, y, sans(19), "#696969");
    y = bloco(c, f[1], 60, y + (i ? 31 : 37) * s, f[2], "#141414", 660, 40 * s);
  });
  // chip DIP de 8 pinos
  const cy = regua + 40, ch = 290;
  rr(c, 820, cy, 140, ch, 6, "#141414");
  circ(c, 890, cy, 16, "#ffffff"); circ(c, 842, cy + 22, 6, "#696969");
  const esq = ["CLK", "A", "B", "GND"], dir = ["VCC", "S", "CO", "EN"];
  for (let k = 0; k < 4; k++) {
    const py = cy + 48 + k * 67.7;
    rect(c, 790, py - 5, 30, 10, "#969696"); rect(c, 960, py - 5, 30, 10, "#969696");
    T(c, esq[k], 780, py + 6, mono(16), "#141414", "right"); T(c, dir[k], 1000, py + 6, mono(16), "#141414");
  }
  c.save(); c.translate(898, cy + ch / 2); c.rotate(-Math.PI / 2);
  T(c, I.tagCompacta, 0, 0, mono(caber(c, I.tagCompacta, mono, 240, 22)), "#ffffff", "center"); c.restore();
  // tabela de características elétricas
  y = Math.max(y, cy + ch) + 67;
  T(c, "ELECTRICAL CHARACTERISTICS", 60, y, sans(22, 700), "#c8102e");
  rect(c, 60, y + 15, 960, 45, "#ececec");
  T(c, "PARÂMETRO", 84, y + 47, sans(18, 700), "#141414"); T(c, "VALOR", 384, y + 44, sans(18, 700), "#141414");
  let topo = y + 60;
  [["Data e hora", I.data], ["Local", I.local]].forEach(r => {
    const b = bloco(c, r[1], 380, topo + 44 * s, sans(36 * s, 700), "#141414", 620, 42 * s);
    T(c, r[0], 80, topo + 37 * s, sans(20), "#696969");
    topo = b + 23 * s; linha(c, 60, topo + .5, 1020, topo + .5, "#cdcdcd", 1.5);
  });
  linha(c, 60, 999.5, 1020, 999.5, "#141414", 1.5);
  T(c, "DS" + I.num + "   Rev. A", 64, 1029, mono(16), "#696969");
  T(c, "Page 1 of 1", 1016, 1029, mono(16), "#696969", "right");
  return topo <= 975;
}

// ---------- 02 diagrama de tempo ----------
function hexBus(c, x1, y1, x2, y2, fill, stroke, lw) {
  const d = 10, m = (y1 + y2) / 2;
  c.beginPath(); c.moveTo(x1, m); c.lineTo(x1 + d, y1); c.lineTo(x2 - d, y1); c.lineTo(x2, m); c.lineTo(x2 - d, y2); c.lineTo(x1 + d, y2); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = lw; c.stroke();
}
function tempo(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#0d1117");
  titulo(c, I, 60, 105, p => mono(p, 700), "#7ee787", 960);
  T(c, "defesa_tcc.vcd   escala: 1 ciclo = 1 semestre", 60, 133, mono(19), "#8b949e");
  linha(c, 60, 162.5, 1020, 162.5, "#30363d", 1.5);
  // clock
  T(c, "clk", 64, 222, mono(19), "#8b949e");
  c.strokeStyle = "#7ee787"; c.lineWidth = 3; c.beginPath();
  let x = 270; c.moveTo(x, 236);
  while (x < 1030) { c.lineTo(x, 196); c.lineTo(Math.min(x + 20, 1030), 196); x += 20; if (x >= 1030) break; c.lineTo(x, 236); c.lineTo(Math.min(x + 20, 1030), 236); x += 20; }
  c.stroke();
  const sinais = [["aluno", I.aluno, mono(32 * s, 700)], ["titulo", I.titulo, mono(30 * s, 700)], ["orientador", I.orientador, mono(28 * s)]];
  if (I.coorientador) sinais.push(["coorientador", I.coorientador, mono(28 * s)]);
  sinais.push(["local", I.local, mono(32 * s, 700)]);
  let y = 268;
  sinais.forEach(sg => {
    const ls = quebrar(c, sg[1], sg[2], 630), lh = 38 * s, h = Math.max(54 * s, 16 * s + ls.length * lh);
    T(c, sg[0], 64, y + h / 2 + 7, mono(19), "#8b949e");
    hexBus(c, 270, y, 330, y + h, "#21262d", "#30363d", 1.5);
    T(c, "XX", 300, y + h / 2 + 5, mono(14), "#484f58", "center");
    hexBus(c, 350, y, 1030, y + h, "#0c2d6b", "#58a6ff", 2);
    const b0 = y + h / 2 - (ls.length - 1) * lh / 2 + 11 * s;
    ls.forEach((l, i) => T(c, l, 371, b0 + i * lh, sg[2], "#e6edf3"));
    y += h + 18;
  });
  const eixo = y + 6;
  linha(c, 340, 180, 340, eixo, "#f0883e", 2, [7, 6]);
  linha(c, 270, eixo + .5, 1030, eixo + .5, "#484f58", 1.5);
  for (let k = 0; k <= 8; k++) linha(c, 270 + k * 95 + .5, eixo, 270 + k * 95 + .5, eixo + 14, "#484f58", 1.5);
  const by = eixo + 58, bh = 58 * Math.max(s, .8);
  const fd = mono(caber(c, "t = " + I.data, p => mono(p, 700), 720, 32 * s), 700);
  const ld = quebrar(c, "t = " + I.data, fd, 720);
  rr(c, 270, by, 760, bh, 6, null, "#f0883e", 2);
  T(c, ld[0], 288, by + bh / 2 + 11, fd, "#f0883e");
  linha(c, 60, 990.5, 1020, 990.5, "#30363d", 1.5);
  T(c, "Radix: ASCII   Zoom: fit   Sinais: " + (sinais.length + 2), 64, 1025, mono(15), "#8b949e");
  T(c, I.tag, 1016, 1025, mono(15), "#8b949e", "right");
  return by + bh <= 970;
}

// ---------- 03 relatório de síntese ----------
function janelaMac(c, x, y, w, nome, barra, texto) {
  rect(c, x, y, w, 60, barra);
  circ(c, x + 35, y + 30, 9, "#ff5f56"); circ(c, x + 61, y + 30, 9, "#ffbd2e"); circ(c, x + 87, y + 30, 9, "#27c93f");
  T(c, nome, x + 124, y + 38, mono(20), texto);
}
function check(c, x, y, r, cor) {
  circ(c, x, y, r, cor);
  c.strokeStyle = "#ffffff"; c.lineWidth = 3.5; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.moveTo(x - r * .45, y + r * .02); c.lineTo(x - r * .1, y + r * .38); c.lineTo(x + r * .48, y - r * .32); c.stroke();
  c.lineCap = "butt"; c.lineJoin = "miter";
}
function sintese(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#e6e6e6");
  caixa(c, 40, 40, 1000, 1000, "#ffffff", "#b5b5b5", 1);
  janelaMac(c, 40, 40, 1000, "synth_report.rpt", "#2d2d30", "#d4d4d4");
  titulo(c, I, 80, 180, p => sans(p, 700), "#1f1f1f", 920);
  T(c, "Synthesis Summary | top: defesa_tcc", 81, 208, mono(18), "#5a5a5a");
  rect(c, 80, 238, 920, 50, "#1f4e79");
  T(c, "Property", 104, 269, sans(18, 700), "#ffffff"); T(c, "Value", 344, 269, sans(18, 700), "#ffffff");
  const lin = [["Author", I.aluno, sans(34 * s, 700)], ["Design", I.titulo, sans(30 * s, 700)], ["Advisor", I.orientador, sans(31 * s)]];
  if (I.coorientador) lin.push(["Co-advisor", I.coorientador, sans(31 * s)]);
  let y = 288;
  lin.forEach(l => {
    const ls = quebrar(c, l[1], l[2], 640), lh = 38 * s, h = Math.max(69 * s, 30 * s + ls.length * lh);
    caixa(c, 80, y, 240, h, null, "#d0d7de", 1); caixa(c, 320, y, 680, h, null, "#d0d7de", 1);
    T(c, l[0], 101, y + 42 * s, mono(19), "#5a5a5a");
    ls.forEach((t, i) => T(c, t, 340, y + h / 2 + 12 * s - (ls.length - 1) * lh / 2 + i * lh, l[2], "#1f1f1f"));
    y += h;
  });
  y += 56;
  T(c, "Timing Summary", 80, y, sans(20, 700), "#1f1f1f");
  const fv = sans(34 * s, 700), ld = quebrar(c, I.data, fv, 640), ll = quebrar(c, I.local, fv, 640), lh = 40 * s;
  const bt = y + 21, bh = 70 + (ld.length + ll.length) * lh + 26 * s;
  caixa(c, 80, bt, 920, bh, "#eaf6ec", "#2da44e", 2);
  check(c, 122, bt + 36, 17, "#2da44e");
  T(c, "All timing constraints are met", 155, bt + 43, sans(20, 700), "#1a7f37");
  let b = bt + 97 * Math.max(s, .85);
  T(c, "Scheduled", 110, b - 3, mono(19), "#5a5a5a"); b = bloco(c, I.data, 310, b, fv, "#1f1f1f", 670, lh);
  b += 52 * s; T(c, "Location", 110, b - 2, mono(19), "#5a5a5a"); bloco(c, I.local, 310, b, fv, "#1f1f1f", 670, lh);
  T(c, "LUT 87%   FF 64%   DSP 22%   BRAM 41%   Fmax 250 MHz", 80, bt + bh + 34, mono(15), "#5a5a5a");
  return bt + bh + 34 <= 1020;
}

// ---------- 04 mapa de memória ----------
function hachura(c, x, y, w, h) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  rect(c, x, y, w, h, "#151d2b"); c.strokeStyle = "#2d3644"; c.lineWidth = 1.5;
  for (let k = -h; k < w; k += 10) { c.beginPath(); c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); c.stroke(); }
  c.restore(); caixa(c, x, y, w, h, null, "#363f4e", 1.5);
}
function memoria(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#111827");
  titulo(c, I, 60, 105, p => mono(p, 700), "#ffffff", 960);
  T(c, "memory map | defesa_tcc.ld", 60, 133, mono(19), "#9ca3af");
  const AZ = ["#1e3a5f", "#60a5fa", "#93c5fd"], RX = ["#312e81", "#a5b4fc", "#c7d2fe"], VD = ["#134e4a", "#5eead4", "#5eead4"];
  const secs = [[".aluno", I.aluno, mono(32 * s, 700), AZ], [".titulo", I.titulo, mono(30 * s, 700), RX], [".orientador", I.orientador, mono(28 * s), AZ]];
  if (I.coorientador) secs.push([".coorientador", I.coorientador, mono(28 * s), AZ]);
  secs.push(null, [".data", I.data, mono(32 * s, 700), VD], [".local", I.local, mono(32 * s, 700), VD]);
  let y = 183, end = 0;
  const ender = (v, yy) => T(c, "0x" + ("0000" + Math.floor(v / 0x10000).toString(16)).slice(-4).toUpperCase() + "_" + ("0000" + (v % 0x10000).toString(16)).slice(-4).toUpperCase(), 308, yy + 6, mono(19), "#9ca3af", "right");
  secs.forEach(sc => {
    ender(end, y);
    if (!sc) { hachura(c, 330, y, 670, 43); const tw = larg(c, "reserved", mono(15)); rect(c, 665 - tw / 2 - 5, y + 12, tw + 10, 20, "#111827"); T(c, "reserved", 665, y + 27, mono(15), "#9ca3af", "center"); y += 43; end += 0x3000; return; }
    const ls = quebrar(c, sc[1], sc[2], 620), lh = 38 * s, h = 40 * s + ls.length * lh;
    caixa(c, 330, y, 670, h, sc[3][0], sc[3][1], 2);
    T(c, sc[0], 352, y + 26, mono(16), sc[3][2]);
    ls.forEach((t, i) => T(c, t, 352, y + 26 + 31 * s + i * lh, sc[2], "#ffffff"));
    y += h; end += 0x1000 * Math.max(1, ls.length - 1);
  });
  ender(end, y);
  linha(c, 60, 990.5, 1020, 990.5, "#374151", 1.5);
  T(c, I.tag + "  SECTIONS " + (secs.length - 1) + "  ALIGN 4K", 64, 1027, mono(16), "#9ca3af");
  T(c, "defesa_tcc.elf", 1016, 1027, mono(16), "#9ca3af", "right");
  return y <= 960;
}

// ---------- 05 diagnóstico do gcc ----------
function gcc(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#1e1e1e");
  titulo(c, I, 60, 105, p => mono(p, 700), "#ffffff", 960);
  trechos(c, 60, 145, [["$ ", mono(21), "#4ec94e"], ["gcc -Wall -o " + I.tagSlug + " defesa.c", mono(21), "#d4d4d4"]]);
  const notas = [["aluno", I.aluno, mono(34 * s, 700)], ["titulo", I.titulo, mono(32 * s, 700)], ["orientador", I.orientador, mono(31 * s)]];
  if (I.coorientador) notas.push(["coorientador", I.coorientador, mono(31 * s)]);
  let y = 193, ln = 3;
  notas.forEach(n => {
    trechos(c, 60, y, [["defesa.c:" + ln + ":9: ", mono(19, 700), "#ffffff"], ["note:", mono(19, 700), "#4fc1ff"], [" " + n[0], mono(19), "#d4d4d4"]]);
    const ls = quebrar(c, '"' + n[1] + '"', n[2], 860), lh = 37 * s;
    T(c, String(ln), 104, y + 37 * s, mono(19), "#808080", "right"); T(c, "|", 117, y + 37 * s, mono(19), "#808080");
    ls.forEach((t, i) => T(c, t, 150, y + 37 * s + i * lh, n[2], "#ce9178"));
    y += 37 * s + (ls.length - 1) * lh + 48 * s; ln++;
  });
  y += 10 * s;
  trechos(c, 60, y, [["defesa.c:" + (ln + 2) + ":1: ", mono(19, 700), "#ffffff"], ["warning:", mono(19, 700), "#d670d6"], [" evento público [", mono(19), "#d4d4d4"], ["-Wpublico", mono(19), "#d670d6"], ["]", mono(19), "#d4d4d4"]]);
  linha(c, 60, y + 24.5, 1020, y + 24.5, "#4f4f4f", 1.5);
  T(c, "build finished, defesa agendada:", 60, y + 62, mono(19), "#4ec94e");
  let b = bloco(c, I.data, 60, y + 103 * Math.max(s, .9), mono(34 * s, 700), "#4ec94e", 960, 37 * s);
  b = bloco(c, I.local, 60, b + 37 * s, mono(34 * s, 700), "#4ec94e", 960, 37 * s);
  T(c, "$", 60, b + 50, mono(21), "#4ec94e"); cursor(c, 92, b + 52, "#d4d4d4");
  return b + 50 <= 1040;
}

// ---------- 06 árvore sintática ----------
function ast(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#fafaf7");
  titulo(c, I, 50, 105, p => sans(p, 700), "#1f1f1f", 980);
  T(c, "clang -Xclang -ast-dump defesa.c", 51, 133, mono(18), "#9a9a9a");
  rr(c, 50, 172, 220, 60, 6, "#3c3489");
  T(c, "DefesaDecl", 160, 198, mono(19), "#ffffff", "center"); T(c, I.tag, 160, 220, mono(13), "#c5c0f0", "center");
  const nos = [["AlunoDecl", [["StringLiteral", I.aluno, sans(34 * s, 700)]]], ["TituloDecl", [["StringLiteral", I.titulo, sans(31 * s, 700)]]], ["OrientadorDecl", [["StringLiteral", I.orientador, sans(31 * s)]]]];
  if (I.coorientador) nos.push(["CoorientDecl", [["StringLiteral", I.coorientador, sans(31 * s)]]]);
  nos.push(["EventoDecl", [["DateLiteral", I.data, sans(34 * s, 700)], ["StringLiteral", I.local, sans(34 * s, 700)]]]);
  let y = 263, ultimoMeio = 0;
  nos.forEach(n => {
    const meios = [];
    n[1].forEach(f => {
      const ls = quebrar(c, f[1], f[2], 580), lh = 39 * s, h = 30 * s + ls.length * lh;
      rr(c, 410, y, 620, h, 6, "#eaf3de", "#3b6d11", 2);
      const tw = larg(c, f[0], mono(13)); rect(c, 1010 - tw - 6, y - 8, tw + 12, 16, "#fafaf7");
      T(c, f[0], 1010, y + 5, mono(13), "#3b6d11", "right");
      ls.forEach((t, i) => T(c, t, 430, y + h / 2 + 11 * s - (ls.length - 1) * lh / 2 + i * lh, f[2], "#173404"));
      meios.push(y + h / 2); y += h + 17;
    });
    const m = (meios[0] + meios[meios.length - 1]) / 2;
    rr(c, 150, m - 28, 222, 56, 6, "#e6f1fb", "#185fa5", 2);
    T(c, n[0], 261, m + 6, mono(17), "#185fa5", "center");
    linha(c, 100, m, 150, m, "#9a9a9a", 2);
    if (meios.length === 1) linha(c, 372, m, 410, m, "#9a9a9a", 2);
    else { linha(c, 372, m, 390, m, "#9a9a9a", 2); linha(c, 390, meios[0], 390, meios[meios.length - 1], "#9a9a9a", 2); meios.forEach(mm => linha(c, 390, mm, 410, mm, "#9a9a9a", 2)); }
    ultimoMeio = m;
  });
  linha(c, 100, 232, 100, ultimoMeio + 1, "#9a9a9a", 2);
  return y <= 1050;
}

// ---------- 07 assembly RISC-V ----------
function riscv(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#fafafa"); rect(c, 0, 170, 95, 870, "#f0f0f1");
  titulo(c, I, 60, 105, p => mono(p, 700), "#383a42", 960);
  T(c, "defesa.s | RV32I", 60, 133, mono(19), "#a0a1a7");
  const dir = "#a626a4", rot = "#4078f2", str = "#388237";
  let y = 210, n = 1;
  const num = yy => T(c, String(n++), 78, yy, mono(19), "#a0a1a7", "right");
  num(y); T(c, ".section .rodata", 152, y, mono(22), dir);
  const campos = [["aluno", I.aluno, 700, 32], ["titulo", I.titulo, 700, 30], ["orientador", I.orientador, 400, 29]];
  if (I.coorientador) campos.push(["coorientador", I.coorientador, 400, 29]);
  campos.push(["data", I.data, 700, 32], ["local", I.local, 700, 32]);
  campos.forEach(f => {
    y += 35; num(y); T(c, f[0] + ":", 112, y, mono(22), rot);
    y += 37 * Math.max(s, .9); num(y);
    const x0 = 152 + T(c, ".string ", 152, y, mono(22), dir), fo = mono(f[3] * s, f[2]);
    const ls = quebrar(c, '"' + f[1] + '"', fo, 1060 - x0), ind = larg(c, '"', fo);
    ls.forEach((t, i) => T(c, t, x0 + (i ? ind : 0), y + i * 36 * s, fo, str));
    y += (ls.length - 1) * 36 * s;
  });
  y += 38; num(y); T(c, ".text", 152, y, mono(22), dir);
  y += 27; num(y); trechos(c, 152, y, [["li", mono(22), "#e45649"], ["    ", mono(22), "#383a42"], ["a7", mono(22), "#986801"], [", " + I.num, mono(22), "#383a42"], ["  # " + I.tag, mono(22), "#a0a1a7"]]);
  y += 27; num(y); trechos(c, 152, y, [["ecall", mono(22), "#e45649"], ["    # defesa", mono(22), "#a0a1a7"]]);
  rect(c, 0, 1040, 1080, 40, "#4078f2");
  T(c, "RISC-V   UTF-8   Ln " + (n - 1) + ", Col 1", 34, 1066, mono(16), "#ffffff");
  T(c, "defesa.s", 1046, 1066, mono(16), "#ffffff", "right");
  return y <= 1020;
}

// ---------- 08 pipeline ----------
function pipeline(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#ffffff");
  titulo(c, I, 60, 105, p => sans(p, 700), "#1f1f1f", 960);
  let y = bloco(c, I.titulo, 60, 158, sans(36 * s, 700), "#1f1f1f", 960, 46 * s);
  const linhasP = [["lw x10, aluno", I.aluno, sans(36 * s, 700)], ["lw x11, orientador", I.orientador, sans(31 * s)]];
  if (I.coorientador) linhasP.push(["lw x12, coorientador", I.coorientador, sans(31 * s)]);
  linhasP.push(["lw x" + (10 + linhasP.length) + ", data", I.data, sans(36 * s, 700)], ["lw x" + (11 + linhasP.length) + ", local", I.local, sans(36 * s, 700)]);
  const ciclos = linhasP.length + 4, x0 = 536, passo = 54;
  y += 58;
  for (let k = 0; k < ciclos; k++) T(c, "C" + (k + 1), x0 + 25 + k * passo, y, mono(16), "#9c9c9c", "center");
  y += 18; linha(c, 60, y + .5, 1020, y + .5, "#e1e1e1", 1.5);
  const EST = [["IF", "#e6f1fb", "#185fa5"], ["ID", "#eeedfe", "#534ab7"], ["EX", "#faeeda", "#854f0b"], ["MEM", "#e1f5ee", "#0f6e56"], ["WB", "#fbeaf0", "#993556"]];
  linhasP.forEach((l, k) => {
    const ls = quebrar(c, l[1], l[2], x0 + k * passo - 80), lh = 38 * s;
    const h = Math.max(106 * s, 64 * s + ls.length * lh);
    T(c, l[0], 60, y + 39 * s, mono(15), "#7d7d7d");
    ls.forEach((t, i) => T(c, t, 60, y + 39 * s + 31 * s + i * lh, l[2], "#1f1f1f"));
    const by = y + h / 2 - 29;
    EST.forEach((e, j) => { const bx = x0 + (k + j) * passo; rr(c, bx, by, 50, 58, 4, e[1]); T(c, e[0], bx + 25, by + 35, mono(16), e[2], "center"); });
    y += h; linha(c, 60, y + .5, 1020, y + .5, "#e1e1e1", 1.5);
  });
  T(c, "CPI = 1   stalls: 0   forwarding: on   " + ciclos + " ciclos", 60, y + 44, mono(16), "#7d7d7d");
  return y + 44 <= 1040;
}

// ---------- 09 banco de registradores ----------
function registradores(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#1e1e2e");
  titulo(c, I, 60, 105, p => mono(p, 700), "#cdd6f4", 960);
  T(c, "riscv-simulator | register file", 60, 133, mono(19), "#7f849c");
  const regs = [["x10", "a0", '"' + I.aluno + '"', mono(32 * s, 700), "#a6e3a1"], ["x11", "a1", '"' + I.titulo + '"', mono(30 * s, 700), "#a6e3a1"], ["x12", "a2", '"' + I.orientador + '"', mono(28 * s), "#a6e3a1"]];
  if (I.coorientador) regs.push(["x13", "a3", '"' + I.coorientador + '"', mono(28 * s), "#a6e3a1"]);
  regs.push(["x" + (10 + regs.length), "a" + regs.length, '"' + I.data + '"', mono(32 * s, 700), "#f9e2af"], ["x" + (11 + regs.length), "a" + (regs.length + 1), '"' + I.local + '"', mono(32 * s, 700), "#f9e2af"]);
  // mede para desenhar o painel antes das linhas
  const alt = regs.map(r => { const n = nLinhas(c, r[2], r[3], 690); return Math.max(60 * s, 22 * s + n * 38 * s); });
  const fim = 291 + alt.reduce((a, b) => a + b, 0) + 52;
  rr(c, 60, 172, 960, fim - 172, 8, "#181825", "#45475a", 2);
  T(c, "REG", 86, 206, mono(17), "#7f849c"); T(c, "ABI", 196, 206, mono(17), "#7f849c"); T(c, "VALUE", 300, 206, mono(17), "#7f849c");
  rect(c, 61, 230, 958, 61, "#313244");
  T(c, "pc", 90, 266, mono(20), "#f9e2af"); T(c, "0x00010074 <defesa>", 304, 267, mono(20), "#f9e2af");
  let y = 291;
  regs.forEach((r, k) => {
    const ls = quebrar(c, r[2], r[3], 690), lh = 38 * s, h = alt[k];
    T(c, r[0], 86, y + 41 * s, mono(19), "#89b4fa"); T(c, r[1], 196, y + 41 * s, mono(19), "#7f849c");
    ls.forEach((t, i) => T(c, t, 300 + (i ? larg(c, '"', r[3]) : 0), y + h / 2 + 11 * s - (ls.length - 1) * lh / 2 + i * lh, r[3], r[4]));
    y += h; linha(c, 61, y + .5, 1019, y + .5, "#313244", 1.5);
  });
  T(c, "x17", 86, y + 33, mono(19), "#89b4fa"); T(c, "a7", 196, y + 33, mono(19), "#7f849c");
  trechos(c, 304, y + 33, [["0x" + ("00000000" + Number(I.num).toString(16)).slice(-8), mono(20), "#fab387"], ["  " + I.tag, mono(20), "#7f849c"]]);
  const bty = fim + 40;
  ["step", "run", "reset"].forEach((b, k) => { rr(c, 60 + k * 190, bty, 172, 57, 6, null, "#89b4fa", 2); T(c, b, 146 + k * 190, bty + 35, mono(19), "#89b4fa", "center"); });
  T(c, "ciclo: 2", 1016, bty + 35, mono(19), "#7f849c", "right");
  return bty + 57 <= 1050;
}

// ---------- 10 systemctl status ----------
function systemctl(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#0c0c0c");
  titulo(c, I, 60, 105, p => mono(p, 700), "#ffffff", 960);
  trechos(c, 60, 145, [["$ ", mono(21), "#4ec94e"], ["systemctl status defesa.service", mono(21), "#d4d4d4"]]);
  circ(c, 72, 192, 10, "#4ec94e");
  T(c, "defesa.service: " + I.rotuloCurto, 92, 200, mono(21, 700), "#ffffff");
  const rot = (t, y) => T(c, t, 300, y, mono(21), "#808080", "right");
  rot("Loaded:", 245); T(c, "loaded (/etc/systemd/defesa.service)", 320, 242, mono(21), "#d4d4d4");
  rot("Active:", 278); T(c, "active (scheduled)", 320, 275, mono(21, 700), "#4ec94e");
  const fg = mono(34 * s, 700), fr = mono(31 * s), lh = 38 * s;
  let y = 332;
  const campo = (r, v, f, cor, dy) => { y += dy; rot(r, y); y = bloco(c, v, 320, y, f, cor, 700, lh); };
  campo("When:", I.data, fg, "#ffffff", 0);
  campo("Where:", I.local, fg, "#ffffff", 38 * s);
  campo("Author:", I.aluno, fg, "#ffffff", 68 * s);
  campo("Advisor:", I.orientador, fr, "#d4d4d4", 34 * s);
  if (I.coorientador) campo("Co-advisor:", I.coorientador, fr, "#d4d4d4", 34 * s);
  campo("Description:", I.titulo, mono(33 * s, 700), "#ffffff", 74 * s);
  y += 81 * Math.max(s, .7);
  const host = (I.local.split(/[\s:]/)[0] || "uft").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "") || "uft";
  T(c, host + " systemd[1]: Starting defesa.service...", 60, y, mono(19), "#808080");
  T(c, host + " systemd[1]: Started defesa.service.", 60, y + 26, mono(19), "#808080");
  T(c, "$", 60, y + 76, mono(21), "#4ec94e"); cursor(c, 92, y + 78, "#d4d4d4");
  return y + 76 <= 1040;
}

// ---------- 11 htop ----------
function htop(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#000000");
  titulo(c, I, 60, 105, p => mono(p, 700), "#4ec94e", 960);
  const f = mono(21), barra = (y, n, ver, amar, pc) => trechos(c, 60, y, [[n, f, "#5fafd7"], ["[", f, "#ffffff"], ["|".repeat(ver), f, "#4ec94e"], ["|".repeat(amar), f, "#d7d75f"], [" ".repeat(20 - ver - amar) + pc + "%]", f, "#ffffff"]]);
  barra(147, "1", 13, 3, 68); barra(172, "2", 8, 0, 31);
  trechos(c, 431, 147, [["Tasks: ", f, "#5fafd7"], [(I.coorientador ? 3 : 2) + ", 1 running", f, "#ffffff"]]);
  trechos(c, 431, 172, [["Load: ", f, "#5fafd7"], [I.tag, f, "#ffffff"]]);
  rect(c, 40, 204, 1000, 38, "#4ec94e");
  T(c, "  PID USER     CPU% Command", 60, 230, mono(19), "#000000");
  rect(c, 40, 248, 1000, 38, "#00afd7");
  T(c, String(I.ano).padStart(5) + " aluno    99.0 " + I.comando, 48, 274, mono(19), "#000000");
  T(c, "   42 orient   12.5 orientar", 48, 330, mono(19), "#d4d4d4");
  let y = 366;
  if (I.coorientador) T(c, "   43 coorient  8.1 coorientar", 48, 366, mono(19), "#d4d4d4"); else y = 330;
  const top = y + 36;
  const ROT = "#5fafd7", fg = mono(32 * s, 700), lh = 38 * s;
  let b = top + 46;
  T(c, "Aluno", 76, b, mono(19), ROT); b = bloco(c, I.aluno, 76, b + 30 * s, fg, "#ffffff", 920, lh);
  b += 49 * s; T(c, "Command", 76, b, mono(19), ROT); b = bloco(c, I.titulo, 76, b + 31 * s, mono(30 * s, 700), "#ffffff", 920, lh);
  b += 49 * s; T(c, "Orientação", 76, b, mono(19), ROT);
  orientacao(I).forEach((o, i) => { b = bloco(c, o, 76, b + (i ? 35 : 30) * s, mono(28 * s), "#d4d4d4", 920, lh); });
  b += 53 * s; T(c, "Start", 76, b, mono(19), ROT); T(c, "Where", 560, b, mono(19), ROT);
  const bd = bloco(c, I.data, 76, b + 29 * s, fg, "#4ec94e", 470, lh), bl = bloco(c, I.local, 560, b + 29 * s, fg, "#4ec94e", 460, lh);
  const fimP = Math.max(bd, bl) + 34;
  caixa(c, 40, top, 1000, fimP - top, null, "#00afd7", 2);
  const tw = larg(c, " Process " + I.ano + " ", mono(19)); rect(c, 66, top - 10, tw, 20, "#000000");
  T(c, " Process " + I.ano + " ", 66, top + 6, mono(19), "#00afd7");
  rect(c, 40, 1014, 1000, 36, "#002c36");
  let x = 54; [["F1", "Help"], ["F3", "Search"], ["F6", "Sort"], ["F9", "Kill"], ["F10", "Quit"]].forEach(k => { x = trechos(c, x, 1038, [[k[0], mono(18), "#ffffff"], [k[1] + " ", mono(18), "#00afd7"]]); });
  return fimP <= 990;
}

// ---------- 12 tradução de endereço ----------
function traducao(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#ffffff");
  titulo(c, I, 80, 105, p => sans(p, 700), "#1f1f1f", 920);
  T(c, "tradução de endereço | Sv32", 81, 133, mono(18), "#8c8c8c");
  const par = (y, rot, rotCor, fill, stroke, val, valCor) => {
    T(c, rot, 80, y - 16, mono(19), "#5f5e5a");
    const fv = mono(caber(c, val, p => mono(p, 700), 560, 32 * Math.max(s, .8)), 700);
    caixa(c, 80, y, 600, 79, fill, stroke, 2); caixa(c, 680, y, 320, 79, "#f1efe8", "#5f5e5a", 2);
    T(c, rot === "ENDEREÇO VIRTUAL" ? "VPN" : "PPN", 100, y + 18, mono(14), rotCor);
    T(c, "OFFSET", 700, y + 18, mono(14), "#5f5e5a");
    T(c, val, 100, y + 58, fv, valCor);
    T(c, I.tag, 840, y + 58, mono(caber(c, I.tag, p => mono(p, 700), 290, 32), 700), "#2c2c2a", "center");
  };
  par(202, "ENDEREÇO VIRTUAL", "#534ab7", "#eeedfe", "#534ab7", I.data, "#26215c");
  seta(c, 380, 281, 380, 340, "#5f5e5a", 2); linha(c, 840, 281, 840, 340, "#8c8c8c", 1.5, [6, 5]);
  T(c, "page walk", 400, 316, mono(14), "#8c8c8c");
  rect(c, 80, 341, 920, 44, "#2c2c2a");
  T(c, "PTE", 104, 370, mono(17), "#ffffff"); T(c, "VALOR", 324, 370, mono(17), "#ffffff"); T(c, "V", 970, 370, mono(17), "#ffffff", "center");
  const pte = [["aluno", I.aluno, sans(34 * s, 700)], ["titulo", I.titulo, sans(31 * s, 700)], ["orientador", I.orientador, sans(31 * s)]];
  if (I.coorientador) pte.push(["coorient.", I.coorientador, sans(31 * s)]);
  let y = 385;
  pte.forEach(p => {
    const ls = quebrar(c, p[1], p[2], 610), lh = 38 * s, h = Math.max(62 * s, 24 * s + ls.length * lh);
    caixa(c, 80, y, 220, h, null, "#d3d1c7", 1.5); caixa(c, 300, y, 700, h, null, "#d3d1c7", 1.5);
    T(c, p[0], 100, y + 36 * s, mono(18), "#5f5e5a");
    ls.forEach((t, i) => T(c, t, 320, y + 40 * s + i * lh, p[2], "#1f1f1f"));
    T(c, "1", 970, y + 36 * s, mono(20, 700), "#3b6d11", "center");
    y += h;
  });
  seta(c, 380, y, 380, y + 53, "#5f5e5a", 2); linha(c, 840, y, 840, y + 53, "#8c8c8c", 1.5, [6, 5]);
  c.fillStyle = "#8c8c8c"; c.beginPath(); c.moveTo(840, y + 75); c.lineTo(835, y + 63); c.lineTo(845, y + 63); c.fill();
  T(c, "TLB hit", 400, y + 34, mono(14), "#8c8c8c");
  par(y + 109, "ENDEREÇO FÍSICO", "#0f6e56", "#e1f5ee", "#0f6e56", I.local, "#04342c");
  return y + 188 <= 1050;
}

// ---------- 14 certificado X.509 ----------
function x509(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#0c0c0c");
  titulo(c, I, 60, 105, p => mono(p, 700), "#ffffff", 960);
  trechos(c, 60, 145, [["$ ", mono(21), "#4ec94e"], ["openssl x509 -in defesa.crt -text -noout", mono(21), "#d4d4d4"]]);
  const AZ = "#5fafd7", CI = "#808080", fg = mono(32 * s, 700), fr = mono(28 * s), lh = 35 * s;
  T(c, "Certificate:", 60, 198, mono(19), CI);
  T(c, "Version: 3 (0x2)   Serial: " + I.tag, 90, 226, mono(19), CI);
  const valor = (pre, v, f, cor, y) => { const x0 = 130 + larg(c, pre, f); T(c, pre, 130, y, f, cor); return bloco(c, v, x0, y, f, cor, 1040 - x0, lh); };
  let y = 284 * 1;
  T(c, "Subject:", 90, y, mono(19), AZ);
  y = valor("CN = ", I.aluno, fg, "#ffffff", y + 36 * s);
  y = valor("L  = ", I.local, fg, "#ffffff", y + 34 * s);
  y += 54 * s; T(c, "Issuer:", 90, y, mono(19), AZ);
  orientacao(I).forEach((o, i) => { y = valor("CN = ", o, fr, "#d4d4d4", y + (i ? 35 : 30) * s); });
  y += 61 * s; T(c, "Validity", 90, y, mono(19), AZ);
  y += 37 * s; T(c, "Not Before:", 130, y, mono(19), CI);
  y = bloco(c, I.data, 300, y, fg, "#f0c674", 740, lh);
  y += 61 * s; T(c, "X509v3 Thesis Title:", 90, y, mono(19), AZ);
  y = bloco(c, I.titulo, 130, y + 34 * s, mono(30 * s, 700), "#ffffff", 910, 38 * s);
  y += 48 * Math.max(s, .8);
  trechos(c, 90, y, [["Signature Algorithm: ", mono(19), AZ], ["sha256WithOrientacao", mono(19), CI]]);
  trechos(c, 90, y + 28, [["Status: ", mono(19), AZ], ["valid, aguardando defesa", mono(19), "#4ec94e"]]);
  T(c, "$", 60, y + 78, mono(21), "#4ec94e"); cursor(c, 92, y + 80, "#d4d4d4");
  return y + 78 <= 1040;
}

// ---------- 15 autômato finito ----------
function automato(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#ffffff");
  titulo(c, I, 60, 105, p => sans(p, 700), "#1f1f1f", 960);
  const A = I.automato, E = A.estados;
  T(c, "M = (Q, Σ, δ, " + E[0] + ", {" + E[2] + "})", 61, 133, mono(18), "#888888");
  const cx = [180, 540, 900], cy = 360, r = 72;
  seta(c, 40, cy, 106, cy, "#444444", 2.5);
  seta(c, 252, cy, 466, cy, "#444444", 2.5); seta(c, 612, cy, 826, cy, "#444444", 2.5);
  T(c, A.arestas[0], 360, cy - 13, mono(18), "#444444", "center"); T(c, A.arestas[1], 720, cy - 13, mono(18), "#444444", "center");
  // laço de ajustes no estado do meio
  c.strokeStyle = "#444444"; c.lineWidth = 2.5; c.beginPath();
  c.moveTo(519, 291); c.bezierCurveTo(490, 220, 590, 220, 561, 291); c.stroke();
  c.fillStyle = "#444444"; c.beginPath(); c.moveTo(560, 295); c.lineTo(552, 283); c.lineTo(566, 281); c.fill();
  T(c, "ajustes", 540, 220, mono(18), "#444444", "center");
  E.forEach((e, k) => {
    const atual = k === A.atual, fim = k === 2;
    if (fim) { circ(c, cx[k], cy, r, "#e1f5ee", "#0f6e56", 3); circ(c, cx[k], cy, r - 12, null, "#0f6e56", 2.5); }
    else if (atual) circ(c, cx[k], cy, r, "#534ab7", "#3c3489", 3);
    else circ(c, cx[k], cy, r, "#f1efe8", "#5f5e5a", 3);
    const cor = fim ? "#04342c" : atual ? "#ffffff" : "#2c2c2a";
    T(c, e, cx[k], cy + 7, mono(caber(c, e, p => mono(p, atual ? 700 : 400), 120, 19), atual ? 700 : 400), cor, "center");
    if (atual) T(c, "estado atual", cx[k], cy + r + 30, mono(14), "#534ab7", "center");
  });
  const top = 490, ROT = "#888888";
  const fT = sans(36 * s, 700), fA = sans(36 * s, 700), fO = sans(31 * s), fD = sans(34 * s, 700);
  const orient = orientacao(I).join(", "), quando = I.data + ", " + I.local;
  const fimP = top + 30 + 48 * s + (nLinhas(c, I.titulo, fT, 900) - 1) * 44 * s + 37 * s + 39 * s + (nLinhas(c, I.aluno, fA, 900) - 1) * 42 * s
    + 37 * s + 35 * s + (nLinhas(c, orient, fO, 900) - 1) * 38 * s + 40 * s + 40 * s + (nLinhas(c, quando, fD, 900) - 1) * 40 * s + 42;
  rr(c, 60, top, 960, fimP - top, 8, "#f9f9f7", "#d3d1c7", 2);
  let y = top + 30;
  T(c, "ENTRADA", 90, y, mono(15), ROT);
  y = bloco(c, I.titulo, 90, y + 48 * s, fT, "#1f1f1f", 900, 44 * s);
  y += 37 * s; T(c, "ALUNO", 90, y, mono(15), ROT);
  y = bloco(c, I.aluno, 90, y + 39 * s, fA, "#1f1f1f", 900, 42 * s);
  y += 37 * s; T(c, "ORIENTAÇÃO", 90, y, mono(15), ROT);
  y = bloco(c, orient, 90, y + 35 * s, fO, "#1f1f1f", 900, 38 * s);
  y += 40 * s; T(c, "δ(" + E[Math.min(A.atual, 1)] + ", " + A.arestas[Math.min(A.atual, 1)] + ")", 90, y, mono(15), ROT);
  bloco(c, quando, 90, y + 40 * s, fD, "#0f6e56", 900, 40 * s);
  return fimP <= 1040;
}

// ---------- 16 Jupyter ----------
function jupyter(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#ffffff");
  rect(c, 0, 0, 1080, 64, "#f3f3f3"); linha(c, 0, 64.5, 1080, 64.5, "#e0e0e0", 1.5);
  T(c, "defesa_tcc.ipynb", 44, 40, sans(19), "#444444"); T(c, "Python 3 (ipykernel)", 1036, 40, sans(19), "#777777", "right");
  titulo(c, I, 150, 150, p => sans(p, 700), "#111111", 880);
  T(c, "In [1]:", 136, 222, mono(16), "#3f51b5", "right");
  rr(c, 150, 179, 880, 76, 4, "#f5f5f5", "#e0e0e0", 1.5);
  trechos(c, 174, 225, [["defesa", mono(19), "#111111"], [".", mono(19), "#aa22ff"], ["to_frame(", mono(19), "#111111"], ['"' + I.tag + '"', mono(19), "#ba2121"], [")", mono(19), "#111111"]]);
  T(c, "Out[1]:", 136, 304, mono(16), "#d84315", "right");
  T(c, I.tag, 420, 300, sans(17, 700), "#111111");
  linha(c, 150, 327, 1030, 327, "#111111", 2);
  const lin = [["aluno", I.aluno, sans(34 * s, 700)], ["titulo", I.titulo, sans(31 * s, 700)], ["orientador", I.orientador, sans(31 * s)]];
  if (I.coorientador) lin.push(["coorientador", I.coorientador, sans(31 * s)]);
  lin.push(["data", I.data, sans(34 * s, 700)], ["local", I.local, sans(34 * s, 700)]);
  let y = 328;
  lin.forEach((l, k) => {
    const ls = quebrar(c, l[1], l[2], 500), lh = 39 * s, h = Math.max(62 * s, 23 * s + ls.length * lh);
    if (k % 2 === 0) rect(c, 150, y, 880, h, "#f5f5f5");
    const b0 = y + h / 2 + 12 * s - (ls.length - 1) * lh / 2;
    T(c, l[0], 390, ls.length > 1 ? b0 - 3 : y + h / 2 + 6, sans(17, 700), "#111111", "right");
    ls.forEach((t, i) => T(c, t, 420, b0 + i * lh, l[2], "#111111"));
    y += h; linha(c, 150, y + .5, 1030, y + .5, "#e0e0e0", 1);
  });
  T(c, lin.length + " rows × 1 columns", 150, y + 28, sans(15), "#777777");
  const iy = y + 66;
  T(c, "In [ ]:", 136, iy + 31, mono(16), "#3f51b5", "right");
  rr(c, 150, iy, 880, 64, 4, "#ffffff", "#42a5f5", 2);
  rect(c, 167, iy + 17, 2, 30, "#111111");
  return iy + 64 <= 1050;
}

// ---------- 17 JSON com jq ----------
function json(c, I, s) {
  rect(c, 0, 0, 1080, 1080, "#1d1f21");
  titulo(c, I, 60, 105, p => mono(p, 700), "#ffffff", 960);
  trechos(c, 60, 145, [["$ ", mono(21), "#b5bd68"], ["curl -s localhost:8080/defesas/" + I.num + " | jq", mono(21), "#c5c8c6"]]);
  const P = "#c5c8c6", K = "#81a2be", ST = "#b5bd68", NU = "#de935f", lh = 38 * s;
  T(c, "{", 60, 192, mono(22), P);
  let y = 192;
  const chave = (k, yy) => T(c, '"' + k + '":', 100, yy, mono(19, 700), K);
  // string JSON quebrada com recuo de uma aspa; vírgula opcional em cinza
  const str = (v, f, x, yy, virg) => {
    const ls = quebrar(c, '"' + v + '"' + (virg ? "," : ""), f, 1040 - x), ind = larg(c, '"', f);
    ls.forEach((t, i) => {
      const xx = x + (i ? ind : 0), yl = yy + i * lh;
      if (virg && i === ls.length - 1) { const w = T(c, t.slice(0, -1), xx, yl, f, ST); T(c, ",", xx + w, yl, f, P); }
      else T(c, t, xx, yl, f, ST);
    });
    return yy + (ls.length - 1) * lh;
  };
  I.jsonEtapa.forEach(e => { y += 30; chave(e[0], y); trechos(c, 290, y, [[e[1], mono(21), NU], [",", mono(21), P]]); });
  y += 48 * s; chave("aluno", y); y = str(I.aluno, mono(32 * s, 700), 290, y, true);
  y += 60 * s; chave("titulo", y); y = str(I.titulo, mono(30 * s, 700), 290, y, true);
  y += 64 * s; chave("orientado", y); T(c, "[", 290, y - 8, mono(22), P);
  const os = orientacao(I);
  os.forEach((o, i) => { y += (i ? 35 : 18) * s; y = str(o, mono(28 * s), 330, y, i < os.length - 1); });
  y += 32 * s; T(c, "],", 290, y, mono(22), P);
  y += 57 * s; chave("data", y); y = str(I.data, mono(32 * s, 700), 290, y, true);
  y += 55 * s; chave("local", y); y = str(I.local, mono(32 * s, 700), 290, y, true);
  y += 52 * s; chave("publica", y); T(c, "true", 290, y - 8, mono(21), NU);
  y += 28; T(c, "}", 60, y, mono(22), P);
  T(c, "$", 60, y + 52, mono(21), ST); cursor(c, 92, y + 54, P);
  return y + 52 <= 1040;
}

const MODELOS = [
  ["datasheet", "Datasheet de CI", datasheet],
  ["tempo", "Diagrama de tempo", tempo],
  ["sintese", "Relatório de síntese", sintese],
  ["memoria", "Mapa de memória", memoria],
  ["gcc", "Diagnóstico do gcc", gcc],
  ["ast", "Árvore sintática (AST)", ast],
  ["riscv", "Assembly RISC-V", riscv],
  ["pipeline", "Pipeline de 5 estágios", pipeline],
  ["registradores", "Banco de registradores", registradores],
  ["systemctl", "systemctl status", systemctl],
  ["htop", "htop", htop],
  ["traducao", "Tradução de endereço", traducao],
  ["x509", "Certificado X.509", x509],
  ["automato", "Autômato finito", automato],
  ["jupyter", "Jupyter (DataFrame)", jupyter],
  ["json", "JSON com jq", json]
];

// desenha o modelo reduzindo a escala do texto até tudo caber
function desenhar(cv, id, I) {
  const m = MODELOS.find(x => x[0] === id) || MODELOS[0];
  cv.width = 1080; cv.height = 1080;
  const c = cv.getContext("2d");
  for (let s = 1; s >= 0.55; s = Math.round((s - 0.05) * 100) / 100) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, 1080, 1080);
    if (m[2](c, I, s) !== false) return s;
  }
  return 0.55;
}

// fontes embutidas (fontes_cards.js define FONTES_CARDS = {nome: base64 woff2})
let prontas = null;
function carregarFontes() {
  if (prontas) return prontas;
  prontas = (async () => {
    if (typeof FONTES_CARDS === "undefined") return;
    const b64 = t => Uint8Array.from(atob(t), ch => ch.charCodeAt(0)).buffer;
    const defs = [["CardMono", "JetBrainsMono-Regular", "400"], ["CardMono", "JetBrainsMono-Bold", "700"],
      ["CardSans", "IBMPlexSans-Regular", "400"], ["CardSans", "IBMPlexSans-SemiBold", "600"], ["CardSans", "IBMPlexSans-Bold", "700"]];
    await Promise.all(defs.map(async d => {
      if (!FONTES_CARDS[d[1]]) return;
      const f = new FontFace(d[0], b64(FONTES_CARDS[d[1]]), { weight: d[2] });
      await f.load(); document.fonts.add(f);
    }));
  })().catch(e => { console.warn("Fontes dos cards:", e); });
  return prontas;
}

window.CARDS = { modelos: MODELOS.map(m => ({ id: m[0], nome: m[1] })), desenhar: desenhar, carregarFontes: carregarFontes };
})();
