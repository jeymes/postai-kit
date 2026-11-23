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
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { alinhar, falar, type Ouvida } from "./voz/texto.ts";
import { PYTHON, RHUBARB } from "./voz/caminhos.ts";
import { IDIOMAS_DA_VOZ, VOZES, VOZES_DO_ELENCO, vozNoIdioma, type IdiomaDaVoz, type Voz } from "../src/componentes/personagens/vozes.ts";

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
// O idioma: o do roteiro ou o do canal (o npm run canal grava em .postai-idioma);
// sem nenhum, português. A voz fala nele e o Whisper escuta nele.
const doCanal = existsSync(".postai-idioma") ? readFileSync(".postai-idioma", "utf8").trim() : "";
const idioma: IdiomaDaVoz = IDIOMAS_DA_VOZ.includes(peca.idioma) ? peca.idioma : IDIOMAS_DA_VOZ.includes(doCanal as IdiomaDaVoz) ? (doCanal as IdiomaDaVoz) : "pt";
// O narrador ("voz" no topo) aceita o id do catálogo ("masculina-4") ou o nome do Kokoro
const doCatalogo: Voz | undefined = peca.voz ? VOZES[peca.voz as string] : undefined;
const voz: string = vozNoIdioma(doCatalogo?.voz ?? peca.voz ?? "pf_dora", idioma);
const velocidade: number = peca.velocidade ?? doCatalogo?.velocidade ?? 1;
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
const vozDa = (cena: Cena) => (cena.quem && vozes[cena.quem]?.voz ? vozNoIdioma(vozes[cena.quem].voz, idioma) : voz);
const velocidadeDa = (cena: Cena) => (cena.quem && vozes[cena.quem]?.velocidade) || velocidade;
if (comMascote && !existsSync(RHUBARB))
  console.log("O Rhubarb não está instalado: o mascote mexe a boca pelo tempo das palavras. Para a boca exata: npm run voz:instalar -- --mascote");

const pendentes = cenas
  .map((cena, indice) => {
    if (!cena.fala) return null;
    const roteiro = falar(cena.fala, pronuncia, idioma);
    const textoDaVoz = roteiro.map((p) => p.falado).join(" ");
    const chave = JSON.stringify([textoDaVoz, vozDa(cena), velocidadeDa(cena), comMascote && existsSync(RHUBARB)]);
    // O nome do áudio leva uma marca da fala (22/11/2026): com só o número da cena,
    // cenas novas no meio do roteiro gravavam por cima do áudio das que mudaram de
    // número, e o vídeo saía com a fala de uma cena na outra.
    const audio = `narracao/${nome}/cena-${String(indice + 1).padStart(2, "0")}-${createHash("sha1").update(chave).digest("hex").slice(0, 8)}.wav`;
    const anterior = cena.narracao?.audio;
    const pronta = cena.narracao?.chave === chave && typeof anterior === "string" && existsSync(join("public", anterior));
    return pronta && !refazer ? null : { indice, roteiro, textoDaVoz, chave, audio, voz: vozDa(cena), velocidade: velocidadeDa(cena) };
  })
  .filter((p) => p !== null);

if (pendentes.length === 0) {
  console.log("A narração já está em dia com o texto. Para gerar de novo: --refazer");
  process.exit(0);
}

console.log(`Narrando ${pendentes.length} cena(s) em ${{ pt: "português", en: "inglês", es: "espanhol" }[idioma]} com a voz ${[...new Set(pendentes.map((p) => p.voz))].join(", ")}...`);
const temporaria = mkdtempSync(join(tmpdir(), "narrar-"));
const pedido = join(temporaria, "pedido.json");
writeFileSync(
  pedido,
  JSON.stringify({
    voz,
    velocidade,
    idioma,
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

// Grava só a narração, no roteiro como ele está AGORA: no Canal dark a
// pesquisadora põe as imagens enquanto a narração roda, e gravar o arquivo
// lido no começo apagaria o que ela fez. Cena cuja fala mudou no meio do
// caminho fica sem esta narração (narre de novo).
const atual = JSON.parse(readFileSync(caminho, "utf8"));
const cenasAtuais: Cena[] = atual.cenas ?? [];
const mudaram: number[] = [];
cenas.forEach((cena, i) => {
  if (!cena.narracao) return;
  if (!cenasAtuais[i] || cenasAtuais[i].fala !== cena.fala) {
    mudaram.push(i + 1);
    return;
  }
  cenasAtuais[i].narracao = cena.narracao;
});
// O vídeo usa o idioma nos textos fixos (o botão do fim, o "Inscreva-se")
atual.idioma = idioma;
writeFileSync(caminho, `${JSON.stringify(atual, null, 2)}\n`);
if (mudaram.length) console.log(`\nAtenção: a fala das cenas ${mudaram.join(", ")} mudou enquanto a narração rodava. Rode o narrar de novo.`);
const total = cenasAtuais.reduce((soma, c) => soma + Number(c.narracao?.duracaoSeg ?? 0), 0);
console.log(`\nPronto: ${total.toFixed(1)} s de fala, gravados em ${caminho}.`);
if (avisos.length) {
  console.log("\nConfira (pode ser pronúncia errada). Se for, ajuste em \"pronuncia\" e narre de novo:");
  console.log(avisos.join("\n"));
  if (idioma !== "pt")
    console.log(`\nA voz fala ${{ en: "inglês", es: "espanhol" }[idioma]} de verdade (voz nativa da língua): estes avisos são só diferenças do que o Whisper escreveu (nome próprio, número, sigla). Nunca pare o vídeo por eles; corrija só a palavra que estiver errada.`);
} else console.log("A conferência não achou diferença entre o roteiro e o que a voz disse.");

// Na rotina da nuvem (com o passe do Postaí), o ponto do vídeo é guardado aqui,
// sozinho: o roteiro já está aprovado (a narração vem depois da checadora) e a
// voz acabou de ficar pronta. Antes dependia da agente rodar o npm run ponto, e
// em 21/11 ela pulou: o vídeo parou nas imagens e o "Continuar de onde parou"
// não apareceu. O ponto de antes do render, se a equipe guardar depois, substitui este.
if (process.env.POSTAI_CHAVE && !mudaram.length && /(^|\/)conteudo\//.test(caminho)) {
  const ponto = spawnSync("npm", ["run", "--silent", "ponto", "--", "guardar", caminho, "roteiro"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  console.log(
    ponto.status === 0
      ? "\nPonto guardado no Postaí (roteiro e voz): se a execução parar, o dono continua daqui."
      : `\n(O ponto não foi guardado: ${(ponto.stderr || ponto.stdout || "").trim().slice(-200)}. Rode npm run ponto -- guardar ${caminho} roteiro)`,
  );
}
