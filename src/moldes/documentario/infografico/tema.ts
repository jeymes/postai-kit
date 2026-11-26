// Infográfico: as duas caras do modelo (fundo escuro azul-petróleo ou creme
// claro) e a cor de destaque. Só o dado que importa sai na cor de destaque; o
// resto fica em tons neutros do próprio fundo.

import { Easing, interpolate, spring } from "remotion";

export interface Tema {
  escuro: boolean;
  fundo: string;
  /** O brilho do fundo, num canto */
  fundo2: string;
  grade: string;
  texto: string;
  /** Eixos, fonte, rótulo de apoio */
  texto2: string;
  /** Barra, fatia e ícone que não são o destaque */
  neutro: string;
  neutroClaro: string;
  eixo: string;
  /** A faixa da legenda, no pé (escura nos dois: a legenda lê igual) */
  faixa: string;
  cartao: string;
  sombra: string;
  destaque: string;
}

const ESCURO: Omit<Tema, "destaque"> = {
  escuro: true,
  fundo: "#0d1b21",
  fundo2: "#163039",
  grade: "rgba(214,236,242,0.05)",
  texto: "#eef3f4",
  texto2: "#91a6ae",
  neutro: "#46636e",
  neutroClaro: "#2f4851",
  eixo: "rgba(214,236,242,0.18)",
  faixa: "rgba(3,10,13,0.62)",
  cartao: "rgba(255,255,255,0.045)",
  sombra: "0 30px 80px rgba(0,0,0,0.45)",
};

const CLARO: Omit<Tema, "destaque"> = {
  escuro: false,
  fundo: "#f4eee3",
  fundo2: "#fbf8f1",
  grade: "rgba(22,38,45,0.07)",
  texto: "#14242b",
  texto2: "#5b6c73",
  neutro: "#a9b6b8",
  neutroClaro: "#cfd6d4",
  eixo: "rgba(22,38,45,0.22)",
  faixa: "#14242b",
  cartao: "#fffdf8",
  sombra: "0 24px 60px rgba(40,30,10,0.16)",
};

const PADRAO = { escuro: "#f5b841", claro: "#d9531e" };

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
function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const hex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
/** Mistura duas cores (0 = a, 1 = b) */
export function misturar(a: string, b: string, t: number) {
  const [ra, ga, ba] = rgb(a);
  const [rb, gb, bb] = rgb(b);
  return `#${hex(ra + (rb - ra) * t)}${hex(ga + (gb - ga) * t)}${hex(ba + (bb - ba) * t)}`;
}

/**
 * A cor de destaque que lê no fundo: a do dono (estilo.cor) ou a do modelo. Uma
 * cor escura demais no fundo escuro (o vermelho #B3001B de uma marca) clareia
 * até ler (contraste 3, o mínimo para letra grande e gráfico).
 */
function destaqueQueLe(cor: string, fundo: string, escuro: boolean) {
  let c = cor;
  for (let i = 1; i <= 10 && contraste(c, fundo) < 3; i++) c = misturar(cor, escuro ? "#ffffff" : "#000000", i * 0.08);
  return c;
}

export function temaDo(estilo?: { cor?: string; fundo?: "escuro" | "claro" }): Tema {
  const base = estilo?.fundo === "claro" ? CLARO : ESCURO;
  const pedida = estilo?.cor && /^#[0-9a-fA-F]{6}$/.test(estilo.cor) ? estilo.cor : base.escuro ? PADRAO.escuro : PADRAO.claro;
  return { ...base, destaque: destaqueQueLe(pedida, base.fundo, base.escuro) };
}

/** Preto ou branco, o que ler melhor sobre a cor */
export const textoSobre = (cor: string) => (contraste(cor, "#111111") > contraste(cor, "#ffffff") ? "#111111" : "#ffffff");

// ---- O ritmo: molas suaves, nada brusco ----

export const FPS_DO_INFO = 30;
const preso = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 com mola sem quique, começando em `atraso` e durando uns `duracao` quadros */
export const mola = (t: number, atraso = 0, duracao = 30) =>
  spring({ frame: t - atraso, fps: FPS_DO_INFO, config: { damping: 200, mass: 0.8 }, durationInFrames: duracao });

const saidaSuave = Easing.bezier(0.22, 1, 0.36, 1);
/** 0 → 1 que desacelera no fim (contagem dos números, linha se desenhando) */
export const cresce = (t: number, atraso: number, duracao: number) => interpolate(t, [atraso, atraso + duracao], [0, 1], { ...preso, easing: saidaSuave });

/** Quadro "parado no fim" (a cena anterior, que sai deslizando já montada) */
export const NO_FIM = 100000;
