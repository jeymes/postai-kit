import type { Visual } from "./Boneco";

// Elenco do protótipo: personagens fixos, sempre com o mesmo visual (a
// "bíblia" do canal define quem é quem). Personagens originais do kit.

export const ELENCO = {
  noiva: {
    nome: "Bia",
    visual: {
      pele: "#F2C4A0",
      cabelo: "#8A5A3C",
      roupa: "#FF8A7A",
      calca: "#7FA7D9",
      sapato: "#FFFFFF",
      penteado: "ondulado",
      roupaEstilo: "faixa-noiva",
      tiara: true,
    },
  },
  organizadora: {
    nome: "Lu",
    visual: {
      pele: "#8D5A3B",
      cabelo: "#1E1A24",
      roupa: "#33427A",
      calca: "#4A4A5A",
      sapato: "#2B2340",
      penteado: "chanel",
      roupaEstilo: "blazer",
      mangaLonga: true,
      oculos: true,
    },
  },
} satisfies Record<string, { nome: string; visual: Visual }>;

export type Personagem = keyof typeof ELENCO;
