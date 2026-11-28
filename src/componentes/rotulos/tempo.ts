// Texto na cena: quando cada rótulo entra e sai, sem React (o molde, o conferir
// e os testes usam). A palavra exata vem da mesma conta da ilustração da fala
// (quadroDaPalavra: sem ligar para acento, maiúscula ou pontuação).
// Testes: node --test src/componentes/rotulos/tempo.test.ts

import { acharPalavra, normalizar, palavrasEstimadas, quadroDaPalavra, type PalavraNoTempo } from "../ilustracao/tempo.ts";
import type { Rotulo, RotuloNaTela } from "./schema.ts";

/** Quadros (30 por segundo): a entrada, a saída e quanto cada tipo fica sem `ate` */
export const TEMPO_DO_ROTULO = {
  antecipa: 3,
  entrada: 12,
  saida: 10,
  /** Quanto fica na tela quando não tem `ate` */
  fica: { lugarEData: 100, nome: 80, bilhete: 90 } as Record<RotuloNaTela["tipo"], number>,
  /** O mínimo na tela (menos que isso não dá para ler) */
  minimo: { lugarEData: 45, nome: 40, bilhete: 48 } as Record<RotuloNaTela["tipo"], number>,
} as const;

export interface RotuloPlanejado {
  rotulo: RotuloNaTela;
  indice: number;
  /** Quadro em que começa a entrar e em que começa a sair (a saída leva TEMPO_DO_ROTULO.saida) */
  entra: number;
  sai: number;
  achouEm: boolean;
  achouAte: boolean;
}

export interface OpcoesDosRotulos {
  /** O começo e o fim da cena (ninguém entra antes nem fica depois) */
  inicio: number;
  fim: number;
  /** Ninguém entra antes deste quadro (o título do começo ainda está na tela) */
  naoAntesDe?: number;
}

/**
 * Quando cada rótulo (menos a placa, que é do cenário) entra e sai. Entra 3
 * quadros antes da palavra `em` (ou um tico depois do começo da cena), sai na
 * palavra `ate` ou depois do tempo do tipo, nunca depois do fim da cena, e
 * fica pelo menos o mínimo do tipo. A mesma palavra dita duas vezes: o segundo
 * rótulo pega a segunda vez.
 */
export function planejarRotulos(rotulos: ReadonlyArray<Rotulo> | undefined, palavras: ReadonlyArray<PalavraNoTempo>, opcoes: OpcoesDosRotulos): RotuloPlanejado[] {
  if (!rotulos?.length) return [];
  const { inicio } = opcoes;
  const fim = Math.max(opcoes.fim, inicio + TEMPO_DO_ROTULO.entrada + TEMPO_DO_ROTULO.saida + 1);
  const piso = Math.max(inicio, opcoes.naoAntesDe ?? inicio);
  let cursor = 0;
  let ultima = "";
  const planos: RotuloPlanejado[] = [];
  rotulos.forEach((rotulo, indice) => {
    if (rotulo.tipo === "placa") return;
    const procurarDe = rotulo.em && normalizar(rotulo.em) === ultima ? cursor + 1 : cursor;
    const em = quadroDaPalavra(palavras, rotulo.em, procurarDe);
    if (rotulo.em && em.achou) {
      cursor = em.indice;
      ultima = normalizar(rotulo.em);
    }
    // Sem `em`: um tico depois do corte (o olho chega no plano antes de ler)
    const desejado = rotulo.em && em.achou ? em.quadro - TEMPO_DO_ROTULO.antecipa : inicio + (rotulo.tipo === "bilhete" ? 4 : 8);
    const minimo = TEMPO_DO_ROTULO.minimo[rotulo.tipo];
    const entra = Math.max(piso, Math.min(fim - TEMPO_DO_ROTULO.saida - minimo, desejado));
    const ate = rotulo.ate ? quadroDaPalavra(palavras, rotulo.ate, em.indice + 1) : undefined;
    const achouAte = !ate || (ate.achou && ate.quadro > em.quadro);
    let sai = ate && achouAte ? ate.quadro - TEMPO_DO_ROTULO.antecipa : entra + TEMPO_DO_ROTULO.fica[rotulo.tipo];
    sai = Math.min(fim - TEMPO_DO_ROTULO.saida, Math.max(sai, entra + minimo));
    sai = Math.max(sai, entra + TEMPO_DO_ROTULO.entrada);
    planos.push({ rotulo, indice, entra, sai, achouEm: !rotulo.em || em.achou, achouAte });
  });
  return planos;
}

/** Quanto o rótulo está na tela no quadro `t`: 0 (fora) a 1 (inteiro), sem curva (o desenho põe a mola) */
export function presencaDoRotulo(p: Pick<RotuloPlanejado, "entra" | "sai">, t: number) {
  if (t < p.entra || t >= p.sai + TEMPO_DO_ROTULO.saida) return 0;
  const entrou = Math.min(1, (t - p.entra) / TEMPO_DO_ROTULO.entrada);
  const saiu = t < p.sai ? 0 : Math.min(1, (t - p.sai) / TEMPO_DO_ROTULO.saida);
  return Math.max(0, entrou - saiu);
}

/** Os quadros em que algo muda na tela por causa dos rótulos (para o ritmo) */
export function mudancasDosRotulos(planos: ReadonlyArray<RotuloPlanejado>): number[] {
  return planos.flatMap((p) => [p.entra, p.sai]);
}

/**
 * Avisos para o conferir: palavra que não está na fala, nome de quem não está
 * na cena, dois bilhetes juntos, placa no molde que não tem cenário 3D.
 */
export function conferirRotulos(
  rotulos: ReadonlyArray<Rotulo> | undefined,
  fala: string,
  opcoes: { ids?: Iterable<string>; molde?: "Mundo3D" | "Conversa"; comIlustracao?: boolean } = {},
): string[] {
  if (!rotulos?.length) return [];
  const palavras = palavrasEstimadas(fala);
  const ids = opcoes.ids ? new Set(opcoes.ids) : null;
  const avisos: string[] = [];
  let cursor = 0;
  let ultima = "";
  rotulos.forEach((r, i) => {
    const n = `rotulos[${i}] (${r.tipo})`;
    if (r.tipo === "placa") {
      if (opcoes.molde === "Conversa") avisos.push(`${n}: a placa é do cenário 3D (Mundo3D); no Conversa ela não aparece`);
      return;
    }
    if (r.em) {
      const k = acharPalavra(palavras, r.em, normalizar(r.em) === ultima ? cursor + 1 : cursor);
      if (k < 0) avisos.push(`${n}: a palavra "${r.em}" não está na fala; o rótulo entra no começo da cena`);
      else {
        cursor = k;
        ultima = normalizar(r.em);
      }
    }
    if (r.ate) {
      const k = acharPalavra(palavras, r.ate, cursor + 1);
      if (k < 0 || k <= cursor) avisos.push(`${n}: a palavra de saída "${r.ate}" não vem depois da "${r.em ?? "começo"}" na fala; o rótulo sai sozinho`);
    }
    if (r.tipo === "nome" && ids && !ids.has(r.quem)) avisos.push(`${n}: "${r.quem}" não está em personagens (o nome sai na faixa de baixo)`);
  });
  const bilhetes = rotulos.filter((r) => r.tipo === "bilhete").length;
  if (bilhetes > 1) avisos.push(`${bilhetes} bilhetes na mesma cena: um por cena (o segundo cobre o primeiro)`);
  if (bilhetes && opcoes.comIlustracao) avisos.push("bilhete e ilustração na mesma cena: o bilhete cobre a ilustração enquanto está na tela (deixe um só)");
  if (rotulos.filter((r) => r.tipo === "lugarEData").length > 1) avisos.push("mais de uma etiqueta de lugar e data na cena: use uma só");
  return avisos;
}
