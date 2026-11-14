// Conferência automática de um episódio animado (molde Conversa) ou de um
// vídeo do Canal dark (molde Documentario), antes de
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

function resultado(): never {
  for (const texto of avisos) console.log(`AVISO  ${texto}`);
  for (const texto of erros) console.log(`ERRO   ${texto}`);
  if (erros.length) {
    console.log(`\n${erros.length} erro(s). Mande cada um para quem está antes dos dois-pontos e rode de novo.`);
    process.exit(1);
  }
  console.log(`\nConferência automática: tudo certo${avisos.length ? ` (${avisos.length} aviso(s))` : ""}.`);
  process.exit(0);
}

// ---- Documentario (Canal dark): a forma, por código. Os fatos ficam com a checadora ----
if (peca.molde === "Documentario") {
  type CenaLonga = { fala?: string; foto?: string; busca?: string; capitulo?: string; texto?: string; narracao?: { duracaoSeg?: number } };
  const doc = peca as unknown as {
    cenas?: CenaLonga[];
    encerramento?: string;
    capa?: { titulo?: string; destaque?: string; foto?: string };
    post?: { titulo?: string; legenda?: string };
  };
  const longas = doc.cenas ?? [];
  // A duração do canal vem do canal-postai.md ("Uns N minutos de fala")
  const canalMd = ["canais/dark/canal-postai.md", ...process.argv.slice(2).filter((a) => a.endsWith(".md"))].find(existsSync);
  const minutos = Number(/Uns (\d+) minutos/.exec(canalMd ? readFileSync(canalMd, "utf8") : "")?.[1] ?? 10);
  const total = longas.reduce((soma, c) => soma + palavras(c.fala), 0);
  const alvo = minutos * 140;
  const narrado = longas.every((c) => c.narracao?.duracaoSeg);
  if (narrado) {
    const seg = longas.reduce((soma, c) => soma + Number(c.narracao?.duracaoSeg ?? 0), 0);
    if (Math.abs(seg - minutos * 60) > minutos * 60 * 0.2)
      erro("roteirista-narrado", `${(seg / 60).toFixed(1)} min de fala; o canal pede uns ${minutos} (corte ou acrescente cenas)`);
  } else if (Math.abs(total - alvo) > alvo * 0.2) {
    erro("roteirista-narrado", `${total} palavras; o canal pede uns ${minutos} min (cerca de ${alvo} palavras, com até 20% de diferença)`);
  }
  const capitulos = longas.filter((c) => c.capitulo);
  if (!longas[0]?.capitulo) erro("roteirista-narrado", "a cena 1 precisa abrir um capítulo (vira o 00:00 da descrição)");
  if (capitulos.length < 4 || capitulos.length > 8) erro("roteirista-narrado", `${capitulos.length} capítulos (de 4 a 8)`);
  let desdeOTexto = 99;
  longas.forEach((c, i) => {
    const n = i + 1;
    if (!c.fala?.trim()) erro("roteirista-narrado", `cena ${n}: sem fala`);
    const frases = (c.fala ?? "").split(/[.!?…]+/).filter((f) => f.trim()).length;
    if (frases > 3) aviso("roteirista-narrado", `cena ${n}: ${frases} frases (o ideal é de 1 a 3)`);
    if (c.capitulo && tamanho(c.capitulo) > 40) erro("roteirista-narrado", `cena ${n}: capítulo com ${tamanho(c.capitulo)} caracteres (até 40)`);
    if (c.texto) {
      if (tamanho(c.texto) > 40) erro("roteirista-narrado", `cena ${n}: texto na tela com ${tamanho(c.texto)} caracteres (até 40)`);
      if (desdeOTexto < 5) aviso("roteirista-narrado", `cena ${n}: texto na tela a menos de 5 cenas do anterior`);
      desdeOTexto = 0;
    } else desdeOTexto++;
    if (!c.foto && !c.busca) erro("roteirista-narrado", `cena ${n}: sem busca de imagem`);
    if (c.foto && !existsSync(`public/${c.foto}`)) erro("pesquisadora-de-imagens", `cena ${n}: a imagem ${c.foto} não existe em public/`);
  });
  const semFoto = longas.filter((c) => !c.foto).length;
  if (semFoto) erro("pesquisadora-de-imagens", `${semFoto} cena(s) sem foto`);
  const usos = new Map<string, number>();
  for (const c of longas) if (c.foto) usos.set(c.foto, (usos.get(c.foto) ?? 0) + 1);
  for (const [foto, vezes] of usos) if (vezes > 3) erro("pesquisadora-de-imagens", `${foto} aparece em ${vezes} cenas (no máximo 3)`);
  if (!doc.encerramento) aviso("roteirista-narrado", "sem encerramento: o vídeo acaba na última cena");
  else if (tamanho(doc.encerramento) > 50) erro("roteirista-narrado", `encerramento com ${tamanho(doc.encerramento)} caracteres (até 50)`);
  if (!doc.capa?.titulo) erro("roteirista-narrado", "falta capa.titulo");
  else {
    if (palavras(doc.capa.titulo) > 8) erro("roteirista-narrado", `capa.titulo com ${palavras(doc.capa.titulo)} palavras (até 8)`);
    if (doc.capa.destaque && !doc.capa.titulo.toLowerCase().includes(doc.capa.destaque.toLowerCase()))
      erro("roteirista-narrado", `capa.destaque "${doc.capa.destaque}" não está no título da capa`);
  }
  if (!doc.capa?.foto) erro("pesquisadora-de-imagens", "falta capa.foto");
  if (!doc.post?.titulo || !doc.post.legenda) erro("roteirista-narrado", "falta post.titulo ou post.legenda");
  else {
    if (tamanho(doc.post.titulo) > 100) erro("roteirista-narrado", `post.titulo com ${tamanho(doc.post.titulo)} caracteres (até 100)`);
    if (tamanho(doc.post.legenda) > 1800) erro("roteirista-narrado", `post.legenda com ${tamanho(doc.post.legenda)} caracteres (até 1.800: os capítulos entram depois)`);
  }
  const textoTodo = JSON.stringify({ ...doc, cenas: longas.map(({ narracao: _n, ...resto }) => resto) });
  if (/sua ?marca|@suamarca|lorem ipsum/i.test(textoTodo)) erro("roteirista-narrado", 'texto de exemplo ("Sua Marca") no roteiro');
  console.log(`Documentario: ${longas.length} cenas, ${total} palavras (alvo ~${alvo}), ${capitulos.length} capítulos, ${usos.size} imagens.`);
  resultado();
}

if (peca.molde !== "Conversa") {
  console.log(`Molde ${peca.molde ?? "?"}: esta conferência é para os moldes Conversa e Documentario.`);
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
resultado();
