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
//   npm run previa -- conteudo/<nome>.json       um quadro de cada cena (rápido, para conferir;
//                                                só refaz as cenas que mudaram, --tudo refaz todas)
//   npm run renderizar -- conteudo/<nome>.json   o vídeo ou as imagens finais
//   (--detalhes mostra o progresso do Remotion; sem ele, só o resumo ou o erro)
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cpus, totalmem } from "node:os";
import { basename, join } from "node:path";
import { duracaoDoMolde, FPS, iniciosDasCenas, MOLDES_3D, MOLDES_DE_VIDEO, QUADROS_DA_IMAGEM, quadrosDaPrevia } from "../src/moldes/tempos.ts";
import { fonte3dDesatualizada, prepararFonte3d } from "./fonte-3d.mts";
import { quadrosQuebrados } from "./quadros-quebrados.mts";
import { tirarImagens, type Imagem } from "./varias-imagens.mts";

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
if ((molde === "Documentario" || molde === "CorteVertical") && !props.estilo) {
  const doCanal = lerJson<Record<string, unknown>>("canais/dark/estilo-narrado.json");
  if (doCanal?.modelo) props.estilo = doCanal;
}

if (!MOLDES.includes(molde)) {
  console.error(`"molde" precisa ser ${MOLDES.join(", ")}. Veio: ${molde}`);
  process.exit(1);
}

if ((molde === "Narrado" || molde === "Documentario" || molde === "CorteVertical" || molde === "Mundo3D") && !previa && !(args.includes("--capa") && molde === "Documentario") && props.cenas.some((c: { narracao?: unknown }) => !c.narracao)) {
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

/**
 * O 3D na nuvem usa o navegador do próprio Remotion (24/11/2026). Com o Chromium
 * da máquina (KIT_NAVEGADOR) e o 3D desenhado no processador, 7% a 24% dos
 * quadros saíam em mosaico e o vídeo piscava; com o navegador do Remotion, o
 * mesmo swangle sai limpo. Ele não confia no certificado do proxy da nuvem, por
 * isso o --ignore-certificate-errors (só as fontes e imagens da peça passam por ali).
 */
let navegadorDoRemotion = com3d && Boolean(process.env.KIT_NAVEGADOR) && !args.includes("--navegador-da-maquina");
function rodarRemotion(comando: string[]) {
  const env = { ...process.env };
  const extra: string[] = [];
  if (navegadorDoRemotion) {
    delete env.KIT_NAVEGADOR;
    extra.push("--ignore-certificate-errors");
  }
  return spawnSync("npx", ["remotion", ...comando, ...gl, ...extra, `--props=${arquivoDeProps}`], {
    stdio: detalhes ? "inherit" : "pipe",
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    shell: process.platform === "win32",
    env,
  });
}

/**
 * O navegador do render fechou no meio ("Target closed", 23/11/2026: 2 vezes num
 * vídeo longo do Canal dark). Costuma ser memória apertada com muitas abas:
 * tenta de novo com metade das abas (e de novo, até 1 aba) antes de desistir.
 */
const navegadorFechou = (saida: string) => /Target closed|Target\.closeTarget|No target with given id/i.test(saida);
function renderComReserva(abas: number, ...comando: string[]) {
  // Se o navegador fechar de novo, continua baixando as abas (metade a cada vez,
  // até 1) antes de desistir: com metade só, a memória ainda podia não bastar.
  let atual = abas;
  for (;;) {
    let r = rodarRemotion([...comando, `--concurrency=${atual}`]);
    // O navegador do Remotion não abriu na nuvem (não baixou, por exemplo): volta ao da máquina
    if (r.status !== 0 && navegadorDoRemotion && !navegadorFechou(`${r.stdout ?? ""}\n${r.stderr ?? ""}`)) {
      console.log("O navegador do Remotion falhou; tentando com o navegador da máquina.");
      navegadorDoRemotion = false;
      r = rodarRemotion([...comando, `--concurrency=${atual}`]);
    }
    if (r.status === 0) return atual;
    const saida = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
    if (atual > 1 && navegadorFechou(saida)) {
      const menos = Math.max(1, Math.floor(atual / 2));
      console.log(`O navegador do render fechou no meio (memória?). Tentando de novo com ${menos} abas em vez de ${atual}.`);
      atual = menos;
      continue;
    }
    // Mesmo caminho do erro de sempre (mostra o motivo e sai)
    remotion(...comando, `--concurrency=${atual}`);
    return atual;
  }
}

function remotion(...comando: string[]) {
  const resultado = rodarRemotion(comando);
  if (resultado.status !== 0) {
    const saida = `${resultado.stdout ?? ""}\n${resultado.stderr ?? ""}`
      .split("\n")
      .filter((linha) => linha.trim() && !/^(Rendered|Encoded|Bundled|Bundling|Getting composition)/.test(linha.trim()))
      // O aviso de memória do Docker (inofensivo) vinha no fim e escondia o motivo real do erro
      .filter((linha) => !/docker run|Docker memory limit|lower amount of memory|--memory flag/i.test(linha));
    // Se a validação do Zod falhou, o motivo vem antes de avisos de memória do Docker: mostra mais linhas
    const comZod = saida.some((linha) => /ZodError|Zod/.test(linha));
    console.error(saida.slice(comZod ? -40 : -15).join("\n"));
    console.error(`\nFalhou: npx remotion ${comando.join(" ")}`);
    process.exit(resultado.status ?? 1);
  }
}

function imagem(composicao: string, dados: unknown, destino: string, quadro = QUADROS_DA_IMAGEM - 1) {
  writeFileSync(arquivoDeProps, JSON.stringify(dados));
  remotion("still", composicao, destino, `--frame=${quadro}`, "--image-format=jpeg", "--jpeg-quality=90");
}

async function tirarOuUmaPorVez(composicao: string, lista: Imagem[]) {
  try {
    await tirarImagens(composicao, lista, gl[0]?.replace("--gl=", ""));
  } catch (erro) {
    console.log(`As imagens de uma vez falharam (${erro instanceof Error ? erro.message.split("\n")[0] : erro}); tirando uma por vez.`);
    for (const { dados, quadro, destino } of lista) imagem(composicao, dados, destino, quadro);
  }
}

/** Várias imagens no mesmo navegador (ferramentas/varias-imagens.mts); se der erro, uma por vez como antes */
async function variasImagens(composicao: string, lista: Imagem[]) {
  await tirarOuUmaPorVez(composicao, lista);
  for (const { destino } of lista) arquivos.push({ arquivo: destino, tipo: "image/jpeg", tamanho: tamanho(destino) });
}

/**
 * Prévia que só refaz o que mudou (23/11/2026): cada volta da crítica refazia a
 * prévia inteira (uns 5 min na nuvem) mesmo quando ela pedia para trocar 3
 * imagens. Cada quadro ganha uma marca (a cena, as vizinhas, o resto da peça e
 * a data dos arquivos que ela usa); o quadro com a mesma marca vem guardado de
 * out/<nome>/.previa/. --tudo refaz todas. Diz quais mudaram, para a crítica
 * olhar só essas.
 */
async function previaSoDoQueMudou() {
  const quadros = quadrosDaPrevia(molde, props);
  const cenas: unknown[] | null = Array.isArray(props.cenas) ? props.cenas : null;
  const inicios = cenas ? iniciosDasCenas(molde, props) : [];
  const resto = { ...props, cenas: undefined };
  const arquivosUsados = (valor: unknown): string[] => {
    const achados: string[] = [];
    const andar = (v: unknown) => {
      if (typeof v === "string") {
        const arquivo = join("public", v);
        if (v.length < 300 && existsSync(arquivo) && statSync(arquivo).isFile()) {
          const { mtimeMs, size } = statSync(arquivo);
          achados.push(`${v}:${mtimeMs}:${size}`);
        }
      } else if (Array.isArray(v)) v.forEach(andar);
      else if (v && typeof v === "object") Object.values(v).forEach(andar);
    };
    andar(valor);
    return achados;
  };
  const marcaDoResto = JSON.stringify([molde, resto, arquivosUsados(resto)]);
  const guardadas = join(saida, ".previa");
  if (args.includes("--tudo")) rmSync(guardadas, { recursive: true, force: true });
  mkdirSync(guardadas, { recursive: true });
  const itens = quadros.map((quadro, i) => {
    let marca: string;
    if (cenas) {
      let cena = 0;
      while (cena + 1 < inicios.length && inicios[cena + 1] <= quadro) cena++;
      // A cena, a seguinte e as de antes até a última com foto (a cena sem foto usa a dela; o
      // número da cena entra porque o movimento da foto muda com ele)
      let desde = Math.max(0, cena - 1);
      const temImagem = (c: unknown) => !!c && typeof c === "object" && ("foto" in c || "video" in c);
      while (desde > 0 && !temImagem(cenas[desde])) desde--;
      const vizinhas = cenas.slice(desde, cena + 2);
      marca = JSON.stringify([marcaDoResto, cena, quadro - inicios[cena], vizinhas, arquivosUsados(vizinhas)]);
    } else marca = JSON.stringify([marcaDoResto, props, quadro]);
    const guardada = join(guardadas, `${createHash("sha1").update(marca).digest("hex").slice(0, 16)}.jpg`);
    return { quadro, guardada, destino: join(saida, `previa-${i + 1}.jpg`), numero: i + 1 };
  });
  const faltam = itens.filter((item) => !existsSync(item.guardada));
  await tirarOuUmaPorVez(molde, faltam.map(({ quadro, guardada }) => ({ dados: props, quadro, destino: guardada })));
  for (const { guardada, destino } of itens) copyFileSync(guardada, destino);
  // Apaga as prévias que sobraram de uma versão com mais cenas
  for (const nomeDoArquivo of readdirSync(saida)) {
    const numero = /^previa-(\d+)\.jpg$/.exec(nomeDoArquivo)?.[1];
    if (numero && Number(numero) > itens.length) rmSync(join(saida, nomeDoArquivo), { force: true });
  }
  // As guardadas que ninguém usa mais (de voltas antigas)
  const emUso = new Set(itens.map((item) => basename(item.guardada)));
  for (const nomeDoArquivo of readdirSync(guardadas)) if (!emUso.has(nomeDoArquivo)) rmSync(join(guardadas, nomeDoArquivo), { force: true });
  for (const { destino } of itens) arquivos.push({ arquivo: destino, tipo: "image/jpeg", tamanho: tamanho(destino) });
  previaMudou = faltam.map((item) => item.numero);
  if (faltam.length === itens.length) console.log(`Prévia: ${itens.length} quadros, todos novos.`);
  else
    console.log(
      `Prévia: ${faltam.length} de ${itens.length} quadros refeitos (os outros não mudaram)${faltam.length ? `: previa-${previaMudou.join(", previa-")}` : ""}.`,
    );
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
let desempenho: { nucleos: number; memoriaGb: number; abas: number; segundos: number } | null = null;
let previaMudou: number[] | null = null;

// --capa: só a capa do vídeo longo, em segundos (para ajustar a capa.marca do
// círculo, da seta, da lupa ou do carimbo olhando o resultado, sem renderizar o vídeo)
if (args.includes("--capa") && molde === "Documentario") {
  const destinoDaCapa = join(saida, "capa.jpg");
  imagem("CapaDoDocumentario", { ...(capa ?? capaPadrao()), ...(props.estilo ? { estilo: props.estilo } : {}) }, destinoDaCapa);
  rmSync(arquivoDeProps, { force: true });
  console.log(`Capa pronta: ${destinoDaCapa} (abra e confira; o vídeo não foi renderizado)`);
  process.exit(0);
}

if (molde === "Carrossel") {
  // O carrossel já é feito de imagens: a prévia são os próprios slides.
  const slides = props.slides.map((_: unknown, indice: number) => ({
    dados: { ...props, indice },
    quadro: QUADROS_DA_IMAGEM - 1,
    destino: join(saida, `slide-${String(indice + 1).padStart(2, "0")}.jpg`),
  }));
  await variasImagens("Carrossel", slides);
} else if (previa) {
  await previaSoDoQueMudou();
} else {
  duracaoSeg = Math.round((duracaoDoMolde(molde, props) / FPS) * 10) / 10;
  const video = join(saida, "video.mp4");
  writeFileSync(arquivoDeProps, JSON.stringify(props));
  // Vídeo longo: taxa fixa de 6 Mbps (o YouTube recomenda 8 para 1080p), uns
  // 450 MB em 10 minutos, abaixo do limite de 1 GB do Postaí. Pintura e foto se
  // movendo comprimem mal com o crf: 10 minutos passariam de 600 MB.
  const qualidade = molde === "Documentario" ? ["--video-bitrate=6M", "--audio-bitrate=192k"] : ["--crf=20"];
  // Quantas abas do Chrome desenham ao mesmo tempo (22/11/2026): todos os núcleos,
  // no máximo o que a memória aguenta (cada aba gasta uns 450 MB; no 3D, uns 800).
  // Antes valia o padrão do Remotion (metade dos núcleos). O tempo fica anotado
  // no info.json para comparar.
  const nucleos = cpus().length;
  const memoriaGb = totalmem() / 2 ** 30;
  const abas = Math.max(1, Math.min(nucleos, Math.floor((memoriaGb - 1.5) / (com3d ? 0.8 : 0.45))));
  console.log(`Render: ${nucleos} núcleos, ${memoriaGb.toFixed(1)} GB de memória, ${abas} abas ao mesmo tempo.`);
  const inicioDoRender = Date.now();
  let abasUsadas = renderComReserva(abas, "render", molde, video, "--codec=h264", ...qualidade);
  // 3D: confere se algum quadro saiu quebrado (pisca); se sim, faz de novo com
  // menos abas (metade, depois 1). Se ainda piscar, para com erro: nada é enviado.
  if (com3d) {
    for (let volta = 0; ; volta++) {
      const quebrados = quadrosQuebrados(video);
      if (!quebrados.length) {
        console.log("Quadros conferidos: nenhum quebrado.");
        break;
      }
      const lista = `${quebrados.slice(0, 12).join(", ")}${quebrados.length > 12 ? "…" : ""}`;
      if (abasUsadas <= 1 || volta >= 2) {
        console.error(`O vídeo 3D saiu com ${quebrados.length} quadros quebrados (piscam), mesmo com ${abasUsadas} aba(s): ${lista}. Não envie este vídeo.`);
        process.exit(1);
      }
      const menos = volta === 0 ? Math.max(1, Math.floor(abasUsadas / 2)) : 1;
      console.log(`${quebrados.length} quadros quebrados (piscam): ${lista}. Fazendo de novo com ${menos} aba(s) em vez de ${abasUsadas}.`);
      abasUsadas = renderComReserva(menos, "render", molde, video, "--codec=h264", ...qualidade);
    }
  }
  const segundosDoRender = Math.round((Date.now() - inicioDoRender) / 1000);
  console.log(`Render levou ${Math.floor(segundosDoRender / 60)} min ${segundosDoRender % 60} s.`);
  desempenho = { nucleos, memoriaGb: Math.round(memoriaGb * 10) / 10, abas: abasUsadas, segundos: segundosDoRender };
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
const info = { molde, previa, ...(previaMudou ? { previaMudou } : {}), duracaoSeg, arquivos, post: post ?? null, ...(capitulos ? { capitulos } : {}), ...(desempenho ? { render: desempenho } : {}) };
writeFileSync(join(saida, "info.json"), JSON.stringify(info, null, 2));
console.log(`\nPronto: ${saida}/`);
console.log(JSON.stringify(info, null, 2));
