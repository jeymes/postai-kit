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
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { cenariosFaltando } from "./cenarios-do-roteiro.ts";
import { CONVERSA, duracaoDoMolde, estimarPalavras, falaDoNarrador, FPS, quadrosDaFala, quadrosDaFalaConversa } from "../src/moldes/tempos.ts";
import { VOZES, VOZES_DO_ELENCO } from "../src/componentes/personagens/vozes.ts";
import { avisoDeDuracao, minutosDoCanal } from "./duracao-do-canal.ts";
import { palavrasDificeis, pronunciasDoVideo } from "./voz/pronuncias.ts";
import { graficoSchema, ICONES, TIPOS_DE_GRAFICO } from "../src/moldes/documentario/infografico/schema.ts";
import { normalizarPalavra } from "../src/moldes/documentario/infografico/numeros.ts";
import { ACOES, MAOS_OCUPADAS, MINIMO_NO_CENARIO, normalizar, POSES_DO_ROTEIRO, trocasDeCenario } from "../src/moldes/conversa/regras2d.ts";
import { corpoSemBracos } from "../src/componentes/personagens/semMangas.ts";
import { conferirIlustra } from "../src/componentes/ilustracao/tempo.ts";
import type { CenaDoPlano } from "../src/moldes/mundo3d/plano.ts";
import { ilustraSchema } from "../src/componentes/ilustracao/schema.ts";

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
// Ilustração da fala (27/11/2026): a palavra de cada item tem de estar na fala
const conferirIlustracoes = (lista: ReadonlyArray<{ fala?: string; ilustra?: unknown }>) =>
  lista.forEach((c, i) => {
    const formato = ilustraSchema.safeParse(c.ilustra);
    if (!formato.success) {
      for (const q of formato.error.issues.slice(0, 3)) erro("roteirista", `cena ${i + 1}: ilustra.${q.path.join(".")}: ${q.message.slice(0, 160)}`);
      return;
    }
    for (const problema of conferirIlustra(c.ilustra as Parameters<typeof conferirIlustra>[0], c.fala ?? "")) aviso("roteirista", `cena ${i + 1}: ${problema}`);
  });

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

/**
 * Os campos do modelo Quadro de evidências (todos opcionais: nos outros modelos o
 * molde não os usa). Confere o formato, para o render não parar no meio.
 */
function conferirQuadroDeEvidencias(doc: Record<string, unknown>, cenas: Record<string, unknown>[]) {
  const modelo = (doc.estilo as { modelo?: string } | undefined)?.modelo;
  const quadro = modelo === "evidencias";
  const INSERTS = ["mapa", "intertitulo", "acao"];
  const SILHUETAS = ["pessoa", "soldado", "cavalo", "navio", "carro", "canhao"];
  if (doc.tese !== undefined && (typeof doc.tese !== "string" || !doc.tese.trim() || tamanho(doc.tese) > 90))
    erro("roteirista-narrado", "tese: a pergunta central do vídeo, em texto de até 90 caracteres");
  let inserts = 0;
  let carimbos = 0;
  cenas.forEach((c, i) => {
    const n = i + 1;
    if (c.ligar !== undefined) {
      const lista = Array.isArray(c.ligar) ? c.ligar : [c.ligar];
      const ok = lista.length >= 1 && lista.length <= 4 && lista.every((x) => Number.isInteger(x) && (x as number) >= 1 && (x as number) < n);
      if (!ok) erro("roteirista-narrado", `cena ${n}: ligar precisa ser o número de uma cena ANTERIOR (1 a ${n - 1}) ou uma lista de até 4, ex.: 3 ou [3, 7]`);
    }
    if (c.carimbo !== undefined) {
      carimbos++;
      if (typeof c.carimbo !== "string" || !c.carimbo.trim() || tamanho(c.carimbo) > 16) erro("roteirista-narrado", `cena ${n}: carimbo é uma palavra curta, até 16 letras (ex.: "ULTRASSECRETO")`);
    }
    if (c.ano !== undefined && (typeof c.ano !== "string" || !c.ano.trim() || tamanho(c.ano) > 12))
      erro("roteirista-narrado", `cena ${n}: ano é texto curto, até 12 caracteres (ex.: "1807" ou "30 d.C.")`);
    if (c.insert !== undefined) {
      inserts++;
      if (typeof c.insert !== "string" || !INSERTS.includes(c.insert)) erro("roteirista-narrado", `cena ${n}: insert "${String(c.insert)}" não existe (mapa, intertitulo ou acao)`);
      else if (c.insert === "mapa" && !Array.isArray(c.rota)) erro("roteirista-narrado", `cena ${n}: insert mapa precisa da rota (os pontos do caminho)`);
      else if (c.insert === "intertitulo" && !c.texto) aviso("roteirista-narrado", `cena ${n}: intertitulo sem texto: sai a 1ª frase da fala (melhor pôr um texto curto)`);
    } else if (Array.isArray(c.rota)) inserts++;
    if (c.silhuetas !== undefined) {
      const lista = c.silhuetas;
      if (!Array.isArray(lista) || !lista.length || lista.length > 4 || !lista.every((x) => typeof x === "string" && SILHUETAS.includes(x)))
        erro("roteirista-narrado", `cena ${n}: silhuetas é uma lista de 1 a 4 entre ${SILHUETAS.join(", ")}`);
      else if (c.insert !== "acao") aviso("roteirista-narrado", `cena ${n}: silhuetas só aparecem com "insert": "acao"`);
    }
    if (c.detalhe !== undefined) {
      const d = c.detalhe;
      if (!(Array.isArray(d) && d.length === 2 && d.every((x) => typeof x === "number" && x >= 0 && x <= 100))) erro("pesquisadora-de-imagens", `cena ${n}: detalhe é [x, y] em % da imagem (0 a 100)`);
    }
    if (c.palavra !== undefined && (typeof c.palavra !== "string" || tamanho(c.palavra) > 24)) erro("roteirista-narrado", `cena ${n}: palavra com até 24 letras`);
  });
  if (!quadro) return;
  if (!doc.tese) aviso("roteirista-narrado", "Quadro de evidências sem tese: o cartão da pergunta central não aparece no meio do quadro");
  if (inserts > Math.ceil(cenas.length / 8)) aviso("roteirista-narrado", `${inserts} trechos de cinema mudo (insert ou rota): o ideal é no máximo 1 a cada 8 cenas`);
  if (carimbos > Math.ceil(cenas.length / 8)) aviso("roteirista-narrado", `${carimbos} carimbos: o ideal é 1 a cada 8 ou 10 cenas (o vermelho só no que importa)`);
}

/**
 * O campo `grafico` do modelo Infográfico animado: o formato (o mesmo schema do
 * molde), a fonte de todo dado real, números de verdade (não texto), o `em` que
 * existe na fala e o que cada tipo precisa. Os números e as contas em si a
 * checadora confere (refazendo a conta).
 */
function conferirInfografico(doc: Record<string, unknown>, cenas: Record<string, unknown>[]) {
  const modelo = (doc.estilo as { modelo?: string; fundo?: unknown } | undefined)?.modelo;
  const info = modelo === "infografico";
  const fundo = (doc.estilo as { fundo?: unknown } | undefined)?.fundo;
  if (fundo !== undefined && fundo !== "escuro" && fundo !== "claro") erro("roteirista-narrado", 'estilo.fundo é "escuro" ou "claro"');
  let comGrafico = 0;
  cenas.forEach((c, i) => {
    const n = i + 1;
    if (c.icone !== undefined && typeof c.icone === "string" && !(ICONES as readonly string[]).includes(c.icone))
      erro("roteirista-narrado", `cena ${n}: icone "${c.icone}" não existe (veja a lista em canais/NARRADO.md)`);
    if (c.grafico === undefined) {
      if (info && !c.foto && !c.video && !c.palavra && !c.icone) aviso("roteirista-narrado", `cena ${n}: sem gráfico, foto, palavra nem ícone: a tela fica só com um ícone genérico`);
      return;
    }
    comGrafico++;
    if (!info) aviso("roteirista-narrado", `cena ${n}: "grafico" só aparece no modelo infografico (este vídeo é ${modelo ?? "classico"})`);
    const g = c.grafico as Record<string, unknown>;
    const tipo = g && typeof g === "object" ? g.tipo : undefined;
    if (typeof tipo !== "string" || !(TIPOS_DE_GRAFICO as readonly string[]).includes(tipo)) {
      erro("roteirista-narrado", `cena ${n}: grafico.tipo "${String(tipo)}" não existe (${TIPOS_DE_GRAFICO.join(", ")})`);
      return;
    }
    const lido = graficoSchema.safeParse(g);
    if (!lido.success) {
      for (const problema of lido.error.issues.slice(0, 6)) {
        const campo = ["grafico", ...problema.path.map(String)].join(".");
        const recebido = problema.path.reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k as string] : undefined), g);
        const dica =
          problema.code === "invalid_type" && typeof recebido === "string" && /valor|^y$|total|marcados|^de$/.test(String(problema.path[problema.path.length - 1]))
            ? ` (número sem aspas e com ponto decimal: 35949.64, não "${recebido}")`
            : problema.code === "invalid_type" && recebido === undefined
              ? " (falta o campo)"
              : problema.code === "unrecognized_keys"
                ? ` (campo que o ${tipo} não tem)`
                : "";
        erro("roteirista-narrado", `cena ${n}: ${campo}: ${problema.message}${dica}`);
      }
      return;
    }
    const gr = lido.data;
    // Todo dado real tem fonte; a conta (cálculo) só recebe aviso
    if (!gr.fonte?.trim()) {
      if (gr.tipo === "conta") aviso("roteirista-narrado", `cena ${n}: conta sem fonte: ponha "Exemplo de cálculo" ou de onde vem a taxa`);
      else erro("roteirista-narrado", `cena ${n}: gráfico ${gr.tipo} sem fonte (ex.: "IBGE, 2025", "Banco Central"; numa simulação, "Exemplo de cálculo")`);
    }
    // A palavra que dispara a animação precisa estar na fala
    if (gr.em) {
      const alvo = gr.em.split(/\s+/).map(normalizarPalavra).filter(Boolean);
      const fala = String(c.fala ?? "").split(/\s+/).map(normalizarPalavra).filter(Boolean);
      const achou = alvo.length > 0 && fala.some((_, k) => alvo.every((a, j) => fala[k + j] === a || (j === alvo.length - 1 && (fala[k + j] ?? "").startsWith(a))));
      if (!achou) aviso("roteirista-narrado", `cena ${n}: grafico.em "${gr.em}" não está na fala: a animação começa no início da cena`);
    }
    if (gr.tipo === "unidades" && gr.marcados > gr.total) erro("roteirista-narrado", `cena ${n}: unidades com marcados (${gr.marcados}) maior que o total (${gr.total})`);
    if (gr.tipo === "unidades" && ![10, 20, 50, 100].includes(gr.total)) aviso("roteirista-narrado", `cena ${n}: unidades com total ${gr.total}: 10, 20, 50 ou 100 formam a grade mais bonita`);
    if (gr.tipo === "linha" && gr.destaque && !gr.pontos.some((p) => String(p.x) === String(gr.destaque?.x)))
      erro("roteirista-narrado", `cena ${n}: linha.destaque.x "${gr.destaque.x}" não é o x de nenhum ponto`);
    if (gr.tipo === "linha") {
      const xs = gr.pontos.map((p) => p.x);
      if (xs.some((x) => typeof x === "number") && xs.some((x) => typeof x === "string"))
        aviso("roteirista-narrado", `cena ${n}: linha com x em número e em texto misturados: use todos iguais (2015 ou "jan")`);
      if (xs.every((x) => typeof x === "number") && xs.some((x, k) => k > 0 && (x as number) <= (xs[k - 1] as number)))
        erro("roteirista-narrado", `cena ${n}: os pontos da linha precisam estar em ordem crescente de x`);
    }
    if (gr.tipo === "pizza" && gr.partes.reduce((a, p) => a + p.valor, 0) <= 0) erro("roteirista-narrado", `cena ${n}: pizza com as partes somando zero`);
    if (gr.tipo === "pizza" && (gr.unidade ?? "%").trim() === "%") {
      const soma = gr.partes.reduce((a, p) => a + p.valor, 0);
      if (Math.abs(soma - 100) > 1.5) aviso("roteirista-narrado", `cena ${n}: pizza em % somando ${soma}: o gráfico mostra cada parte como fatia do total (confira se falta uma parte, "Outros")`);
    }
    if (gr.tipo === "comparacao" && gr.a.valor === gr.b.valor) aviso("roteirista-narrado", `cena ${n}: comparação com os dois valores iguais`);
    if ((gr.tipo === "barras" || gr.tipo === "escala") && gr.itens.filter((x) => x.destaque).length > 1)
      aviso("roteirista-narrado", `cena ${n}: ${gr.tipo} com mais de um destaque: só o dado que importa sai na cor de destaque`);
  });
  if (info && cenas.length && comGrafico < cenas.length / 2)
    aviso("roteirista-narrado", `infográfico com gráfico em só ${comGrafico} de ${cenas.length} cenas: o ideal é em pelo menos metade (cena sem gráfico vira foto num cartão ou ícone com palavra)`);
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
  const infografico = (peca as { estilo?: { modelo?: string } }).estilo?.modelo === "infografico";
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
      if (desdeOTexto < 5 && !infografico) aviso("roteirista-narrado", `cena ${n}: texto na tela a menos de 5 cenas do anterior`);
      desdeOTexto = 0;
    } else desdeOTexto++;
    // No Infográfico a cena pode ser só o gráfico (ou o ícone com a palavra): não precisa de imagem
    const doInfo = infografico && Boolean((c as Record<string, unknown>).grafico || (c as Record<string, unknown>).icone || (c as Record<string, unknown>).palavra);
    if (!c.foto && !c.video && !c.busca && !doInfo) erro("roteirista-narrado", `cena ${n}: sem busca de imagem${infografico ? " nem gráfico" : ""}`);
    if (c.foto && !existsSync(`public/${c.foto}`)) erro("pesquisadora-de-imagens", `cena ${n}: a imagem ${c.foto} não existe em public/`);
    if (c.video && !existsSync(`public/${c.video}`)) erro("pesquisadora-de-imagens", `cena ${n}: o vídeo ${c.video} não existe em public/`);
  });
  // Cena sem imagem continua a imagem da anterior (o molde faz): o vídeo não para por
  // falta de foto. Só barra sem imagem na 1ª cena ou com mais de 2/3 das cenas sem imagem.
  const temImagem = (c: (typeof longas)[number]) =>
    Boolean(c.foto || c.video || (infografico && ((c as Record<string, unknown>).grafico || (c as Record<string, unknown>).icone || (c as Record<string, unknown>).palavra)));
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
    // No Infográfico, a cena com gráfico (ou ícone) não continua a foto anterior
    else if (infografico && temImagem(c)) ultima = undefined;
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
  if (modelo && !["classico", "circulo", "seta", "zoom", "dois-lados", "selo", "cinema"].includes(modelo))
    erro("pesquisadora-de-imagens", `capa.modelo "${modelo}" não existe (classico, circulo, seta, zoom, dois-lados, selo ou cinema)`);
  // Cinema: a foto é o retrato de IA feito para a capa (npm run buscar-fotos -- --capa), não uma pintura
  if (modelo === "cinema" && doc.capa?.foto && !/capa/i.test(doc.capa.foto))
    aviso("pesquisadora-de-imagens", 'capa.modelo cinema pede o retrato feito para a capa: npm run buscar-fotos -- --pasta <pasta> --capa --rosto <lado> capa="<descrição em inglês>" (ver "Capa" no canais/NARRADO.md)');
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
  conferirQuadroDeEvidencias(peca as Record<string, unknown>, longas as unknown as Record<string, unknown>[]);
  conferirInfografico(peca as Record<string, unknown>, longas as unknown as Record<string, unknown>[]);
  const textoTodo = JSON.stringify({ ...doc, cenas: longas.map(({ narracao: _n, ...resto }) => resto) });
  if (/sua ?marca|@suamarca|lorem ipsum/i.test(textoTodo)) erro("roteirista-narrado", 'texto de exemplo ("Sua Marca") no roteiro');
  console.log(`Documentario: ${longas.length} cenas, ${total} palavras (alvo ~${alvo}), ${capitulos.length} capítulos, ${usos.size} imagens.`);
  resultado();
}

// ---- Mundo3D (bonecos de peças num mundo 3D): a forma, por código ----
// 27/11/2026: as ações na palavra (acoes), o lugar por cena (lugar), quem está em
// cada cena (personagens[].cenas), o ritmo (nada parado mais de ~4 s) e as
// combinações que davam defeito na tela (objeto na mão com as duas mãos ocupadas,
// plano "ombro" sem ninguém, troca de lugar rápida demais).
if (peca.molde === "Mundo3D") {
  type Acao3D = { quem?: string; em?: string | number; acao?: string; ate?: [number, number]; para?: string; objeto?: string };
  type Cena3D = {
    fala?: string;
    quem?: string;
    plano?: string;
    foco?: string;
    lugar?: string;
    estados?: Record<string, { pose?: string; ate?: [number, number] }>;
    mudancas?: Array<{ em?: number; quem?: string; pose?: string }>;
    acoes?: Acao3D[];
    camera?: { cortar?: boolean };
    narracao?: { duracaoSeg?: number; legendas?: Array<{ texto: string }> };
    queda?: string;
  };
  const m = peca as unknown as {
    titulo?: string;
    bonecos?: string;
    personagens?: Array<{ id: string; visual?: unknown; onde?: [number, number]; cenas?: number[]; figurino?: number }>;
    multidao?: unknown;
    cenas?: Cena3D[];
    objetos?: Array<{ tipo: string; perto?: string; naMao?: boolean; cenas?: number[] }>;
    ctaFinal?: string;
    botaoFinal?: string;
    cenario?: { ponte?: boolean; ambiente?: string; rio?: boolean };
    post?: { titulo?: string; legenda?: string };
  };
  const cenas = m.cenas ?? [];
  const pecas = m.bonecos === "pecas";
  const ids = new Set((m.personagens ?? []).map((p) => p.id));
  const PLANOS = ["aberto", "medio-aberto", "medio", "close", "de-baixo", "por-cima", "ombro", "detalhe"];
  const AMBIENTES = ["campo", "deserto", "cidade", "aldeia", "moderno", "reino", "mar", "salao"];
  const ACOES = [
    "normal", "cintura", "celular", "celular-baixo", "cabeca", "explicando", "comemorando", "pensando", "sentado", "apontando", "caido", "abraco",
    "andar", "correr", "virar", "olhar", "olhar-cima", "olhar-baixo", "ajoelhar", "orar", "ajoelhar-orando", "levantar-bracos", "chorar", "acenar",
    "entregar", "abracar", "sentar", "levantar", "cair", "assustar", "cruzar-bracos", "mostrar", "apontar", "comemorar", "pensar", "explicar",
  ];
  // Poses que usam as duas mãos: o objeto da mão é guardado enquanto durar (some da tela)
  const DUAS_MAOS = new Set(["cabeca", "chorar", "orar", "ajoelhar-orando", "abraco", "abracar", "cruzar-bracos", "comemorando", "comemorar", "levantar-bracos"]);
  const ambiente = m.cenario?.ambiente ?? "campo";
  const temPonte = m.cenario?.ponte ?? ambiente === "campo";
  if (!AMBIENTES.includes(ambiente)) erro("roteirista", `cenario.ambiente "${ambiente}" não existe (use ${AMBIENTES.join(", ")})`);
  const semCores = pecas ? (m.personagens ?? []).filter((p) => !p.visual).map((p) => p.id) : [];
  if (semCores.length) aviso("roteirista", `sem as cores do elenco: ${semCores.join(", ")} (rode npm run elenco -- <arquivo> --canal canais/<canal>; fora do elenco, tudo bem)`);
  if (cenas.length < 3) erro("roteirista", `só ${cenas.length} cena(s): um vídeo pede de 5 a 12`);
  if (cenas.length > 14) erro("roteirista", `${cenas.length} cenas: no máximo 14 (o vídeo passa de 1 minuto)`);
  if (tamanho(m.titulo) > 60) erro("roteirista", `título com ${tamanho(m.titulo)} letras (até 60, cabe em 4 linhas)`);
  const presente = (id: string, n: number) => {
    const p = (m.personagens ?? []).find((x) => x.id === id);
    return !!p && (!p.cenas?.length || p.cenas.includes(n));
  };
  for (const p of m.personagens ?? []) {
    if (p.figurino !== undefined && !(Number.isInteger(p.figurino) && p.figurino >= 1 && p.figurino <= 5)) erro("roteirista", `${p.id}: figurino ${p.figurino} (use de 1 a 5)`);
    for (const q of m.personagens ?? [])
      if (p.id < q.id && p.onde && q.onde && Math.hypot(p.onde[0] - q.onde[0], p.onde[1] - q.onde[1]) < 1.2)
        aviso("diretora-de-arte", `${p.id} e ${q.id} começam a menos de 1,2 m um do outro: os braços se cruzam (afaste o "onde")`);
  }
  const limpa = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const segundosDe = (c: Cena3D) => c.narracao?.duracaoSeg ?? palavras(c.fala) / 2.6;
  let lugar = ambiente;
  let desdeATroca = 0;
  let trocas = 0;
  // Quem está com objeto na mão em cada cena (pelo "perto" e pelas cenas do objeto)
  // (segue o "entregar": depois da cena da entrega, o objeto é de quem recebeu)
  const donoNaCena = (o: { tipo: string; perto?: string }, n: number) => {
    let dono = o.perto;
    cenas.forEach((c, i) => {
      if (i + 1 >= n) return;
      for (const a of c.acoes ?? []) if (a.acao === "entregar" && a.quem === dono && a.para && (!a.objeto || a.objeto === o.tipo)) dono = a.para;
    });
    return dono;
  };
  const objetoNaMao = (id: string, n: number) =>
    (m.objetos ?? []).some((o) => o.naMao && donoNaCena(o, n) === id && (!o.cenas?.length || (n >= Math.min(...o.cenas) && n <= Math.max(...o.cenas))));
  conferirIlustracoes(cenas);
  cenas.forEach((cena, i) => {
    const n = i + 1;
    if (!cena.fala?.trim()) erro("roteirista", `cena ${n} sem fala`);
    else if (palavras(cena.fala) > 28) erro("roteirista", `cena ${n} com ${palavras(cena.fala)} palavras (até 28: divida em duas cenas)`);
    conferirVoz("roteirista", `cena ${n}`, cena.fala);
    if (!PLANOS.includes(cena.plano ?? "")) erro("roteirista", `cena ${n}: plano "${cena.plano}" (use ${PLANOS.join(", ")})`);
    const foco = cena.foco ?? "";
    if (!(ids.has(foco) || (foco === "multidao" && m.multidao) || (foco === "ponte" && temPonte)))
      erro("roteirista", `cena ${n}: foco "${foco}" não existe (um id de personagens, "multidao" ou "ponte")`);
    else if (ids.has(foco) && !presente(foco, n)) erro("roteirista", `cena ${n}: o foco "${foco}" não está nesta cena (veja "cenas" dele em personagens)`);
    if (cena.quem && !ids.has(cena.quem)) erro("roteirista", `cena ${n}: quem "${cena.quem}" não está em personagens`);
    for (const id of Object.keys(cena.estados ?? {})) if (!ids.has(id)) erro("roteirista", `cena ${n}: estado de "${id}", que não está em personagens`);
    if (cena.queda && !temPonte) erro("roteirista", `cena ${n}: queda sem ponte no cenário`);
    if (process.argv.includes("--com-voz") && !cena.narracao) erro("producao", `cena ${n} sem voz: rode o narrar de novo`);
    if (cena.plano === "ombro" && ![...ids].some((o) => o !== foco && presente(o, n)))
      aviso("diretora-de-arte", `cena ${n}: plano "ombro" sem mais ninguém na cena (sai um close)`);

    // O lugar: cada um fica pelo menos 6 s na tela (a troca rápida parecia defeito: "o cenário muda do nada")
    if (cena.lugar && !AMBIENTES.includes(cena.lugar)) erro("roteirista", `cena ${n}: lugar "${cena.lugar}" não existe (use ${AMBIENTES.join(", ")})`);
    if (cena.lugar && cena.lugar !== lugar) {
      if (i > 0 && desdeATroca < 6) erro("roteirista", `cena ${n}: troca de lugar ${desdeATroca.toFixed(1)} s depois da anterior (cada lugar fica pelo menos 6 s; junte as cenas do mesmo lugar)`);
      lugar = cena.lugar;
      desdeATroca = 0;
      trocas++;
    }
    desdeATroca += segundosDe(cena);

    // As ações: quem, a palavra, o que pede "para" ou "ate"
    const ditas = (cena.narracao?.legendas?.map((l) => l.texto) ?? (cena.fala ?? "").split(/\s+/)).map(limpa).filter(Boolean);
    for (const a of cena.acoes ?? []) {
      const onde = `cena ${n}, ação "${a.acao}" de ${a.quem}`;
      if (!a.acao || !ACOES.includes(a.acao)) erro("roteirista", `${onde}: essa ação não existe (use ${ACOES.join(", ")})`);
      if (!a.quem || (!ids.has(a.quem) && a.quem !== "multidao")) erro("roteirista", `${onde}: "${a.quem}" não está em personagens`);
      else if (a.quem !== "multidao" && !presente(a.quem, n)) erro("roteirista", `${onde}: ${a.quem} não está nesta cena`);
      if (typeof a.em === "string") {
        const alvo = limpa(a.em);
        if (!ditas.some((w) => w === alvo || w.startsWith(alvo) || (alvo.length >= 4 && alvo.startsWith(w) && w.length >= 3)))
          erro("roteirista", `${onde}: a palavra "${a.em}" não está na fala desta cena (a ação acontece na palavra dita)`);
      } else if (typeof a.em !== "number") erro("roteirista", `${onde}: falta "em" (a palavra da fala ou os segundos)`);
      if ((a.acao === "entregar" || a.acao === "abracar") && (!a.para || !ids.has(a.para))) erro("roteirista", `${onde}: falta "para" (o id de quem recebe ou é abraçado)`);
      if (a.para && ids.has(a.para) && !presente(a.para, n)) erro("roteirista", `${onde}: ${a.para} não está nesta cena`);
      if ((a.acao === "andar" || a.acao === "correr") && !a.ate && !a.para) erro("roteirista", `${onde}: falta "ate" [x, z] ou "para" (de quem chegar perto)`);
      if (a.ate && (Math.abs(a.ate[0]) > 6 || a.ate[1] > 7 || a.ate[1] < -3)) aviso("diretora-de-arte", `${onde}: "ate" [${a.ate.join(", ")}] fora do palco (x de -6 a 6, z de -3 a 7): pode sair do plano`);
      if (a.acao === "entregar" && a.quem && !a.objeto && !objetoNaMao(a.quem, n))
        erro("diretora-de-arte", `${onde}: ${a.quem} não tem objeto na mão nesta cena (ponha um objeto com "naMao": true e "perto": "${a.quem}", ou "objeto")`);
      if (a.quem && DUAS_MAOS.has(a.acao ?? "") && objetoNaMao(a.quem, n))
        aviso("diretora-de-arte", `${onde}: usa as duas mãos e ${a.quem} está com um objeto na mão (o objeto é guardado e some enquanto isso): troque a ação ou tire o objeto destas cenas`);
    }
    for (const [id, est] of Object.entries(cena.estados ?? {}))
      if (est?.pose && DUAS_MAOS.has(est.pose) && objetoNaMao(id, n))
        aviso("diretora-de-arte", `cena ${n}: ${id} na pose "${est.pose}" (as duas mãos) com objeto na mão: o objeto é guardado e some; troque a pose`);

    // O ritmo: cena comprida sem nada mudando (o boneco "trava")
    const seg = segundosDe(cena);
    const mexe = (cena.acoes?.length ?? 0) + (cena.mudancas?.length ?? 0) + Object.values(cena.estados ?? {}).filter((e) => e?.ate).length;
    if (pecas && seg > 4.2 && !mexe)
      aviso("diretora-de-arte", `cena ${n}: ${seg.toFixed(1)} s sem nenhuma ação (o boneco só respira e gesticula): ponha "acoes" na palavra forte (ex.: { "quem": "${cena.foco}", "em": "<palavra>", "acao": "apontar" })`);
  });
  if (trocas > 3) aviso("roteirista", `${trocas} trocas de lugar: o vídeo fica picado (use no máximo 2 ou 3)`);
  // O rosto do foco atrás de alguém em todo ângulo (28/11/2026: o ajoelhado atrás de quem está
  // de pé sumia no plano). A mesma conta da câmera do molde: ela já procura outro ângulo e olha
  // de cima; se nada livra o rosto, a equipe muda o "onde", o foco ou o plano
  if (pecas && (m.personagens ?? []).every((p) => p.onde)) {
    try {
      const { linhaDoTempo, planejarFilmagem } = await import("../src/moldes/mundo3d/plano.ts");
      const { sementeDoTexto } = await import("../src/moldes/mundo3d/ambientes.ts");
      const doc3d = peca as unknown as { cenas: CenaDoPlano[]; cenario?: { semente?: number }; titulo?: string; multidao?: { quantos: number; naPonte?: boolean } | null };
      const linha = linhaDoTempo(doc3d.cenas.map((c) => ({ ...c, plano: c.plano ?? "medio", foco: c.foco ?? "" })));
      const { tomadas } = planejarFilmagem({
        personagens: (m.personagens ?? []).map((p) => ({ ...p, onde: p.onde as [number, number] })),
        multidao: doc3d.multidao ? { quantos: doc3d.multidao.quantos, naPonte: doc3d.multidao.naPonte ?? true } : null,
        objetos: m.objetos ?? [],
        ambiente: ambiente,
        semente: doc3d.cenario?.semente ?? sementeDoTexto(doc3d.titulo ?? ""),
        linha,
        largura: 1080,
        altura: 1920,
      });
      const ditos = new Set<string>();
      for (const t of tomadas) {
        if (!t.tapado) continue;
        const chave = `${t.cena}-${t.foco}`;
        if (ditos.has(chave)) continue;
        ditos.add(chave);
        aviso(
          "diretora-de-arte",
          `cena ${t.cena + 1}: o rosto de ${t.foco} fica atrás de ${t.tapadoPor ?? "alguém"} no plano "${t.plano}" de todos os ângulos (ajoelhado, sentado ou colado a quem está de pé): afaste o "onde", ponha o foco em quem está na frente ou use "aberto"`,
        );
      }
    } catch (e) {
      aviso("producao", `não deu para conferir a câmera do 3D (${e instanceof Error ? e.message : e})`);
    }
  }
  // Objetos com buraco nas cenas: o kit mostra em todas do meio (não some e volta)
  for (const o of m.objetos ?? []) {
    if (!o.cenas?.length) continue;
    const de = Math.min(...o.cenas);
    const ate = Math.max(...o.cenas);
    if (o.cenas.length !== ate - de + 1) aviso("diretora-de-arte", `objeto ${o.tipo}: cenas ${o.cenas.join(", ")} têm buraco; o kit mostra de ${de} a ${ate} sem sumir (ponha todas, ou só as que quer)`);
    if (o.perto && ids.has(o.perto) && [...Array(ate - de + 1)].some((_, k) => !presente(o.perto as string, de + k)))
      erro("diretora-de-arte", `objeto ${o.tipo}: ${o.perto} não está em todas as cenas de ${de} a ${ate}`);
  }
  // Os planos variam (o que prende é a câmera mudando)
  const repetidos = cenas.filter((c, i) => i > 0 && c.plano === cenas[i - 1].plano).length;
  if (cenas.length >= 4 && repetidos > cenas.length / 2) aviso("roteirista", "muitos planos iguais seguidos: varie (aberto, médio, de baixo, close)");
  const segundos = cenas.reduce((soma, c) => soma + segundosDe(c), 0);
  if (segundos > 75) erro("roteirista", `uns ${Math.round(segundos)} s de fala: o Short vai até uns 60 s`);
  if (!m.ctaFinal) aviso("roteirista", "sem ctaFinal: o vídeo termina sem o cartão da marca");
  if (m.ctaFinal && (/@/.test(m.ctaFinal) || /link na bio/i.test(m.ctaFinal))) erro("roteirista", "ctaFinal sem @ e sem link na bio (isso vai no botão)");
  if (!m.post?.titulo || !m.post?.legenda) erro("roteirista", 'falta "post": { "titulo", "legenda" }');
  console.log(`Mundo3D: ${cenas.length} cenas, uns ${Math.round(segundos)} s de fala, ${cenas.reduce((s2, c) => s2 + (c.acoes?.length ?? 0), 0)} ações.`);
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
conferirIlustracoes(cenas);
// A coluna do título já cheia (hora + notificação, ou uma delas com o balão do começo): a ilustração no alto fica espremida
cenas.forEach((cena, i) => {
  const c = cena as Cena & { hora?: string; notificacao?: unknown; ilustra?: Array<{ lugar?: string }> };
  const ocupados = (c.hora ? 1 : 0) + (c.notificacao ? 1 : 0) + (i === 0 && peca.ctaInicial ? 1 : 0);
  if (ocupados >= 2 && c.ilustra?.some((x) => !x.lugar || ["alto", "esquerda", "direita"].includes(x.lugar)))
    aviso("roteirista", `cena ${i + 1}: hora, notificação e balão do começo já enchem o alto; ponha a ilustração em outra fala ou no "meio"`);
});
cenas.forEach((cena, i) => {
  const n = palavras(cena.fala);
  // Personagem sozinho (aula, monólogo para quem assiste): fala como o narrador, até 20
  // (decisão do dono, 28/11/2026: o Já Caiu? é uma aula da Bia, sem diálogo)
  const sozinho = (peca as { elenco?: unknown[] }).elenco?.length === 1;
  const longa = doNarrador(cena) || sozinho;
  const limite = longa ? 20 : 12;
  if (!cena.fala?.trim()) erro("roteirista", `cena ${i + 1}: sem fala`);
  if (n > limite) erro("roteirista", `cena ${i + 1}: fala ${doNarrador(cena) ? "do narrador " : sozinho ? "de quem está sozinho " : ""}com ${n} palavras (até ${limite}${longa ? "" : "; o narrador ou quem está sozinho, até 20"})`);
  conferirVoz("roteirista", `cena ${i + 1}`, cena.fala);
});
// ---- Narrador: a voz dele ----
{
  const doTopo = (peca as Record<string, unknown>).voz as string | undefined;
  const narradas = cenas.filter(doNarrador).length;
  // Narrado pela voz do Google (o motor e a voz vão na chave da narração): o narrador
  // vem do vozes.json do canal, não do "voz" do topo; confere só se repete a voz de alguém
  const doGoogle = (c: Cena) => {
    try {
      const chave = JSON.parse(String((c.narracao as { chave?: string } | undefined)?.chave ?? "[]")) as unknown[];
      return chave[1] === "gemini" || chave[1] === "chirp" ? String(chave[2]) : undefined;
    } catch {
      return undefined;
    }
  };
  if (narradas && cenas.some((c) => doGoogle(c))) {
    const doNarradorGoogle = new Set(cenas.filter(doNarrador).map(doGoogle).filter(Boolean));
    const repetidas = new Set(cenas.filter((c) => !doNarrador(c) && c.quem && doNarradorGoogle.has(doGoogle(c))).map((c) => c.quem));
    for (const id of repetidas) aviso("roteirista", `o narrador tem a mesma voz do Google de "${id}": escolha outra voz para o narrador no Postaí`);
  } else if (narradas) {
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
    // Com a virada no meio da fala (ou uma ação na palavra), a cena termina na pose dela
    const ultimaAcao = ((cena.acoes ?? []) as Array<Estado & { quem?: string }>).filter((x) => x.quem === id && (x.pose || x.expressao)).pop();
    anterior = ultimaAcao ? { pose: ultimaAcao.pose ?? (cena.meio?.[id] ?? atual ?? anterior)?.pose, expressao: ultimaAcao.expressao ?? (cena.meio?.[id] ?? atual ?? anterior)?.expressao } : (cena.meio?.[id] ?? atual ?? anterior);
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

// ---- Animação 2D: ações, cenário, combinações que quebram e ritmo (27/11/2026) ----
// O dono reclamou de cenário que troca rápido demais, celular e objeto que somem, boneco
// parado falando e "quatro braços". O molde agora evita os saltos; aqui o roteiro que
// pede o impossível volta para quem escreveu.
{
  type Acao2D = { quem?: string; em?: string; vez?: number; pose?: string; expressao?: string; acao?: string };
  type CenaComDirecao = Cena & { acoes?: Acao2D[]; cenario?: string; noite?: boolean; objetos?: Array<{ quem?: string; tipo?: string; onde?: string }>; camera?: string; foco?: string };
  const cenas2d = cenas as CenaComDirecao[];
  // A linha do tempo como no molde: onde começa cada fala e o tempo de cada palavra
  type Narr = { duracaoSeg: number; legendas: Array<{ texto: string; inicioMs: number; fimMs: number }> };
  let quadro = CONVERSA.inicio;
  const linha2d = cenas2d.map((cena) => {
    const inicio = quadro;
    const narr = cena.narracao as Narr | undefined;
    const palavrasDaFala = narr
      ? narr.legendas.map((l) => ({ texto: l.texto, inicio: inicio + Math.round((l.inicioMs / 1000) * FPS) }))
      : estimarPalavras(cena.fala ?? "").map((p) => ({ texto: p.texto, inicio: inicio + p.inicio }));
    const duracao = quadrosDaFalaConversa(cena as Parameters<typeof quadrosDaFalaConversa>[0]);
    quadro += duracao + CONVERSA.entreFalas;
    return { cena, inicio, duracao, palavras: palavrasDaFala };
  });
  const seg = (q: number) => (q / FPS).toFixed(1).replace(".", ",");
  const elencoDoRoteiro = (peca.elenco ?? []) as Array<{ id: string; tipo?: string; desenho?: { corpo?: string; figurinos?: string[] } }>;
  const temDesenho = (id: string) => Boolean(elencoDoRoteiro.find((p) => p.id === id)?.desenho);

  // Desenho próprio com mangas ou braços no corpo: o kit tira (senão sai com quatro braços), mas a designer corrige
  for (const p of elencoDoRoteiro) {
    for (const corpo of [p.desenho?.corpo, ...(p.desenho?.figurinos ?? [])].filter(Boolean) as string[]) {
      const { tirados } = corpoSemBracos(corpo);
      if (tirados) aviso("designer-de-personagens", `"${p.id}": o corpo do desenho tem ${tirados} pedaço(s) de manga/braço fora do tronco; o kit tira na hora (os braços são do kit), mas redesenhe o corpo sem mangas (src/componentes/personagens/desenho/GUIA.md)`);
    }
  }

  // As ações na palavra
  const POSES_COM_CELULAR = ["celular", "celular-baixo", "sentado"];
  const posesPorPessoa = new Map<string, string>();
  cenas2d.forEach((cena, i) => {
    for (const id of ids) {
      const e = estadoNa(cena, id);
      if (e?.pose) posesPorPessoa.set(id, e.pose);
    }
    const legendas = linha2d[i].palavras.map((w) => normalizar(w.texto));
    for (const a of cena.acoes ?? []) {
      if (!a.quem || !ids.includes(a.quem)) erro("diretora-de-arte", `cena ${i + 1}: ação de "${a.quem}", que não está no elenco (${ids.join(", ")})`);
      if (!a.pose && !a.acao && !a.expressao) erro("diretora-de-arte", `cena ${i + 1}: ação sem pose, acao nem expressao (em "${a.em}")`);
      if (a.pose && !(POSES_DO_ROTEIRO as readonly string[]).includes(a.pose)) erro("diretora-de-arte", `cena ${i + 1}: pose "${a.pose}" não existe (${POSES_DO_ROTEIRO.join(", ")})`);
      if (a.acao && !(ACOES as readonly string[]).includes(a.acao)) erro("diretora-de-arte", `cena ${i + 1}: acao "${a.acao}" não existe (${ACOES.join(", ")})`);
      const alvo = normalizar(a.em ?? "");
      const achou =
        alvo === "inicio" || alvo === "fim" || legendas.filter((w) => w === alvo || (alvo.length >= 4 && w.startsWith(alvo))).length >= (a.vez ?? 1);
      if (!alvo || !achou)
        erro("diretora-de-arte", `cena ${i + 1}: a ação de "${a.quem}" está na palavra "${a.em}", que não está na fala ("${cena.fala}"); use uma palavra da fala, "inicio" ou "fim"`);
      const antes = posesPorPessoa.get(a.quem ?? "") ?? "normal";
      // Com o celular na mão: celular, celular-baixo (28/11/2026: dava falso aviso) ou sentado com ele
      if (a.acao === "guardar-celular" && !POSES_COM_CELULAR.includes(antes))
        aviso("diretora-de-arte", `cena ${i + 1}: "${a.quem}" guarda o celular, mas não está com ele (pose ${antes})`);
      if (a.acao === "levantar" && antes !== "sentado" && antes !== "sentado-livre")
        aviso("diretora-de-arte", `cena ${i + 1}: "${a.quem}" levanta, mas não está sentado`);
      if (ids.length === 2 && (a.acao === "andar-meio" || (a.acao === "andar-direita" && a.quem === ids[0]) || (a.acao === "andar-esquerda" && a.quem === ids[1])))
        aviso("diretora-de-arte", `cena ${i + 1}: "${a.quem}" anda (${a.acao}) para o lado de quem está na cena e passa por cima dele; com dois na cena, use "andar-perto" ou "andar-longe"`);
      if (a.acao === "costas" && a.quem && temDesenho(a.quem))
        aviso("diretora-de-arte", `cena ${i + 1}: "${a.quem}" tem desenho próprio, que não tem as costas desenhadas: ele só vira de lado (use "virar")`);
      if (cena.luz && (a.acao === "guardar-celular" || a.acao === "baixar-celular"))
        erro("diretora-de-arte", `cena ${i + 1}: a luz do aviso acende no celular, e "${a.quem}" guarda o celular na mesma fala; tire a ação ou a luz`);
      // A pose que a ação deixa (como no molde, direcao.ts): baixar o celular deixa celular-baixo,
      // e quem guarda depois está com ele na mão
      const deixa =
        a.pose ??
        { "pegar-celular": "celular", "baixar-celular": "celular-baixo", "guardar-celular": "normal", levantar: "normal" }[a.acao ?? ""] ??
        (a.acao === "cair-sentado" ? (antes === "celular" || antes === "sentado" ? "sentado" : "sentado-livre") : undefined);
      if (deixa) posesPorPessoa.set(a.quem ?? "", deixa);
    }
    // Quem anda (ou volta) nesta fala: a câmera fica aberta, mesmo com close pedido
    if (cena.camera && cena.camera !== "aberto" && (cena.acoes ?? []).some((a) => a.acao?.startsWith("andar") || a.acao === "voltar"))
      aviso("diretora-de-arte", `cena ${i + 1}: camera "${cena.camera}" com alguém andando; o molde usa o plano aberto (quem anda precisa do quadro inteiro)`);
    for (const id of ids) {
      const m = cena.meio?.[id];
      if (m?.pose) posesPorPessoa.set(id, m.pose);
    }
  });

  // Abraço só com duas pessoas
  if (ids.length < 2 && cenas2d.some((c) => ids.some((id) => estadoNa(c, id)?.pose === "abraco")))
    erro("diretora-de-arte", 'pose "abraco" com uma pessoa só na cena (não tem quem abraçar)');

  // Objeto na mão e mãos ocupadas: o objeto encolhe e some enquanto as duas mãos estão ocupadas
  {
    const comObjeto = new Set<string>();
    cenas2d.forEach((cena, i) => {
      for (const o of cena.objetos ?? []) {
        if ((o.onde ?? "mao") !== "mao" || !o.quem) continue;
        if (o.tipo === "nenhum") comObjeto.delete(o.quem);
        else comObjeto.add(o.quem);
      }
      for (const id of comObjeto) {
        const poses = [estadoNa(cena, id)?.pose, cena.meio?.[id]?.pose, ...(cena.acoes ?? []).filter((a) => a.quem === id).map((a) => a.pose)].filter(Boolean) as string[];
        const ambas = poses.find((p) => (MAOS_OCUPADAS[p]?.length ?? 0) >= 2);
        if (ambas)
          aviso("diretora-de-arte", `cena ${i + 1}: "${id}" segura um objeto e faz a pose "${ambas}" (as duas mãos ocupadas): o objeto some enquanto ela dura; use uma pose com uma mão livre ou ponha o objeto "ao-lado"`);
      }
    });
  }

  // Cenário: no máximo 3 trocas, cada lugar com tempo para ser visto
  {
    const MAXIMO_DE_TROCAS = 3;
    const trocas = trocasDeCenario(linha2d.map((l) => ({ cena: l.cena, inicio: l.inicio })), (peca as Record<string, unknown>).cenario as string ?? "atelie");
    const pedidas: Array<{ i: number; em: number; cenario: string }> = [];
    let atual = ((peca as Record<string, unknown>).cenario as string) ?? "atelie";
    linha2d.forEach((l, i) => {
      if (l.cena.cenario && l.cena.cenario !== atual) {
        if (i > 0) pedidas.push({ i, em: l.inicio, cenario: l.cena.cenario });
        atual = l.cena.cenario;
      }
    });
    if (pedidas.length > MAXIMO_DE_TROCAS)
      erro("diretora-de-arte", `${pedidas.length} trocas de cenário (até ${MAXIMO_DE_TROCAS} num vídeo curto): troca demais confunde; junte as falas no mesmo lugar`);
    const fimDasFalas = linha2d.length ? linha2d[linha2d.length - 1].inicio + linha2d[linha2d.length - 1].duracao : 0;
    const marcos = [{ i: 0, em: 0, cenario: "(início)" }, ...pedidas, { i: cenas2d.length, em: fimDasFalas, cenario: "(fim)" }];
    for (let k = 1; k < marcos.length - 1; k++) {
      const quanto = marcos[k + 1].em - marcos[k].em;
      const falas = marcos[k + 1].i - marcos[k].i;
      if (quanto < MINIMO_NO_CENARIO)
        erro("diretora-de-arte", `cena ${marcos[k].i + 1}: o cenário "${marcos[k].cenario}" fica só ${seg(quanto)} s na tela (mínimo ${seg(MINIMO_NO_CENARIO)} s; menos que isso pisca e o molde adia a troca): tire a troca ou mantenha o lugar por mais falas`);
      else if (quanto < 5 * FPS && falas < 3)
        aviso("diretora-de-arte", `cena ${marcos[k].i + 1}: o cenário "${marcos[k].cenario}" fica ${seg(quanto)} s (${falas} fala(s)); o ideal é 3 falas ou 5 s em cada lugar`);
    }
    const adiadas = pedidas.length - trocas.filter((t) => t.mudouLugar).length;
    if (adiadas > 0) aviso("diretora-de-arte", `${adiadas} troca(s) de cenário rápida(s) demais: o molde adia para a fala seguinte`);
  }

  // Ritmo: mais de ~4 s sem nada mudando na tela (pose, expressão, ação, câmera ou lugar)
  {
    const fixa = (peca as Record<string, unknown>).camera === "fixa";
    const mudancas: number[] = [0];
    let antes: Record<string, string> = {};
    linha2d.forEach(({ cena, inicio, palavras }, i) => {
      const agora: Record<string, string> = {};
      for (const id of ids) {
        const e = estadoNa(cena, id);
        agora[id] = e ? `${e.pose}/${e.expressao}` : (antes[id] ?? "");
      }
      if (i === 0 || !fixa || ids.some((id) => agora[id] !== antes[id]) || cena.cenario || cena.camera) mudancas.push(inicio);
      antes = agora;
      if (cena.meio && Object.keys(cena.meio).length) mudancas.push(palavras[Math.floor(palavras.length / 2)]?.inicio ?? inicio);
      for (const a of cena.acoes ?? []) {
        const alvo = normalizar(a.em ?? "");
        const w = palavras.find((p) => normalizar(p.texto) === alvo || (alvo.length >= 4 && normalizar(p.texto).startsWith(alvo)));
        mudancas.push(alvo === "fim" ? inicio + linha2d[i].duracao : (w?.inicio ?? inicio));
      }
      // Fala longa no mesmo plano: a câmera só respira
      if (!cena.acoes?.length && !cena.meio && linha2d[i].duracao > 4 * FPS)
        aviso("diretora-de-arte", `cena ${i + 1}: fala de ${seg(linha2d[i].duracao)} s sem nenhuma ação: ponha 1 ou 2 "acoes" na palavra certa (ex.: { "quem": "${cena.quem ?? ids[0]}", "em": "<palavra>", "pose": "explicando" })`);
    });
    const fim = linha2d.length ? linha2d[linha2d.length - 1].inicio + linha2d[linha2d.length - 1].duracao : 0;
    mudancas.push(fim);
    mudancas.sort((a, b) => a - b);
    let maior = 0;
    let onde = 0;
    for (let k = 1; k < mudancas.length; k++)
      if (mudancas[k] - mudancas[k - 1] > maior) {
        maior = mudancas[k] - mudancas[k - 1];
        onde = mudancas[k - 1];
      }
    const cenaDoBuraco = linha2d.filter((l) => l.inicio <= onde).length;
    if (maior > 7 * FPS) erro("diretora-de-arte", `${seg(maior)} s sem nenhuma mudança na tela (a partir da cena ${cenaDoBuraco}): ponha "acoes", "meio" ou mude a pose/expressão`);
    else if (maior > 4 * FPS) aviso("diretora-de-arte", `${seg(maior)} s sem nenhuma mudança na tela (a partir da cena ${cenaDoBuraco}): ponha uma ação na palavra forte`);
  }
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
// Cenário repetido: os lugares dos últimos 3 vídeos (coluna Cenários do episodios.md
// do canal). Erro quando o canal pede para não repetir; aviso nos outros (28/11/2026)
{
  const pastaDoCanal = (() => {
    const i = process.argv.indexOf("--canal");
    if (i > 0 && process.argv[i + 1]) return process.argv[i + 1];
    if (!existsSync("canais")) return "";
    const comRegistro = readdirSync("canais").filter((p) => existsSync(`canais/${p}/episodios.md`));
    return comRegistro.length === 1 ? `canais/${comRegistro[0]}` : "";
  })();
  const registro = pastaDoCanal && existsSync(`${pastaDoCanal}/episodios.md`) ? readFileSync(`${pastaDoCanal}/episodios.md`, "utf8") : "";
  const linhas = registro.split("\n").filter((l) => l.startsWith("|"));
  const cabecalho = linhas[0]?.split("|").map((c) => c.trim()) ?? [];
  const coluna = cabecalho.indexOf("Cenários");
  if (coluna > 0) {
    const recentes = new Set(
      linhas
        .slice(2)
        .slice(-3)
        .flatMap((l) => (l.split("|")[coluna] ?? "").split(",").map((c) => c.trim()))
        .filter((c) => c && c !== "-"),
    );
    const id = (c: unknown) => (typeof c === "string" ? c : c && typeof c === "object" && "id" in c ? String((c as { id: unknown }).id) : "");
    const p = peca as { cenario?: unknown; cenas?: Array<{ cenario?: unknown; lugar?: unknown }> };
    const usados = [...new Set([id(p.cenario), ...(p.cenas ?? []).flatMap((c) => [id(c.cenario), id(c.lugar)])].filter(Boolean))];
    const repetidos = usados.filter((c) => recentes.has(c));
    const naoRepete = existsSync(`${pastaDoCanal}/canal-postai.md`) && /repetir cen[aá]rio|nenhum se repete|n[aã]o repet\w* (o )?cen[aá]rio/i.test(readFileSync(`${pastaDoCanal}/canal-postai.md`, "utf8"));
    if (repetidos.length) (naoRepete ? erro : aviso)("roteirista", `cenário repetido dos últimos 3 vídeos: ${repetidos.join(", ")} (troque por um lugar que não saiu, veja a coluna Cenários do episodios.md)`);
  }
  // Personagem repetido: quando o canal pede ("repetir personagem dos últimos 4"), o nome de
  // quem está no elenco não pode estar no título nem no tema dos últimos 4 vídeos (28/11/2026)
  const textoDoCanal = pastaDoCanal && existsSync(`${pastaDoCanal}/canal-postai.md`) ? readFileSync(`${pastaDoCanal}/canal-postai.md`, "utf8") : "";
  if (/repetir personagem/i.test(textoDoCanal) && linhas.length > 2) {
    const ultimos = linhas.slice(2).slice(-4).join(" ").toLowerCase();
    const nomes = ((peca as { elenco?: Array<{ nome?: string }> }).elenco ?? []).map((p) => p.nome ?? "").filter((n) => n.length > 2);
    const vistos = nomes.filter((n) => new RegExp(`(^|[^\\p{L}])${n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u").test(ultimos));
    if (vistos.length) erro("roteirista", `personagem dos últimos 4 vídeos: ${vistos.join(", ")} (o canal pede um personagem diferente a cada vídeo; veja o episodios.md)`);
  }
}
// Como o vídeo termina: a frase na luz só quando o dono escolheu (public/marca/fim.json)
if (peca.molde === "Conversa" || peca.molde === "Mundo3D") {
  const fimEscolhido = existsSync("public/marca/fim.json") ? (JSON.parse(readFileSync("public/marca/fim.json", "utf8")) as { fim?: string }).fim : undefined;
  const temFinal = Boolean((peca as { final?: unknown }).final);
  if (fimEscolhido === "luz" && !temFinal)
    erro("roteirista", 'o dono escolheu terminar na frase na luz: ponha "final" { frase, linha, botao (pedindo para seguir) }');
  if (fimEscolhido !== "luz" && temFinal)
    aviso("roteirista", 'o "final" (frase na luz) não sai: o dono não escolheu terminar na luz (o vídeo acaba no cartão do fim)');
}
if (existsSync("marca/marca.json")) {
  const marca = JSON.parse(readFileSync("marca/marca.json", "utf8")) as { nome?: string; logo?: string | null };
  if (!marca.nome || /^sua marca$/i.test(marca.nome)) erro("producao", "a marca do canal não foi baixada: rode npm run canal -- canais/<canal>");
  if (!marca.logo) aviso("producao", "sem logo: o balão e o cartão do fim usam a inicial do nome");
}

// ---- Resultado ----
resultado();
