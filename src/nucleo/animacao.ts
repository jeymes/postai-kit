import { Easing, interpolate, spring } from "remotion";

// Curvas compartilhadas, adaptadas do Laços. Movimento discreto: fade, leve
// escala e deslize.
export const suave = Easing.bezier(0.16, 1, 0.3, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 entre `inicio` e `inicio + duracao`, com a curva suave */
export const progresso = (frame: number, inicio: number, duracao: number) =>
  interpolate(frame, [inicio, inicio + duracao], [0, 1], { ...clamp, easing: suave });

/** Entrada padrão: fade + deslize de `distancia` px para cima */
export const entrada = (frame: number, inicio: number, duracao = 18, distancia = 40) => {
  const p = progresso(frame, inicio, duracao);
  return { opacity: p, translate: `0px ${(1 - p) * distancia}px` };
};

/** Saída: some nos últimos `duracao` quadros antes de `fim` */
export const saida = (frame: number, fim: number, duracao = 10) =>
  interpolate(frame, [fim - duracao, fim], [1, 0], clamp);

/** Pulo com mola, para preço e selos */
export const pulo = (frame: number, inicio: number, fps: number) =>
  spring({ frame: frame - inicio, fps, config: { damping: 12, stiffness: 160 } });
