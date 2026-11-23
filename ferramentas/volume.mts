// O volume do vídeo pronto (23/11/2026): o ffmpeg do Remotion não tem o
// volumedetect, e a crítica não conseguia medir se a música cobre a voz.
// Decodifica o áudio (mono, 8 kHz) e mede o volume a cada meio segundo.
//
// Uso: npm run volume -- out/<nome>/video.mp4
//
// Diz o volume da fala (os trechos mais altos) e o do fundo (os trechos mais
// baixos, onde só a música toca: entre as falas e no fim). Se o fundo ficar a
// menos de 12 dB da fala, a música está alta: baixe o volumeMusica.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const arquivo = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!arquivo || !existsSync(arquivo)) {
  console.error("Uso: npm run volume -- out/<nome>/video.mp4");
  process.exit(1);
}

const TAXA = 8000;
const r = spawnSync("npx", ["remotion", "ffmpeg", "-loglevel", "error", "-i", arquivo, "-vn", "-ac", "1", "-ar", String(TAXA), "-acodec", "pcm_s16le", "-f", "wav", "-"], {
  maxBuffer: 1024 * 1024 * 1024,
  shell: process.platform === "win32",
});
if (/does not contain any stream/i.test(String(r.stderr ?? ""))) {
  console.log("O vídeo não tem áudio (sem voz e sem música).");
  process.exit(0);
}
if (r.status !== 0 || !r.stdout?.length) {
  console.error(`Não consegui ler o áudio: ${String(r.stderr ?? "").trim().slice(-300) || "sem áudio no vídeo?"}`);
  process.exit(1);
}

// O ffmpeg do Remotion não tem o formato bruto: vem em WAV; os dados começam depois do bloco "data"
const wav = r.stdout as Buffer;
const inicioDosDados = wav.indexOf("data") + 8;
const dados = wav.subarray(inicioDosDados, inicioDosDados + Math.floor((wav.length - inicioDosDados) / 2) * 2);
const amostras = new Int16Array(dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.length));
const JANELA = TAXA / 2;
const db: number[] = [];
for (let i = 0; i + JANELA <= amostras.length; i += JANELA) {
  let soma = 0;
  for (let j = i; j < i + JANELA; j++) soma += (amostras[j] / 32768) ** 2;
  const rms = Math.sqrt(soma / JANELA);
  db.push(rms > 0 ? 20 * Math.log10(rms) : -90);
}
const comSom = db.filter((d) => d > -60);
if (!comSom.length) {
  console.log("O vídeo está em silêncio (sem voz nem música).");
  process.exit(0);
}
const ordem = [...comSom].sort((a, b) => a - b);
const parte = (p: number) => ordem[Math.min(ordem.length - 1, Math.floor(p * ordem.length))];
const fala = parte(0.8);
const fundo = parte(0.1);
const diferenca = fala - fundo;
const pico = ordem[ordem.length - 1];
const duracao = (amostras.length / TAXA).toFixed(0);

console.log(`Áudio de ${duracao} s.`);
console.log(`Fala (trechos altos): ${fala.toFixed(1)} dB · Fundo (trechos baixos, só música): ${fundo.toFixed(1)} dB · Diferença: ${diferenca.toFixed(1)} dB · Pico: ${pico.toFixed(1)} dB`);
if (diferenca < 12) console.log("MÚSICA ALTA: o fundo está a menos de 12 dB da fala. Baixe o volumeMusica (ex.: 0.15 → 0.1) e renderize de novo.");
else if (fundo < -45) console.log("Fundo muito baixo ou sem música: confira se a música entrou (volumeMusica).");
else console.log("OK: a voz fica bem acima da música.");
if (pico > -1) console.log("Cuidado: o pico passa de -1 dB (pode estourar no celular).");
