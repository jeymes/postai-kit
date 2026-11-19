// Gera por código os sons do mundo do molde Mundo3D (sem licença de ninguém,
// sem crédito): passos de uma tropa marchando, o rangido da madeira e o estalo
// de algo que quebra. Ficam em public/sfx/<nome>.wav, junto dos outros efeitos.
//
// Uso: npm run sons:mundo (já vêm no kit; só rode de novo para mudar)

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

/** Um passo: uma batida grave (bota na madeira) com um pouco de ruído por cima. */
function passo(saida: Float32Array, inicio: number, forca: number, r: () => number) {
  const dur = Math.round(TAXA * 0.16);
  let filtrado = 0;
  for (let i = 0; i < dur && inicio + i < saida.length; i++) {
    const t = i / TAXA;
    const corpo = Math.sin(2 * Math.PI * (95 - 260 * t) * t) * Math.exp(-t * 32);
    filtrado += (r() - filtrado) * 0.18;
    saida[inicio + i] += forca * (corpo * 0.9 + filtrado * Math.exp(-t * 45) * 0.8);
  }
}

// Passos: 2 segundos, 4 passos de muitos pés quase juntos (a marcha no mesmo ritmo)
{
  const r = ruido(5);
  const s = new Float32Array(TAXA * 2);
  for (let k = 0; k < 4; k++) {
    for (let pe = 0; pe < 9; pe++) passo(s, Math.round(TAXA * (k * 0.5 + r() * 0.025)), 0.5 + r() * 0.5, r);
  }
  gravar("passos", s);
}

// Rangido: a madeira forçando (um tom que sobe e desce, áspero, com ruído)
{
  const r = ruido(9);
  const dur = 1.4;
  const s = new Float32Array(Math.round(TAXA * dur));
  let fase = 0;
  let filtrado = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / TAXA;
    const freq = 210 + 70 * Math.sin(t * 5.3) + 30 * Math.sin(t * 17);
    fase += (2 * Math.PI * freq) / TAXA;
    // Dente de serra irregular (o "atrito"), aberto e fechado devagar
    const serra = ((fase / Math.PI) % 2) - 1;
    const envelope = Math.sin(Math.PI * Math.min(1, t / dur)) * (0.6 + 0.4 * Math.sin(t * 23));
    filtrado += (r() - filtrado) * 0.05;
    s[i] = envelope * (serra * 0.55 + filtrado * 0.6);
  }
  gravar("rangido", s);
}

// Estalo: um estouro seco (a madeira partindo) e um ronco grave depois
{
  const r = ruido(13);
  const s = new Float32Array(Math.round(TAXA * 1.2));
  for (let i = 0; i < s.length; i++) {
    const t = i / TAXA;
    const estouro = r() * Math.exp(-t * 26);
    const lascas = t < 0.35 ? r() * (r() > 0.92 ? 1 : 0.1) * Math.exp(-t * 6) : 0;
    const ronco = Math.sin(2 * Math.PI * 55 * t) * Math.exp(-t * 3.2) * Math.min(1, t * 20);
    s[i] = estouro * 0.9 + lascas * 0.5 + ronco * 0.7;
  }
  gravar("estalo", s);
}
