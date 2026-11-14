// Transforma uma peça (conteudo/<nome>.json) em arquivos prontos para o Postaí,
// em out/<nome>/:
//   vídeo (Oferta, Lista, Tutorial, AntesDepois, Depoimento, Trend, Narrado, Vitrine3D): video.mp4 + capa.jpg
//   Documentario (vídeo longo, deitado): video.mp4 + capa.jpg (1280×720, do YouTube) + os capítulos
//   Carrossel: slide-01.jpg, slide-02.jpg... (JPEG, como o Instagram pede)
// e um info.json com o tamanho de cada arquivo, a duração do vídeo e o texto
// do post, que é o que o Claude passa para o pedir_envio e o por_na_fila.
//
// Uso:
//   npm run previa -- conteudo/<nome>.json       um quadro de cada cena (rápido, para conferir)
//   npm run renderizar -- conteudo/<nome>.json   o vídeo ou as imagens finais
//   (--detalhes mostra o progresso do Remotion; sem ele, só o resumo ou o erro)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { duracaoDoMolde, FPS, iniciosDasCenas, MOLDES_3D, MOLDES_DE_VIDEO, QUADROS_DA_IMAGEM, quadrosDaPrevia } from "../src/moldes/tempos.ts";
import { fonte3dDesatualizada, prepararFonte3d } from "./fonte-3d.mts";

const MOLDES = [...MOLDES_DE_VIDEO, "Carrossel"];

const args = process.argv.slice(2);
const previa = args.includes("--previa");
const caminho = args.find((arg) => !arg.startsWith("--"));
if (!caminho) {
  console.error("Uso: npm run renderizar -- conteudo/<nome>.json   (ou npm run previa -- ...)");
  process.exit(1);
}

const peca = JSON.parse(readFileSync(caminho, "utf8"));
const { molde, capa, post, ...props } = peca;
if (!MOLDES.includes(molde)) {
  console.error(`"molde" precisa ser ${MOLDES.join(", ")}. Veio: ${molde}`);
  process.exit(1);
}

if ((molde === "Narrado" || molde === "Documentario") && !previa && props.cenas.some((c: { narracao?: unknown }) => !c.narracao)) {
  console.error(`Falta a voz de alguma cena. Rode antes: npm run narrar -- ${caminho}`);
  process.exit(1);
}

// 3D: molde do kit ou um molde seu que use os componentes de src/componentes/3d
const meu = join("src", "moldes", "meus", `${molde}.tsx`);
const com3d = MOLDES_3D.includes(molde) || (existsSync(meu) && readFileSync(meu, "utf8").includes("componentes/3d"));
if (com3d && fonte3dDesatualizada()) await prepararFonte3d();
// O jeito de usar a placa de vídeo que o `npm run diagnostico` achou (angle serve na maioria)
const gl = com3d ? [`--gl=${lerDiagnostico()?.gl ?? "angle"}`] : [];

function lerDiagnostico(): { gl?: string } | null {
  try {
    return JSON.parse(readFileSync(".estudio.json", "utf8"));
  } catch {
    return null;
  }
}

const nome = basename(caminho, ".json");
const saida = join("out", nome);
mkdirSync(saida, { recursive: true });
const arquivoDeProps = join(saida, ".props.json");

// O Remotion imprime uma linha de progresso por quadro (um vídeo de 6 min deu
// 11 mil linhas): isso enche o contexto do Claude à toa. A saída fica guardada
// e só aparece, em 15 linhas, se der erro. --detalhes mostra tudo.
const detalhes = args.includes("--detalhes");
function remotion(...comando: string[]) {
  const resultado = spawnSync("npx", ["remotion", ...comando, ...gl, `--props=${arquivoDeProps}`], {
    stdio: detalhes ? "inherit" : "pipe",
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  if (resultado.status !== 0) {
    const saida = `${resultado.stdout ?? ""}\n${resultado.stderr ?? ""}`
      .split("\n")
      .filter((linha) => linha.trim() && !/^(Rendered|Encoded|Bundled|Bundling|Getting composition)/.test(linha.trim()));
    console.error(saida.slice(-15).join("\n"));
    console.error(`\nFalhou: npx remotion ${comando.join(" ")}`);
    process.exit(resultado.status ?? 1);
  }
}

function imagem(composicao: string, dados: unknown, destino: string, quadro = QUADROS_DA_IMAGEM - 1) {
  writeFileSync(arquivoDeProps, JSON.stringify(dados));
  remotion("still", composicao, destino, `--frame=${quadro}`, "--image-format=jpeg", "--jpeg-quality=90");
}

/** Capa padrão do vídeo, quando a peça não traz a sua: a primeira frase e a primeira foto */
function capaPadrao() {
  const primeira = props.cenas?.[0];
  const depoimento = props.depoimentos?.[0];
  return {
    titulo: props.gancho ?? props.titulo3d?.replace(/\n/g, " ") ?? primeira?.texto ?? primeira?.titulo ?? primeira?.fala ?? depoimento?.texto ?? post?.titulo ?? "",
    destaque: props.destaqueGancho ?? primeira?.destaque,
    foto: props.produto?.foto ?? props.produtos?.[0]?.foto ?? props.depois?.foto ?? primeira?.foto,
  };
}

/**
 * Capítulos para a descrição do YouTube ("00:00 Título", um por linha), pelo
 * começo de cada cena com "capitulo". O YouTube só mostra com 3 ou mais, o
 * primeiro em 00:00 e cada um com 10 s ou mais; senão, null.
 */
function capitulosDoYouTube() {
  const inicios = iniciosDasCenas(molde, props);
  const lista = (props.cenas as Array<{ capitulo?: string }>)
    .map((cena, i) => (cena.capitulo ? { titulo: cena.capitulo, seg: Math.floor(inicios[i] / FPS) } : null))
    .filter((c) => c !== null);
  if (lista.length < 3) return null;
  lista[0].seg = 0;
  if (lista.some((c, i) => i > 0 && c.seg - lista[i - 1].seg < 10)) return null;
  const hora = (seg: number) => {
    const h = Math.floor(seg / 3600);
    const m = String(Math.floor((seg % 3600) / 60)).padStart(2, "0");
    const s = String(seg % 60).padStart(2, "0");
    return h ? `${h}:${m}:${s}` : `${m}:${s}`;
  };
  return lista.map((c) => `${hora(c.seg)} ${c.titulo}`).join("\n");
}

const tamanho = (arquivo: string) => statSync(arquivo).size;
const arquivos: Array<{ arquivo: string; tipo: string; tamanho: number }> = [];
let duracaoSeg: number | null = null;
let capitulos: string | null = null;

if (molde === "Carrossel") {
  // O carrossel já é feito de imagens: a prévia são os próprios slides.
  props.slides.forEach((_: unknown, indice: number) => {
    const destino = join(saida, `slide-${String(indice + 1).padStart(2, "0")}.jpg`);
    imagem("Carrossel", { ...props, indice }, destino);
    arquivos.push({ arquivo: destino, tipo: "image/jpeg", tamanho: tamanho(destino) });
  });
} else if (previa) {
  quadrosDaPrevia(molde, props).forEach((quadro, i) => {
    const destino = join(saida, `previa-${i + 1}.jpg`);
    imagem(molde, props, destino, quadro);
    arquivos.push({ arquivo: destino, tipo: "image/jpeg", tamanho: tamanho(destino) });
  });
} else {
  duracaoSeg = Math.round((duracaoDoMolde(molde, props) / FPS) * 10) / 10;
  const video = join(saida, "video.mp4");
  writeFileSync(arquivoDeProps, JSON.stringify(props));
  // Vídeo longo: taxa fixa de 6 Mbps (o YouTube recomenda 8 para 1080p), uns
  // 450 MB em 10 minutos, abaixo do limite de 1 GB do Postaí. Pintura e foto se
  // movendo comprimem mal com o crf: 10 minutos passariam de 600 MB.
  remotion("render", molde, video, "--codec=h264", ...(molde === "Documentario" ? ["--video-bitrate=6M", "--audio-bitrate=192k"] : ["--crf=20"]));
  arquivos.push({ arquivo: video, tipo: "video/mp4", tamanho: tamanho(video) });

  const destinoDaCapa = join(saida, "capa.jpg");
  // Vídeo animado: a capa é a cena com os personagens
  if (molde === "Conversa") imagem("CapaConversa", { ...props, capa: capa ?? {} }, destinoDaCapa);
  else if (molde === "Documentario") {
    imagem("CapaDoDocumentario", capa ?? capaPadrao(), destinoDaCapa);
    capitulos = capitulosDoYouTube();
  }
  else imagem("Capa", capa ?? capaPadrao(), destinoDaCapa);
  arquivos.push({ arquivo: destinoDaCapa, tipo: "image/jpeg", tamanho: tamanho(destinoDaCapa) });
}

rmSync(arquivoDeProps, { force: true });
const info = { molde, previa, duracaoSeg, arquivos, post: post ?? null, ...(capitulos ? { capitulos } : {}) };
writeFileSync(join(saida, "info.json"), JSON.stringify(info, null, 2));
console.log(`\nPronto: ${saida}/`);
console.log(JSON.stringify(info, null, 2));
