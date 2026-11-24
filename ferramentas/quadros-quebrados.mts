// Acha quadros quebrados num vídeo pronto (24/11/2026): na nuvem, sem placa de
// vídeo, o 3D saía com 7% a 24% dos quadros em mosaico (o céu repetido em tiras,
// sem título nem legenda), mais com 4 abas do que com 2. Na tela isso pisca.
//
// Como: tira cada quadro pequeno (90 x 160) e compara com os vizinhos. Um quadro
// quebrado é muito diferente do anterior, mas o vídeo "volta" logo depois (até 4
// quadros) para algo parecido com o anterior. Um corte de cena não volta, então
// não conta.
//
// Uso sozinho:  npx tsx ferramentas/quadros-quebrados.mts out/<nome>/video.mp4
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";

const LARGURA = 90;
const ALTURA = 160;
// Diferença média por pixel (0 a 255): acima disso o quadro "pulou"
const PULO = 12;
// Quantos quadros quebrados seguidos ainda contam como piscada
const ATE = 4;

function cinzas(arquivo: string): Float32Array {
  const png = PNG.sync.read(readFileSync(arquivo));
  const g = new Float32Array(png.width * png.height);
  for (let i = 0; i < g.length; i++) g[i] = (png.data[i * 4] + png.data[i * 4 + 1] + png.data[i * 4 + 2]) / 3;
  return g;
}

function diferenca(a: Float32Array, b: Float32Array): number {
  let soma = 0;
  for (let i = 0; i < a.length; i++) soma += Math.abs(a[i] - b[i]);
  return soma / a.length;
}

/** Os números (a partir de 0) dos quadros que piscam; lista vazia se o vídeo está bom */
export function acharNosQuadros(quadros: Float32Array[]): number[] {
  const quebrados: number[] = [];
  for (let i = 1; i < quadros.length - 1; i++) {
    const antes = quadros[i - 1];
    const pulo = diferenca(antes, quadros[i]);
    if (pulo < PULO) continue;
    // Volta a algo parecido com o anterior em até ATE quadros?
    for (let j = i + 1; j <= Math.min(i + ATE, quadros.length - 1); j++) {
      const deVolta = diferenca(antes, quadros[j]);
      if (deVolta < pulo / 3 && diferenca(quadros[j - 1], quadros[j]) >= PULO / 2) {
        for (let k = i; k < j; k++) quebrados.push(k);
        i = j - 1;
        break;
      }
    }
  }
  return quebrados;
}

/** Tira os quadros do vídeo pelo ffmpeg do Remotion e procura os quebrados */
export function quadrosQuebrados(video: string): number[] {
  const pasta = mkdtempSync(join(tmpdir(), "quadros-"));
  try {
    const r = spawnSync(
      "npx",
      ["remotion", "ffmpeg", "-loglevel", "error", "-i", video, "-vf", `scale=${LARGURA}:${ALTURA}`, join(pasta, "%06d.png")],
      { encoding: "utf8", shell: process.platform === "win32" },
    );
    if (r.status !== 0) throw new Error(`Não consegui tirar os quadros de ${video}: ${(r.stderr ?? "").trim().slice(-300)}`);
    const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".png")).sort();
    return acharNosQuadros(arquivos.map((f) => cinzas(join(pasta, f))));
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith("quadros-quebrados.mts")) {
  const video = process.argv[2];
  if (!video) {
    console.error("Uso: npx tsx ferramentas/quadros-quebrados.mts out/<nome>/video.mp4");
    process.exit(1);
  }
  const lista = quadrosQuebrados(video);
  if (!lista.length) console.log("Nenhum quadro quebrado.");
  else {
    console.log(`${lista.length} quadros quebrados (piscam): ${lista.slice(0, 30).join(", ")}${lista.length > 30 ? "…" : ""}`);
    process.exit(2);
  }
}
