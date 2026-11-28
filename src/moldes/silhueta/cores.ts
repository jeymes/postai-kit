// Silhueta: as cores de cada cena. A paleta dá as 3 camadas (longe, meio,
// perto) e o céu; o clima da cena mexe no céu e escurece ou lava as camadas.
// Sem React: a capa e os testes usam direto.

import type { ClimaDaSilhueta, PaletaDaSilhueta } from "./schema.ts";

type Rgb = [number, number, number];

const paraRgb = (hex: string): Rgb => {
  const h = hex.replace("#", "");
  const cheio = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(cheio, 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [128, 128, 128];
};
const paraHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/** Mistura `a` com `b` (t = 0: só a; t = 1: só b) */
export function misturar(a: string, b: string, t: number): string {
  const x = paraRgb(a);
  const y = paraRgb(b);
  return paraHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** Luminância relativa (0 preto, 1 branco) */
export function luminancia(hex: string): number {
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = paraRgb(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export interface CoresDaCena {
  ceuTopo: string;
  ceuMeio: string;
  ceuBase: string;
  longe: string;
  meio: string;
  perto: string;
  /** O dourado do título, da palavra falada e do diagrama */
  ouro: string;
  /** O dourado da palavra falada na legenda (em cima do chão escuro: mais claro) */
  ouroDaLegenda: string;
  /** A cor do brilho (sol, raio de luz, reflexo na água) */
  luz: string;
  nevoa: string;
  nuvens: string;
  astro: { tipo: "sol" | "lua" | "nenhum"; x: number; y: number; raio: number; cor: string };
  /** 0 a 1 */
  estrelas: number;
  nuvensForca: number;
  nevoaForca: number;
  chuva: boolean;
  relampago: boolean;
  raios: boolean;
  /** A borda dourada na figura (luz por trás) */
  contraluz: boolean;
  /** A letra do título e do diagrama, pelo céu atrás deles */
  tinta: string;
  tintaSuave: string;
  /** O véu atrás das letras do alto (#rrggbb): claro atrás da tinta escura, escuro atrás da letra clara */
  veu: string;
}

type Base = Pick<CoresDaCena, "ceuTopo" | "ceuMeio" | "ceuBase" | "ouro" | "luz" | "nevoa" | "nuvens"> & {
  /** A cor das silhuetas (quase preta, com o tom da paleta) */
  silhueta: string;
  astro: CoresDaCena["astro"];
  estrelas: number;
};

// 2ª rodada (28/11/2026): contraste e drama. O céu tem cor forte e degradê
// marcado; as silhuetas são quase pretas e nítidas; a névoa só no clima que pede.
function basePaleta(paleta: PaletaDaSilhueta, destaqueDaMarca: string): Base {
  switch (paleta) {
    case "noite-azul":
      return {
        ceuTopo: "#040817",
        ceuMeio: "#12285A",
        ceuBase: "#4A6FB0",
        silhueta: "#070B1A",
        ouro: "#F0C46A",
        luz: "#FFE4A6",
        nevoa: "#6A7BA6",
        nuvens: "#1C2C55",
        astro: { tipo: "lua", x: 830, y: 760, raio: 46, cor: "#F7EED6" },
        estrelas: 1,
      };
    case "verde-dourado":
      return {
        ceuTopo: "#1E3324",
        ceuMeio: "#A88A2C",
        ceuBase: "#F6D877",
        silhueta: "#0C170E",
        ouro: "#F2C24E",
        luz: "#FFF0B0",
        nevoa: "#E9DFAF",
        nuvens: "#3E4F2E",
        astro: { tipo: "sol", x: 700, y: 1010, raio: 80, cor: "#FFF2C2" },
        estrelas: 0,
      };
    case "marca": {
      const d = destaqueDaMarca;
      return {
        ceuTopo: misturar(d, "#06060A", 0.88),
        ceuMeio: misturar(d, "#1A1018", 0.35),
        ceuBase: misturar(d, "#FFE7B8", 0.45),
        silhueta: misturar(d, "#050507", 0.9),
        ouro: luminancia(d) < 0.12 ? misturar(d, "#FFFFFF", 0.45) : misturar(d, "#FFE6A3", 0.2),
        luz: misturar(d, "#FFF6E4", 0.65),
        nevoa: misturar(d, "#D9D2C6", 0.6),
        nuvens: misturar(d, "#141018", 0.75),
        astro: { tipo: "sol", x: 700, y: 1000, raio: 84, cor: misturar(d, "#FFF6E4", 0.7) },
        estrelas: 0.2,
      };
    }
    default:
      // sepia: céu de âmbar queimado (escuro no alto, dourado no horizonte), silhuetas de tinta marrom quase preta
      return {
        ceuTopo: "#2B1A10",
        ceuMeio: "#9A5A26",
        ceuBase: "#F2B865",
        silhueta: "#140B06",
        ouro: "#F0B95A",
        luz: "#FFE3A8",
        nevoa: "#E6C79A",
        nuvens: "#3A2414",
        astro: { tipo: "sol", x: 700, y: 1010, raio: 82, cor: "#FFEBC0" },
        estrelas: 0,
      };
  }
}

/** As cores de uma cena: a paleta com o clima por cima */
export function coresDaCena(paleta: PaletaDaSilhueta, clima: ClimaDaSilhueta | undefined, destaqueDaMarca = "#C8953B"): CoresDaCena {
  const b = basePaleta(paleta, destaqueDaMarca);
  // O clima troca o céu (com um pouco do tom da paleta, para o vídeo ter unidade)
  const ceu = (topo: string, meio: string, base: string, tom = 0.18) => {
    c.ceuTopo = misturar(topo, b.ceuTopo, tom);
    c.ceuMeio = misturar(meio, b.ceuMeio, tom);
    c.ceuBase = misturar(base, b.ceuBase, tom);
  };
  const c: CoresDaCena = {
    ceuTopo: b.ceuTopo,
    ceuMeio: b.ceuMeio,
    ceuBase: b.ceuBase,
    longe: "",
    meio: "",
    perto: "",
    ouro: b.ouro,
    ouroDaLegenda: misturar(b.ouro, "#FFE6A3", 0.15),
    luz: b.luz,
    nevoa: b.nevoa,
    nuvens: b.nuvens,
    astro: b.astro,
    estrelas: b.estrelas,
    nuvensForca: 0.5,
    nevoaForca: 0,
    chuva: false,
    relampago: false,
    raios: false,
    contraluz: true,
    tinta: "",
    tintaSuave: "",
    veu: "",
  };
  let silhueta = b.silhueta;
  switch (clima) {
    case "amanhecer":
      ceu("#1D2550", "#B8576A", "#FFC27A");
      c.astro = { tipo: "sol", x: 380, y: 1040, raio: 78, cor: "#FFE9B8" };
      c.estrelas = 0.25;
      c.nuvens = "#5A3150";
      silhueta = misturar(silhueta, "#0C0A1C", 0.5);
      break;
    case "entardecer":
      ceu("#1E0B22", "#B23A26", "#FF9B33");
      c.astro = { tipo: "sol", x: 700, y: 1010, raio: 96, cor: "#FFD27A" };
      c.estrelas = 0;
      c.nuvens = "#4A1420";
      silhueta = misturar(silhueta, "#120404", 0.5);
      break;
    case "noite":
      ceu("#02040C", "#0B1736", "#2A4478", 0.1);
      c.astro = { tipo: "lua", x: 830, y: 760, raio: 46, cor: "#F7EED6" };
      c.estrelas = 1;
      c.nuvens = "#101C3A";
      c.nuvensForca = 0.35;
      c.nevoa = "#2C3D66";
      c.contraluz = false;
      silhueta = misturar(silhueta, "#02040A", 0.6);
      break;
    case "tempestade":
      ceu("#08090C", "#262B33", "#5C636D", 0.08);
      c.astro = { ...c.astro, tipo: "nenhum" };
      c.estrelas = 0;
      c.nuvens = "#14171C";
      c.nuvensForca = 1;
      c.nevoa = "#3A4048";
      c.chuva = true;
      c.relampago = true;
      c.contraluz = false;
      silhueta = misturar(silhueta, "#030405", 0.6);
      break;
    case "nevoa":
      ceu(misturar(b.ceuTopo, b.nevoa, 0.35), misturar(b.ceuMeio, b.nevoa, 0.55), misturar(b.ceuBase, b.nevoa, 0.55), 0);
      c.nevoaForca = 1;
      c.nuvensForca = 0.2;
      c.contraluz = false;
      break;
    case "luz":
      ceu("#3A2408", "#E2A23A", "#FFF4CF", 0.12);
      c.astro = { tipo: "sol", x: 540, y: 760, raio: 60, cor: "#FFFCEC" };
      c.raios = true;
      c.nuvensForca = 0.3;
      c.nuvens = "#5A3A14";
      break;
    default:
      break;
  }
  // As 3 camadas: perto quase preta, meio a silhueta, longe com o ar do horizonte (profundidade)
  c.perto = misturar(silhueta, "#000000", 0.45);
  c.meio = silhueta;
  c.longe = misturar(silhueta, c.ceuBase, c.nevoaForca > 0 ? 0.5 : 0.3);
  if (c.nevoaForca > 0) c.meio = misturar(silhueta, c.nevoa, 0.18);
  // O chão perto sempre escuro: a legenda clara fica em cima dele
  if (luminancia(c.perto) > 0.035) c.perto = misturar(c.perto, "#000000", 0.45);
  // A letra do alto pelo céu atrás dela (claro: tinta escura; escuro: letra clara)
  const fundoDoTexto = misturar(c.ceuTopo, c.ceuMeio, 0.5);
  const claro = luminancia(fundoDoTexto) > 0.3;
  c.tinta = claro ? misturar(c.perto, "#1A140E", 0.4) : "#F8F0DF";
  c.tintaSuave = claro ? misturar(c.tinta, fundoDoTexto, 0.35) : misturar("#F8F0DF", fundoDoTexto, 0.3);
  c.veu = claro ? "#FAF4E6" : "#0E0A08";
  // No céu claro, o dourado escurece um pouco para ler bem
  if (claro && luminancia(c.ouro) > 0.3) c.ouro = misturar(c.ouro, "#6B4A12", 0.3);
  return c;
}
