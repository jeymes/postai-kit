// Conferência da tela (23/11/2026): tira uma imagem no meio de cada cena, com
// cada texto dizendo onde ficou (src/componentes/conferir.ts), e avisa:
// - vídeo em pé: texto embaixo dos botões do app (a faixa de baixo do TikTok,
//   do Reels e do Shorts, a coluna de botões da direita e a faixa de cima);
// - qualquer vídeo: letra difícil de ler (pouco contraste com a imagem em
//   volta, sem caixa nem contorno).
// Ideia do `check` do HyperFrames (contraste e área segura), feita do nosso jeito.
//
// Uso: npm run conferir-tela -- conteudo/<arquivo>.json
import { readFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition, type ChromiumOptions } from "@remotion/renderer";
import { PNG } from "pngjs";
import { FPS, cenasDoMolde, iniciosDasCenas } from "../src/moldes/tempos.ts";

type Texto = { nome: string; x: number; y: number; w: number; h: number; cor: string; caixa: boolean; contorno: boolean; sombra: boolean; texto: string };

const caminho = process.argv.slice(2).find((a) => a.endsWith(".json"));
if (!caminho) {
  console.error("Uso: npm run conferir-tela -- conteudo/<arquivo>.json");
  process.exit(1);
}
const peca = JSON.parse(readFileSync(caminho, "utf8"));
const { molde, capa: _capa, post: _post, ...props } = peca;
void [_capa, _post];

// Carrossel (24/11/2026): cada slide é uma imagem; confere todos (o "quadro" é o número do slide)
const carrossel = molde === "Carrossel";
// Um quadro no meio de cada trecho do vídeo (no máximo 30, espalhados)
let quadros: number[];
if (carrossel) quadros = (props.slides as unknown[]).map((_, i) => i);
else {
  const duracoes = cenasDoMolde(molde, props);
  const inicios = iniciosDasCenas(molde, props);
  quadros = duracoes.map((d, i) => inicios[i] + Math.floor(d / 2));
}
if (quadros.length > 30) quadros = Array.from({ length: 30 }, (_, i) => quadros[Math.floor((i * quadros.length) / 30)]);
const tempo = (q: number) => {
  if (carrossel) return `slide ${q + 1}`;
  const s = Math.round(q / FPS);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Contraste do WCAG entre duas cores (1 a 21)
const luz = ([r, g, b]: number[]) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contraste = (a: number[], b: number[]) => {
  const [l1, l2] = [luz(a), luz(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const corDe = (css: string) => (/rgba?\(([^)]+)\)/.exec(css)?.[1].split(",").map((v) => Number(v.trim())) ?? [255, 255, 255]).slice(0, 3);

/** A cor do fundo em volta do texto: a mediana de um anel de 14 px por fora da caixa do texto. */
function fundoEmVolta(png: PNG, t: Texto) {
  const pontos: number[][] = [];
  const x0 = Math.max(0, Math.floor(t.x - 14)), x1 = Math.min(png.width - 1, Math.ceil(t.x + t.w + 14));
  const y0 = Math.max(0, Math.floor(t.y - 14)), y1 = Math.min(png.height - 1, Math.ceil(t.y + t.h + 14));
  for (let y = y0; y <= y1; y += 2)
    for (let x = x0; x <= x1; x += 2) {
      const dentro = x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h;
      if (dentro) continue;
      const i = (png.width * y + x) * 4;
      pontos.push([png.data[i], png.data[i + 1], png.data[i + 2]]);
    }
  if (!pontos.length) return null;
  pontos.sort((a, b) => luz(a) - luz(b));
  return pontos[Math.floor(pontos.length / 2)];
}

// As medidas passam pelo console do navegador: não precisam aparecer no terminal
const escrever = process.stdout.write.bind(process.stdout);
process.stdout.write = ((pedaco: string | Uint8Array, ...resto: unknown[]) =>
  String(pedaco).includes("POSTAI_TEXTO") ? true : (escrever as (...a: unknown[]) => boolean)(pedaco, ...resto)) as typeof process.stdout.write;

const avisos: string[] = [];
const serveUrl = await bundle({ entryPoint: "src/index.ts" });
const chromiumOptions: ChromiumOptions = {};
const browserExecutable = process.env.KIT_NAVEGADOR || null;
const navegador = await openBrowser("chrome", { browserExecutable, chromiumOptions });
const dados = { ...props, __conferir: true };
try {
  const composicao = await selectComposition({ serveUrl, id: molde, inputProps: dados, puppeteerInstance: navegador, chromiumOptions, browserExecutable, logLevel: "error" });
  // O carrossel (4:5) não tem os botões do app por cima: a regra de vídeo em pé não vale
  const emPe = !carrossel && composicao.height > composicao.width;
  const escala = carrossel ? composicao.width / 1080 : composicao.height / (emPe ? 1920 : 1080);
  for (const quadro of quadros) {
    const textos: Texto[] = [];
    const { buffer } = await renderStill({
      serveUrl,
      composition: carrossel ? { ...composicao, props: { ...composicao.props, indice: quadro } } : composicao,
      inputProps: carrossel ? { ...dados, indice: quadro } : dados,
      frame: carrossel ? 0 : Math.min(quadro, composicao.durationInFrames - 1),
      imageFormat: "png",
      puppeteerInstance: navegador,
      chromiumOptions,
      browserExecutable,
      logLevel: "error",
      onBrowserLog: (log) => {
        const linha = log.text;
        if (linha.startsWith("POSTAI_TEXTO ")) textos.push(JSON.parse(linha.slice(13)));
      },
    });
    if (!buffer) continue;
    const png = PNG.sync.read(buffer as Buffer);
    for (const t of textos) {
      const onde = `${tempo(quadro)} (${t.nome}: "${t.texto}")`;
      const baixo = (t.y + t.h) / escala;
      if (emPe) {
        // A descrição e os botões do app cobrem o fim da tela (TikTok: uns 380 px de 1920)
        if (baixo > 1540) avisos.push(`${onde}: o texto desce até ${Math.round(baixo)} px de 1920 e fica embaixo da descrição do app (deixe acima de 1540).`);
        // A coluna de botões da direita (curtir, comentar, compartilhar)
        if ((t.x + t.w) / escala > 1010 && baixo > 700 && t.y / escala < 1480) avisos.push(`${onde}: o texto vai até a borda direita, onde ficam os botões de curtir e comentar.`);
        if (t.y / escala < 110 && t.nome !== "titulo") avisos.push(`${onde}: o texto encosta no alto, onde fica a busca e o relógio do celular.`);
      }
      if (carrossel) {
        // O texto não pode passar do slide nem cobrir o pé (o @ e o número, a partir de ~1250 de 1350)
        const altura = composicao.height / escala;
        if (baixo > altura - 105) avisos.push(`${onde}: o texto desce até ${Math.round(baixo)} px de ${Math.round(altura)} e cobre o pé do slide (o @ e o número). Encurte o texto ou divida em dois slides.`);
        if (t.x / escala < 40 || (t.x + t.w) / escala > 1040) avisos.push(`${onde}: o texto passa da borda do slide. Encurte as palavras ou o texto.`);
        if (t.y / escala < 40) avisos.push(`${onde}: o texto passa do alto do slide. Encurte o texto ou divida em dois slides.`);
      }
      // Contraste: só quando a letra está solta em cima da imagem
      if (!t.caixa && !t.contorno) {
        const fundo = fundoEmVolta(png, t);
        if (fundo) {
          const c = contraste(corDe(t.cor), fundo);
          const minimo = t.sombra ? 2 : 3;
          if (c < minimo) avisos.push(`${onde}: letra difícil de ler (contraste ${c.toFixed(1)}:1 com a imagem em volta; o bom é ${minimo}:1 ou mais). Troque a imagem, use legendaNoAlto ou uma caixa.`);
        }
      }
    }
  }
} finally {
  await navegador.close({ silent: true });
}

const unicos = [...new Set(avisos)];
if (!unicos.length) console.log(carrossel ? `Slides conferidos (${quadros.length}): nenhum texto passando do slide nem difícil de ler.` : `Tela conferida (${quadros.length} quadros): nenhum texto embaixo dos botões do app nem difícil de ler.`);
else {
  for (const a of unicos) console.log(`AVISO  ${a}`);
  console.log(`\n${unicos.length} aviso(s) em ${quadros.length} quadros. Texto do roteiro: roteirista; imagem atrás da legenda: pesquisadora ou diretora-de-arte; posição fixa do molde: npm run limite -- texto-na-tela "...".`);
}
