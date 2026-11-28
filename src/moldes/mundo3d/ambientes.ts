import * as THREE from "three";
import type { Visual } from "../../componentes/personagens/Boneco";

// Os lugares do Mundo 3D e o que cada um muda: o chão, o céu, as plantas, as
// casas e a roupa dos bonecos. A equipe escolhe só o lugar (cenario.ambiente) e
// tudo combina: o boneco "segue o ambiente".

// serra, sertao e europa (28/11/2026): os lugares dos causos em alta (a curva da
// serra com a mureta, o sertão de chão rachado e mandacaru, a praça de pedra)
export const AMBIENTES = ["campo", "deserto", "cidade", "aldeia", "moderno", "reino", "mar", "salao", "serra", "sertao", "europa"] as const;
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
  plantas: "arvores" | "palmeiras" | "redondas" | "caatinga";
  casas: "barro" | "palha" | "coloridas" | "taipa" | null;
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
  /** A estrada de serra com a curva, a mureta e o vale atrás (lugaresNovos.tsx) */
  estrada?: boolean;
  /** O chão: com manchas (padrão), rachado (sertão) ou de pedra (calçamento) */
  textura?: "manchas" | "rachado" | "pedras";
  /** A praça de cidade europeia antiga: sobrados de pedra, a torre com relógio e o chafariz */
  praca?: boolean;
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
  // A estrada de serra: asfalto com faixa amarela, a curva com a mureta e as placas
  // de curva, o vale lá embaixo e as montanhas verdes (a referência: o borracheiro da curva)
  serra: {
    chao: "#6FB04A",
    margem: "#8E8C84",
    ceu: "#A8CDEB",
    nevoa: "#D3E3EE",
    luzDoChao: "#4F7F33",
    luzDoSol: "#FFFFFF",
    grama: 0.27,
    montanhas: { matiz: 0.31, saturacao: 0.32, luz: 0.36, baixas: false },
    plantas: "arvores",
    casas: null,
    muralha: false,
    pedras: false,
    rio: false,
    tendas: false,
    estrada: true,
  },
  // O sertão: chão de terra rachada, mandacaru, galho seco, casinha de taipa e serras baixas
  sertao: {
    chao: "#D2A56C",
    margem: "#B88A55",
    ceu: "#86C3F2",
    nevoa: "#EED9B6",
    luzDoChao: "#A97C48",
    luzDoSol: "#FFF1D8",
    grama: null,
    montanhas: { matiz: 0.07, saturacao: 0.42, luz: 0.5, baixas: true },
    plantas: "caatinga",
    casas: "taipa",
    muralha: false,
    pedras: true,
    rio: false,
    tendas: false,
    textura: "rachado",
  },
  // A cidade europeia antiga: calçamento de pedra, sobrados de dois e três andares com
  // telhado e janela de veneziana, a torre com relógio e o chafariz no meio da praça
  europa: {
    chao: "#B9B1A3",
    margem: "#9C9486",
    ceu: "#AFCBE3",
    nevoa: "#DCE2E6",
    luzDoChao: "#8E8678",
    luzDoSol: "#FFF6E8",
    grama: null,
    montanhas: { matiz: 0.3, saturacao: 0.18, luz: 0.5, baixas: true },
    plantas: "redondas",
    casas: null,
    muralha: false,
    pedras: false,
    rio: false,
    tendas: false,
    textura: "pedras",
    praca: true,
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
    // Os lugares de hoje (ou de há pouco): roupa de hoje; no sertão, às vezes o chapéu
    case "serra":
    case "europa":
      return { figurino: "moderno", acessorio: "nenhum", pano };
    case "sertao":
      return { figurino: "moderno", acessorio: cabeloCurto && semente % 2 === 0 ? "chapeu" : "nenhum", pano };
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

// ---------- Variações de roupa (27/11/2026) ----------
// O dono: "cenas e roupas se repetem". Cada personagem tem 5 variações da roupa,
// sempre com a mesma identidade (rosto, pele, cabelo, barba e a cor principal):
// 1 = a do elenco; 2 = barra e cinto de pano; 3 = colete escuro e manga comprida;
// 4 = faixa atravessada no peito; 5 = capa curta nos ombros e barra. A equipe
// escolhe no campo "figurino" do personagem; sem ele, muda sozinha a cada episódio.

export type Variacao = {
  roupa?: string;
  barra?: string;
  cinto?: string;
  colete?: string;
  faixa?: string;
  capaCurta?: string;
  mangaLonga?: boolean;
};
export const VARIACOES = [1, 2, 3, 4, 5] as const;

const tom = (cor: string, luz: number, sat = 0) => {
  const c = new THREE.Color(cor);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return "#" + new THREE.Color().setHSL(hsl.h, Math.min(1, Math.max(0, hsl.s + sat)), Math.min(0.92, Math.max(0.08, hsl.l + luz))).getHexString();
};

/** Os detalhes da variação n (1 a 5) da roupa de quem tem este visual e este traje */
export function variacaoDoFigurino(n: number, visual: Visual, traje: Traje): Variacao {
  const pano = traje.pano;
  const roupa = visual.roupa;
  const v = ((Math.round(n) - 1) % 5 + 5) % 5 + 1;
  if (traje.figurino === "armadura") return v % 2 === 0 ? { capaCurta: pano } : {};
  if (traje.figurino === "moderno") {
    switch (v) {
      case 2:
        return { colete: tom(pano, -0.18), mangaLonga: true };
      case 3:
        return { roupa: tom(roupa, 0.12, -0.05), faixa: tom(pano, -0.05) };
      case 4:
        return { mangaLonga: true, roupa: tom(roupa, -0.1) };
      case 5:
        return { colete: tom(roupa, -0.25) };
      default:
        return {};
    }
  }
  switch (v) {
    case 2:
      return { barra: pano, cinto: tom(pano, -0.15) };
    case 3:
      return { colete: tom(roupa, -0.22, 0.05), mangaLonga: true };
    case 4:
      return { roupa: tom(roupa, 0.08), faixa: pano };
    case 5:
      return { capaCurta: pano, barra: tom(roupa, -0.2) };
    default:
      return {};
  }
}

/** Um número de 0 a 2^31 a partir de um texto (o título do episódio): a semente do episódio */
export function sementeDoTexto(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483647;
}

// ---------- A hora do dia (27/11/2026): o céu e a luz combinam ----------
export const HORAS = ["dia", "tarde", "noite"] as const;
export type Hora = (typeof HORAS)[number];

export type LuzDaHora = {
  ceuTopo: string;
  ceuHorizonte: string;
  nevoa: string;
  sol: string;
  forcaDoSol: number;
  /** De onde vem o sol (direção, não precisa ser unitária) */
  direcaoDoSol: [number, number, number];
  luzDoCeu: string;
  forcaDoCeu: number;
  contraluz: string;
  forcaDaContraluz: number;
};

export function luzDaHora(p: Paleta, hora: Hora): LuzDaHora {
  if (hora === "tarde")
    return {
      ceuTopo: "#6E8FCB",
      ceuHorizonte: "#F6C08A",
      nevoa: "#F0C9A0",
      sol: "#FFC587",
      forcaDoSol: 2.5,
      direcaoDoSol: [14, 9, 10],
      luzDoCeu: "#C9D6F2",
      forcaDoCeu: 0.85,
      contraluz: "#FFB46B",
      forcaDaContraluz: 1.6,
    };
  if (hora === "noite")
    return {
      ceuTopo: "#0E1630",
      ceuHorizonte: "#2C3A66",
      nevoa: "#24315A",
      sol: "#A9C2FF",
      forcaDoSol: 0.9,
      direcaoDoSol: [-10, 22, 12],
      luzDoCeu: "#5A6FA8",
      forcaDoCeu: 0.55,
      contraluz: "#8FB0FF",
      forcaDaContraluz: 1.2,
    };
  return {
    ceuTopo: new THREE.Color(p.ceu).offsetHSL(0.01, 0.05, -0.12).getStyle(),
    ceuHorizonte: p.nevoa,
    nevoa: p.nevoa,
    sol: p.luzDoSol,
    forcaDoSol: 2.6,
    direcaoDoSol: [16, 26, 14],
    luzDoCeu: "#DDEEFF",
    forcaDoCeu: 1.0,
    contraluz: "#FFF1D6",
    forcaDaContraluz: 1.3,
  };
}
