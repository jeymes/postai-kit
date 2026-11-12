// Caminhos e ajudas usadas por todas as ferramentas.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const windows = process.platform === "win32";

export const RAIZ = process.cwd();
export const ENTRADA = join(RAIZ, "entrada");
export const TRABALHO = join(RAIZ, "trabalho");
export const PASTA_PYTHON = join(RAIZ, ".cortes");
export const MODELOS = join(PASTA_PYTHON, "modelos");
export const PYTHON = join(PASTA_PYTHON, "python", windows ? "Scripts" : "bin", windows ? "python.exe" : "python");
export const EXTENSOES = [".mp4", ".mov", ".mkv", ".webm", ".m4v"];
export const FPS = 30;

/** Roda um comando e para tudo se falhar. Devolve a saída (stdout). */
export function rodar(programa: string, args: string[], { mostrar = false } = {}) {
  const r = spawnSync(programa, args, {
    encoding: "utf8",
    stdio: mostrar ? "inherit" : "pipe",
    shell: windows,
    maxBuffer: 1024 * 1024 * 200,
  });
  if (r.status !== 0) {
    if (!mostrar) console.error(r.stderr || r.stdout);
    throw new Error(`Falhou: ${programa} ${args.slice(0, 4).join(" ")}...`);
  }
  return r.stdout ?? "";
}

/** O ffmpeg e o ffprobe que vêm com o Remotion (não precisa instalar nada). */
const REMOTION = join(RAIZ, "node_modules", ".bin", windows ? "remotion.cmd" : "remotion");
export const ffmpeg = (args: string[]) => rodar(REMOTION, ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", ...args]);
export const ffprobe = (args: string[]) => rodar(REMOTION, ["ffprobe", "-v", "error", ...args]);

export function infoDoVideo(arquivo: string) {
  const saida = ffprobe(["-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", arquivo]);
  const dados = JSON.parse(saida) as { streams?: Array<{ width: number; height: number }>; format?: { duration?: string } };
  const v = dados.streams?.[0];
  return { largura: v?.width ?? 0, altura: v?.height ?? 0, duracaoSeg: Number(dados.format?.duration ?? 0) };
}

export function lerJson<T>(arquivo: string): T {
  return JSON.parse(readFileSync(arquivo, "utf8")) as T;
}

/** Aceita "trabalho/abc", "abc" ou o caminho inteiro. */
export function pastaDoTrabalho(arg: string | undefined) {
  if (!arg) throw new Error("Diga qual trabalho: npm run <comando> -- trabalho/<id>");
  const direto = resolve(arg);
  if (existsSync(join(direto, "origem.json"))) return direto;
  const dentro = join(TRABALHO, arg);
  if (existsSync(join(dentro, "origem.json"))) return dentro;
  throw new Error(`Não achei o trabalho "${arg}" (precisa ter origem.json). Rode antes o npm run transcrever.`);
}

export type Origem = {
  id: string;
  arquivo: string;
  largura: number;
  altura: number;
  duracaoSeg: number;
  transcritoEm: string;
  /** Pedido do menu Cortes do Postaí (npm run buscar). Sem ele, o corte vai direto para a fila. */
  pedidoId?: string;
};

export type Palavra = { p: string; i: number; f: number };
export type Transcricao = {
  idioma: string;
  duracaoSeg: number;
  segmentos: Array<{ i: number; f: number; texto: string; palavras: Palavra[] }>;
};

export type Enquadramento = "desfocado" | "centro";

export type PedidoDeCortes = {
  enquadramento?: Enquadramento;
  cortes: Array<{
    inicio: number;
    fim: number;
    /** Frase curta no topo do vídeo, que prende nos primeiros segundos */
    gancho: string;
    /** Título no YouTube (até 100 caracteres) */
    titulo: string;
    /** Legenda do post, com até 5 hashtags. O crédito do canal entra sozinho no fim. */
    legenda: string;
    enquadramento?: Enquadramento;
    /** Só no "centro": onde fica o centro do recorte, de 0 (esquerda) a 1 (direita). Padrão 0,5. */
    foco?: number;
  }>;
};

/** Os vídeos de entrada/: soltos na pasta ou numa subpasta (um nível). */
export function videosDaEntrada() {
  if (!existsSync(ENTRADA)) return [];
  const eVideo = (nome: string) => EXTENSOES.includes(extname(nome).toLowerCase());
  return readdirSync(ENTRADA, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? readdirSync(join(ENTRADA, d.name)).filter(eVideo).map((a) => join(ENTRADA, d.name, a))
      : eVideo(d.name)
        ? [join(ENTRADA, d.name)]
        : [],
  );
}

export const doisDigitos = (n: number) => String(n).padStart(2, "0");

export function tempo(seg: number) {
  const m = Math.floor(seg / 60);
  const h = Math.floor(m / 60);
  const s = (seg % 60).toFixed(1).padStart(4, "0");
  return h ? `${h}:${doisDigitos(m % 60)}:${s}` : `${doisDigitos(m)}:${s}`;
}
