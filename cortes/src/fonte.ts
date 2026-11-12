// Montserrat guardada no próprio projeto (licença SIL OFL 1.1, livre para usar
// e redistribuir). Antes vinha do Google na hora de renderizar, mas na nuvem do
// Claude o navegador do Remotion não passa pelo proxy e as fontes falhavam.
// Assim a renderização não precisa de internet.
//
// É fonte variável: um arquivo serve para todos os pesos (100 a 900).
import { continueRender, delayRender } from "remotion";
import latin from "./fontes/montserrat-latin.woff2";
import latinExt from "./fontes/montserrat-latin-ext.woff2";

export const fontFamily = "Montserrat";

const arquivos = [
  {
    url: latin,
    unicodeRange:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    url: latinExt,
    unicodeRange:
      "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
  },
];

if (typeof document !== "undefined") {
  const espera = delayRender("Carregando a Montserrat");
  Promise.all(
    arquivos.map(async ({ url, unicodeRange }) => {
      const fonte = new FontFace(fontFamily, `url(${url}) format("woff2")`, { weight: "100 900", style: "normal", unicodeRange });
      await fonte.load();
      document.fonts.add(fonte);
    }),
  )
    .then(() => continueRender(espera))
    .catch((erro) => {
      console.error(erro);
      throw erro;
    });
}
