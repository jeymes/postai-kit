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
import { FPS, quadrosDaFala } from "../src/moldes/tempos.ts";

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
  const canalMd = ["canais/dark/canal-postai.md", ...process.argv.slice(2).filter((a) => a.endsWith(".md"))].find(existsSync);
  const minutos = Number(/Uns (\d+) minutos/.exec(canalMd ? readFileSync(canalMd, "utf8") : "")?.[1] ?? 10);
  const total = longas.reduce((soma, c) => soma + palavras(c.fala), 0);
  const alvo = minutos * 140;
  const narrado = longas.every((c) => c.narracao?.duracaoSeg);
  // Cena sem voz vai muda para o vídeo. Parte narrada e parte não = algo gravou o
  // roteiro por cima da narração; com --com-voz (antes da prévia e do render),
  // nenhuma cena pode estar sem voz. O narrar reaproveita as cenas já narradas.
  const semVoz = longas.map((c, i) => (c.narracao?.duracaoSeg ? 0 : i + 1)).filter(Boolean);
  const exigirVoz = process.argv.includes("--com-voz");
  if (semVoz.length && (exigirVoz || semVoz.length < longas.length)) {
    erro("producao", `${semVoz.length} cena(s) sem voz (${semVoz.slice(0, 8).join(", ")}${semVoz.length > 8 ? "…" : ""}): rode o narrar de novo, ele só narra as que faltam`);
  }
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
  const PLANOS = ["aberto", "medio", "close", "de-baixo", "por-cima"];
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
cenas.forEach((cena, i) => {
  const n = palavras(cena.fala);
  if (n > 12) erro("roteirista", `cena ${i + 1}: fala com ${n} palavras (até 12)`);
});

// ---- CTAs: curtos, frase inteira, nunca @ ----
const temContato = (texto = "") => /@\w|https?:|www\.|\.com\b|\.app\b|link na bio/i.test(texto);
if (!peca.ctaInicial) erro("roteirista", "falta o ctaInicial");
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
for (const id of ids) {
  let anterior: Estado | undefined;
  cenas.forEach((cena, i) => {
    const atual = estadoNa(cena, id);
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
  if (cena.quem && !ids.includes(cena.quem)) erro("roteirista", `"${cena.quem}" fala, mas não está no elenco (${ids.join(", ")})`);
  for (const id of Object.keys(cena.meio ?? {})) {
    if (!ids.includes(id)) erro("diretora-de-arte", `"${id}" em meio, mas não está no elenco (${ids.join(", ")})`);
  }
}

// ---- Objetos e corpo: o celular, a luz do aviso e o sentado ----
// Defeitos que a crítica deixava passar: luz acesa sem ninguém com o celular e
// pessoa sentada sem a cama ou o sofá na frente (as pernas sumiam; o molde
// agora põe de pé, mas o roteiro tem que pedir certo)
{
  const cenariosComFrente = new Set(["quarto", "sala", ...(((peca as Record<string, unknown>).cenariosProprios as Array<{ id: string; frente?: string }> | undefined) ?? []).filter((c) => c.frente).map((c) => c.id)]);
  let cenario = (peca as Record<string, unknown>).cenario as string | undefined;
  const daEsquerda = ids.length === 2 ? ids[0] : null;
  cenas.forEach((cena, i) => {
    cenario = (cena.cenario as string | undefined) ?? cenario;
    const poses = [...Object.entries(cena.estados ?? {}), ...ids.filter((id) => cena[id]).map((id) => [id, cena[id] as Estado] as const)];
    if (cena.luz && !poses.some(([, e]) => e?.pose === "celular" || e?.pose === "sentado"))
      erro("diretora-de-arte", `cena ${i + 1}: tem "luz" mas ninguém está com o celular (pose celular ou sentado); a luz acenderia numa mão vazia`);
    for (const [id, e] of [...poses, ...Object.entries(cena.meio ?? {})]) {
      if (e?.pose !== "sentado") continue;
      if (!cenariosComFrente.has(cenario ?? "") || id !== daEsquerda)
        aviso("diretora-de-arte", `cena ${i + 1}: "${id}" sentado sem a cama ou o sofá na frente dele (só no quarto, na sala ou num cenário com frente, e só o da esquerda numa conversa de dois): o vídeo vai mostrar de pé com o celular`);
    }
  });
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
