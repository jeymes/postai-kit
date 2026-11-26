// Bordas lisas das imagens de acervo (26/11/2026): gravura de museu escaneada vem
// com margem cinza, branca ou preta em volta e, às vezes, uma faixa com a legenda
// do arquivo embaixo. No vídeo ela entrava pequena, com a borda e a legenda no
// quadro. Aqui a imagem é lida pequena (640 px), e cada lado só é cortado quando a
// borda é de verdade: os 4 cantos da mesma cor neutra (cinza, branco ou preto),
// a primeira linha daquele lado inteira dessa cor e o corte para numa linha lisa,
// logo antes da imagem. Na dúvida, não corta. Cada lado corta no máximo 25%.
//
// Uso à mão (corta e grava por cima): npm run recortar-bordas -- public/fotos/<peça>/<nome>.jpg [...]
// O buscar-fotos já corta sozinho cada imagem que baixa.
import { spawnSync } from "node:child_process";
import { renameSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** O pedaço da imagem que fica, em frações da largura e da altura (0 a 1) */
export type Recorte = { x: number; y: number; w: number; h: number };

const LARGURA = 640;
/** Quanto um pixel pode diferir da cor da borda (0 a 255, no canal que mais difere) */
const TOLERANCIA = 22;
/** Linha (ou coluna) de borda: quase toda na cor da borda */
const LISA = 0.94;
/** Linha da faixa de legenda: a maior parte na cor da borda, e o resto bem diferente dela (letras escuras) */
const COM_LETRAS = 0.5;
const MAXIMO_POR_LADO = 0.25;

function lerPequena(arquivo: string): { px: Uint8Array; w: number; h: number } | null {
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-v", "error", "-i", arquivo, ...AMOSTRA_NO_STDOUT], {
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  if (r.status !== 0 || !r.stdout?.length) return null;
  const px = new Uint8Array(r.stdout);
  const h = Math.floor(px.length / (LARGURA * 3));
  return h > 10 ? { px, w: LARGURA, h } : null;
}

/** A cor do meio de um quadradinho (a mediana de cada canal) */
function corDoCanto(px: Uint8Array, w: number, x0: number, y0: number, lado: number): [number, number, number] {
  const canais: number[][] = [[], [], []];
  for (let y = y0; y < y0 + lado; y++)
    for (let x = x0; x < x0 + lado; x++) for (let c = 0; c < 3; c++) canais[c].push(px[(y * w + x) * 3 + c]);
  return canais.map((v) => v.sort((a, b) => a - b)[v.length >> 1]) as [number, number, number];
}

const distancia = (a: readonly number[], b: readonly number[]) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

/**
 * Onde cortar as bordas lisas da imagem, ou null quando não tem borda (ou não dá
 * para ter certeza). Só lê o arquivo.
 */
export function acharBordas(arquivo: string): Recorte | null {
  const lida = lerPequena(arquivo);
  return lida ? acharBordasNosPixels(lida.px, lida.w, lida.h) : null;
}

/**
 * Os argumentos do ffmpeg para tirar, no mesmo comando que converte a imagem, a
 * amostra pequena que o acharBordasNosPixels lê (sai no stdout). Assim o
 * buscar-fotos não gasta um comando a mais por imagem.
 */
export const AMOSTRA_NO_STDOUT = ["-vf", `scale=${LARGURA}:-2`, "-frames:v", "1", "-f", "image2pipe", "-c:v", "rawvideo", "-pix_fmt", "rgb24", "-"];

/** O mesmo que acharBordas, com a amostra já lida (RGB, LARGURA px de largura) */
export function acharBordasNosPixels(dados: Uint8Array, largura = LARGURA, altura = Math.floor(dados.length / (LARGURA * 3))): Recorte | null {
  if (altura <= 10) return null;
  const px = dados;
  // Até 3 passadas: o fundo do scanner (preto), depois a margem do papel, depois a moldura
  let area = { x0: 0, y0: 0, x1: largura, y1: altura };
  for (let passada = 0; passada < 3; passada++) {
    const nova = cortarUmaVez(px, largura, area);
    if (!nova) break;
    area = nova;
  }
  if (area.x0 === 0 && area.y0 === 0 && area.x1 === largura && area.y1 === altura) return null;
  const recorte = { x: area.x0 / largura, y: area.y0 / altura, w: (area.x1 - area.x0) / largura, h: (area.y1 - area.y0) / altura };
  // Sobrou pouco: algo deu errado, melhor não cortar
  if (recorte.w < 0.5 || recorte.h < 0.5) return null;
  return recorte;
}

type Area = { x0: number; y0: number; x1: number; y1: number };

/** Uma passada: a borda lisa em volta da área, ou null sem borda */
function cortarUmaVez(px: Uint8Array, largura: number, area: Area): Area | null {
  const w = area.x1 - area.x0;
  const h = area.y1 - area.y0;
  if (w < 40 || h < 40) return null;
  const lado = 4;
  const cantos = [
    corDoCanto(px, largura, area.x0, area.y0, lado),
    corDoCanto(px, largura, area.x1 - lado, area.y0, lado),
    corDoCanto(px, largura, area.x0, area.y1 - lado, lado),
    corDoCanto(px, largura, area.x1 - lado, area.y1 - lado, lado),
  ];
  // Os 4 cantos da mesma cor: é moldura (ou faixa preta em cima e embaixo)
  if (cantos.some((c) => distancia(c, cantos[0]) > TOLERANCIA)) return null;
  const cor = [0, 1, 2].map((c) => Math.round(cantos.reduce((s, k) => s + k[c], 0) / 4));
  // Só cor neutra (cinza, branco, preto, papel claro): moldura dourada ou céu azul ficam
  if (Math.max(...cor) - Math.min(...cor) > 40) return null;

  const diferenca = (x: number, y: number) => {
    const i = ((area.y0 + y) * largura + area.x0 + x) * 3;
    return distancia([px[i], px[i + 1], px[i + 2]], cor);
  };
  /** Como é a linha: 2 = lisa (toda da cor da borda), 1 = quase toda da borda com letras escuras, 0.5 = quase toda da borda (sem certeza), 0 = imagem */
  const tipoDe = (n: number, pixel: (i: number) => [number, number]) => {
    let iguais = 0;
    let longes = 0;
    for (let i = 0; i < n; i++) {
      const [x, y] = pixel(i);
      const d = diferenca(x, y);
      if (d <= TOLERANCIA) iguais++;
      else if (d > 60) longes++;
    }
    const f = iguais / n;
    if (f >= LISA) return 2;
    if (f < COM_LETRAS) return 0;
    // Letras: o que não é borda é bem diferente dela. Céu claro ou parede (tons
    // parecidos com a borda) não contam como letras
    return longes >= (n - iguais) * 0.4 ? 1 : 0.5;
  };
  const linha = (y: number) => tipoDe(w, (x) => [x, y]);
  const coluna = (x: number) => tipoDe(h, (y) => [x, y]);

  /** Quantas linhas cortar de um lado: anda de fora para dentro pelas lisas e pela faixa de legenda; para na imagem */
  const medir = (total: number, tipo: (i: number) => number, deFora: (k: number) => number) => {
    if (tipo(deFora(0)) !== 2) return 0;
    const limite = Math.floor(total * MAXIMO_POR_LADO);
    // A borda lisa de fora (a parte certa)
    let lisa = 0;
    while (lisa <= limite && tipo(deFora(lisa)) === 2) lisa++;
    if (lisa > limite) return 0;
    // Depois dela, a faixa de legenda: linhas com letras e, entre a legenda e a
    // imagem, outra parte lisa. Só conta se teve letras de verdade e se termina
    // numa linha lisa colada na imagem (até 3 linhas de transição)
    let ultimaLisa = lisa - 1;
    let letras = false;
    for (let k = lisa; k <= limite; k++) {
      const t = tipo(deFora(k));
      if (t === 2) ultimaLisa = k;
      else if (t === 1) letras = true;
      else if (t === 0) return letras && ultimaLisa >= lisa && k - ultimaLisa <= 3 ? ultimaLisa + 1 : lisa;
    }
    return lisa;
  };
  // Menos de 1% de borda não vale o corte
  const minimo = (total: number, n: number) => (n / total >= 0.01 ? n : 0);
  const cima = minimo(h, medir(h, linha, (k) => k));
  const baixo = minimo(h, medir(h, linha, (k) => h - 1 - k));
  const esquerda = minimo(w, medir(w, coluna, (k) => k));
  const direita = minimo(w, medir(w, coluna, (k) => w - 1 - k));
  if (!cima && !baixo && !esquerda && !direita) return null;
  return { x0: area.x0 + esquerda, y0: area.y0 + cima, x1: area.x1 - direita, y1: area.y1 - baixo };
}

/** O filtro do ffmpeg que corta (para pôr antes da escala), ou "" sem corte */
export function filtroDoRecorte(r: Recorte | null) {
  if (!r) return "";
  const f = (n: number) => n.toFixed(4);
  // Números pares: o JPEG em 4:2:0 não aceita largura ímpar
  return `crop=trunc(iw*${f(r.w)}/2)*2:trunc(ih*${f(r.h)}/2)*2:trunc(iw*${f(r.x)}):trunc(ih*${f(r.y)}),`;
}

export const descreverRecorte = (r: Recorte) =>
  `bordas cortadas: ${Math.round(r.y * 100)}% em cima, ${Math.round((1 - r.y - r.h) * 100)}% embaixo, ${Math.round(r.x * 100)}% à esquerda, ${Math.round((1 - r.x - r.w) * 100)}% à direita`;

// Uso à mão: corta e grava por cima
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const arquivos = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--corte");
  // --corte e,c,d,b: o quanto cortar de cada lado, em % (esquerda, cima, direita, baixo), olhando a imagem.
  // Para a margem que o corte sozinho não pega (papel velho rasgado, manchado)
  const manual = args.includes("--corte") ? args[args.indexOf("--corte") + 1]?.split(",").map(Number) : undefined;
  if (!arquivos.length || (manual && (manual.length !== 4 || manual.some((n) => !(n >= 0 && n < 50))))) {
    console.error("Uso: npm run recortar-bordas -- public/fotos/<peça>/<nome>.jpg [...]   (ou --corte esquerda,cima,direita,baixo em %, ex.: --corte 10,20,10,25)");
    process.exit(1);
  }
  for (const arquivo of arquivos) {
    const r = manual
      ? { x: manual[0] / 100, y: manual[1] / 100, w: 1 - (manual[0] + manual[2]) / 100, h: 1 - (manual[1] + manual[3]) / 100 }
      : acharBordas(arquivo);
    if (!r) {
      console.log(`• ${arquivo}: sem borda lisa para cortar (se a margem é de papel velho ou rasgado, olhe a imagem e use --corte esquerda,cima,direita,baixo em %)`);
      continue;
    }
    const temporario = arquivo.replace(/\.(jpe?g|png)$/i, ".recorte.$1");
    const ok = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", arquivo, "-vf", filtroDoRecorte(r).replace(/,$/, ""), "-q:v", "3", temporario], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (ok.status !== 0) {
      rmSync(temporario, { force: true });
      console.log(`✗ ${arquivo}: não consegui cortar`);
      process.exitCode = 1;
      continue;
    }
    renameSync(temporario, arquivo);
    console.log(`✓ ${arquivo}: ${descreverRecorte(r)}`);
  }
}
