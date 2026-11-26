// Conferência automática de um episódio animado (molde Conversa ou Mundo3D) ou
// de um vídeo do Canal dark (molde Documentario), antes de
// renderizar. Confere o que é regra fixa e não depende de gosto: tamanhos,
// CTAs, @ e texto de exemplo, movimento dos personagens, capa e post. Não
// gasta nada do Claude e não se distrai. O gosto (graça, ritmo, beleza) fica
// com a agente crítica, que assiste ao vídeo pronto.
//
// Cada problema diz quem corrige. Sai com erro (código 1) se houver algum ERRO.
//
// Uso: npm run conferir -- conteudo/<arquivo>.json
import { existsSync, readFileSync } from "node:fs";
import { cenariosFaltando } from "./cenarios-do-roteiro.ts";
import { duracaoDoMolde, falaDoNarrador, FPS, quadrosDaFala } from "../src/moldes/tempos.ts";
import { VOZES, VOZES_DO_ELENCO } from "../src/componentes/personagens/vozes.ts";
import { avisoDeDuracao, minutosDoCanal } from "./duracao-do-canal.ts";
import { palavrasDificeis, pronunciasDoVideo } from "./voz/pronuncias.ts";

const arquivo = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!arquivo || !existsSync(arquivo)) {
  console.error("Uso: npm run conferir -- conteudo/<arquivo>.json");
  process.exit(1);
}

type Estado = { pose?: string; expressao?: string };
type Cena = { quem?: string; fala?: string; estados?: Record<string, Estado>; meio?: Record<string, Estado>; narracao?: unknown } & Record<string, unknown>;
type Peca = {
  molde?: string;
  titulo?: string;
  cenas?: Cena[];
  elenco?: Array<{ id: string; tipo?: string }>;
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

// Texto sem cara de IA (canais/VOZ.md, 23/11/2026): frase longa demais e os
// vícios mais comuns viram aviso; a crítica decide se reescreve.
const VICIOS_DE_IA: Array<[RegExp, string]> = [
  [/\bneste v[ií]deo\b|\bin this video\b|\ben este v[ií]deo\b/i, '"neste vídeo"'],
  [/voc[eê] j[aá] se perguntou|have you ever wondered|alguna vez te has preguntado/i, '"você já se perguntou"'],
  [/voc[eê] n[aã]o vai acreditar|you won'?t believe|no vas a creer/i, '"você não vai acreditar"'],
  [/fique at[eé] o final|stay until the end|qu[eé]date hasta el final/i, '"fique até o final"'],
  [/\bmas n[aã]o [eé] s[oó] isso\b|\bbut that'?s not all\b|\bpero eso no es todo\b/i, '"mas não é só isso"'],
  [/\bjornada\b|\bjourney\b|\bmergulh(ar|amos|e)\b|\bdelve\b|\btape[cç]aria\b|\btapestry\b|\bfascinante\b|\bdesvendar\b/i, "palavra gasta (jornada, mergulhar, fascinante, desvendar)"],
  [/[eé] importante lembrar|vale destacar|vale ressaltar|it'?s important to note/i, '"é importante lembrar"'],
];
function conferirVoz(quem: string, onde: string, fala = "") {
  for (const frase of fala.split(/(?<=[.!?…])\s+/)) {
    const n = palavras(frase);
    if (n > 25) aviso(quem, `${onde}: frase com ${n} palavras ("${frase.slice(0, 50)}…"): quebre em duas (canais/VOZ.md)`);
  }
  for (const [padrao, nome] of VICIOS_DE_IA) if (padrao.test(fala)) aviso(quem, `${onde}: ${nome} soa como texto de IA (canais/VOZ.md)`);
  const travessoes = (fala.match(/—/g) ?? []).length;
  if (travessoes >= 2) aviso(quem, `${onde}: ${travessoes} travessões (—) na mesma fala soam como IA`);
}

function resultado(): never {
  // Palavra estrangeira ou difícil sem "pronuncia" (26/11/2026: "splagchnizomai" saiu
  // entrecortado num vídeo postado; a conferência da voz não pega palavra estrangeira)
  {
    const doCanal = existsSync(".postai-idioma") ? readFileSync(".postai-idioma", "utf8").trim() : "";
    const idioma = String((peca as Record<string, unknown>).idioma ?? (doCanal || "pt"));
    const falas = ((peca.cenas ?? []) as Array<{ fala?: string }>).map((c) => c.fala ?? "").filter(Boolean);
    const dificeis = palavrasDificeis(falas, pronunciasDoVideo((peca as Record<string, unknown>).pronuncia as Record<string, string> | undefined, idioma), idioma);
    if (dificeis.length)
      aviso("roteirista", `a voz pode ler errado: ${dificeis.join(", ")}. Ponha em "pronuncia" como se lê (ex.: "splagchnizomai": "splanknízomai") ou troque por português`);
  }
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
  type CenaLonga = { fala?: string; foto?: string; video?: string; busca?: string; capitulo?: string; texto?: string; narracao?: { duracaoSeg?: number } };
  const doc = peca as unknown as {
    cenas?: CenaLonga[];
    encerramento?: string;
    capa?: {
      titulo?: string;
      destaque?: string;
      foto?: string;
      modelo?: string;
      foto2?: string;
      rotulos?: unknown;
      selo?: string;
      marca?: { x?: unknown; y?: unknown };
    };
    post?: { titulo?: string; legenda?: string };
  };
  const longas = doc.cenas ?? [];
  // A duração do canal vem do canal-postai.md ("Uns N minutos de fala")
  const minutos = minutosDoCanal(process.argv.slice(2)) ?? 10;
  const total = longas.reduce((soma, c) => soma + palavras(c.fala), 0);
  // A voz fala uns 185 palavras por minuto, contando as pausas entre as cenas
  // (medido em 22/11/2026; com 140, o roteiro saía 30% curto e voltava depois da narração)
  const alvo = minutos * 185;
  const narrado = longas.every((c) => c.narracao?.duracaoSeg);
  // Cena sem voz vai muda para o vídeo. Parte narrada e parte não = algo gravou o
  // roteiro por cima da narração; com --com-voz (antes da prévia e do render),
  // nenhuma cena pode estar sem voz. O narrar reaproveita as cenas já narradas.
  const semVoz = longas.map((c, i) => (c.narracao?.duracaoSeg ? 0 : i + 1)).filter(Boolean);
  const exigirVoz = process.argv.includes("--com-voz");
  if (semVoz.length && (exigirVoz || semVoz.length < longas.length)) {
    erro("producao", `${semVoz.length} cena(s) sem voz (${semVoz.slice(0, 8).join(", ")}${semVoz.length > 8 ? "…" : ""}): rode o narrar de novo, ele só narra as que faltam`);
  }
  // Duas cenas no mesmo áudio = uma fala tocando no lugar da outra (o defeito de
  // 22/11/2026, quando cenas entravam no meio do roteiro)
  const porAudio = new Map<string, number[]>();
  longas.forEach((c, i) => {
    const audio = (c.narracao as { audio?: string } | undefined)?.audio;
    if (audio) porAudio.set(audio, [...(porAudio.get(audio) ?? []), i + 1]);
  });
  for (const cenas of porAudio.values())
    if (cenas.length > 1) erro("producao", `as cenas ${cenas.join(", ")} usam o mesmo áudio: rode npm run narrar -- <arquivo> --refazer`);
  if (narrado) {
    const seg = longas.reduce((soma, c) => soma + Number(c.narracao?.duracaoSeg ?? 0), 0);
    if (Math.abs(seg - minutos * 60) > minutos * 60 * 0.2)
      erro("roteirista-narrado", `${(seg / 60).toFixed(1)} min de fala; o canal pede uns ${minutos} (corte ou acrescente cenas)`);
  } else if (Math.abs(total - alvo) > alvo * 0.2) {
    erro("roteirista-narrado", `${total} palavras; o canal pede uns ${minutos} min (cerca de ${alvo} palavras, com até 20% de diferença)`);
  }
  // A duração do VÍDEO (cada cena ganha uns 0,7 s de respiro, e há o cartão final),
  // não só a das falas: passa de 120% do alvo, avisa antes do render
  {
    const falas = longas.reduce((soma, c) => soma + (c.narracao?.duracaoSeg ? Number(c.narracao.duracaoSeg) : quadrosDaFala({ fala: c.fala }) / FPS), 0);
    const video = duracaoDoMolde("Documentario", doc as unknown as Record<string, unknown>) / FPS;
    const longo = avisoDeDuracao(video, falas, minutos);
    if (longo) aviso("roteirista-narrado", longo);
  }
  const capitulos = longas.filter((c) => c.capitulo);
  if (!longas[0]?.capitulo) erro("roteirista-narrado", "a cena 1 precisa abrir um capítulo (vira o 00:00 da descrição)");
  if (capitulos.length < 4 || capitulos.length > 8) erro("roteirista-narrado", `${capitulos.length} capítulos (de 4 a 8)`);
  let desdeOTexto = 99;
  longas.forEach((c, i) => {
    const n = i + 1;
    if (!c.fala?.trim()) erro("roteirista-narrado", `cena ${n}: sem fala`);
    conferirVoz("roteirista-narrado", `cena ${n}`, c.fala);
    const frases = (c.fala ?? "").split(/[.!?…]+/).filter((f) => f.trim()).length;
    if (frases > 3) aviso("roteirista-narrado", `cena ${n}: ${frases} frases (o ideal é de 1 a 3)`);
    if (c.capitulo && tamanho(c.capitulo) > 40) erro("roteirista-narrado", `cena ${n}: capítulo com ${tamanho(c.capitulo)} caracteres (até 40)`);
    if (c.texto) {
      if (tamanho(c.texto) > 40) erro("roteirista-narrado", `cena ${n}: texto na tela com ${tamanho(c.texto)} caracteres (até 40)`);
      if (desdeOTexto < 5) aviso("roteirista-narrado", `cena ${n}: texto na tela a menos de 5 cenas do anterior`);
      desdeOTexto = 0;
    } else desdeOTexto++;
    if (!c.foto && !c.video && !c.busca) erro("roteirista-narrado", `cena ${n}: sem busca de imagem`);
    if (c.foto && !existsSync(`public/${c.foto}`)) erro("pesquisadora-de-imagens", `cena ${n}: a imagem ${c.foto} não existe em public/`);
    if (c.video && !existsSync(`public/${c.video}`)) erro("pesquisadora-de-imagens", `cena ${n}: o vídeo ${c.video} não existe em public/`);
  });
  // Cena sem imagem continua a imagem da anterior (o molde faz): o vídeo não para por
  // falta de foto. Só barra sem imagem na 1ª cena ou com mais de 2/3 das cenas sem imagem.
  const temImagem = (c: (typeof longas)[number]) => Boolean(c.foto || c.video);
  const semFoto = longas.filter((c) => !temImagem(c)).length;
  if (longas[0] && !temImagem(longas[0])) erro("pesquisadora-de-imagens", "a cena 1 precisa de foto ou vídeo (as cenas sem imagem continuam a anterior)");
  else if (semFoto > (longas.length * 2) / 3)
    erro("pesquisadora-de-imagens", `${semFoto} de ${longas.length} cenas sem imagem: é imagem de menos (tente termos mais gerais ou outra fonte)`);
  else if (semFoto) {
    // Quanto tempo a mesma imagem fica na tela (aviso: o ideal é até uns 30 s)
    let maior = 0;
    let atual = 0;
    for (const c of longas) {
      const quadros = quadrosDaFala({ fala: c.fala, narracao: c.narracao?.duracaoSeg ? { duracaoSeg: c.narracao.duracaoSeg } : undefined });
      atual = temImagem(c) ? quadros : atual + quadros;
      maior = Math.max(maior, atual);
    }
    aviso(
      "pesquisadora-de-imagens",
      `${semFoto} cena(s) sem imagem: continuam a imagem anterior (a mais longa fica ${Math.round(maior / FPS)} s na tela; o ideal é até uns 30 s, mas não pare o vídeo por isso)`,
    );
  }
  const usos = new Map<string, number>();
  for (const c of longas) if (c.foto) usos.set(c.foto, (usos.get(c.foto) ?? 0) + 1);
  for (const [foto, vezes] of usos) if (vezes > 3) erro("pesquisadora-de-imagens", `${foto} aparece em ${vezes} cenas (no máximo 3)`);
  // Contando as cenas sem foto, que continuam a imagem anterior: a mesma imagem fica em
  // mais cenas do que parece (23/11/2026: a moeda de Alexandre ficou em 4 cenas sem aviso)
  const naTela = new Map<string, number>();
  let ultima: string | undefined;
  for (const c of longas) {
    if (c.foto) ultima = c.foto;
    if (ultima) naTela.set(ultima, (naTela.get(ultima) ?? 0) + 1);
  }
  for (const [foto, vezes] of naTela)
    if (vezes > 3 && (usos.get(foto) ?? 0) <= 3)
      aviso("pesquisadora-de-imagens", `${foto} fica na tela em ${vezes} cenas, contando as sem foto que continuam ela: ponha imagem em algumas dessas cenas`);
  if (!doc.encerramento) aviso("roteirista-narrado", "sem encerramento: o vídeo acaba na última cena");
  else if (tamanho(doc.encerramento) > 50) erro("roteirista-narrado", `encerramento com ${tamanho(doc.encerramento)} caracteres (até 50)`);
  if (!doc.capa?.titulo) erro("roteirista-narrado", "falta capa.titulo");
  else {
    if (palavras(doc.capa.titulo) > 4) erro("roteirista-narrado", `capa.titulo com ${palavras(doc.capa.titulo)} palavras (até 4, letra grande na capa)`);
    if (doc.capa.destaque && !doc.capa.titulo.toLowerCase().includes(doc.capa.destaque.toLowerCase()))
      erro("roteirista-narrado", `capa.destaque "${doc.capa.destaque}" não está no título da capa`);
  }
  if (!doc.capa?.foto) erro("pesquisadora-de-imagens", "falta capa.foto");
  else if (!existsSync(`public/${doc.capa.foto}`)) erro("pesquisadora-de-imagens", `a capa.foto ${doc.capa.foto} não existe em public/`);
  // Os modelos de capa: o que cada um precisa (antes, o erro só aparecia no fim do render, depois do vídeo inteiro)
  const modelo = doc.capa?.modelo;
  if (modelo && !["classico", "circulo", "seta", "zoom", "dois-lados", "selo"].includes(modelo))
    erro("pesquisadora-de-imagens", `capa.modelo "${modelo}" não existe (classico, circulo, seta, zoom, dois-lados ou selo)`);
  if (modelo === "dois-lados") {
    if (!doc.capa?.foto2) erro("pesquisadora-de-imagens", "capa.modelo dois-lados precisa da capa.foto2");
    else if (!existsSync(`public/${doc.capa.foto2}`)) erro("pesquisadora-de-imagens", `a capa.foto2 ${doc.capa.foto2} não existe em public/`);
    const rotulos = doc.capa?.rotulos;
    if (rotulos !== undefined && !(Array.isArray(rotulos) && rotulos.length === 2 && rotulos.every((r) => typeof r === "string" && r.length <= 14)))
      erro("pesquisadora-de-imagens", 'capa.rotulos: dois textos de até 14 letras, ex.: ["1957", "HOJE"]');
  }
  if ((modelo === "circulo" || modelo === "seta" || modelo === "zoom") && !(typeof doc.capa?.marca?.x === "number" && typeof doc.capa?.marca?.y === "number"))
    erro("pesquisadora-de-imagens", `capa.modelo ${modelo} precisa da capa.marca { x, y } (em % da capa): confira com npm run renderizar -- <roteiro> --capa`);
  if (modelo === "selo" && !doc.capa?.selo) erro("pesquisadora-de-imagens", 'capa.modelo selo precisa do capa.selo (ex.: "PROIBIDO")');
  if (!doc.post?.titulo || !doc.post.legenda) erro("roteirista-narrado", "falta post.titulo ou post.legenda");
  else {
    if (tamanho(doc.post.titulo) > 100) erro("roteirista-narrado", `post.titulo com ${tamanho(doc.post.titulo)} caracteres (até 100)`);
    if (tamanho(doc.post.legenda) > 1800) erro("roteirista-narrado", `post.legenda com ${tamanho(doc.post.legenda)} caracteres (até 1.800: os capítulos entram depois)`);
  }
  // Foto do Unsplash (e a capa): o crédito na legenda do post é obrigatório (o buscar-fotos anota no CREDITOS.md)
  const usadas = new Set([...usos.keys(), ...(doc.capa?.foto ? [doc.capa.foto] : []), ...(doc.capa?.foto2 ? [doc.capa.foto2] : [])]);
  for (const pasta of new Set([...usadas].map((f) => f.split("/").slice(0, -1).join("/")))) {
    const caminho = `public/${pasta}/CREDITOS.md`;
    if (!existsSync(caminho)) continue;
    for (const linha of readFileSync(caminho, "utf8").split("\n")) {
      const colunas = linha.split("|").map((c) => c.trim());
      // | arquivo | fonte | original | id | crédito |
      if (colunas[2] !== "unsplash" || !usadas.has(`${pasta}/${colunas[1]}`)) continue;
      const autor = (colunas[5] ?? "").replace(/^Foto de /, "").replace(/ no Unsplash$/, "");
      if (autor && !(doc.post?.legenda ?? "").includes(autor))
        erro("roteirista-narrado", `falta o crédito do Unsplash na legenda do post: "${colunas[5]}" (foto ${colunas[1]})`);
    }
  }
  const textoTodo = JSON.stringify({ ...doc, cenas: longas.map(({ narracao: _n, ...resto }) => resto) });
  if (/sua ?marca|@suamarca|lorem ipsum/i.test(textoTodo)) erro("roteirista-narrado", 'texto de exemplo ("Sua Marca") no roteiro');
  console.log(`Documentario: ${longas.length} cenas, ${total} palavras (alvo ~${alvo}), ${capitulos.length} capítulos, ${usos.size} imagens.`);
  resultado();
}

// ---- Mundo3D (bonecos de peças num mundo 3D): a forma, por código ----
if (peca.molde === "Mundo3D") {
  type Cena3D = { fala?: string; quem?: string; plano?: string; foco?: string; estados?: Record<string, unknown>; narracao?: { duracaoSeg?: number }; queda?: string };
  const m = peca as unknown as {
    titulo?: string;
    personagens?: Array<{ id: string; visual?: unknown }>;
    multidao?: unknown;
    cenas?: Cena3D[];
    ctaFinal?: string;
    botaoFinal?: string;
    cenario?: { ponte?: boolean; ambiente?: string };
    post?: { titulo?: string; legenda?: string };
  };
  const cenas = m.cenas ?? [];
  const ids = new Set((m.personagens ?? []).map((p) => p.id));
  const PLANOS = ["aberto", "medio-aberto", "medio", "close", "de-baixo", "por-cima"];
  const AMBIENTES = ["campo", "deserto", "cidade", "aldeia", "moderno"];
  const ambiente = m.cenario?.ambiente ?? "campo";
  const temPonte = m.cenario?.ponte ?? ambiente === "campo";
  if (!AMBIENTES.includes(ambiente)) erro("roteirista", `cenario.ambiente "${ambiente}" não existe (use ${AMBIENTES.join(", ")})`);
  const semCores = (peca as { bonecos?: string }).bonecos === "pecas" ? (m.personagens ?? []).filter((p) => !p.visual).map((p) => p.id) : [];
  if (semCores.length) aviso("roteirista", `sem as cores do elenco: ${semCores.join(", ")} (rode npm run elenco -- <arquivo> --canal canais/<canal>; fora do elenco, tudo bem)`);
  if (cenas.length < 3) erro("roteirista", `só ${cenas.length} cena(s): um vídeo pede de 5 a 12`);
  if (cenas.length > 14) erro("roteirista", `${cenas.length} cenas: no máximo 14 (o vídeo passa de 1 minuto)`);
  if (tamanho(m.titulo) > 60) erro("roteirista", `título com ${tamanho(m.titulo)} letras (até 60, cabe em 4 linhas)`);
  cenas.forEach((cena, i) => {
    const n = i + 1;
    if (!cena.fala?.trim()) erro("roteirista", `cena ${n} sem fala`);
    else if (palavras(cena.fala) > 28) erro("roteirista", `cena ${n} com ${palavras(cena.fala)} palavras (até 28: divida em duas cenas)`);
    conferirVoz("roteirista", `cena ${n}`, cena.fala);
    if (!PLANOS.includes(cena.plano ?? "")) erro("roteirista", `cena ${n}: plano "${cena.plano}" (use ${PLANOS.join(", ")})`);
    const foco = cena.foco ?? "";
    if (!(ids.has(foco) || (foco === "multidao" && m.multidao) || (foco === "ponte" && temPonte)))
      erro("roteirista", `cena ${n}: foco "${foco}" não existe (um id de personagens, "multidao" ou "ponte")`);
    if (cena.quem && !ids.has(cena.quem)) erro("roteirista", `cena ${n}: quem "${cena.quem}" não está em personagens`);
    for (const id of Object.keys(cena.estados ?? {})) if (!ids.has(id)) erro("roteirista", `cena ${n}: estado de "${id}", que não está em personagens`);
    if (cena.queda && !temPonte) erro("roteirista", `cena ${n}: queda sem ponte no cenário`);
    if (process.argv.includes("--com-voz") && !cena.narracao) erro("producao", `cena ${n} sem voz: rode o narrar de novo`);
  });
  // Os planos variam (o que prende é a câmera mudando)
  const repetidos = cenas.filter((c, i) => i > 0 && c.plano === cenas[i - 1].plano).length;
  if (cenas.length >= 4 && repetidos > cenas.length / 2) aviso("roteirista", "muitos planos iguais seguidos: varie (aberto, médio, de baixo, close)");
  const segundos = cenas.reduce((soma, c) => soma + (c.narracao?.duracaoSeg ?? palavras(c.fala) / 2.6), 0);
  if (segundos > 75) erro("roteirista", `uns ${Math.round(segundos)} s de fala: o Short vai até uns 60 s`);
  if (!m.ctaFinal) aviso("roteirista", "sem ctaFinal: o vídeo termina sem o cartão da marca");
  if (m.ctaFinal && (/@/.test(m.ctaFinal) || /link na bio/i.test(m.ctaFinal))) erro("roteirista", "ctaFinal sem @ e sem link na bio (isso vai no botão)");
  if (!m.post?.titulo || !m.post?.legenda) erro("roteirista", 'falta "post": { "titulo", "legenda" }');
  console.log(`Mundo3D: ${cenas.length} cenas, uns ${Math.round(segundos)} s de fala.`);
  resultado();
}

if (peca.molde !== "Conversa") {
  console.log(`Molde ${peca.molde ?? "?"}: esta conferência é para os moldes Conversa, Documentario e Mundo3D.`);
  process.exit(0);
}

// ---- Roteiro ----
const cenas = peca.cenas ?? [];
// Cenário que não é do kit nem está desenhado no roteiro (sai no ateliê, errado)
const semDesenho = cenariosFaltando(peca as Parameters<typeof cenariosFaltando>[0]);
if (semDesenho.length)
  erro("designer-de-personagens", `cenário sem desenho: ${semDesenho.join(", ")} (desenhe com npm run cenario ... --gravar e rode npm run cenarios -- ${arquivo} --canal canais/<canal>)`);
if (!peca.titulo) erro("roteirista", "falta o título");
else if (tamanho(peca.titulo) > 50) erro("roteirista", `título com ${tamanho(peca.titulo)} caracteres (até 50)`);
// De 4 a 7 cenas (uns 30 s); até 12 quando o canal pede vídeo mais longo (ex.: 45 a 60 s)
if (cenas.length < 4 || cenas.length > 12) erro("roteirista", `${cenas.length} cenas (de 4 a 7; até 12 se o canal pedir vídeo mais longo)`);
else if (cenas.length > 7) aviso("roteirista", `${cenas.length} cenas: só se o canal pedir vídeo mais longo (ex.: 45 a 60 s)`);
// O narrador (fala sem "quem", ou quem "narrador") conta a história por cima: a fala
// dele pode ser um pouco maior que a de um personagem (até 20 palavras)
const idsDoElenco = peca.elenco?.length ? peca.elenco.map((p) => p.id) : ["noiva", "organizadora"];
const doNarrador = (cena: Cena) => falaDoNarrador(cena.quem, idsDoElenco);
cenas.forEach((cena, i) => {
  const n = palavras(cena.fala);
  const limite = doNarrador(cena) ? 20 : 12;
  if (!cena.fala?.trim()) erro("roteirista", `cena ${i + 1}: sem fala`);
  if (n > limite) erro("roteirista", `cena ${i + 1}: fala ${doNarrador(cena) ? "do narrador " : ""}com ${n} palavras (até ${limite}${doNarrador(cena) ? "" : "; o narrador, até 20"})`);
  conferirVoz("roteirista", `cena ${i + 1}`, cena.fala);
});
// ---- Narrador: a voz dele ----
{
  const doTopo = (peca as Record<string, unknown>).voz as string | undefined;
  const narradas = cenas.filter(doNarrador).length;
  if (narradas) {
    if (!doTopo) aviso("roteirista", `${narradas} fala(s) do narrador sem "voz" no topo do roteiro: sai a voz padrão (feminina); ponha a voz do narrador que o canal diz (um id de src/componentes/personagens/vozes.ts)`);
    else if (!VOZES[doTopo] && !/^[a-z]{2}_[a-z]+/.test(doTopo))
      erro("roteirista", `"voz" do narrador "${doTopo}" não existe: use um id de src/componentes/personagens/vozes.ts (ex.: "masculina-12")`);
    // Narrador com a mesma voz de um personagem: quem assiste não sabe quem está falando
    const doElenco = new Map(
      [
        // Como no narrar: a voz da Bia e da Lu, a do elenco e, por cima, a de "vozes"
        ...Object.entries(VOZES_DO_ELENCO).map(([id, v]) => [id, v.voz] as const),
        ...((peca.elenco ?? []) as Array<{ id: string; voz?: string }>).filter((p) => p.voz).map((p) => [p.id, p.voz as string] as const),
        ...Object.entries(((peca as Record<string, unknown>).vozes ?? {}) as Record<string, { voz?: string } | string>).map(
          ([id, v]) => [id, typeof v === "string" ? v : (v.voz ?? "")] as const,
        ),
      ].filter(([id]) => cenas.some((c) => c.quem === id)),
    );
    const vozReal = (v?: string) => (v ? (VOZES[v]?.voz ?? v) : undefined);
    for (const [id, v] of doElenco)
      if (doTopo && vozReal(v) === vozReal(doTopo)) aviso("roteirista", `o narrador tem a mesma voz de "${id}": escolha outra voz para o narrador`);
  }
}

// ---- CTAs: curtos, frase inteira, nunca @ ----
const temContato = (texto = "") => /@\w|https?:|www\.|\.com\b|\.app\b|link na bio/i.test(texto);
// Sem ctaInicial não há balão no começo: o dono pode pedir para tirar (22/11/2026)
if (!peca.ctaInicial) aviso("roteirista", "sem ctaInicial: o vídeo começa sem o balão (só se o dono pediu)");
else if (tamanho(peca.ctaInicial) > 36) erro("roteirista", `ctaInicial com ${tamanho(peca.ctaInicial)} caracteres (até 36; acima de 28 o balão diminui a letra para caber numa linha)`);
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
// A criatura só está na tela da primeira cena em que fala ou tem pose até a luz do aviso
// (que a empurra e some com ela): antes disso e depois, não se cobra pose dela. 26/11/2026:
// a Dúvida só sai do celular na cena 3, e as cenas 1 e 2 davam erro falso
const naTela = (id: string, i: number) => {
  if (!peca.elenco?.some((p) => p.id === id && p.tipo === "criatura")) return true;
  const primeira = cenas.findIndex((c) => c.quem === id || estadoNa(c, id));
  if (primeira < 0 || i < primeira) return false;
  const luz = cenas.findIndex((c) => c.luz);
  return luz < 0 || i <= luz;
};
for (const id of ids) {
  let anterior: Estado | undefined;
  cenas.forEach((cena, i) => {
    const atual = estadoNa(cena, id);
    if (!naTela(id, i)) return;
    if (!atual) {
      erro("diretora-de-arte", `cena ${i + 1}: falta a pose e a expressão de "${id}" em estados`);
    } else if (anterior && atual.pose === anterior.pose && atual.expressao === anterior.expressao) {
      erro("diretora-de-arte", `cena ${i + 1}: "${id}" repete ${atual.pose}/${atual.expressao} da cena ${i}; mude a pose ou a expressão`);
    }
    // Com a virada no meio da fala, a cena termina na pose do meio
    anterior = cena.meio?.[id] ?? atual ?? anterior;
  });
}
for (const cena of cenas) {
  if (cena.quem && !doNarrador(cena) && !ids.includes(cena.quem)) erro("roteirista", `"${cena.quem}" fala, mas não está no elenco (${ids.join(", ")})`);
  for (const id of Object.keys(cena.meio ?? {})) {
    if (!ids.includes(id)) erro("diretora-de-arte", `"${id}" em meio, mas não está no elenco (${ids.join(", ")})`);
  }
}

// ---- Objetos de apoio, marca na testa e QR (26/11/2026) ----
{
  const qrDoRoteiro = (peca as Record<string, unknown>).qr as { texto?: string } | undefined;
  const site = existsSync("marca/marca.json") ? String((JSON.parse(readFileSync("marca/marca.json", "utf8")) as { site?: string }).site ?? "").trim() : "";
  if (qrDoRoteiro && !qrDoRoteiro.texto && !site) erro("roteirista", "qr sem texto e a marca sem site: ponha o endereço em qr.texto (o QR não aparece)");
  cenas.forEach((cena, i) => {
    const extra = cena as Record<string, unknown> & {
      objetos?: Array<{ quem?: string }>;
      testa?: Record<string, string>;
      qr?: { texto?: string };
    };
    for (const o of extra.objetos ?? [])
      if (o.quem && !ids.includes(o.quem)) erro("diretora-de-arte", `cena ${i + 1}: objeto com "${o.quem}", que não está no elenco (${ids.join(", ")})`);
    for (const id of Object.keys(extra.testa ?? {}))
      if (!ids.includes(id)) erro("diretora-de-arte", `cena ${i + 1}: testa de "${id}", que não está no elenco (${ids.join(", ")})`);
    if (extra.qr && !extra.qr.texto && !qrDoRoteiro?.texto && !site) erro("roteirista", `cena ${i + 1}: qr sem endereço (nem qr.texto nem o site da marca)`);
    const cartao = (peca as Record<string, unknown>).cartao as { entra?: number; sai?: number } | undefined;
    if (extra.qr && (extra.notificacao || (cartao && i >= (cartao.entra ?? 0) && i <= (cartao.sai ?? -1))))
      aviso("diretora-de-arte", `cena ${i + 1}: o QR divide o alto da tela com a notificação ou o cartão; confira na prévia se nada se cobre`);
  });
}

// ---- Objetos: o celular e a luz do aviso ----
// Luz acesa sem ninguém com o celular (defeito que a crítica deixava passar). Quem
// senta sem a cama, o sofá ou o painel na frente ganha uma poltrona (26/11/2026)
cenas.forEach((cena, i) => {
  const poses = [...Object.entries(cena.estados ?? {}), ...ids.filter((id) => cena[id]).map((id) => [id, cena[id] as Estado] as const)];
  if (cena.luz && !poses.some(([, e]) => e?.pose === "celular" || e?.pose === "sentado"))
    erro("diretora-de-arte", `cena ${i + 1}: tem "luz" mas ninguém está com o celular (pose celular ou sentado); a luz acenderia numa mão vazia`);
});

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
