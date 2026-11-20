import type { Visual } from "../../componentes/personagens/Boneco";

// Os lugares do Mundo 3D e o que cada um muda: o chão, o céu, as plantas, as
// casas e a roupa dos bonecos. A equipe escolhe só o lugar (cenario.ambiente) e
// tudo combina: o boneco "segue o ambiente".

export const AMBIENTES = ["campo", "deserto", "cidade", "aldeia", "moderno", "reino", "mar", "salao"] as const;
export type Ambiente = (typeof AMBIENTES)[number];

export const FIGURINOS = ["tunica-curta", "tunica-longa", "manto", "armadura", "moderno"] as const;
export type Figurino = (typeof FIGURINOS)[number];

export const ACESSORIOS = ["nenhum", "veu", "turbante", "coroa", "capacete", "chapeu"] as const;
export type Acessorio = (typeof ACESSORIOS)[number];

export type Paleta = {
  chao: string;
  margem: string;
  ceu: string;
  nevoa: string;
  luzDoChao: string;
  luzDoSol: string;
  /** Grama 3D na frente (o matiz da cor) ou nada */
  grama: number | null;
  montanhas: { matiz: number; saturacao: number; luz: number; baixas: boolean };
  plantas: "arvores" | "palmeiras" | "redondas";
  casas: "barro" | "palha" | "coloridas" | null;
  muralha: boolean;
  pedras: boolean;
  rio: boolean;
  tendas: boolean;
  /** O castelo do reino, no fundo */
  castelo?: boolean;
  /** O mar no fundo (a areia na frente) com barcos */
  mar?: boolean;
  /** Lugar fechado: o salão do trono (sem céu, montanhas nem plantas) */
  interior?: boolean;
};

export const PALETAS: Record<Ambiente, Paleta> = {
  campo: {
    chao: "#79C24B",
    margem: "#9C8A55",
    ceu: "#9ED2F6",
    nevoa: "#C3E4F8",
    luzDoChao: "#557F33",
    luzDoSol: "#FFFFFF",
    grama: 0.26,
    montanhas: { matiz: 0.3, saturacao: 0.38, luz: 0.38, baixas: false },
    plantas: "arvores",
    casas: null,
    muralha: false,
    pedras: false,
    rio: true,
    tendas: true,
  },
  deserto: {
    chao: "#E6C886",
    margem: "#C9A35E",
    ceu: "#A6D2F2",
    nevoa: "#F3E2BE",
    luzDoChao: "#B8955A",
    luzDoSol: "#FFF0D2",
    grama: null,
    montanhas: { matiz: 0.095, saturacao: 0.5, luz: 0.64, baixas: true },
    plantas: "palmeiras",
    casas: null,
    muralha: false,
    pedras: true,
    rio: false,
    tendas: true,
  },
  cidade: {
    chao: "#D8C196",
    margem: "#B8995F",
    ceu: "#A9D5F4",
    nevoa: "#EFE0C2",
    luzDoChao: "#A88B5A",
    luzDoSol: "#FFF4DE",
    grama: null,
    montanhas: { matiz: 0.1, saturacao: 0.35, luz: 0.58, baixas: true },
    plantas: "palmeiras",
    casas: "barro",
    muralha: true,
    pedras: false,
    rio: false,
    tendas: false,
  },
  aldeia: {
    chao: "#86BF57",
    margem: "#9C8A55",
    ceu: "#9ED2F6",
    nevoa: "#C9E6F6",
    luzDoChao: "#5B8436",
    luzDoSol: "#FFF8EA",
    grama: 0.24,
    montanhas: { matiz: 0.29, saturacao: 0.32, luz: 0.42, baixas: false },
    plantas: "arvores",
    casas: "palha",
    muralha: false,
    pedras: true,
    rio: true,
    tendas: false,
  },
  moderno: {
    chao: "#7CC456",
    margem: "#A39D8F",
    ceu: "#95CFF7",
    nevoa: "#CDE8F8",
    luzDoChao: "#5A8A3A",
    luzDoSol: "#FFFFFF",
    grama: 0.28,
    montanhas: { matiz: 0.32, saturacao: 0.3, luz: 0.45, baixas: false },
    plantas: "redondas",
    casas: "coloridas",
    muralha: false,
    pedras: false,
    rio: false,
    tendas: false,
  },
  reino: {
    chao: "#7DBF52",
    margem: "#9C8A55",
    ceu: "#9CCFF5",
    nevoa: "#C6E3F6",
    luzDoChao: "#567F35",
    luzDoSol: "#FFF6E6",
    grama: 0.25,
    montanhas: { matiz: 0.31, saturacao: 0.3, luz: 0.42, baixas: false },
    plantas: "arvores",
    casas: null,
    muralha: false,
    pedras: false,
    rio: false,
    tendas: false,
    castelo: true,
  },
  mar: {
    chao: "#EED9A4",
    margem: "#D8BE82",
    ceu: "#8FCBF5",
    nevoa: "#CFE8F7",
    luzDoChao: "#BFA36A",
    luzDoSol: "#FFF8EC",
    grama: null,
    montanhas: { matiz: 0.33, saturacao: 0.25, luz: 0.4, baixas: true },
    plantas: "palmeiras",
    casas: null,
    muralha: false,
    pedras: true,
    rio: false,
    tendas: false,
    mar: true,
  },
  salao: {
    chao: "#8C7A66",
    margem: "#8C7A66",
    ceu: "#241B14",
    nevoa: "#2E2219",
    luzDoChao: "#5A4232",
    luzDoSol: "#FFE2B0",
    grama: null,
    montanhas: { matiz: 0, saturacao: 0, luz: 0, baixas: true },
    plantas: "arvores",
    casas: null,
    muralha: false,
    pedras: false,
    rio: false,
    tendas: false,
    interior: true,
  },
};

/** Cores de pano (véu, turbante, capa) que combinam com roupa antiga */
// Sem amarelo nem marrom: o pano não pode parecer cabelo
const PANOS = ["#EFE7D6", "#C8553D", "#3E6E8E", "#7A5C99", "#5E8C5A", "#E3D9F0"];
export const panoDa = (semente: number) => PANOS[Math.abs(semente) % PANOS.length];

export type Traje = { figurino: Figurino; acessorio: Acessorio; pano: string };

/**
 * A roupa que o lugar pede, quando a equipe não escolheu: no deserto e na
 * cidade antiga, túnica comprida com véu (cabelo comprido) ou turbante; na
 * aldeia, túnica curta e às vezes chapéu de palha; no moderno, roupa de hoje.
 */
export function trajeDoAmbiente(ambiente: Ambiente, visual: Visual, semente: number): Traje {
  const pano = panoDa(semente);
  const cabeloCurto = visual.penteado === "curto";
  switch (ambiente) {
    case "deserto":
    case "cidade":
      return { figurino: "tunica-longa", acessorio: cabeloCurto ? "turbante" : "veu", pano };
    case "aldeia":
      return cabeloCurto
        ? { figurino: "tunica-curta", acessorio: semente % 3 === 0 ? "chapeu" : "nenhum", pano }
        : { figurino: "tunica-longa", acessorio: "nenhum", pano };
    case "moderno":
      return { figurino: "moderno", acessorio: "nenhum", pano };
    case "salao":
      // Na corte: roupa comprida e capa
      return { figurino: cabeloCurto ? "manto" : "tunica-longa", acessorio: cabeloCurto ? "nenhum" : "veu", pano };
    case "mar":
      return { figurino: "tunica-curta", acessorio: cabeloCurto && semente % 2 === 0 ? "turbante" : "nenhum", pano };
    case "reino":
      return cabeloCurto ? { figurino: "tunica-curta", acessorio: "nenhum", pano } : { figurino: "tunica-longa", acessorio: "nenhum", pano };
    default:
      return { figurino: visual.calca === visual.roupa ? "tunica-longa" : "tunica-curta", acessorio: "nenhum", pano };
  }
}

/** O chapéu antigo do palito vira acessório (e roupa) do boneco de peças */
export function trajeDoChapeu(chapeu: "coroa" | "capacete" | "faixa" | undefined): Partial<Traje> {
  if (chapeu === "capacete") return { figurino: "armadura", acessorio: "capacete" };
  if (chapeu === "coroa") return { figurino: "manto", acessorio: "coroa" };
  if (chapeu === "faixa") return { acessorio: "turbante" };
  return {};
}

const PELES = ["#F2C4A0", "#E0A882", "#C68B5E", "#8D5A3B", "#F7D7C4", "#A8714A"];
const CABELOS = ["#2E211A", "#4A3226", "#6B3A22", "#1F1A17", "#7A5A3A", "#3A2A20"];
const ROUPAS = ["#C9B08A", "#8A6E4B", "#B5523B", "#5C7A99", "#D8C7A0", "#7D8F5A"];

/** Um visual para quem não tem elenco (a multidão e os figurantes): variado, mas com semente */
export function visualDeFigurante(semente: number, veste?: string): Visual {
  const roupa = veste ?? ROUPAS[semente % ROUPAS.length];
  return {
    pele: PELES[(semente * 7) % PELES.length],
    cabelo: CABELOS[(semente * 5) % CABELOS.length],
    roupa,
    calca: "#3B4A6B",
    sapato: "#6B4A2E",
    penteado: semente % 4 === 1 ? "ondulado" : "curto",
    roupaEstilo: "blusa",
  };
}
