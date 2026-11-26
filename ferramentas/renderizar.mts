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
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cpus, totalmem } from "node:os";
import { basename, join } from "node:path";
import { duracaoDoMolde, FPS, iniciosDasCenas, MOLDES_3D, MOLDES_DE_VIDEO, QUADROS_DA_IMAGEM, quadrosDaPrevia } from "../src/moldes/tempos.ts";
import { avisoDeDuracao, minutosDoCanal } from "./duracao-do-canal.ts";
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
// 25/11/2026: o mosaico apareceu também no vídeo longo do Canal dark (6% dos
// quadros), sem 3D: vale para todo render na nuvem.
const naNuvem = Boolean(process.env.KIT_NAVEGADOR);
let navegadorDoRemotion = naNuvem && !args.includes("--navegador-da-maquina");
// Só para teste do render em blocos: a próxima chamada finge que o navegador fechou
let fingirNavegadorFechado = false;
function rodarRemotion(comando: string[]): SpawnSyncReturns<string> {
  if (fingirNavegadorFechado) {
    fingirNavegadorFechado = false;
    const erro = "ProtocolError: Protocol error (Target.closeTarget): Target closed (falha de teste, KIT_TESTE_FALHA_BLOCO)";
    return { pid: 0, output: [null, "", erro], stdout: "", stderr: erro, status: 1, signal: null };
  }
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
  // Conteúdo inválido (Root.tsx) não melhora com outro navegador nem com menos abas:
  // antes tentava 8→4→2→1 e trocava para o navegador da máquina (o do mosaico) à toa
  const conteudoInvalido = (r: { stdout?: string | null; stderr?: string | null }) =>
    `${r.stdout ?? ""}\n${r.stderr ?? ""}`.includes("Conteúdo inválido no molde");
  for (;;) {
    let r = rodarRemotion([...comando, `--concurrency=${atual}`]);
    if (r.status !== 0 && conteudoInvalido(r)) {
      remotion(...comando, `--concurrency=${atual}`);
      return atual;
    }
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
    // O campo errado do JSON (src/Root.tsx) fica perto do fim: a Saúde do kit guarda só o fim
    const campo = saida.find((linha) => linha.includes("Conteúdo inválido no molde"));
    if (campo) console.error(`\n${campo.trim().replace(/^Error\s+Error:\s*/, "")}`);
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

/** Os arquivos de public/ que a peça usa, com a data e o tamanho (mudou o arquivo, muda a marca) */
function arquivosUsados(valor: unknown): string[] {
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

/** Vídeo longo: avisa na prévia (antes do render) se o vídeo passa de 120% do alvo do canal */
function avisarDuracao() {
  if (molde !== "Documentario") return;
  const minutos = minutosDoCanal(args);
  if (!minutos) return;
  const cenas = (props.cenas ?? []) as Array<{ fala?: string; narracao?: { duracaoSeg?: number } }>;
  const falas = cenas.reduce((soma, c) => soma + Number(c.narracao?.duracaoSeg ?? 0), 0);
  const aviso = avisoDeDuracao(duracaoDoMolde(molde, props) / FPS, falas, minutos);
  if (aviso) console.log(`AVISO  ${aviso}`);
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

/**
 * Vídeo longo em blocos (26/11/2026): o render do Documentario de 10 a 15 min
 * falhava na nuvem com "Target closed" (10 vezes em 3 contas), mesmo com 1 aba:
 * o navegador cansa num render longo. Agora o vídeo sai em pedaços de
 * BLOCO_SEG segundos (--frames=a-b), cada um num Remotion (e num navegador)
 * novo, com a mesma qualidade, e o som de cada pedaço em WAV
 * (--separate-audio-to). No fim o ffmpeg emenda as imagens sem recodificar
 * (cada bloco começa num quadro-chave) e o som, e codifica o AAC uma vez só, do
 * jeito que o Remotion Lambda junta os pedaços dele.
 *
 * Bloco pronto fica em out/<nome>/.blocos/: se o comando parar no meio, rodar
 * de novo continua do bloco que faltava (mudou a peça ou um arquivo dela,
 * começa do zero). Navegador fechado num bloco: tenta só esse bloco de novo
 * com menos abas (renderComReserva).
 *
 * Vale para o Documentario e para todo vídeo de mais de 3 min; --inteiro faz
 * do jeito antigo, de uma vez. --bloco=N (ou KIT_BLOCO_SEG) muda o tamanho do
 * bloco em segundos. Teste: KIT_TESTE_FALHA_BLOCO=2,5 finge que o navegador
 * fechou na primeira tentativa desses blocos.
 */
const BLOCO_SEG = Math.max(1, Number(args.find((arg) => arg.startsWith("--bloco="))?.split("=")[1] ?? process.env.KIT_BLOCO_SEG) || 90);
const AMOSTRAS_POR_SEG = 48000;
const blocosDeTeste = new Set((process.env.KIT_TESTE_FALHA_BLOCO ?? "").split(",").map(Number).filter(Boolean));

function ff(programa: "ffmpeg" | "ffprobe", ...argumentos: string[]) {
  return spawnSync("npx", ["remotion", programa, "-v", "error", ...argumentos], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32",
  });
}

/** Quantos quadros (vídeo) ou amostras (som) o arquivo tem de verdade; null se não abriu */
function contar(arquivo: string, tipo: "v" | "a"): number | null {
  const r =
    tipo === "v"
      ? ff("ffprobe", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", arquivo)
      : ff("ffprobe", "-select_streams", "a:0", "-show_entries", "stream=duration_ts", "-of", "csv=p=0", arquivo);
  // O ffprobe pode deixar uma vírgula no fim ("150,"): parseInt ignora
  const n = Number.parseInt((r.stdout ?? "").trim().split("\n")[0], 10);
  return r.status === 0 && Number.isFinite(n) && n > 0 ? n : null;
}

function falhaDoFfmpeg(r: SpawnSyncReturns<string>, oQue: string, comando: string[]): never {
  console.error(`${oQue}: ${(r.stderr ?? "").trim().split("\n").slice(-8).join("\n")}`);
  console.error(`\nFalhou: npx remotion ffmpeg ${comando.join(" ")}`);
  process.exit(r.status || 1);
}

type Bloco = { numero: number; de: number; ate: number; video: string; som: string };

function blocosDoVideo(totalDeQuadros: number, pasta: string): Bloco[] {
  const porBloco = Math.round(BLOCO_SEG * FPS);
  const lista: Bloco[] = [];
  for (let de = 0, numero = 1; de < totalDeQuadros; de += porBloco, numero++) {
    const nome = `bloco-${String(numero).padStart(3, "0")}`;
    lista.push({ numero, de, ate: Math.min(totalDeQuadros, de + porBloco) - 1, video: join(pasta, `${nome}.mp4`), som: join(pasta, `${nome}.wav`) });
  }
  return lista;
}

/** O bloco está inteiro: o número certo de quadros e de amostras de som */
function blocoPronto(bloco: Bloco) {
  if (!existsSync(bloco.video) || !existsSync(bloco.som)) return false;
  const quadros = bloco.ate - bloco.de + 1;
  return contar(bloco.video, "v") === quadros && contar(bloco.som, "a") === Math.round((quadros / FPS) * AMOSTRAS_POR_SEG);
}

/** Renderiza os blocos que faltam; devolve as abas que funcionaram */
function renderizarBlocos(blocos: Bloco[], abas: number, qualidade: string[]): number {
  const deVideo = qualidade.filter((q) => !q.startsWith("--audio-bitrate"));
  const faltam = blocos.filter((bloco) => !blocoPronto(bloco));
  if (faltam.length < blocos.length) console.log(`Blocos já prontos: ${blocos.length - faltam.length} de ${blocos.length} (faz só os que faltam).`);
  let atual = abas;
  for (const bloco of faltam) {
    const inicio = Date.now();
    const parcialV = bloco.video.replace(/\.mp4$/, ".parcial.mp4");
    const parcialA = bloco.som.replace(/\.wav$/, ".parcial.wav");
    rmSync(parcialV, { force: true });
    rmSync(parcialA, { force: true });
    if (blocosDeTeste.delete(bloco.numero)) fingirNavegadorFechado = true;
    // Se um bloco precisou de menos abas, os seguintes já começam com menos
    atual = renderComReserva(
      atual,
      "render", molde, parcialV, "--codec=h264", ...deVideo,
      `--frames=${bloco.de}-${bloco.ate}`, `--separate-audio-to=${parcialA}`, "--enforce-audio-track",
    );
    renameSync(parcialV, bloco.video);
    renameSync(parcialA, bloco.som);
    if (!blocoPronto(bloco)) {
      const quadros = bloco.ate - bloco.de + 1;
      console.error(
        `O bloco ${bloco.numero} saiu incompleto: ${contar(bloco.video, "v")} quadros (esperava ${quadros}) e ${contar(bloco.som, "a")} amostras de som (esperava ${Math.round((quadros / FPS) * AMOSTRAS_POR_SEG)}).`,
      );
      rmSync(bloco.video, { force: true });
      rmSync(bloco.som, { force: true });
      console.error(`\nFalhou: bloco ${bloco.numero} do render (quadros ${bloco.de}-${bloco.ate})`);
      process.exit(1);
    }
    const seg = Math.round((Date.now() - inicio) / 1000);
    console.log(`Bloco ${bloco.numero} de ${blocos.length} pronto: quadros ${bloco.de} a ${bloco.ate} em ${Math.floor(seg / 60)} min ${seg % 60} s (${atual} abas).`);
  }
  return atual;
}

/** Emenda as imagens dos blocos sem recodificar e o som (AAC uma vez só) em video.mp4 */
function juntarBlocos(blocos: Bloco[], pasta: string, video: string, qualidade: string[], totalDeQuadros: number) {
  const listaV = join(pasta, "imagens.txt");
  const listaA = join(pasta, "sons.txt");
  // O caminho no arquivo da lista vale a partir da pasta da lista
  writeFileSync(listaV, blocos.map((b) => `file '${basename(b.video)}'`).join("\n") + "\n");
  writeFileSync(listaA, blocos.map((b) => `file '${basename(b.som)}'`).join("\n") + "\n");
  const bitrate = qualidade.find((q) => q.startsWith("--audio-bitrate="))?.split("=")[1] ?? "320k";
  const juntos = join(pasta, "juntos.mp4");
  const comando = [
    "-y",
    "-f", "concat", "-safe", "0", "-i", listaV,
    "-f", "concat", "-safe", "0", "-i", listaA,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", bitrate,
    "-movflags", "+faststart",
    juntos,
  ];
  const r = ff("ffmpeg", ...comando);
  if (r.status !== 0) falhaDoFfmpeg(r, "Não consegui juntar os blocos do vídeo", comando);
  const quadros = contar(juntos, "v");
  if (quadros !== totalDeQuadros) {
    console.error(`O vídeo juntado ficou com ${quadros} quadros em vez de ${totalDeQuadros}.`);
    console.error(`\nFalhou: juntar os blocos do render`);
    process.exit(1);
  }
  renameSync(juntos, video);
  console.log(`Blocos juntados: ${blocos.length} blocos, ${quadros} quadros.`);
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
  avisarDuracao();
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
  const totalDeQuadros = duracaoDoMolde(molde, props);
  // Vídeo longo: em blocos, cada um num navegador novo (veja renderizarBlocos)
  const emBlocos = !args.includes("--inteiro") && (molde === "Documentario" || totalDeQuadros > 3 * 60 * FPS);
  const pastaDosBlocos = join(saida, ".blocos");
  let blocos: Bloco[] = [];
  let abasUsadas: number;
  if (emBlocos) {
    // A marca da peça: mudou o roteiro, um arquivo dela, a qualidade ou o tamanho do bloco,
    // os blocos guardados não servem mais
    const marca = createHash("sha1")
      .update(JSON.stringify([molde, props, arquivosUsados(props), qualidade, gl, BLOCO_SEG, totalDeQuadros]))
      .digest("hex");
    const arquivoDaMarca = join(pastaDosBlocos, "marca.txt");
    if (!existsSync(arquivoDaMarca) || readFileSync(arquivoDaMarca, "utf8") !== marca) {
      rmSync(pastaDosBlocos, { recursive: true, force: true });
      mkdirSync(pastaDosBlocos, { recursive: true });
      writeFileSync(arquivoDaMarca, marca);
    }
    blocos = blocosDoVideo(totalDeQuadros, pastaDosBlocos);
    console.log(`Vídeo longo: ${blocos.length} blocos de até ${BLOCO_SEG} s, cada um num navegador novo.`);
    abasUsadas = renderizarBlocos(blocos, abas, qualidade);
    juntarBlocos(blocos, pastaDosBlocos, video, qualidade, totalDeQuadros);
  } else abasUsadas = renderComReserva(abas, "render", molde, video, "--codec=h264", ...qualidade);
  // Na nuvem (todo vídeo) e no 3D: confere se algum quadro saiu quebrado (pisca);
  // se sim, faz de novo com menos abas (metade, depois 1). Se ainda piscar, para
  // com erro: nada é enviado (o ponto antes do render deixa continuar dali).
  // Em blocos, só os blocos com quadro quebrado são feitos de novo.
  if (com3d || naNuvem) {
    for (let volta = 0; ; volta++) {
      const quebrados = quadrosQuebrados(video);
      if (!quebrados.length) {
        console.log("Quadros conferidos: nenhum quebrado.");
        break;
      }
      const lista = `${quebrados.slice(0, 12).join(", ")}${quebrados.length > 12 ? "…" : ""}`;
      const ruins = blocos.filter((b) => quebrados.some((q) => q >= b.de && q <= b.ate));
      // Os blocos quebrados saem da pasta: rodar de novo refaz só eles
      for (const b of ruins) {
        rmSync(b.video, { force: true });
        rmSync(b.som, { force: true });
      }
      if (abasUsadas <= 1 || volta >= 2) {
        console.error(`O vídeo saiu com ${quebrados.length} quadros quebrados (piscam), mesmo com ${abasUsadas} aba(s): ${lista}. Não envie este vídeo.`);
        process.exit(1);
      }
      const menos = volta === 0 ? Math.max(1, Math.floor(abasUsadas / 2)) : 1;
      if (emBlocos) {
        console.log(`${quebrados.length} quadros quebrados (piscam): ${lista}. Fazendo de novo o(s) bloco(s) ${ruins.map((b) => b.numero).join(", ")} com ${menos} aba(s) em vez de ${abasUsadas}.`);
        abasUsadas = renderizarBlocos(blocos, menos, qualidade);
        juntarBlocos(blocos, pastaDosBlocos, video, qualidade, totalDeQuadros);
      } else {
        console.log(`${quebrados.length} quadros quebrados (piscam): ${lista}. Fazendo de novo com ${menos} aba(s) em vez de ${abasUsadas}.`);
        abasUsadas = renderComReserva(menos, "render", molde, video, "--codec=h264", ...qualidade);
      }
    }
  }
  // Vídeo pronto e conferido: os blocos não servem mais (uns 600 MB num vídeo de 10 min)
  if (emBlocos) rmSync(pastaDosBlocos, { recursive: true, force: true });
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
