// Quadros para a crítica conferir o vídeo pronto de perto: em cada cena, três
// quadros grandes (logo depois de começar, no meio, perto do fim: pega a troca
// de pose no meio da fala) e, ao lado de cada um, o que TEM que aparecer nele
// (quem fala, a pose e a expressão de cada personagem, a luz do aviso). Antes a
// crítica tirava um quadro pequeno a cada 1,5 s e deixava passar celular que
// some, luz sem celular e pernas cortadas.
//
// Uso: npm run quadros -- conteudo/<arquivo>.json   (depois do npm run renderizar)
// Grava out/<arquivo>/quadros/cena-<n>-<a|b|c>.jpg e imprime a lista.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { cenasDoMolde, FPS, iniciosDasCenas } from "../src/moldes/tempos.ts";

const caminho = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!caminho || !existsSync(caminho)) {
  console.error("Uso: npm run quadros -- conteudo/<arquivo>.json   (depois do npm run renderizar)");
  process.exit(1);
}
const nome = basename(caminho, ".json");
const video = join("out", nome, "video.mp4");
if (!existsSync(video)) {
  console.error(`Não achei ${video}: rode antes npm run renderizar -- ${caminho}`);
  process.exit(1);
}

type Estado = { pose?: string; expressao?: string };
type Cena = {
  quem?: string;
  fala?: string;
  luz?: boolean;
  estados?: Record<string, Estado>;
  meio?: Record<string, Estado>;
  noiva?: Estado;
  organizadora?: Estado;
};
const peca = JSON.parse(readFileSync(caminho, "utf8"));
const molde: string = peca.molde ?? "Conversa";
const cenas: Cena[] = peca.cenas ?? [];
const duracoes = cenasDoMolde(molde, peca);
const inicios = iniciosDasCenas(molde, peca);
// Na Conversa, a primeira "cena" dos tempos é a abertura (antes da primeira fala)
const desloca = molde === "Conversa" ? 1 : 0;
const segundo = (quadro: number) => Math.max(0, quadro / FPS);

const pasta = join("out", nome, "quadros");
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });

const comCelular = (pose?: string) => pose === "celular" || pose === "sentado";
const descrever = (estados: Record<string, Estado>) =>
  Object.entries(estados)
    .map(([id, e]) => `${id}: ${e.pose ?? "?"}/${e.expressao ?? "?"}${comCelular(e.pose) ? " (o CELULAR tem que estar na mão)" : ""}${e.pose === "sentado" ? " (sentado: a frente do cenário cobre as pernas; sem ela, sai de pé)" : ""}`)
    .join("; ");

console.log(`Quadros de ${nome} (${molde}): abra cada um e confira o que está ao lado.\n`);
let falhas = 0;
cenas.forEach((cena, i) => {
  const inicio = inicios[i + desloca];
  const duracao = duracoes[i + desloca];
  if (inicio === undefined || duracao === undefined) return;
  const estados = { ...(cena.noiva ? { noiva: cena.noiva } : {}), ...(cena.organizadora ? { organizadora: cena.organizadora } : {}), ...(cena.estados ?? {}) };
  const momentos: Array<[string, number, string]> = [
    ["a", inicio + Math.min(12, duracao / 4), "começo"],
    ["b", inicio + duracao / 2, "meio"],
    ["c", inicio + duracao - Math.min(8, duracao / 4), "fim"],
  ];
  console.log(`Cena ${i + 1}${cena.quem ? ` (fala: ${cena.quem})` : " (narrador)"}: "${(cena.fala ?? "").slice(0, 70)}"`);
  console.log(`  esperado no começo: ${descrever(estados) || "como na cena anterior"}`);
  if (cena.meio) console.log(`  esperado do meio em diante: ${descrever(cena.meio)}`);
  if (cena.luz) console.log("  LUZ DO AVISO: o celular aceso (dourado) tem que estar NA MÃO de alguém; luz sem celular é defeito");
  // Objetos de apoio, marca na testa e QR (26/11/2026)
  const extra = cena as { objetos?: Array<{ quem?: string; tipo?: string; onde?: string }>; testa?: Record<string, string>; qr?: { como?: string } };
  for (const o of extra.objetos ?? [])
    console.log(`  OBJETO: ${o.tipo === "nenhum" ? `${o.quem} larga o objeto ${o.onde === "ao-lado" ? "do lado" : "da mão"}` : `${o.tipo} ${o.onde === "ao-lado" ? "de pé ao lado de" : "na mão de"} ${o.quem}`} (fica nas cenas seguintes)`);
  for (const [id, t] of Object.entries(extra.testa ?? {})) console.log(`  TESTA: ${id} com ${t} (fica nas cenas seguintes)`);
  if (extra.qr) console.log(`  QR CODE (${extra.qr.como ?? "celular"}) no alto da tela, inteiro e sem nada por cima`);
  for (const [letra, quadro, quando] of momentos) {
    const destino = join(pasta, `cena-${String(i + 1).padStart(2, "0")}-${letra}.jpg`);
    const r = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-ss", segundo(quadro).toFixed(2), "-i", video, "-frames:v", "1", "-vf", "scale=720:-2", destino], { stdio: "inherit" });
    if (r.status !== 0) falhas++;
    console.log(`  ${quando}: ${destino} (${segundo(quadro).toFixed(1)} s)`);
  }
});
console.log(
  "\nEm CADA quadro confira: o celular aparece na mão de quem está na pose celular ou sentado; nenhuma luz ou brilho sem o objeto; ninguém sem pernas, cortado no quadril ou atravessando móvel (atrás do sofá ou da cama, tudo bem); nenhum objeto sumindo da mão de uma cena para a outra; rosto e corpo inteiros na tela.",
);
if (falhas) {
  console.error(`${falhas} quadro(s) não saíram.`);
  process.exit(1);
}
