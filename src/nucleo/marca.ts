import { loadFont as bricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as dmSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as montserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as nunito } from "@remotion/google-fonts/Nunito";
import { loadFont as playfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as poppins } from "@remotion/google-fonts/Poppins";
import { staticFile } from "remotion";
import dados from "../../marca/marca.json";

// A marca do cliente vem de marca/marca.json (a skill configurar-marca
// preenche a partir do site). Todos os moldes leem daqui: cores, fontes,
// logo e a chamada do fim.

// Fontes que o kit sabe carregar (Google Fonts, só o alfabeto latino).
const latino = { subsets: ["latin" as const] };
export const FONTES = {
  "Bricolage Grotesque": () => bricolage("normal", latino),
  "DM Serif Display": () => dmSerif("normal", latino),
  Inter: () => inter("normal", latino),
  Montserrat: () => montserrat("normal", latino),
  Nunito: () => nunito("normal", latino),
  "Playfair Display": () => playfair("normal", latino),
  Poppins: () => poppins("normal", latino),
};

export type NomeDaFonte = keyof typeof FONTES;

function carregar(nome: string) {
  return (FONTES[nome as NomeDaFonte] ?? FONTES.Inter)().fontFamily;
}

export const marca = {
  ...dados,
  fontes: {
    titulo: carregar(dados.fontes.titulo),
    texto: carregar(dados.fontes.texto),
  },
  logo: dados.logo ? staticFile(dados.logo) : null,
};

export const cores = marca.cores;
export const fontes = marca.fontes;
