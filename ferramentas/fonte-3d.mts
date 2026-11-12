// Prepara a fonte de título da marca para os textos em 3D: baixa o .ttf do
// Google Fonts (licença OFL) e converte para o formato do three.js, em
// public/marca/fonte-3d.json. O renderizar chama sozinho quando um molde 3D
// precisa e a fonte da marca mudou.
//
// A conversão é copiada e adaptada do TTFLoader do three.js (MIT), que busca o
// opentype.js pela internet na hora: aqui ele vem do npm e roda uma vez só.
//
// Uso: npm run fonte-3d
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import opentype from "opentype.js";

export const ARQUIVO_DA_FONTE_3D = "public/marca/fonte-3d.json";

// Só o que um título usa: letras latinas com acento, números e pontuação
const CARACTERES = new Set([
  ...Array.from({ length: 95 }, (_, i) => String.fromCodePoint(32 + i)),
  ..."ÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜàáâãäçèéêëìíîïñòóôõöùúûü–—‘’“”…€ºª°",
]);

async function baixarTtf(familia: string) {
  // Sem cara de navegador, o Google Fonts responde com .ttf (e não .woff2)
  for (const peso of [800, 700, 400]) {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(familia)}:wght@${peso}`);
    if (!css.ok) continue;
    const url = (await css.text()).match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    if (!url) continue;
    const ttf = await fetch(url);
    if (ttf.ok) return { dados: await ttf.arrayBuffer(), peso };
  }
  throw new Error(`Não achei a fonte "${familia}" no Google Fonts.`);
}

function converter(fonte: opentype.Font) {
  const escala = 100000 / ((fonte.unitsPerEm || 2048) * 72);
  const r = Math.round;
  const glyphs: Record<string, { ha: number; x_min: number; x_max: number; o: string }> = {};
  for (const caractere of CARACTERES) {
    const glifo = fonte.charToGlyph(caractere);
    if (!glifo || glifo.index === 0) continue;
    let o = "";
    for (const c of glifo.path.commands) {
      const tipo = c.type === "C" ? "b" : c.type.toLowerCase();
      o += `${tipo} `;
      if ("x" in c) o += `${r(c.x * escala)} ${r(c.y * escala)} `;
      if ("x1" in c) o += `${r(c.x1 * escala)} ${r(c.y1 * escala)} `;
      if ("x2" in c) o += `${r(c.x2 * escala)} ${r(c.y2 * escala)} `;
    }
    glyphs[caractere] = {
      ha: r((glifo.advanceWidth ?? 0) * escala),
      x_min: r((glifo.xMin ?? 0) * escala),
      x_max: r((glifo.xMax ?? 0) * escala),
      o,
    };
  }
  const head = fonte.tables.head as unknown as { xMin: number; xMax: number; yMin: number; yMax: number };
  const post = fonte.tables.post as unknown as { underlinePosition: number; underlineThickness: number };
  return {
    glyphs,
    familyName: fonte.getEnglishName("fullName"),
    ascender: r(fonte.ascender * escala),
    descender: r(fonte.descender * escala),
    underlinePosition: post.underlinePosition,
    underlineThickness: post.underlineThickness,
    boundingBox: { xMin: head.xMin, xMax: head.xMax, yMin: head.yMin, yMax: head.yMax },
    resolution: 1000,
  };
}

export async function prepararFonte3d() {
  const marca = JSON.parse(readFileSync("marca/marca.json", "utf8"));
  const familia: string = marca.fontes.titulo;
  const { dados, peso } = await baixarTtf(familia);
  const convertida = converter(opentype.parse(dados));
  mkdirSync("public/marca", { recursive: true });
  // "origem" diz de qual fonte veio: o renderizar refaz se a marca trocar de fonte
  writeFileSync(ARQUIVO_DA_FONTE_3D, JSON.stringify({ ...convertida, origem: familia }));
  console.log(`Fonte 3D pronta: ${familia} (peso ${peso}), em ${ARQUIVO_DA_FONTE_3D}`);
}

/** Precisa (re)fazer? Quando não existe ou a marca trocou de fonte */
export function fonte3dDesatualizada() {
  try {
    const marca = JSON.parse(readFileSync("marca/marca.json", "utf8"));
    return JSON.parse(readFileSync(ARQUIVO_DA_FONTE_3D, "utf8")).origem !== marca.fontes.titulo;
  } catch {
    return true;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await prepararFonte3d();
