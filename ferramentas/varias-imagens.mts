// Várias imagens de uma vez (22/11/2026): a prévia e o carrossel chamavam o
// `npx remotion still` uma vez por cena, e cada chamada empacotava o projeto e
// abria o navegador de novo (uns 5 s por cena; 80 cenas, uns 7 minutos). Aqui o
// projeto é empacotado uma vez e o mesmo navegador tira todas as imagens.
import { cpus, totalmem } from "node:os";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition, type ChromiumOptions } from "@remotion/renderer";

export type Imagem = { dados: Record<string, unknown>; quadro: number; destino: string };

export async function tirarImagens(composicao: string, imagens: Imagem[], gl?: string) {
  if (!imagens.length) return;
  const serveUrl = await bundle({ entryPoint: "src/index.ts" });
  const chromiumOptions: ChromiumOptions = gl ? { gl: gl as ChromiumOptions["gl"] } : {};
  const browserExecutable = process.env.KIT_NAVEGADOR || null;
  const navegador = await openBrowser("chrome", { browserExecutable, chromiumOptions });
  // A composição (duração, tamanho) muda com os dados: calcula uma vez por dados
  const composicoes = new Map<Record<string, unknown>, ReturnType<typeof selectComposition>>();
  const comporPara = (dados: Record<string, unknown>) => {
    if (!composicoes.has(dados))
      composicoes.set(dados, selectComposition({ serveUrl, id: composicao, inputProps: dados, puppeteerInstance: navegador, chromiumOptions, browserExecutable, logLevel: "error" }));
    return composicoes.get(dados)!;
  };
  // Algumas abas ao mesmo tempo (cada uma gasta uns 450 MB)
  const abas = Math.max(1, Math.min(4, cpus().length, Math.floor((totalmem() / 2 ** 30 - 1.5) / 0.45)));
  const fila = [...imagens];
  const trabalhar = async () => {
    for (let item = fila.shift(); item; item = fila.shift()) {
      const { dados, quadro, destino } = item;
      await renderStill({
        serveUrl,
        composition: await comporPara(dados),
        inputProps: dados,
        frame: quadro,
        output: destino,
        imageFormat: "jpeg",
        jpegQuality: 90,
        overwrite: true,
        puppeteerInstance: navegador,
        chromiumOptions,
        browserExecutable,
        logLevel: "error",
      });
    }
  };
  try {
    await Promise.all(Array.from({ length: abas }, trabalhar));
  } finally {
    await navegador.close({ silent: true });
  }
}
