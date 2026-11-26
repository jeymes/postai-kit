// Gera por código os sons do Quadro de evidências (modelo "evidencias" do Canal
// dark), sem licença de ninguém e sem crédito: a máquina de escrever da
// etiqueta, a batida do carimbo, o risco da caneta (círculo, sublinhado,
// barbante), o "whoosh" leve da câmera viajando longe e o ruído do projetor nos
// trechos de cinema mudo. Ficam em public/sfx/<nome>.wav. O volume de cada um
// (baixo, por baixo da voz) fica no SONS do src/componentes/audio/Som.tsx.
//
// Uso: npm run sons:evidencias (já vêm no kit; só rode de novo para mudar)

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TAXA = 44100;

/** Ruído com semente: o mesmo som sai sempre igual. */
function ruido(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Grava as amostras (de -1 a 1) num WAV de 16 bits, mono. */
function gravar(nome: string, amostras: Float32Array) {
  const dados = Buffer.alloc(44 + amostras.length * 2);
  dados.write("RIFF", 0);
  dados.writeUInt32LE(36 + amostras.length * 2, 4);
  dados.write("WAVEfmt ", 8);
  dados.writeUInt32LE(16, 16);
  dados.writeUInt16LE(1, 20);
  dados.writeUInt16LE(1, 22);
  dados.writeUInt32LE(TAXA, 24);
  dados.writeUInt32LE(TAXA * 2, 28);
  dados.writeUInt16LE(2, 32);
  dados.writeUInt16LE(16, 34);
  dados.write("data", 36);
  dados.writeUInt32LE(amostras.length * 2, 40);
  let pico = 0;
  for (const a of amostras) pico = Math.max(pico, Math.abs(a));
  const ganho = pico > 0 ? 0.89 / pico : 1;
  amostras.forEach((a, i) => dados.writeInt16LE(Math.round(a * ganho * 32767), 44 + i * 2));
  const pasta = join("public", "sfx");
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, `${nome}.wav`), dados);
  console.log(`✓ public/sfx/${nome}.wav (${(amostras.length / TAXA).toFixed(1)} s)`);
}

/** Filtro passa-baixa de um polo (0 < a <= 1: quanto menor, mais abafado) */
function abafar(a: number) {
  let y = 0;
  return (x: number) => (y += (x - y) * a);
}

// Datilografia: umas 14 teclas em ritmo irregular (clique seco + a batida do tipo no papel)
{
  const r = ruido(21);
  const s = new Float32Array(Math.round(TAXA * 1.4));
  let t = 0.02;
  while (t < 1.3) {
    const inicio = Math.round(t * TAXA);
    const forca = 0.6 + r() * 0.4;
    const tom = 1800 + r() * 900;
    const grave = abafar(0.08);
    for (let i = 0; i < TAXA * 0.06 && inicio + i < s.length; i++) {
      const u = i / TAXA;
      const clique = r() * Math.exp(-u * 900);
      const ping = Math.sin(2 * Math.PI * tom * u) * Math.exp(-u * 160) * 0.35;
      const tipo = grave(r()) * Math.exp(-u * 70) * 2.2;
      s[inicio + i] += forca * (clique * 0.8 + ping + tipo);
    }
    t += 0.07 + r() * 0.06 + (r() > 0.85 ? 0.12 : 0);
  }
  gravar("datilografia", s);
}

// Carimbo: o baque grave do cabo na mesa e o tapa da borracha no papel
{
  const r = ruido(33);
  const s = new Float32Array(Math.round(TAXA * 0.7));
  const papel = abafar(0.35);
  for (let i = 0; i < s.length; i++) {
    const u = i / TAXA;
    const baque = Math.sin(2 * Math.PI * (70 + 90 * Math.exp(-u * 30)) * u) * Math.exp(-u * 14);
    const tapa = papel(r()) * Math.exp(-u * 45);
    s[i] = baque * 0.9 + tapa * 1.1;
  }
  gravar("carimbo", s);
}

// Risco: a caneta grossa correndo no papel (ruído agudo em dois traços)
{
  const r = ruido(45);
  const dur = 0.6;
  const s = new Float32Array(Math.round(TAXA * dur));
  let anterior = 0;
  const suave = abafar(0.5);
  for (let i = 0; i < s.length; i++) {
    const u = i / TAXA;
    const x = r();
    const agudo = suave(x - anterior);
    anterior = x;
    const traco = Math.sin(Math.PI * Math.min(1, u / dur)) * (0.55 + 0.45 * Math.sin(u * 2 * Math.PI * 5.5));
    const chiado = Math.sin(2 * Math.PI * (1500 + 300 * Math.sin(u * 9)) * u) * 0.06;
    s[i] = traco * (agudo * 0.9 + chiado);
  }
  gravar("risco", s);
}

// Whoosh: ar passando (ruído que abre e fecha), bem leve
{
  const r = ruido(57);
  const dur = 0.9;
  const s = new Float32Array(Math.round(TAXA * dur));
  let y = 0;
  let y2 = 0;
  for (let i = 0; i < s.length; i++) {
    const u = i / TAXA;
    const p = u / dur;
    const abre = 0.02 + 0.16 * Math.sin(Math.PI * p);
    y += (r() - y) * abre;
    y2 += (y - y2) * abre;
    s[i] = y2 * Math.pow(Math.sin(Math.PI * p), 1.5);
  }
  gravar("whoosh", s);
}

// Projetor: a matraca do filme passando (24 cliques por segundo), o motor e um chiado; 4 s que emendam
{
  const r = ruido(69);
  const dur = 4;
  const s = new Float32Array(Math.round(TAXA * dur));
  const chiado = abafar(0.25);
  const clique = abafar(0.5);
  for (let i = 0; i < s.length; i++) {
    const u = i / TAXA;
    const fase = (u * 24) % 1;
    const matraca = clique(r()) * Math.exp(-fase * 40) * (0.7 + 0.3 * Math.sin(u * 2 * Math.PI * 0.5));
    const motor = Math.sin(2 * Math.PI * 50 * u) * 0.12 + Math.sin(2 * Math.PI * 100 * u) * 0.06;
    s[i] = matraca * 0.9 + motor + chiado(r()) * 0.12;
  }
  // As pontas emendam sem estalo
  const borda = Math.round(TAXA * 0.05);
  for (let i = 0; i < borda; i++) {
    s[i] *= i / borda;
    s[s.length - 1 - i] *= i / borda;
  }
  gravar("projetor", s);
}
