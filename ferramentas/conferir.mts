// Conferência automática de um episódio animado (molde Conversa), antes de
// renderizar. Confere o que é regra fixa e não depende de gosto: tamanhos,
// CTAs, @ e texto de exemplo, movimento dos personagens, capa e post. Não
// gasta nada do Claude e não se distrai. O gosto (graça, ritmo, beleza) fica
// com a agente crítica, que assiste ao vídeo pronto.
//
// Cada problema diz quem corrige. Sai com erro (código 1) se houver algum ERRO.
//
// Uso: npm run conferir -- conteudo/<arquivo>.json
import { existsSync, readFileSync } from "node:fs";

const arquivo = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!arquivo || !existsSync(arquivo)) {
  console.error("Uso: npm run conferir -- conteudo/<arquivo>.json");
  process.exit(1);
}

type Estado = { pose?: string; expressao?: string };
type Cena = { quem?: string; fala?: string; estados?: Record<string, Estado>; narracao?: unknown } & Record<string, unknown>;
type Peca = {
  molde?: string;
  titulo?: string;
  cenas?: Cena[];
  elenco?: Array<{ id: string }>;
  ctaInicial?: string;
  ctaFinal?: string;
  botaoFinal?: string;
  capa?: { titulo?: string; destaque?: string } & Record<string, unknown>;
  post?: { titulo?: string; legenda?: string };
};

const peca = JSON.parse(readFileSync(arquivo, "utf8")) as Peca;
const erros: string[] = [];
const avisos: string[] = [];
const erro = (quem: string, texto: string) => erros.push(`${quem}: ${texto}`);
const aviso = (quem: string, texto: string) => avisos.push(`${quem}: ${texto}`);

// Letras como a pessoa vê (um emoji simples conta como um)
const tamanho = (texto = "") => Array.from(texto).length;
const palavras = (texto = "") => texto.trim().split(/\s+/).filter(Boolean).length;

if (peca.molde !== "Conversa") {
  console.log(`Molde ${peca.molde ?? "?"}: esta conferência é só para o molde Conversa.`);
  process.exit(0);
}

// ---- Roteiro ----
const cenas = peca.cenas ?? [];
if (!peca.titulo) erro("roteirista", "falta o título");
else if (tamanho(peca.titulo) > 50) erro("roteirista", `título com ${tamanho(peca.titulo)} caracteres (até 50)`);
if (cenas.length < 4 || cenas.length > 7) erro("roteirista", `${cenas.length} cenas (de 4 a 7)`);
cenas.forEach((cena, i) => {
  const n = palavras(cena.fala);
  if (n > 12) erro("roteirista", `cena ${i + 1}: fala com ${n} palavras (até 12)`);
});

// ---- CTAs: curtos, frase inteira, nunca @ ----
const temContato = (texto = "") => /@\w|https?:|www\.|\.com\b|\.app\b|link na bio/i.test(texto);
if (!peca.ctaInicial) erro("roteirista", "falta o ctaInicial");
else if (tamanho(peca.ctaInicial) > 28) erro("roteirista", `ctaInicial com ${tamanho(peca.ctaInicial)} caracteres (até 28, cabe numa linha do balão)`);
if (!peca.ctaFinal) erro("roteirista", "falta o ctaFinal");
else {
  if (tamanho(peca.ctaFinal) > 60) erro("roteirista", `ctaFinal com ${tamanho(peca.ctaFinal)} caracteres (até 60)`);
  if (temContato(peca.ctaFinal)) erro("roteirista", 'ctaFinal com @, site ou "link na bio": isso vai no botaoFinal');
}
if (!peca.botaoFinal) erro("roteirista", 'falta o botaoFinal (ex.: "Link na bio 👆")');
else {
  if (tamanho(peca.botaoFinal) > 24) erro("roteirista", `botaoFinal com ${tamanho(peca.botaoFinal)} caracteres (até 24)`);
  if (/@\w/.test(peca.botaoFinal)) erro("roteirista", "botaoFinal com @: o @ nunca aparece no vídeo");
}

// ---- Movimento: os dois mudam de uma cena para a outra ----
const ids = peca.elenco?.length ? peca.elenco.map((p) => p.id) : ["noiva", "organizadora"];
const estadoNa = (cena: Cena, id: string): Estado | undefined =>
  cena.estados?.[id] ?? (cena[id] as Estado | undefined);
for (const id of ids) {
  let anterior: Estado | undefined;
  cenas.forEach((cena, i) => {
    const atual = estadoNa(cena, id);
    if (!atual) {
      erro("diretora-de-arte", `cena ${i + 1}: falta a pose e a expressão de "${id}" em estados`);
    } else if (anterior && atual.pose === anterior.pose && atual.expressao === anterior.expressao) {
      erro("diretora-de-arte", `cena ${i + 1}: "${id}" repete ${atual.pose}/${atual.expressao} da cena ${i}; mude a pose ou a expressão`);
    }
    anterior = atual ?? anterior;
  });
}
for (const cena of cenas) {
  if (cena.quem && !ids.includes(cena.quem)) erro("roteirista", `"${cena.quem}" fala, mas não está no elenco (${ids.join(", ")})`);
}

// ---- Narração: ou todas as falas, ou nenhuma ----
const narradas = cenas.filter((c) => c.narracao).length;
if (narradas > 0 && narradas < cenas.length) erro("producao", `só ${narradas} de ${cenas.length} falas narradas: rode o narrar de novo`);

// ---- Capa e post ----
if (!peca.capa?.titulo) erro("diretora-de-arte", "falta capa.titulo");
else if (palavras(peca.capa.titulo) > 6) erro("diretora-de-arte", `capa.titulo com ${palavras(peca.capa.titulo)} palavras (até 6)`);
if (peca.capa?.titulo && peca.capa.destaque && !peca.capa.titulo.includes(peca.capa.destaque)) {
  erro("diretora-de-arte", `capa.destaque "${peca.capa.destaque}" não está no título da capa`);
}
if (!peca.post?.titulo || !peca.post.legenda) erro("roteirista", "falta post.titulo ou post.legenda");
else {
  if (tamanho(peca.post.titulo) > 70) erro("roteirista", `post.titulo com ${tamanho(peca.post.titulo)} caracteres (até 70)`);
  const hashtags = peca.post.legenda.match(/#\p{L}[\p{L}\p{N}_]*/gu) ?? [];
  if (hashtags.length > 5) erro("roteirista", `${hashtags.length} hashtags na legenda (até 5)`);
}

// ---- Texto de exemplo e marca ----
const tudo = JSON.stringify({ ...peca, cenas: cenas.map(({ narracao: _n, ...resto }) => resto), elenco: undefined });
if (/sua ?marca|@suamarca|lorem ipsum/i.test(tudo)) erro("roteirista", 'texto de exemplo ("Sua Marca", "@suamarca") no roteiro');
if (existsSync("marca/marca.json")) {
  const marca = JSON.parse(readFileSync("marca/marca.json", "utf8")) as { nome?: string; logo?: string | null };
  if (!marca.nome || /^sua marca$/i.test(marca.nome)) erro("producao", "a marca do canal não foi baixada: rode npm run canal -- canais/<canal>");
  if (!marca.logo) aviso("producao", "sem logo: o balão e o cartão do fim usam a inicial do nome");
}

// ---- Resultado ----
for (const texto of avisos) console.log(`AVISO  ${texto}`);
for (const texto of erros) console.log(`ERRO   ${texto}`);
if (erros.length) {
  console.log(`\n${erros.length} erro(s). Mande cada um para quem está antes dos dois-pontos e rode de novo.`);
  process.exit(1);
}
console.log(`\nConferência automática: tudo certo${avisos.length ? ` (${avisos.length} aviso(s))` : ""}.`);
