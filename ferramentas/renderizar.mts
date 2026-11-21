// Transforma uma peça (conteudo/<nome>.json) em arquivos prontos para o Postaí,
// em out/<nome>/:
//   vídeo (Oferta, Lista, Tutorial, AntesDepois, Depoimento, Trend, Narrado, Vitrine3D): video.mp4 + capa.jpg
//   Documentario (vídeo longo, deitado): video.mp4 + capa.jpg (1280×720, do YouTube) + os capítulos
//   Carrossel: slide-01.jpg, slide-02.jpg... (JPEG, como o Instagram pede)
// e um info.json com o tamanho de cada arquivo, a duração do vídeo e o texto
// do post, que é o que o Claude passa para o pedir_envio e o por_na_fila.
// Com a vinheta do fim do canal (public/marca/vinheta.*, que o npm run canal
// baixa do Postaí), ela entra no fim de todo vídeo, depois do cartão do fim.
// O dono escolhe como o vídeo termina (public/marca/fim.json): só a chamada
// (sem vinheta), só a vinheta (a Conversa e o Documentario saem sem o cartão
// do fim) ou as duas (o padrão).
//
// Uso:
//   npm run previa -- conteudo/<nome>.json       um quadro de cada cena (rápido, para conferir)
//   npm run renderizar -- conteudo/<nome>.json   o vídeo ou as imagens finais
//   (--detalhes mostra o progresso do Remotion; sem ele, só o resumo ou o erro)
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
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

// Como o vídeo termina: sem vinheta, sempre na chamada
const temVinheta = existsSync("public/marca") && readdirSync("public/marca").some((nome) => /^vinheta\.(mp4|mov|webm)$/.test(nome));
const fimDoVideo: "chamada" | "vinheta" | "ambos" = temVinheta ? (lerJson<{ fim?: "chamada" | "vinheta" | "ambos" }>("public/marca/fim.json")?.fim ?? "ambos") : "chamada";
// Só a vinheta: tira o cartão do fim dos moldes em que ele é opcional
if (fimDoVideo === "vinheta" && !args.includes("--previa")) {
  if (molde === "Conversa") {
    delete props.final;
    delete props.ctaFinal;
  }
  if (molde === "Documentario") delete props.encerramento;
  if (molde === "Mundo3D") {
    delete props.final;
    delete props.ctaFinal;
  }
}

function lerJson<T>(arquivo: string): T | null {
  try {
    return JSON.parse(readFileSync(arquivo, "utf8")) as T;
  } catch {
    return null;
  }
}
// Canal dark: o modelo visual do canal (npm run canal grava em canais/dark/estilo-narrado.json)
// O vídeo do app (Conversa) vem dos materiais do canal: o Remotion só enxerga
// public/, então copia para public/videos-do-app/ e aponta o roteiro para lá
if (molde === "Conversa" && props.videoDoApp?.arquivo && !existsSync(join("public", props.videoDoApp.arquivo))) {
  const origem = props.videoDoApp.arquivo;
  if (!existsSync(origem)) {
    console.error(`O vídeo do app não existe: ${origem} (rode npm run materiais -- canais/<canal>)`);
    process.exit(1);
  }
  mkdirSync(join("public", "videos-do-app"), { recursive: true });
  const nomeDoArquivo = origem.split("/").pop() as string;
  copyFileSync(origem, join("public", "videos-do-app", nomeDoArquivo));
  props.videoDoApp = { ...props.videoDoApp, arquivo: `videos-do-app/${nomeDoArquivo}` };
}
// Sem "multidao" no roteiro, o Remotion completaria com a do exemplo do molde
// (15 soldados): roteiro sem multidão sai sem multidão.
if (molde === "Mundo3D" && props.multidao === undefined) props.multidao = null;
if (molde === "Documentario" && !props.estilo) {
  const doCanal = lerJson<Record<string, unknown>>("canais/dark/estilo-narrado.json");
  if (doCanal?.modelo) props.estilo = doCanal;
}

if (!MOLDES.includes(molde)) {
  console.error(`"molde" precisa ser ${MOLDES.join(", ")}. Veio: ${molde}`);
  process.exit(1);
}

if ((molde === "Narrado" || molde === "Documentario" || molde === "Mundo3D") && !previa && props.cenas.some((c: { narracao?: unknown }) => !c.narracao)) {
  console.error(`Falta a voz de alguma cena. Rode antes: npm run narrar -- ${caminho}`);
  process.exit(1);
}

// 3D: molde do kit ou um molde seu que use os componentes de src/componentes/3d
const meu = join("src", "moldes", "meus", `${molde}.tsx`);
const com3d = MOLDES_3D.includes(molde) || (existsSync(meu) && readFileSync(meu, "utf8").includes("componentes/3d"));
if (com3d && fonte3dDesatualizada()) await prepararFonte3d();
// O jeito de usar a placa de vídeo que o `npm run diagnostico` achou (angle serve na maioria)
// Na nuvem não há placa de vídeo: o swangle desenha o 3D no processador
const gl = com3d ? [`--gl=${lerDiagnostico()?.gl ?? (process.env.KIT_NAVEGADOR ? "swangle" : "angle")}`] : [];

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

/** O que o ffprobe diz do arquivo: a duração e se tem som */
function sondar(arquivo: string): { duracao: number; temSom: boolean } | null {
  const r = spawnSync("npx", ["remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", arquivo], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) return null;
  try {
    const dados = JSON.parse(r.stdout) as { format?: { duration?: string }; streams?: Array<{ codec_type?: string }> };
    return { duracao: Number(dados.format?.duration ?? 0), temSom: (dados.streams ?? []).some((s) => s.codec_type === "audio") };
  } catch {
    return null;
  }
}

const MAX_VINHETA_SEG = 15;

/**
 * Cola a vinheta do fim do canal no fim do vídeo, se houver uma em
 * public/marca/. Ela passa pelo Remotion no tamanho do vídeo (inteira, com
 * faixas pretas se o formato for outro) e as duas partes são emendadas pelo
 * ffmpeg. Devolve quantos segundos entraram (0 sem vinheta ou se falhar: aí o
 * vídeo fica como estava).
 */
function colarVinheta(video: string, { largura, altura }: { largura: number; altura: number }, qualidade: string[]): number {
  const arquivo = existsSync("public/marca") ? readdirSync("public/marca").find((nome) => /^vinheta\.(mp4|mov|webm)$/.test(nome)) : undefined;
  if (!arquivo) return 0;
  const info = sondar(join("public/marca", arquivo));
  if (!info || !(info.duracao > 0)) {
    console.log("A vinheta do fim não abriu (arquivo estragado?): o vídeo sai sem ela.");
    return 0;
  }
  const segundos = Math.min(info.duracao, MAX_VINHETA_SEG);
  const quadros = Math.max(1, Math.floor(segundos * FPS));
  const parte = join(saida, ".vinheta.mp4");
  writeFileSync(arquivoDeProps, JSON.stringify({ arquivo: `marca/${arquivo}`, largura, altura, quadros }));
  remotion("render", "Vinheta", parte, "--codec=h264", "--enforce-audio-track", ...qualidade);
  const principal = sondar(video);
  const juntos = join(saida, ".com-vinheta.mp4");
  const semSom = !principal?.temSom;
  const r = spawnSync(
    "npx",
    [
      "remotion", "ffmpeg", "-v", "error", "-y",
      "-i", video, "-i", parte,
      ...(semSom ? ["-f", "lavfi", "-t", String(principal?.duracao || 1), "-i", "anullsrc=r=48000:cl=stereo"] : []),
      "-filter_complex",
      `[${semSom ? 2 : 0}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a0];[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a1];[0:v][a0][1:v][a1]concat=n=2:v=1:a=1[v][a]`,
      "-map", "[v]", "-map", "[a]",
      "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      ...(qualidade.includes("--crf=20") ? ["-crf", "20"] : ["-b:v", "6M"]),
      "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
      juntos,
    ],
    { encoding: "utf8", shell: process.platform === "win32" },
  );
  rmSync(parte, { force: true });
  if (r.status !== 0) {
    rmSync(juntos, { force: true });
    console.log(`Não consegui emendar a vinheta do fim (o vídeo sai sem ela): ${(r.stderr ?? "").trim().split("\n").slice(-3).join(" ")}`);
    return 0;
  }
  renameSync(juntos, video);
  console.log(`Vinheta do fim colada (${segundos.toFixed(1)} s${info.duracao > MAX_VINHETA_SEG ? `; cortada em ${MAX_VINHETA_SEG} s` : ""}).`);
  return quadros / FPS;
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
  const qualidade = molde === "Documentario" ? ["--video-bitrate=6M", "--audio-bitrate=192k"] : ["--crf=20"];
  remotion("render", molde, video, "--codec=h264", ...qualidade);
  const vinheta = fimDoVideo === "chamada" ? 0 : colarVinheta(video, molde === "Documentario" ? { largura: 1920, altura: 1080 } : { largura: 1080, altura: 1920 }, qualidade);
  if (vinheta) duracaoSeg = Math.round((duracaoSeg + vinheta) * 10) / 10;
  arquivos.push({ arquivo: video, tipo: "video/mp4", tamanho: tamanho(video) });

  const destinoDaCapa = join(saida, "capa.jpg");
  // Vídeo animado: a capa é a cena com os personagens
  if (molde === "Conversa") imagem("CapaConversa", { ...props, capa: capa ?? {} }, destinoDaCapa);
  // Mundo 3D: o primeiro plano, já com o título inteiro na tela
  // Mundo3D: a capa é um quadro da cena escolhida (capa.cena; sem ela, a 1ª), com o título
  // e o destaque da capa e as poses de capa.estados
  else if (molde === "Mundo3D") {
    const cenaDaCapa = Math.min(Math.max(1, capa?.cena ?? 1), props.cenas.length) - 1;
    const quadro = iniciosDasCenas("Mundo3D", props)[cenaDaCapa] + 45;
    imagem("Mundo3D", { ...props, capa: capa ?? {}, semLegenda: true }, destinoDaCapa, quadro);
  }
  else if (molde === "Documentario") {
    imagem("CapaDoDocumentario", { ...(capa ?? capaPadrao()), ...(props.estilo ? { estilo: props.estilo } : {}) }, destinoDaCapa);
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
