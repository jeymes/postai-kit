// Busca fotos de domínio público (CC0: uso comercial sem crédito obrigatório)
// no Openverse, para quando o cliente não tem foto própria. Copiado e
// adaptado do buscar-presentes do Laços; o redimensionamento usa o ffmpeg do
// Remotion, então funciona no Mac e no Windows.
//
// Uso, um item por argumento (termo em inglês e específico):
//   npm run buscar-fotos -- --candidatos cafe="coffee cup on wooden table" pao="bread loaf bakery"
//       → 4 opções de cada em public/fotos/_candidatos/ (cafe-1.jpg ... cafe-4.jpg) para olhar
//   npm run buscar-fotos -- cafe="coffee cup on wooden table"#3 pao="bread loaf bakery"#1
//       → grava public/fotos/cafe.jpg (3ª opção) e pao.jpg (1ª), anota em public/fotos/CREDITOS.md
// Opções: --pasta outra (dentro de public/), --fonte stocksnap (fotos de produto mais limpas),
//   --deitadas (só fotos deitadas, gravadas com 1920 px de largura: para o Documentario),
//   --fonte commons (Wikimedia Commons: pinturas, mapas e fotos antigas; só domínio público e CC0;
//   melhor para história e com termos gerais, ex. "Rio de Janeiro 19th century painting"),
//   --fonte museus (ao mesmo tempo no Art Institute of Chicago, no Cleveland Museum of Art, no The Met, no
//   Commons e no Openverse, só domínio público e CC0, sem chave; os museus vêm primeiro: as
//   imagens são escaneadas por eles, em alta resolução; o melhor para o Canal dark; na rotina
//   da nuvem entra também o Pixabay, com fotos modernas de lugares e paisagens),
//   Com o passe do Postaí, procura antes no BANCO DE IMAGENS do Postaí e guarda nele a imagem livre escolhida
//   (--nicho "<tema>" organiza; sem ele, o do canal-postai.md; --sem-banco desliga).
//   --fonte unsplash (fotos modernas do Unsplash, uso comercial; passa pelo Postaí; avisa o Unsplash no download
//   final e o CRÉDITO vai obrigatório na legenda do post, anotado no CREDITOS.md),
//   --fonte ia (gera a imagem com IA pelo Postaí: só cena de clima, sem nome de modelo, marca ou pessoa real;
//   é também o último recurso sozinho quando nenhum acervo tem a cena; até 40 por dia; marca o vídeo como sintético),
//   --fonte pixabay (fotos e ilustrações modernas do Pixabay, uso comercial sem crédito; passa pelo
//   Postaí, que tem a chave: precisa do passe da rotina ou da POSTAI_CHAVE)
// As opções de cada item ficam em _candidatos/<item>.json: a escolha (#n) pega exatamente a que
// foi vista, sem buscar de novo. Limite do Openverse sem chave: 20 buscas por minuto, 200 por dia.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ferramenta } from "./postai.ts";

type Foto = {
  id: string;
  /** A imagem grande, que vai para o vídeo */
  url: string;
  /** Uma versão pequena, só para olhar (sem ela, usa a grande) */
  previa?: string;
  source: string;
  foreign_landing_url: string;
  width: number;
  height: number;
  /** O nome da obra, quando o acervo dá (ajuda a saber quem é) */
  titulo?: string;
  /** Crédito obrigatório na legenda do post (Unsplash: "Foto de <autor> no Unsplash") */
  credito?: string;
  /** A licença, quando o acervo diz (Openverse: cc0 ou pdm; banco: a guardada) */
  licenca?: string;
  /** Cabeçalhos que o acervo exige para baixar */
  cabecalhos?: Record<string, string>;
};

const args = process.argv.slice(2);
// --help: o uso (antes dava "Item inválido: --help")
if (args.includes("--help") || args.includes("-h")) {
  const fonte = readFileSync(new URL(import.meta.url), "utf8");
  console.log(
    fonte
      .split("\n")
      .filter((linha) => linha.startsWith("//"))
      .slice(0, 30)
      .map((linha) => linha.replace(/^\/\/ ?/, ""))
      .join("\n"),
  );
  process.exit(0);
}
const opcao = (nome: string) => {
  const i = args.indexOf(`--${nome}`);
  if (i < 0) return undefined;
  const valor = args[i + 1];
  args.splice(i, 2);
  return valor;
};
const flag = (nome: string) => {
  const i = args.indexOf(`--${nome}`);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
};

const pasta = opcao("pasta") ?? "fotos";
const fonte = opcao("fonte");
const candidatos = flag("candidatos");
const deitadas = flag("deitadas");
// Estas opções saem de args antes de os itens serem lidos (senão "--sem-banco" vira "item inválido")
const semBanco = flag("sem-banco");
const nichoPedido = opcao("nicho");
if (args.length === 0) {
  console.error('Uso: npm run buscar-fotos -- [--candidatos] arquivo="termo em inglês"[#n] ...');
  process.exit(1);
}
const itens = args.map((a) => {
  // Só a escolha, sem o termo (24/11/2026: "ia_ora#1" depois do --candidatos
  // dava "Item inválido"): o termo vem das opções guardadas desse item
  const soEscolha = a.match(/^([\p{L}\p{N}_-]+)#(\d+)$/u);
  if (soEscolha) {
    const arquivo = soEscolha[1].normalize("NFD").replace(/\p{M}/gu, "");
    const guardadas = join("public", pasta, "_candidatos", `${arquivo}.json`);
    if (!existsSync(guardadas)) {
      // As opções podem ter sido guardadas com outro --pasta (25/11/2026: a redatora
      // buscou com --pasta e escolheu sem): diz o comando certo em vez de só recusar
      const outras = existsSync("public")
        ? readdirSync("public", { withFileTypes: true })
            .filter((d) => d.isDirectory() && existsSync(join("public", d.name, "_candidatos", `${arquivo}.json`)))
            .map((d) => d.name)
        : [];
      if (outras.length)
        throw new Error(`Item inválido: ${a}. As opções de "${arquivo}" estão em --pasta ${outras[0]}: rode npm run buscar-fotos -- --pasta ${outras[0]} ${a}`);
      throw new Error(`Item inválido: ${a}. Não há opções guardadas de "${arquivo}": rode antes com --candidatos ${arquivo}="termo em inglês", ou escreva ${arquivo}="termo"#${soEscolha[2]}`);
    }
    const { termo } = JSON.parse(readFileSync(guardadas, "utf8")) as { termo: string };
    return { arquivo, termo, escolha: Number(soEscolha[2]) };
  }
  const m = a.match(/^([\p{L}\p{N}_-]+)=(.+?)(?:#(\d+))?$/u);
  if (!m) throw new Error(`Item inválido: ${a} (use arquivo="termo"#n, ou arquivo#n depois do --candidatos)`);
  // Aceita acento no nome, mas grava sem ele (poços → pocos.jpg): nome com acento
  // dava problema em link, no R2 e no pacote da refação
  const arquivo = m[1].normalize("NFD").replace(/\p{M}/gu, "");
  if (arquivo !== m[1]) console.log(`(o arquivo "${m[1]}" fica sem acento: ${arquivo}.jpg; use esse nome no roteiro)`);
  return { arquivo, termo: m[2], escolha: Number(m[3] ?? 1) };
});

const destino = join("public", pasta);
const pastaCandidatos = join(destino, "_candidatos");
mkdirSync(candidatos ? pastaCandidatos : destino, { recursive: true });

const AGENTE = "postai-estudio/1.0 (https://github.com/jeymes/postai-kit)";

const espera = (ms: number) => new Promise((pronto) => setTimeout(pronto, ms));

// Site que bloqueia a máquina (429 seguidos, como o Wikimedia na nuvem) fica de
// fora por 10 minutos, anotado num arquivo para valer também nas próximas
// buscas: os outros acervos cobrem, e a busca não fica parada esperando.
const CANSADOS = join(tmpdir(), "postai-sites-cansados.json");
const PAUSA_MS = 10 * 60 * 1000;
const grupo = (url: string | URL) => {
  const host = new URL(String(url)).host;
  return host.endsWith("wikimedia.org") ? "wikimedia" : host;
};
function lerCansados(): Record<string, number> {
  try {
    return JSON.parse(readFileSync(CANSADOS, "utf8")) as Record<string, number>;
  } catch {
    return {};
  }
}
// Na rotina (com a chave do Postaí), o Commons vai pelo servidor do Postaí: a
// máquina da nuvem divide o IP com muitos robôs e o Commons bloqueava (429)
const commonsPeloPostai = Boolean(process.env.POSTAI_CHAVE);
function cansado(url: string | URL) {
  if (commonsPeloPostai && grupo(url) === "wikimedia") return false;
  return (lerCansados()[grupo(url)] ?? 0) > Date.now();
}
function marcarCansado(url: string | URL) {
  const todos = lerCansados();
  todos[grupo(url)] = Date.now() + PAUSA_MS;
  try {
    writeFileSync(CANSADOS, JSON.stringify(todos));
  } catch {
    // sem o arquivo, vale só nesta busca
  }
  console.log(`  (${grupo(url)} está bloqueando esta máquina: sigo sem ele pelos próximos 10 minutos)`);
}

/**
 * fetch que tenta de novo quando o site pede calma (429) ou cai (5xx). Depois
 * de 2 bloqueios seguidos, desiste do site por 10 minutos (ver CANSADOS).
 */
// O Wikimedia pede um pedido de cada vez, sem rajada: pelo menos 1 s entre eles
let ultimoNoWikimedia = 0;
async function calmaNoWikimedia(url: string | URL) {
  if (grupo(url) !== "wikimedia") return;
  const falta = ultimoNoWikimedia + 1000 - Date.now();
  if (falta > 0) await espera(falta);
  ultimoNoWikimedia = Date.now();
}

async function pedir(url: string | URL, cabecalhos: Record<string, string> = { "User-Agent": AGENTE }, tentativas = 3): Promise<Response> {
  if (cansado(url)) return new Response(null, { status: 429 });
  for (let vez = 1; ; vez++) {
    await calmaNoWikimedia(url);
    const resp = await fetch(url, { headers: cabecalhos });
    if (resp.status !== 429 && resp.status < 500) return resp;
    if (resp.status === 429 && vez >= 2) {
      marcarCansado(url);
      return resp;
    }
    if (vez >= tentativas) return resp;
    const pedido = Number(resp.headers.get("retry-after"));
    const ms = Math.min(10_000, (pedido > 0 ? pedido : 3 * vez) * 1000);
    console.log(`  (${new URL(String(url)).host} pediu para esperar: tento de novo em ${Math.round(ms / 1000)} s)`);
    await espera(ms);
  }
}

// Na rotina do Canal dark, conta na tela do Postaí quantos itens já foram:
// a busca leva minutos e, sem isso, o dono só vê "trabalhando".
const NA_ROTINA_DARK = existsSync(".postai-canal") && readFileSync(".postai-canal", "utf8").trim() === "dark";
async function contarNaTela(feitos: number) {
  if (!NA_ROTINA_DARK || !process.env.POSTAI_CHAVE) return;
  try {
    await ferramenta("contar_andamento", {
      agente: "pesquisadora-de-imagens",
      status: "trabalhando",
      mensagem: `${candidatos ? "Procurando opções de imagem" : "Baixando as imagens"}: ${feitos} de ${itens.length}`,
      progresso: true,
    });
  } catch {
    // a tela é só um aviso: a busca segue
  }
}

/** Wikimedia Commons: só domínio público e CC0 (sem crédito obrigatório nem "compartilha igual") */
async function buscarNoCommons(termo: string): Promise<Foto[]> {
  if (commonsPeloPostai) {
    try {
      const { fotos } = JSON.parse(await ferramenta("buscar_no_commons", { termo })) as { fotos: Foto[] };
      return fotos.filter(filtroDeTamanho);
    } catch (erro) {
      console.log(`  (o Commons pelo Postaí não respondeu: ${erro instanceof Error ? erro.message : String(erro)}; tento direto)`);
    }
  }
  return buscarNoCommonsDireto(termo);
}

async function buscarNoCommonsDireto(termo: string): Promise<Foto[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  for (const [k, v] of Object.entries({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "50",
    gsrsearch: `${termo} filetype:bitmap`,
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "1920",
    iiextmetadatafilter: "LicenseShortName",
  }))
    url.searchParams.set(k, v);
  const resp = await pedir(url);
  if (!resp.ok) throw new Error(`O Commons respondeu ${resp.status} para "${termo}"`);
  type Pagina = {
    pageid: number;
    index: number;
    imageinfo?: Array<{ width: number; height: number; thumburl?: string; url: string; descriptionurl: string; extmetadata?: { LicenseShortName?: { value?: string } } }>;
  };
  const dados = (await resp.json()) as { query?: { pages?: Record<string, Pagina> } };
  return Object.values(dados.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .flatMap((p) => {
      const info = p.imageinfo?.[0];
      const licenca = info?.extmetadata?.LicenseShortName?.value ?? "";
      if (!info || !/^(public domain|pd|cc0)/i.test(licenca)) return [];
      const url = info.thumburl ?? info.url;
      // A prévia na miniatura de 500 px (tamanho padrão do Wikimedia): sai rápido e não gasta o limite
      const previa = url.replace(/\/\d+px-([^/]+)$/, "/500px-$1");
      return [{ id: String(p.pageid), url, previa, source: "wikimedia", foreign_landing_url: info.descriptionurl, width: info.width, height: info.height }];
    })
    .filter(filtroDeTamanho);
}

// A busca dos museus também procura no nome do artista e em palavras soltas
// ("David sling" trazia obras do pintor David Lucas; "King Saul", moedas). Por
// isso o nome da obra precisa ter as palavras importantes da busca (todas, ou
// 2 delas quando há 3 ou mais).
const GERAIS = new Set(
  "a an and the of in on at with by for from to painting paintings portrait king queen ancient old art scene view century map photo photograph engraving drawing biblical bible dramatic".split(" "),
);
const semAcento = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function tituloCombina(termo: string, titulo: string) {
  const importantes = semAcento(termo)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 2 && !GERAIS.has(p) && !/^\d+(th|st|nd|rd)?$/.test(p));
  if (importantes.length === 0) return true;
  const nome = semAcento(titulo);
  const achadas = importantes.filter((p) => nome.includes(p)).length;
  return achadas >= Math.min(importantes.length, 2);
}

// O Art Institute bloqueia User-Agent de programa; pede o seu próprio cabeçalho.
const CABECALHOS_DO_AIC = { "AIC-User-Agent": AGENTE };

/** Art Institute of Chicago: pinturas em domínio público, pelo IIIF (até 1686 px) */
async function buscarNoAIC(termo: string): Promise<Foto[]> {
  const url = new URL("https://api.artic.edu/api/v1/artworks/search");
  url.searchParams.set("q", termo);
  url.searchParams.set("limit", "20");
  url.searchParams.set("fields", "id,title,image_id,thumbnail,artist_title");
  url.searchParams.set("query[term][is_public_domain]", "true");
  const resp = await pedir(url, CABECALHOS_DO_AIC);
  if (!resp.ok) throw new Error(`O Art Institute respondeu ${resp.status} para "${termo}"`);
  type Obra = { id: number; title?: string; image_id?: string | null; thumbnail?: { width?: number; height?: number } | null; artist_title?: string | null };
  const { data } = (await resp.json()) as { data?: Obra[] };
  return (data ?? [])
    .flatMap((o) => {
      if (!o.image_id || !o.thumbnail?.width || !o.thumbnail.height || !tituloCombina(termo, o.title ?? "")) return [];
      const iiif = `https://www.artic.edu/iiif/2/${o.image_id}/full`;
      // O IIIF entrega até 1686 px de largura; a altura e a largura do original vêm na thumbnail
      const escala = Math.min(1, 1686 / o.thumbnail.width);
      return [{
        id: String(o.id),
        url: `${iiif}/1686,/0/default.jpg`,
        previa: `${iiif}/600,/0/default.jpg`,
        source: "artic",
        foreign_landing_url: `https://www.artic.edu/artworks/${o.id}`,
        width: Math.round(o.thumbnail.width * escala),
        height: Math.round(o.thumbnail.height * escala),
        titulo: [o.title, o.artist_title].filter(Boolean).join(", "),
        cabecalhos: CABECALHOS_DO_AIC,
      }];
    })
    .filter(filtroDeTamanho);
}

/** Cleveland Museum of Art: só CC0, com a versão de impressão (até uns 3400 px) */
async function buscarNoCleveland(termo: string): Promise<Foto[]> {
  const url = new URL("https://openaccess-api.clevelandart.org/api/artworks/");
  url.searchParams.set("q", termo);
  url.searchParams.set("cc0", "1");
  url.searchParams.set("has_image", "1");
  url.searchParams.set("limit", "20");
  const resp = await pedir(url);
  if (!resp.ok) throw new Error(`O Cleveland respondeu ${resp.status} para "${termo}"`);
  type Imagem = { url: string; width: number | string; height: number | string };
  type Obra = { id: number; title?: string; url?: string; images?: { web?: Imagem; print?: Imagem } | null; creators?: Array<{ description?: string }> };
  const { data } = (await resp.json()) as { data?: Obra[] };
  return (data ?? [])
    .flatMap((o) => {
      const grande = o.images?.print ?? o.images?.web;
      if (!grande || !tituloCombina(termo, o.title ?? "")) return [];
      return [{
        id: String(o.id),
        url: grande.url,
        previa: o.images?.web?.url,
        source: "clevelandart",
        foreign_landing_url: o.url ?? `https://www.clevelandart.org/art/${o.id}`,
        width: Number(grande.width),
        height: Number(grande.height),
        titulo: [o.title, o.creators?.[0]?.description?.split("(")[0].trim()].filter(Boolean).join(", "),
      }];
    })
    .filter(filtroDeTamanho);
}

/** Largura e altura de um JPEG pelos primeiros bytes (o marcador SOF), sem baixar a imagem toda */
function dimensoesDoJpeg(b: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marca = b[i + 1];
    const tamanho = (b[i + 2] << 8) + b[i + 3];
    // SOF0 a SOF15, menos os que não são quadro (C4, C8, CC)
    if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
      return { height: (b[i + 5] << 8) + b[i + 6], width: (b[i + 7] << 8) + b[i + 8] };
    }
    i += 2 + tamanho;
  }
  return null;
}

/**
 * The Met (Nova York): obras em domínio público (CC0), sem chave. A busca é a
 * v1.1 (a v1 saiu do ar em 01/10/2026); cada obra diz se é domínio público. A
 * API não dá o tamanho da imagem: lê do começo do próprio JPEG.
 */
async function buscarNoMet(termo: string): Promise<Foto[]> {
  const url = new URL("https://collectionapi.metmuseum.org/public/collection/v1.1/search");
  url.searchParams.set("q", termo);
  url.searchParams.set("hasImages", "true");
  url.searchParams.set("limit", "20");
  const resp = await pedir(url);
  if (!resp.ok) throw new Error(`O Met respondeu ${resp.status} para "${termo}"`);
  const { objectIDs } = (await resp.json()) as { objectIDs?: number[] | null };
  type Obra = { objectID: number; isPublicDomain?: boolean; primaryImage?: string; primaryImageSmall?: string; title?: string; artistDisplayName?: string; objectURL?: string };
  const obras = await Promise.all(
    (objectIDs ?? []).slice(0, 12).map(async (id) => {
      const r = await pedir(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
      return r.ok ? ((await r.json()) as Obra) : null;
    }),
  );
  const boas = obras.filter((o): o is Obra => Boolean(o?.isPublicDomain && o.primaryImage && tituloCombina(termo, o.title ?? "")));
  const fotos = await Promise.all(
    boas.map(async (o): Promise<Foto | null> => {
      const comeco = await pedir(o.primaryImage as string, { "User-Agent": AGENTE, Range: "bytes=0-65535" });
      if (!comeco.ok) return null;
      const dim = dimensoesDoJpeg(new Uint8Array(await comeco.arrayBuffer()));
      if (!dim) return null;
      return {
        id: String(o.objectID),
        url: o.primaryImage as string,
        previa: o.primaryImageSmall || undefined,
        source: "met",
        foreign_landing_url: o.objectURL ?? `https://www.metmuseum.org/art/collection/search/${o.objectID}`,
        width: dim.width,
        height: dim.height,
        titulo: [o.title, o.artistDisplayName].filter(Boolean).join(", "),
      };
    }),
  );
  return fotos.filter((f): f is Foto => f !== null).filter(filtroDeTamanho);
}

/** As tags que o Pixabay põe em imagem feita por IA */
const FEITO_POR_IA = /\b(ai[- ]?generated|generative|midjourney|stable diffusion|dall[- ]?e|ai art)\b/i;

/** Pixabay: a busca passa pelo Postaí (a chave fica lá); fotos com até 1280 px */
async function buscarNoPixabay(termo: string): Promise<Foto[]> {
  if (!process.env.POSTAI_CHAVE) throw new Error("sem o passe do Postaí (o Pixabay passa pelo Postaí)");
  const texto = await ferramenta("buscar_no_pixabay", { q: termo, tipo: "foto", orientacao: deitadas ? "horizontal" : "all", porPagina: 20 });
  let resultados: Array<{ id: string; pagina: string; largura: number; altura: number; previa: string; url: string; tags: string }>;
  try {
    resultados = (JSON.parse(texto) as { resultados: typeof resultados }).resultados;
  } catch {
    throw new Error(texto.slice(0, 160));
  }
  return resultados
    // Nada feito por IA: destoa das pinturas e o YouTube pede para marcar conteúdo sintético
    .filter((r) => !FEITO_POR_IA.test(r.tags))
    // Vetores vêm com fundo transparente, que vira preto no JPEG
    .filter((r) => !r.pagina.includes("/vectors/"))
    .map((r) => ({ id: r.id, url: r.url, previa: r.previa, source: "pixabay", foreign_landing_url: r.pagina, width: r.largura, height: r.altura, titulo: r.tags }))
    .filter(filtroDeTamanho);
}

/**
 * Unsplash: fotos modernas (grátis, uso comercial), pela chave do Postaí. Exige
 * avisar o Unsplash quando a foto é escolhida (feito no download final) e o
 * crédito na legenda do post. Nunca vai para o banco geral de imagens.
 */
async function buscarNoUnsplash(termo: string): Promise<Foto[]> {
  if (!process.env.POSTAI_CHAVE) throw new Error("sem o passe do Postaí (o Unsplash passa pelo Postaí)");
  const texto = await ferramenta("buscar_no_unsplash", { q: termo, orientacao: deitadas ? "horizontal" : "all", porPagina: 20 });
  let resultados: Array<{ id: string; pagina: string; largura: number; altura: number; previa: string; url: string; descricao: string; credito: string }>;
  try {
    resultados = (JSON.parse(texto) as { resultados: typeof resultados }).resultados;
  } catch {
    throw new Error(texto.slice(0, 160));
  }
  return resultados
    .map((r) => ({ id: r.id, url: r.url, previa: r.previa, source: "unsplash", foreign_landing_url: r.pagina, width: r.largura, height: r.altura, titulo: r.descricao, credito: r.credito }))
    .filter(filtroDeTamanho);
}

// Quanto cada acervo vale na ordem: os museus escaneiam as próprias obras (alta
// resolução, licença certa); o resto do Openverse (Flickr etc.) é mais variado.
const PESO: Record<string, number> = {
  artic: 4,
  clevelandart: 4,
  met: 3,
  smithsonian: 3,
  rijksmuseum: 3,
  nga: 3,
  wikimedia: 2,
  pixabay: 1.5,
  unsplash: 1.5,
};
const pesoDe = (f: Foto) => PESO[f.source] ?? (f.source.startsWith("smithsonian") ? 3 : 1);

/**
 * Todos os acervos ao mesmo tempo. Um que falhar não atrapalha os outros. A
 * ordem alterna os acervos (o 1º de cada, depois o 2º de cada...), do mais
 * confiável para o menos, e mantém a ordem de relevância de cada um.
 */
async function buscarNosMuseus(termo: string): Promise<Foto[]> {
  const nomes = ["Art Institute", "Cleveland", "Met", "Commons", "Openverse", "Pixabay", "Unsplash"];
  const resultados = await Promise.allSettled([
    buscarNoAIC(termo),
    buscarNoCleveland(termo),
    buscarNoMet(termo),
    buscarNoCommons(termo),
    buscarNoOpenverse(termo, false),
    // Sem o passe (no computador, sem a rotina), o Pixabay fica de fora sem avisar
    process.env.POSTAI_CHAVE ? buscarNoPixabay(termo) : Promise.resolve([]),
    process.env.POSTAI_CHAVE ? buscarNoUnsplash(termo) : Promise.resolve([]),
  ]);
  const listas: Foto[][] = [];
  for (const [i, r] of resultados.entries()) {
    if (r.status === "fulfilled") listas.push(r.value);
    else console.log(`  (${nomes[i]} não respondeu: ${r.reason instanceof Error ? r.reason.message : String(r.reason)})`);
  }
  // O Openverse mistura acervos: separa cada um, para alternar e pesar certo
  const grupos = new Map<string, Foto[]>();
  for (const foto of listas.flat()) grupos.set(foto.source, [...(grupos.get(foto.source) ?? []), foto]);
  const ordem = [...grupos.values()].sort((a, b) => pesoDe(b[0]) - pesoDe(a[0]));
  const vistas = new Set<string>();
  const juntas: Foto[] = [];
  for (let i = 0; ordem.some((g) => i < g.length); i++) {
    for (const grupo of ordem) {
      const foto = grupo[i];
      if (!foto) continue;
      // A mesma imagem pode vir do Commons e do Openverse, com endereços diferentes: compara também o nome
      const endereco = foto.foreign_landing_url.replace(/^https?:\/\/(www\.)?/, "").toLowerCase();
      const nome = semAcento(foto.titulo || decodeURIComponent(foto.foreign_landing_url.split("/").pop() ?? ""))
        .replace(/^file:/, "")
        .replace(/\.(jpe?g|png|tiff?|webp|gif)$/, "")
        .replace(/[^a-z0-9]/g, "");
      if (vistas.has(endereco) || (nome.length > 8 && vistas.has(nome))) continue;
      // Imagem de um site que está bloqueando a máquina não baixaria: dá a vaga para outra
      if (cansado(foto.url) || (foto.previa && cansado(foto.previa))) continue;
      vistas.add(endereco);
      if (nome.length > 8) vistas.add(nome);
      juntas.push(foto);
    }
  }
  return juntas;
}

const filtroDeTamanho = (f: Foto) =>
  deitadas
    ? f.width >= 1280 && f.width / f.height >= 1.25 && f.width / f.height <= 2.2
    : Math.min(f.width, f.height) >= 800 && Math.max(f.width, f.height) / Math.min(f.width, f.height) <= 1.8;

/** Openverse: só fotos (padrão) ou qualquer imagem em domínio público e CC0 (nos museus) */
async function buscarNoOpenverse(termo: string, soFotos = true): Promise<Foto[]> {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", termo);
  url.searchParams.set("license", deitadas || !soFotos ? "cc0,pdm" : "cc0");
  if (soFotos) url.searchParams.set("category", "photograph");
  url.searchParams.set("page_size", "20");
  // Nos museus (e na reserva quando a fonte pedida falha) o Openverse busca em todas as fontes dele
  if (soFotos && fonte && !["museus", "commons", "pixabay", "unsplash"].includes(fonte)) url.searchParams.set("source", fonte);
  let resp = await pedir(url);
  // 400 com --fonte: o Openverse não conhece essa fonte (ex.: "wikimedia" escrito
  // diferente). Tenta sem filtrar a fonte em vez de perder o item.
  if (resp.status === 400 && url.searchParams.has("source")) {
    console.log(`  (o Openverse não aceitou a fonte "${fonte}": procuro em todas as fontes dele)`);
    url.searchParams.delete("source");
    resp = await pedir(url);
  }
  if (!resp.ok) throw new Error(`Openverse respondeu ${resp.status} para "${termo}"`);
  const { results } = (await resp.json()) as { results: Array<Foto & { title?: string }> };
  // Grandes o bastante e não muito compridas
  // O rawpixel diz ter 5000 px, mas entrega um WebP de 1024 px: fica de fora
  return results
    .filter((r) => r.source !== "rawpixel")
    .map((r) => ({ id: r.id, url: r.url, previa: `https://api.openverse.org/v1/images/${r.id}/thumb/`, source: r.source, foreign_landing_url: r.foreign_landing_url, width: r.width, height: r.height, titulo: r.title, licenca: (r as { license?: string }).license }))
    .filter(filtroDeTamanho);
}

// ---- Banco de imagens do Postaí (geral, só imagens livres) ----
// Antes da internet, procura no banco: o que outra equipe já escolheu (mesma
// pintura, mesmo mapa) vem de lá, sem pedir de novo ao Commons. A imagem nova
// que a equipe escolher (menos as do Unsplash) é guardada para as próximas.
const usarBanco = Boolean(process.env.POSTAI_CHAVE) && !semBanco;
const nicho = nichoPedido ?? nichoDoCanal();

/** O nicho do canal (o tema ou o que divulga), do canal-postai.md, para o banco organizar */
function nichoDoCanal(): string {
  try {
    if (!existsSync("canais")) return "";
    for (const pasta of readdirSync("canais", { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const md = join("canais", pasta.name, "canal-postai.md");
      if (!existsSync(md)) continue;
      const achado = readFileSync(md, "utf8").match(/## (?:Tema do canal|O que divulga)\s*\n+([^\n]+)/);
      if (achado) return achado[1].trim().slice(0, 60);
    }
  } catch {
    // Sem o canal, o banco guarda sem nicho
  }
  return "";
}

async function buscarNoBanco(termo: string): Promise<Foto[]> {
  const texto = await ferramenta("buscar_no_banco_de_imagens", { q: termo, nicho, orientacao: deitadas ? "horizontal" : "all", limite: 6 });
  let resultados: Array<{ id: string; largura: number; altura: number; titulo: string; fonte: string; licenca: string; original: string; usadaPorEstaContaHaDias: number | null; previa: string; url: string }>;
  try {
    resultados = (JSON.parse(texto) as { resultados: typeof resultados }).resultados;
  } catch {
    throw new Error(texto.slice(0, 160));
  }
  return resultados
    .map((r) => ({
      id: r.id,
      url: r.url,
      previa: r.previa,
      // A imagem de IA do banco continua marcada (o vídeo sai como sintético)
      source: r.licenca === "ia" ? "banco-ia" : "banco",
      foreign_landing_url: r.original || `banco:${r.id}`,
      width: r.largura,
      height: r.altura,
      titulo: `${r.titulo || "sem título"} (banco, de ${r.fonte}${r.usadaPorEstaContaHaDias !== null ? `; esta conta usou há ${r.usadaPorEstaContaHaDias} dias` : ""})`,
      licenca: r.licenca,
    }))
    // A de IA passa sem o filtro de tamanho (o vídeo recorta), mas a gerada EM PÉ
    // (para um vídeo vertical) não entra no vídeo deitado: virava uma tira estreita
    // com bordas desfocadas (crítica, 25/11/2026)
    .filter((f) => (f.source === "banco-ia" ? !(deitadas && f.height > f.width) : filtroDeTamanho(f)));
}

async function buscar(termo: string): Promise<Foto[]> {
  // --fonte ia pede uma imagem NOVA: não pega a do banco (23/11/2026: devolvia a do
  // banco de outra cena em vez de gerar a do Antíoco IV)
  const doBanco = usarBanco && fonte !== "ia"
    ? await buscarNoBanco(termo).catch((erro) => {
        console.log(`  (banco de imagens não respondeu: ${erro instanceof Error ? erro.message : String(erro)})`);
        return [] as Foto[];
      })
    : [];
  // Com 4 ou mais boas no banco, nem vai à internet (mais rápido e sem o limite do Commons)
  if (doBanco.length >= 4) return doBanco;
  // A internet falhou de vez: o que o banco tinha ainda serve
  const daInternet = await buscarNaInternet(termo).catch((erro) => {
    if (!doBanco.length) throw erro;
    console.log(`  (${erro instanceof Error ? erro.message : String(erro)}: fico com as do banco)`);
    return [] as Foto[];
  });
  return [...doBanco, ...daInternet.filter((f) => !doBanco.some((b) => b.foreign_landing_url === f.foreign_landing_url))];
}

const licencaDa = (foto: Foto) =>
  foto.source === "ia"
    ? "ia"
    : foto.source === "pixabay"
    ? "pixabay"
    : foto.source === "clevelandart" || foto.source === "met" || foto.licenca === "cc0"
      ? "cc0"
      : "dominio-publico";

/** Guarda no banco a imagem escolhida (a grande e a miniatura de 480 px), com a licença e de onde veio */
async function guardarNoBanco(arquivo: string, foto: Foto, termo: string) {
  const bytes = readFileSync(arquivo);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const pedido = JSON.parse(await ferramenta("pedir_envio_ao_banco", { hash })) as { jaExiste: boolean; imagem?: string; miniatura?: string };
  if (!pedido.jaExiste && pedido.imagem && pedido.miniatura) {
    const mini = join(tmpdir(), `banco-${hash.slice(0, 12)}.jpg`);
    spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", arquivo, "-vf", "scale='min(480,iw)':-2", "-q:v", "4", mini], { shell: process.platform === "win32" });
    for (const [url, corpo] of [[pedido.imagem, bytes], [pedido.miniatura, readFileSync(mini)]] as const) {
      const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: corpo });
      if (!r.ok) throw new Error(`o envio ao banco respondeu ${r.status}`);
    }
    rmSync(mini, { force: true });
  }
  const dim = dimensoesDoJpeg(bytes) ?? { width: foto.width, height: foto.height };
  const etiquetas = [...new Set(termo.toLowerCase().split(/[^a-z0-9]+/).filter((p) => p.length > 2))].slice(0, 12);
  await ferramenta("guardar_no_banco", {
    hash,
    largura: dim.width,
    altura: dim.height,
    fonte: foto.source.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40) || "outra",
    licenca: licencaDa(foto),
    // A de IA não tem página de origem
    original: foto.source === "ia" ? "" : foto.foreign_landing_url,
    titulo: foto.titulo ?? "",
    etiquetas,
    nicho,
  });
}

/**
 * Último recurso (21/11/2026): a imagem gerada com IA pelo Postaí (FLUX no
 * Cloudflare), quando nenhum acervo livre tem a cena. Só cena de clima: o termo
 * vira a descrição (em inglês). Até 40 por conta por dia; o vídeo sai marcado
 * como conteúdo sintético no YouTube (o aprovar lê o CREDITOS.md).
 */
async function gerarComIa(termo: string, pedidaDeProposito = fonte === "ia"): Promise<Foto[]> {
  if (!process.env.POSTAI_CHAVE) return [];
  // Pedida de propósito (--fonte ia): o termo já é a descrição da cena que a
  // pesquisadora escreveu. Reserva automática: o termo de busca é curto, então
  // vai junto o assunto do canal, para a imagem sair no clima do vídeo
  // Termo curto demais para descrever uma cena (24/11/2026: "portrait" e "stones"
  // voltavam do Postaí com "Descreva a cena em inglês"): leva junto o assunto do
  // canal; sem ele, avisa aqui o que escrever, sem gastar a chamada
  const curto = termo.trim().split(/\s+/).length < 4 || termo.trim().length < 8;
  if (termo.trim().length < 8 && !nicho) {
    throw new Error(`a imagem de IA precisa de uma cena descrita em inglês (o lugar, a luz, a época, o que aparece), com pelo menos 4 palavras. Veio só "${termo}". Ex.: "old stone altar on a desert hill at dawn, warm light"`);
  }
  const descricao = (pedidaDeProposito && !curto) || !nicho ? termo : `${termo}. A scene for a narrated documentary video about: ${nicho}`;
  const resposta = JSON.parse(await ferramenta("gerar_imagem_com_ia", { descricao: descricao.slice(0, 500), formato: deitadas ? "deitada" : "em-pe" })) as {
    id: string;
    url: string;
    largura: number;
    altura: number;
  };
  console.log(`  (nenhum acervo tinha "${termo}": imagem gerada com IA)`);
  const foto: Foto = {
    id: resposta.id,
    url: resposta.url,
    previa: resposta.url,
    source: "ia",
    foreign_landing_url: `ia:${resposta.id}`,
    width: resposta.largura,
    height: resposta.altura,
    titulo: "Imagem gerada com IA (FLUX.2)",
    licenca: "ia",
  };
  // Guarda no banco do Postaí na hora (o dono quer todas lá): as próximas equipes
  // reaproveitam sem gerar de novo
  if (usarBanco) {
    const arquivo = join(tmpdir(), `ia-${resposta.id}.jpg`);
    try {
      const r = await fetch(resposta.url);
      if (!r.ok) throw new Error(`não baixou (${r.status})`);
      writeFileSync(arquivo, Buffer.from(await r.arrayBuffer()));
      await guardarNoBanco(arquivo, foto, termo);
    } catch (erro) {
      console.log(`  (a imagem de IA não foi para o banco: ${erro instanceof Error ? erro.message : String(erro)})`);
    } finally {
      rmSync(arquivo, { force: true });
    }
  }
  return [foto];
}

async function buscarNaFonte(termo: string): Promise<Foto[]> {
  if (fonte === "ia") return gerarComIa(termo);
  if (fonte === "commons") return buscarNoCommons(termo);
  if (fonte === "museus") return buscarNosMuseus(termo);
  if (fonte === "pixabay") return buscarNoPixabay(termo);
  if (fonte === "unsplash") return buscarNoUnsplash(termo);
  return buscarNoOpenverse(termo);
}

/**
 * A fonte pedida e, se ela bloquear a máquina (o Commons dá 429 na nuvem), cair
 * ou não achar nada, todos os acervos juntos (os museus, o Commons, o Openverse,
 * o Pixabay e o Unsplash). Antes o item só falhava e o vídeo saía com menos fotos.
 */
async function buscarNaInternet(termo: string): Promise<Foto[]> {
  if (fonte === "ia") return gerarComIa(termo);
  if (fonte === "museus") {
    const dosMuseus = await buscarNosMuseus(termo);
    if (dosMuseus.length) return dosMuseus;
    return gerarComIa(termo).catch((erro) => {
      console.log(`  (imagem de IA: ${erro instanceof Error ? erro.message : String(erro)})`);
      return [] as Foto[];
    });
  }
  const nome = fonte ?? "Openverse";
  try {
    const fotos = await buscarNaFonte(termo);
    if (fotos.length) return fotos;
    console.log(`  (nada em ${nome} para "${termo}": procuro em todos os acervos)`);
  } catch (erro) {
    console.log(`  (${erro instanceof Error ? erro.message : String(erro)}: procuro em todos os acervos)`);
  }
  const deTodos = await buscarNosMuseus(termo);
  if (deTodos.length) return deTodos;
  // Nenhum acervo tem a cena: a imagem de IA (se a conta ainda tiver vaga hoje)
  return gerarComIa(termo).catch((erro) => {
    console.log(`  (imagem de IA: ${erro instanceof Error ? erro.message : String(erro)})`);
    return [] as Foto[];
  });
}

/** Baixa e grava em JPEG, com o lado menor em 1080 px (candidata: 480 px de largura, só para olhar) */
/** A imagem do Commons vem pelo servidor do Postaí (guardada lá); se ele falhar, direto. */
async function pelaRota(url: string): Promise<string> {
  if (!commonsPeloPostai || new URL(url).hostname !== "upload.wikimedia.org") return url;
  try {
    return (JSON.parse(await ferramenta("baixar_do_commons", { url })) as { url: string }).url;
  } catch (erro) {
    console.log(`  (o Commons pelo Postaí não baixou: ${erro instanceof Error ? erro.message : String(erro)}; tento direto)`);
    return url;
  }
}

async function baixar(foto: Foto, saida: string, pequena = false) {
  // A prévia vem na versão pequena do acervo: sai rápido e não gasta o limite
  let url = pequena && foto.previa ? foto.previa : foto.url;
  url = await pelaRota(url);
  let resp = await pedir(url, foto.cabecalhos);
  // A versão pequena falhou (o Openverse às vezes não gera): tenta a grande
  if (!resp.ok && foto.previa && pequena) {
    url = await pelaRota(foto.url);
    resp = await pedir(url, foto.cabecalhos);
  }
  // O acervo do Met às vezes devolve 200 com uma página HTML de bloqueio no lugar da imagem
  // grande: tenta a versão pequena antes de desistir (o ffmpeg só dizia "Não converteu")
  const ehPagina = (r: Response) => /text\/html/i.test(r.headers.get("content-type") ?? "");
  if (resp.ok && ehPagina(resp) && foto.previa && url !== foto.previa) {
    url = await pelaRota(foto.previa);
    resp = await pedir(url, foto.cabecalhos);
  }
  if (!resp.ok) throw new Error(`Não baixou ${url} (${resp.status})`);
  // Página HTML no lugar da imagem (bloqueio do acervo): erro claro. Tipo genérico
  // (application/octet-stream) passa, porque alguns acervos mandam a imagem assim
  if (ehPagina(resp)) throw new Error(`Não baixou ${url} (o acervo mandou uma página, não a imagem)`);
  // O ffmpeg reconhece a imagem pela extensão (o Commons tem PNG e TIFF também)
  // O tipo vem da resposta (o nome pode mentir: .jpg que é WebP) e, sem ele, do nome
  const tipo = resp.headers.get("content-type") ?? "";
  const extensao =
    tipo.match(/image\/(jpeg|png|webp|tiff|gif)/)?.[1].replace("jpeg", "jpg") ??
    new URL(url).pathname.match(/\.(jpe?g|png|webp|tiff?|gif)$/i)?.[1].toLowerCase() ??
    "jpg";
  const bruto = saida.replace(/\.jpg$/, `.bruto.${extensao}`);
  writeFileSync(bruto, Buffer.from(await resp.arrayBuffer()));
  // Candidata pequena: o Claude olha cada uma, e imagem grande custa uns 5 vezes mais
  const escala = pequena
    ? "scale='min(480,iw)':-2"
    : deitadas
      ? "scale='min(1920,iw)':-2"
      : foto.width > foto.height
        ? "scale=-2:1080"
        : "scale=1080:-2";
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", bruto, "-vf", escala, "-q:v", "3", saida], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  rmSync(bruto, { force: true });
  if (r.status !== 0) throw new Error(`Não converteu ${foto.url}`);
}

const creditos: { arquivo: string; foto: Foto }[] = [];
// Um item que falha não derruba os outros: ele sai com ✗ e o resto segue.
for (const [n, item] of itens.entries()) {
  try {
    // A escolha (#n) usa as opções guardadas na busca das candidatas: é a mesma imagem que foi vista
    const guardadas = join(pastaCandidatos, `${item.arquivo}.json`);
    let fotos: Foto[] | null = null;
    if (!candidatos && existsSync(guardadas)) {
      const salvo = JSON.parse(readFileSync(guardadas, "utf8")) as { termo: string; fotos: Foto[] };
      if (salvo.termo === item.termo) fotos = salvo.fotos;
    }
    fotos ??= await buscar(item.termo);
    if (fotos.length === 0) {
      console.error(
        `✗ ${item.arquivo}: nenhuma imagem livre para "${item.termo}" em nenhum acervo (tente um termo mais geral em inglês: o lugar, o objeto ou a época, sem nome próprio raro)`,
      );
      process.exitCode = 1;
      continue;
    }
    if (candidatos) {
      // Cada opção que não baixar é só pulada (as outras servem)
      const opcoes: Foto[] = [];
      // Nos museus vêm 6 (mais acervos, mais escolha); nos outros, 4
      for (const foto of fotos.slice(0, fonte === "museus" ? 6 : 4)) {
        try {
          await baixar(foto, join(pastaCandidatos, `${item.arquivo}-${opcoes.length + 1}.jpg`), true);
          opcoes.push(foto);
        } catch (erro) {
          console.log(`  (pulei uma opção de ${item.arquivo}: ${erro instanceof Error ? erro.message : String(erro)})`);
        }
        await espera(500);
      }
      if (opcoes.length === 0) throw new Error(`nenhuma opção baixou para "${item.termo}"`);
      writeFileSync(guardadas, JSON.stringify({ termo: item.termo, fotos: opcoes }, null, 2));
      // O nome da obra (ou do arquivo no Commons) ajuda a saber quem é (ex.: Napoleon_I_of_France_by_...)
      const nomes = opcoes.map((foto, i) => {
        const nome = foto.titulo || decodeURIComponent(foto.foreign_landing_url.split("/").pop() ?? "").replace(/^File:/, "");
        return `${i + 1}: ${nome.slice(0, 70)} (${foto.source}, ${foto.width}×${foto.height})`;
      });
      console.log(`• ${item.arquivo}: ${opcoes.length} ${opcoes.length === 1 ? "opção" : "opções"} em ${pastaCandidatos}/${item.arquivo}-N.jpg (480 px)\n    ${nomes.join("\n    ")}`);
    } else {
      const foto = fotos[item.escolha - 1];
      if (!foto)
        throw new Error(
          `a escolha #${item.escolha} não existe: "${item.termo}" tem ${fotos.length} ${fotos.length === 1 ? "opção (use #1)" : `opções (use #1 a #${fotos.length})`}`,
        );
      await baixar(foto, join(destino, `${item.arquivo}.jpg`));
      // Banco: conta o uso (e esta conta não repete a imagem em vídeos seguidos).
      // Nova e livre: guarda no banco para as próximas equipes (o Unsplash nunca)
      if (foto.source.startsWith("banco")) await ferramenta("usar_do_banco", { id: foto.id }).catch(() => undefined);
      // A de IA já foi guardada quando foi gerada (gerarComIa)
      else if (usarBanco && foto.source !== "unsplash" && foto.source !== "ia")
        await guardarNoBanco(join(destino, `${item.arquivo}.jpg`), foto, item.termo).catch((erro) =>
          console.log(`  (não guardou no banco: ${erro instanceof Error ? erro.message : String(erro)})`),
        );
      // Unsplash: avisa que a foto foi usada (exigência deles) e lembra o crédito da legenda
      if (foto.source === "unsplash") {
        await ferramenta("usar_foto_do_unsplash", { id: foto.id }).catch(() => undefined);
        console.log(`  CRÉDITO OBRIGATÓRIO na legenda do post: ${foto.credito}`);
      }
      creditos.push({ arquivo: `${item.arquivo}.jpg`, foto });
      console.log(`✓ ${destino}/${item.arquivo}.jpg (${foto.source}, ${foto.foreign_landing_url})`);
    }
  } catch (erro) {
    console.error(`✗ ${item.arquivo}: ${erro instanceof Error ? erro.message : String(erro)}`);
    process.exitCode = 1;
  } finally {
    await contarNaTela(n + 1);
  }
}

if (!candidatos && creditos.length > 0) {
  const caminho = join(destino, "CREDITOS.md");
  const antigas = existsSync(caminho)
    ? readFileSync(caminho, "utf8")
        .split("\n")
        .filter((l) => /^\| \S+\.jpg \|/.test(l) && !creditos.some((c) => l.startsWith(`| ${c.arquivo} |`)))
    : [];
  const novas = creditos.map(({ arquivo, foto }) => `| ${arquivo} | ${foto.source} | ${foto.foreign_landing_url} | ${foto.id} |${foto.credito ? ` ${foto.credito} |` : ""}`);
  writeFileSync(
    caminho,
    [
      `# Fotos de domínio público (${pasta})`,
      "",
      "Licença CC0 ou domínio público (uso comercial sem crédito obrigatório), baixadas do Openverse, do Wikimedia Commons, do Art Institute of Chicago, do Cleveland Museum of Art ou do The Met com o ferramentas/buscar-fotos.mts. As do Unsplash (licença do Unsplash) têm crédito obrigatório na legenda do post: está na última coluna.",
      "",
      "| Arquivo | Fonte | Original | Id |",
      "| --- | --- | --- | --- |",
      ...antigas,
      ...novas,
      "",
    ].join("\n"),
  );
  if (existsSync(pastaCandidatos)) rmSync(pastaCandidatos, { recursive: true });
}
