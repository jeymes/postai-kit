// Ilustração da fala: as cores e o traço de cada estilo do canal, para a
// ilustração parecer parte do desenho e não um adesivo de outro vídeo.
//   chapado (e quadrinhos): cartão branco com o contorno grosso do kit e sombra dura;
//   liso (e massinha): cartão sem contorno, sombra macia;
//   palito: papel com o contorno desenhado à mão (o traço se desenha na entrada) e letra de mão;
//   giz: lousa, traço de giz tremido e letra de mão;
//   neon: vidro escuro com o traço que brilha;
//   3d (Mundo 3D, bonecos 3D): cartão com volume, luz de cima e sombra funda.
// Cada um em claro e noite. A cor de destaque é a da marca (ou a pedida), clareada
// se não lê no fundo do cartão.

import { loadFont as carregarKalam } from "@remotion/google-fonts/Kalam";
import { FONTES, cores, fontes } from "../../nucleo/marca";
import { misturar, textoSobre } from "../../moldes/documentario/infografico/tema";

const { fontFamily: KALAM } = carregarKalam("normal", { subsets: ["latin"], weights: ["400", "700"] });
const INTER = FONTES.Inter().fontFamily;

export type Familia = "chapado" | "liso" | "palito" | "giz" | "neon" | "3d";

/** O estilo do canal (o `estilo.modelo` do roteiro) vira uma das famílias de desenho */
export function familiaDo(modelo?: string): Familia {
  switch (modelo) {
    case "palito":
      return "palito";
    case "giz":
      return "giz";
    case "neon":
      return "neon";
    case "liso":
    case "massinha":
      return "liso";
    case "3d":
    case "mundo3d":
    case "bonecos3d":
    case "pecas":
      return "3d";
    default:
      return "chapado";
  }
}

export interface TemaDaIlustracao {
  familia: Familia;
  escuro: boolean;
  /** O cartão: fundo, contorno (cor e largura), canto e sombra */
  cartao: string;
  contorno: string;
  larguraDoContorno: number;
  canto: number;
  sombra: string;
  /** O contorno é desenhado à mão (palito, giz): um SVG tremido que se desenha na entrada */
  desenhado: boolean;
  /** Filtro do traço (giz tremido, neon brilhando), em SVG; o id vem do <FiltrosDaIlustracao> */
  filtro?: string;
  texto: string;
  texto2: string;
  destaque: string;
  /** Texto em cima da cor de destaque */
  sobreDestaque: string;
  /** Barra e fatia que não são o destaque, e a grade/eixo dos gráficos */
  neutro: string;
  neutroClaro: string;
  eixo: string;
  /** Brilho das letras (neon) */
  brilho?: string;
  fonteTitulo: string;
  fonteTexto: string;
  fonteNumero: string;
  peso: number;
}

const TRACO = "#2B2340";

function rgb(cor: string) {
  return [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16));
}
function luminancia(cor: string) {
  const [r, g, b] = rgb(cor).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** Clareia (no escuro) ou escurece (no claro) a cor até ler no fundo (contraste 3) */
function queLe(cor: string, fundo: string, escuro: boolean) {
  let c = cor;
  for (let i = 1; i <= 10 && contraste(c, fundo) < 3; i++) c = misturar(cor, escuro ? "#ffffff" : "#000000", i * 0.08);
  return c;
}
const ehHex = (c?: string): c is string => Boolean(c && /^#[0-9a-fA-F]{6}$/.test(c));

/**
 * O tema da ilustração para o estilo do canal. `modelo`: o estilo.modelo do
 * roteiro (chapado, palito, liso, giz, neon, quadrinhos, massinha, 3d);
 * `fundo`: claro ou noite; `destaque`: a cor de destaque (padrão: a da marca).
 */
export function temaDaIlustracao(opcoes: { modelo?: string; fundo?: "claro" | "noite"; destaque?: string } = {}): TemaDaIlustracao {
  const familia = familiaDo(opcoes.modelo);
  const noite = opcoes.fundo === "noite";
  const pedida = ehHex(opcoes.destaque) ? opcoes.destaque : ehHex(cores.destaque) ? cores.destaque : "#E8572A";
  const base = { familia, fonteTitulo: fontes.titulo, fonteTexto: fontes.titulo, fonteNumero: INTER, peso: 800, desenhado: false } as const;
  let t: Omit<TemaDaIlustracao, "destaque" | "sobreDestaque" | "neutro" | "neutroClaro" | "eixo">;
  let destaque = pedida;
  switch (familia) {
    case "palito":
      t = noite
        ? { ...base, escuro: true, cartao: "#131A3A", contorno: "#9AA8E8", larguraDoContorno: 5, canto: 26, sombra: "none", desenhado: true, texto: "#F4F6FF", texto2: "#AEB8E6", fonteTitulo: KALAM, fonteTexto: KALAM, peso: 700 }
        : { ...base, escuro: false, cartao: "#FFFDF7", contorno: TRACO, larguraDoContorno: 5, canto: 26, sombra: "none", desenhado: true, texto: TRACO, texto2: "#6A6380", fonteTitulo: KALAM, fonteTexto: KALAM, peso: 700 };
      if (noite) destaque = "#F5C94A";
      break;
    case "giz":
      t = {
        ...base,
        escuro: true,
        cartao: noite ? "rgba(18,21,23,0.78)" : "rgba(32,52,43,0.82)",
        contorno: "rgba(244,241,232,0.9)",
        larguraDoContorno: 5,
        canto: 24,
        sombra: "none",
        desenhado: true,
        filtro: "url(#ilustra-giz)",
        texto: "#F4F1E8",
        texto2: "rgba(244,241,232,0.72)",
        fonteTitulo: KALAM,
        fonteTexto: KALAM,
        fonteNumero: KALAM,
        peso: 700,
      };
      // Giz colorido: o destaque vira um giz claro (amarelo, se a marca for escura)
      destaque = misturar(pedida, "#ffffff", 0.35);
      break;
    case "neon":
      t = {
        ...base,
        escuro: true,
        cartao: noite ? "rgba(8,5,18,0.82)" : "rgba(24,14,60,0.8)",
        contorno: "#22E1FF",
        larguraDoContorno: 4,
        canto: 28,
        sombra: "0 0 18px rgba(34,225,255,0.55), inset 0 0 14px rgba(34,225,255,0.25)",
        texto: "#FFFFFF",
        texto2: "#A9F3FF",
        brilho: "0 0 10px rgba(34,225,255,0.85), 0 0 24px rgba(34,225,255,0.45)",
      };
      destaque = "#FF5CC8";
      break;
    case "liso":
      t = noite
        ? { ...base, escuro: true, cartao: "#1E2547", contorno: "transparent", larguraDoContorno: 0, canto: 36, sombra: "0 18px 44px rgba(0,0,0,0.38)", texto: "#F4F6FF", texto2: "#AEB8E6" }
        : { ...base, escuro: false, cartao: "#FFFFFF", contorno: "transparent", larguraDoContorno: 0, canto: 36, sombra: "0 18px 44px rgba(30,26,45,0.18)", texto: "#1E1A2D", texto2: "#6A6380" };
      if (noite) destaque = "#F5C94A";
      break;
    case "3d":
      t = noite
        ? {
            ...base,
            escuro: true,
            cartao: "linear-gradient(180deg, #33407A 0%, #1C2350 100%)",
            contorno: "rgba(255,255,255,0.14)",
            larguraDoContorno: 2,
            canto: 34,
            sombra: "inset 0 3px 0 rgba(255,255,255,0.22), inset 0 -8px 0 rgba(0,0,0,0.28), 0 28px 50px rgba(0,0,0,0.5)",
            texto: "#F4F6FF",
            texto2: "#B9C3F0",
          }
        : {
            ...base,
            escuro: false,
            cartao: "linear-gradient(180deg, #FFFFFF 0%, #ECEFF7 100%)",
            contorno: "rgba(255,255,255,0.9)",
            larguraDoContorno: 2,
            canto: 34,
            sombra: "inset 0 3px 0 #FFFFFF, inset 0 -8px 0 rgba(40,50,90,0.12), 0 26px 46px rgba(20,24,60,0.3)",
            texto: "#1E2240",
            texto2: "#5E6688",
          };
      if (noite) destaque = "#F5C94A";
      break;
    default:
      // Chapado (e quadrinhos): o contorno grosso do kit
      t = noite
        ? { ...base, escuro: true, cartao: "#1B2350", contorno: "#3A4890", larguraDoContorno: 6, canto: 30, sombra: "0 10px 0 rgba(0,0,0,0.35)", texto: "#F4F6FF", texto2: "#AEB8E6" }
        : {
            ...base,
            escuro: false,
            cartao: "#FFFFFF",
            contorno: opcoes.modelo === "quadrinhos" ? "#111111" : TRACO,
            larguraDoContorno: opcoes.modelo === "quadrinhos" ? 8 : 6,
            canto: 30,
            sombra: `0 10px 0 ${opcoes.modelo === "quadrinhos" ? "#111111" : "rgba(43,35,64,0.2)"}`,
            texto: TRACO,
            texto2: "#6A6380",
          };
      if (noite) destaque = "#F5C94A";
  }
  // O fundo do cartão para medir o contraste (o gradiente e o rgba: o tom do meio)
  const fundoDoCartao = t.cartao.startsWith("#")
    ? t.cartao
    : familia === "giz"
      ? noite
        ? "#1D2124"
        : "#2F4A3E"
      : familia === "neon"
        ? "#140B30"
        : t.escuro
          ? "#262F66"
          : "#F4F5FA";
  destaque = queLe(destaque, fundoDoCartao, t.escuro);
  const textoHex = t.texto.startsWith("#") ? t.texto : "#F4F1E8";
  return {
    ...t,
    destaque,
    sobreDestaque: textoSobre(destaque),
    neutro: misturar(textoHex, fundoDoCartao, 0.55),
    neutroClaro: misturar(textoHex, fundoDoCartao, 0.82),
    eixo: misturar(textoHex, fundoDoCartao, 0.7),
  };
}
