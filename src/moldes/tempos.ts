// Duração de cada cena, em quadros (30 por segundo). Sem import de runtime:
// o ferramentas/renderizar.mts usa este arquivo para saber a duração e
// escolher os quadros da prévia.

import { CENAS_DOS_MEUS_MOLDES } from "./meus/tempos.ts";

export const FPS = 30;

// Capa e carrossel são imagens: a composição dura 3 s (para ver a entrada no
// Studio) e a imagem sai do último quadro, com tudo já no lugar.
export const QUADROS_DA_IMAGEM = 90;

export const TEMPOS = {
  gancho: 75,
  produto: 180,
  beneficios: 120,
  item: 105,
  passo: 100,
  antesDepois: 165,
  depoimento: 165,
  chamada: 90,
  /** Narrado: espera antes da voz começar e respiro depois que ela acaba */
  antesDaFala: 8,
  depoisDaFala: 14,
  abertura3d: 105,
  produto3d: 120,
} as const;

/** Quadros por batida da música, para cortar no ritmo */
export const quadrosPorBatida = (bpm: number) => (60 / bpm) * FPS;

type Conteudo = {
  beneficios?: unknown[];
  itens?: unknown[];
  passos?: unknown[];
  depoimentos?: unknown[];
  cenas?: unknown[];
  bpm?: number;
  batidasPorCena?: number;
  [campo: string]: unknown;
};

type CenaNarrada = { fala?: string; narracao?: { duracaoSeg: number } };

/** Cena do Narrado: o tempo da fala; antes do `npm run narrar`, uma estimativa pelo texto */
export function quadrosDaFala(cena: CenaNarrada) {
  if (cena.narracao) return Math.ceil(cena.narracao.duracaoSeg * FPS) + TEMPOS.antesDaFala + TEMPOS.depoisDaFala;
  const palavras = (cena.fala ?? "").split(/\s+/).filter(Boolean).length;
  return Math.max(60, Math.ceil(palavras * 0.36 * FPS) + TEMPOS.antesDaFala + TEMPOS.depoisDaFala);
}

/** Conversa: respiro antes da primeira fala, entre as falas e no fim */
export const CONVERSA = { inicio: 20, entreFalas: 12, fim: 45, ctaFinal: 80 } as const;

/** Tempo estimado de cada palavra (antes da voz): curtas ~0,2 s, longas ~0,5 s, pausa na pontuação */
export function estimarPalavras(fala: string) {
  let quadro = 0;
  return fala
    .split(/\s+/)
    .filter(Boolean)
    .map((texto) => {
      const dur = Math.max(6, Math.round(((110 + 55 * texto.replace(/[^\p{L}]/gu, "").length) / 1000) * FPS));
      const palavra = { texto, inicio: quadro, fim: quadro + dur };
      quadro += dur + (/[,.!?]$/.test(texto) ? 6 : 0);
      return palavra;
    });
}

/** Fala do Conversa: o tempo da voz; antes do `npm run narrar`, a estimativa */
export function quadrosDaFalaConversa(cena: CenaNarrada) {
  if (cena.narracao) return Math.ceil(cena.narracao.duracaoSeg * FPS);
  const palavras = estimarPalavras(cena.fala ?? "");
  return palavras.length ? palavras[palavras.length - 1].fim : 30;
}

/** Duração de cada cena do molde, na ordem */
export function cenasDoMolde(molde: string, c: Conteudo): number[] {
  switch (molde) {
    case "Oferta":
      return [TEMPOS.gancho, TEMPOS.produto, ...((c.beneficios?.length ?? 0) > 0 ? [TEMPOS.beneficios] : []), TEMPOS.chamada];
    case "Lista":
      return [TEMPOS.gancho, ...(c.itens ?? []).map(() => TEMPOS.item), TEMPOS.chamada];
    case "Tutorial":
      return [TEMPOS.gancho, ...(c.passos ?? []).map(() => TEMPOS.passo), TEMPOS.chamada];
    case "AntesDepois":
      return [TEMPOS.gancho, TEMPOS.antesDepois, TEMPOS.chamada];
    case "Depoimento":
      return [...(c.depoimentos ?? []).map(() => TEMPOS.depoimento), TEMPOS.chamada];
    case "Trend": {
      const cena = Math.round(quadrosPorBatida(c.bpm ?? 129.2) * (c.batidasPorCena ?? 2));
      return [...(c.cenas ?? []).map(() => cena), TEMPOS.chamada];
    }
    case "Vitrine3D":
      return [TEMPOS.abertura3d, ...((c.produtos as unknown[] | undefined) ?? []).map(() => TEMPOS.produto3d), TEMPOS.chamada];
    case "Narrado":
      return [...((c.cenas ?? []) as CenaNarrada[]).map(quadrosDaFala), TEMPOS.chamada];
    case "Conversa":
      return [CONVERSA.inicio, ...((c.cenas ?? []) as CenaNarrada[]).map((cena) => quadrosDaFalaConversa(cena) + CONVERSA.entreFalas), CONVERSA.fim, ...(c.ctaFinal ? [CONVERSA.ctaFinal] : [])];
    default: {
      const meu = CENAS_DOS_MEUS_MOLDES[molde];
      if (!meu) throw new Error(`Molde sem tempos: ${molde} (registre em src/moldes/meus/tempos.ts)`);
      return meu(c);
    }
  }
}

export const duracaoDoMolde = (molde: string, c: Conteudo) => cenasDoMolde(molde, c).reduce((a, b) => a + b, 0);

/** Onde cada cena começa (quadro), na ordem */
export function iniciosDasCenas(molde: string, c: Conteudo) {
  const inicios: number[] = [];
  let t = 0;
  for (const d of cenasDoMolde(molde, c)) {
    inicios.push(t);
    t += d;
  }
  return inicios;
}

/** Um quadro perto do fim de cada cena, quando tudo já entrou: para a prévia */
export const quadrosDaPrevia = (molde: string, c: Conteudo) =>
  cenasDoMolde(molde, c).map((d, i) => iniciosDasCenas(molde, c)[i] + Math.round(d * 0.75));

export const MOLDES_DE_VIDEO = [
  "Oferta",
  "Lista",
  "Tutorial",
  "AntesDepois",
  "Depoimento",
  "Trend",
  "Narrado",
  "Vitrine3D",
  "Conversa",
  ...Object.keys(CENAS_DOS_MEUS_MOLDES),
];

/** Moldes do kit com 3D: o renderizar prepara a fonte 3D e usa a placa de vídeo */
export const MOLDES_3D = ["Vitrine3D"];
