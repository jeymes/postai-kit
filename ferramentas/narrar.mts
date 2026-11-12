// Narra uma peça: cada cena com "fala" ganha a voz (Kokoro), a legenda com o
// tempo de cada palavra e a conferência do que a voz disse (Whisper). Com
// "mascote": true (ou no molde Conversa) e o Rhubarb instalado, também a boca.
// No Conversa, cada cena é a fala de um personagem ("quem"), com a voz dele em
// "vozes" (ou a do elenco).
//
// O áudio vai para public/narracao/<peça>/ e o resto volta para o próprio
// conteudo/<peça>.json, em "narracao" de cada cena. Só refaz a cena cujo
// texto, voz ou velocidade mudou.
//
// Uso: npm run narrar -- conteudo/<peça>.json [--refazer]
// Antes, uma vez: npm run voz:instalar
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { alinhar, falar, type Ouvida } from "./voz/texto.ts";
import { PYTHON, RHUBARB } from "./voz/caminhos.ts";
import { VOZES, VOZES_DO_ELENCO, type Voz } from "../src/componentes/personagens/vozes.ts";

const args = process.argv.slice(2);
const caminho = args.find((arg) => !arg.startsWith("--"));
const refazer = args.includes("--refazer");
if (!caminho) {
  console.error("Uso: npm run narrar -- conteudo/<peça>.json");
  process.exit(1);
}
if (!existsSync(PYTHON)) {
  console.error("A narração ainda não está instalada neste computador. Rode antes: npm run voz:instalar");
  process.exit(1);
}

type Cena = { fala?: string; quem?: string; narracao?: { chave?: string; audio?: string } & Record<string, unknown> };
const peca = JSON.parse(readFileSync(caminho, "utf8"));
const cenas: Cena[] = peca.cenas ?? [];
if (!cenas.some((cena) => cena.fala)) {
  console.error('Nenhuma cena com "fala". A narração é do molde Narrado (ou de um molde seu com cenas[].fala).');
  process.exit(1);
}

const nome = basename(caminho, ".json");
const voz: string = peca.voz ?? "pf_dora";
const velocidade: number = peca.velocidade ?? 1;
const pronuncia: Record<string, string> = peca.pronuncia ?? {};
const comMascote = peca.mascote === true || peca.molde === "Conversa";
// Voz de cada personagem: a do elenco do roteiro (o nome de uma das VOZES ou
// uma voz do Kokoro), senão a da Bia e da Lu, e por cima o que vier em "vozes".
const doElenco: Record<string, Voz> = Object.fromEntries(
  ((peca.elenco ?? []) as Array<{ id: string; voz?: string }>)
    .filter((p) => p.voz)
    .map((p) => [p.id, VOZES[p.voz as string] ?? { voz: p.voz as string }]),
);
const vozes: Record<string, Voz> = { ...VOZES_DO_ELENCO, ...doElenco, ...(peca.vozes ?? {}) };
const vozDa = (cena: Cena) => (cena.quem && vozes[cena.quem]?.voz) || voz;
const velocidadeDa = (cena: Cena) => (cena.quem && vozes[cena.quem]?.velocidade) || velocidade;
if (comMascote && !existsSync(RHUBARB))
  console.log("O Rhubarb não está instalado: o mascote mexe a boca pelo tempo das palavras. Para a boca exata: npm run voz:instalar -- --mascote");

const pendentes = cenas
  .map((cena, indice) => {
    if (!cena.fala) return null;
    const roteiro = falar(cena.fala, pronuncia);
    const textoDaVoz = roteiro.map((p) => p.falado).join(" ");
    const chave = JSON.stringify([textoDaVoz, vozDa(cena), velocidadeDa(cena), comMascote && existsSync(RHUBARB)]);
    const audio = `narracao/${nome}/cena-${String(indice + 1).padStart(2, "0")}.wav`;
    const pronta = cena.narracao?.chave === chave && existsSync(join("public", audio));
    return pronta && !refazer ? null : { indice, roteiro, textoDaVoz, chave, audio, voz: vozDa(cena), velocidade: velocidadeDa(cena) };
  })
  .filter((p) => p !== null);

if (pendentes.length === 0) {
  console.log("A narração já está em dia com o texto. Para gerar de novo: --refazer");
  process.exit(0);
}

console.log(`Narrando ${pendentes.length} cena(s) com a voz ${[...new Set(pendentes.map((p) => p.voz))].join(", ")}...`);
const temporaria = mkdtempSync(join(tmpdir(), "narrar-"));
const pedido = join(temporaria, "pedido.json");
writeFileSync(
  pedido,
  JSON.stringify({
    voz,
    velocidade,
    falas: pendentes.map((p) => ({ texto: p.textoDaVoz, saida: join(process.cwd(), "public", p.audio), voz: p.voz, velocidade: p.velocidade })),
  }),
);
const resposta = spawnSync(PYTHON, [join("ferramentas", "voz", "voz.py"), pedido], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
rmSync(temporaria, { recursive: true, force: true });
if (resposta.status !== 0) {
  console.error(resposta.stderr);
  console.error("A voz falhou. Se for a primeira vez, rode de novo: npm run voz:instalar");
  process.exit(1);
}
const resultados: Array<{ duracao: number; palavras: Ouvida[] }> = JSON.parse(resposta.stdout);

/** Formas da boca (A a H e X, do Rhubarb), com o segundo em que cada uma começa */
function boca(audio: string) {
  const r = spawnSync(RHUBARB, ["-r", "phonetic", "-f", "json", "-q", join("public", audio)], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`O Rhubarb falhou em ${audio}: o mascote mexe a boca pelo tempo das palavras.`);
    return undefined;
  }
  const { mouthCues } = JSON.parse(r.stdout) as { mouthCues: Array<{ start: number; value: string }> };
  return mouthCues.map((c) => ({ inicio: c.start, forma: c.value }));
}

const avisos: string[] = [];
pendentes.forEach((p, i) => {
  const { duracao, palavras } = resultados[i];
  const { legendas, diferencas } = alinhar(p.roteiro, palavras, duracao);
  cenas[p.indice].narracao = {
    audio: p.audio,
    duracaoSeg: duracao,
    legendas,
    ...(comMascote && existsSync(RHUBARB) ? { boca: boca(p.audio) } : {}),
    chave: p.chave,
  };
  console.log(`  cena ${p.indice + 1}: ${duracao.toFixed(1)} s`);
  for (const d of diferencas) avisos.push(`  cena ${p.indice + 1}: ${d}`);
});

writeFileSync(caminho, `${JSON.stringify(peca, null, 2)}\n`);
const total = cenas.reduce((soma, c) => soma + Number(c.narracao?.duracaoSeg ?? 0), 0);
console.log(`\nPronto: ${total.toFixed(1)} s de fala, gravados em ${caminho}.`);
if (avisos.length) {
  console.log("\nConfira (pode ser pronúncia errada). Se for, ajuste em \"pronuncia\" e narre de novo:");
  console.log(avisos.join("\n"));
} else console.log("A conferência não achou diferença entre o roteiro e o que a voz disse.");
