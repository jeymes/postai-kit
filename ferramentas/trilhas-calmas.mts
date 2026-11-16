// Gera as músicas calmas do Canal dark por código (sem licença de ninguém, sem
// crédito): um "pad" suave de acordes que se trocam devagar, um baixo grave e
// notas de sino esparsas, com eco de sala. Cada uma tem 2 minutos; o
// Documentario repete baixinho por baixo da voz (campo "musica").
//
// Uso: npm run trilhas:calmas  → public/musica/calma-*.mp3 (já vêm no kit; só
// rode de novo para mudar ou criar outra).
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TAXA = 44100;
const DURACAO = 120; // segundos
const POR_ACORDE = 10; // segundos de cada acorde (12 acordes em 2 min)

// Frequência de uma nota MIDI (60 = Dó central)
const hz = (nota: number) => 440 * 2 ** ((nota - 69) / 12);

type Trilha = { nome: string; descricao: string; acordes: number[][]; brilho: number };

// Acordes em notas MIDI (a primeira é a fundamental)
const TRILHAS: Trilha[] = [
  {
    nome: "calma-esperanca",
    descricao: "Dó maior, luminosa: fé, esperança, milagre, final feliz",
    acordes: [
      [48, 55, 60, 64, 67],
      [45, 52, 57, 60, 64],
      [41, 53, 57, 60, 65],
      [43, 55, 59, 62, 67],
    ],
    brilho: 1,
  },
  {
    nome: "calma-reflexao",
    descricao: "Lá menor, contemplativa: ensino, parábola, oração, perdão",
    acordes: [
      [45, 52, 57, 60, 64],
      [41, 53, 57, 60, 65],
      [48, 55, 60, 64, 67],
      [43, 55, 59, 62, 67],
    ],
    brilho: 0.7,
  },
  {
    nome: "calma-drama",
    descricao: "Ré menor, grave e tensa (mas calma): batalha, perigo, provação, mistério",
    acordes: [
      [38, 50, 53, 57, 62],
      [34, 46, 53, 58, 62],
      [41, 53, 57, 60, 65],
      [36, 48, 55, 60, 64],
    ],
    brilho: 0.45,
  },
];

// Gerador pseudoaleatório fixo: a mesma trilha sai igual toda vez
function sorteio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Eco de sala simples (Schroeder: 4 pentes e 2 passa-tudo), um por canal */
function reverb(entrada: Float32Array, atrasos: number[], mistura = 0.32) {
  const saida = new Float32Array(entrada.length);
  const pentes = atrasos.slice(0, 4).map((ms) => ({ buf: new Float32Array(Math.round((ms / 1000) * TAXA)), i: 0 }));
  const tudo = atrasos.slice(4).map((ms) => ({ buf: new Float32Array(Math.round((ms / 1000) * TAXA)), i: 0 }));
  for (let n = 0; n < entrada.length; n++) {
    let soma = 0;
    for (const p of pentes) {
      const atrasado = p.buf[p.i];
      p.buf[p.i] = entrada[n] + atrasado * 0.84;
      p.i = (p.i + 1) % p.buf.length;
      soma += atrasado;
    }
    let x = soma / 4;
    for (const a of tudo) {
      const atrasado = a.buf[a.i];
      const novo = x + atrasado * 0.5;
      a.buf[a.i] = novo;
      a.i = (a.i + 1) % a.buf.length;
      x = atrasado - novo * 0.5;
    }
    saida[n] = entrada[n] * (1 - mistura) + x * mistura;
  }
  return saida;
}

function sintetizar(trilha: Trilha, semente: number) {
  const total = TAXA * DURACAO;
  const esq = new Float32Array(total);
  const dir = new Float32Array(total);
  const aleatorio = sorteio(semente);
  const quantos = DURACAO / POR_ACORDE;
  // Acordes que se cruzam devagar (entrada e saída de 3 s)
  for (let k = 0; k < quantos; k++) {
    const acorde = trilha.acordes[k % trilha.acordes.length];
    const inicio = k * POR_ACORDE - 3;
    const fim = (k + 1) * POR_ACORDE + 3;
    const de = Math.max(0, Math.floor(inicio * TAXA));
    const ate = Math.min(total, Math.floor(fim * TAXA));
    acorde.forEach((nota, v) => {
      const f = hz(nota);
      const grave = v === 0;
      const peso = grave ? 0.16 : 0.07;
      // Dois osciladores levemente desafinados (coro) e o 2º harmônico baixinho
      const fases = [aleatorio() * 6.28, aleatorio() * 6.28];
      const lado = grave ? 0.5 : 0.25 + 0.5 * aleatorio();
      for (let n = de; n < ate; n++) {
        const t = n / TAXA;
        const local = t - inicio;
        const env = Math.min(1, local / 3, (fim - t) / 3);
        const ondula = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.07 * t + v);
        const s =
          Math.sin(2 * Math.PI * f * 0.9985 * t + fases[0]) +
          Math.sin(2 * Math.PI * f * 1.0015 * t + fases[1]) +
          (grave ? 0 : 0.18 * trilha.brilho * Math.sin(2 * Math.PI * f * 2 * t));
        const amostra = (s / 2.2) * peso * env * env * ondula;
        esq[n] += amostra * (1 - lado);
        dir[n] += amostra * lado;
      }
    });
    // Sinos esparsos: 2 ou 3 notas do acorde, uma oitava acima, com decaimento lento
    const sinos = 2 + Math.floor(aleatorio() * 2);
    for (let b = 0; b < sinos; b++) {
      const nota = acorde[1 + Math.floor(aleatorio() * (acorde.length - 1))] + 12;
      const f = hz(nota);
      const quando = k * POR_ACORDE + 1 + aleatorio() * (POR_ACORDE - 2);
      const lado = 0.2 + 0.6 * aleatorio();
      const comeco = Math.floor(quando * TAXA);
      const dura = Math.floor(4 * TAXA);
      for (let n = comeco; n < Math.min(total, comeco + dura); n++) {
        const t = (n - comeco) / TAXA;
        const env = Math.min(1, t / 0.01) * Math.exp(-t * 1.3);
        const amostra = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-t * 3)) * 0.035 * trilha.brilho * env;
        esq[n] += amostra * (1 - lado);
        dir[n] += amostra * lado;
      }
    }
  }
  // Sala: atrasos diferentes em cada lado dão largura
  const salaEsq = reverb(esq, [29.7, 37.1, 41.1, 43.7, 5.0, 1.7]);
  const salaDir = reverb(dir, [30.7, 35.9, 40.3, 44.9, 5.3, 1.9]);
  // Volume: pico em -3 dB, entrada e saída de 1 s (o loop do molde emenda)
  let pico = 0;
  for (let n = 0; n < total; n++) pico = Math.max(pico, Math.abs(salaEsq[n]), Math.abs(salaDir[n]));
  const ganho = 0.7 / (pico || 1);
  const pcm = Buffer.alloc(total * 4);
  for (let n = 0; n < total; n++) {
    const borda = Math.min(1, n / TAXA, (total - n) / TAXA);
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, salaEsq[n] * ganho * borda)) * 32767), n * 4);
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, salaDir[n] * ganho * borda)) * 32767), n * 4 + 2);
  }
  return pcm;
}

function wav(pcm: Buffer) {
  const cab = Buffer.alloc(44);
  cab.write("RIFF", 0);
  cab.writeUInt32LE(36 + pcm.length, 4);
  cab.write("WAVEfmt ", 8);
  cab.writeUInt32LE(16, 16);
  cab.writeUInt16LE(1, 20);
  cab.writeUInt16LE(2, 22);
  cab.writeUInt32LE(TAXA, 24);
  cab.writeUInt32LE(TAXA * 4, 28);
  cab.writeUInt16LE(4, 32);
  cab.writeUInt16LE(16, 34);
  cab.write("data", 36);
  cab.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([cab, pcm]);
}

const pasta = join("public", "musica");
mkdirSync(pasta, { recursive: true });
for (const [i, trilha] of TRILHAS.entries()) {
  const bruto = join(tmpdir(), `${trilha.nome}.wav`);
  writeFileSync(bruto, wav(sintetizar(trilha, 7 + i * 101)));
  const saida = join(pasta, `${trilha.nome}.mp3`);
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", bruto, "-c:a", "libmp3lame", "-b:a", "128k", saida], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  rmSync(bruto, { force: true });
  if (r.status !== 0) throw new Error(`Não gravou ${saida}`);
  console.log(`✓ ${saida}: ${trilha.descricao}`);
}
