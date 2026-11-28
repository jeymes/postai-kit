// Silhueta: a pessoa pequena da paisagem, montada por articulações (cabeça,
// pescoço, quadril, joelhos, pés, cotovelos, mãos e a barra do manto). Cada
// pose é um conjunto de pontos; um gesto na palavra leva de uma pose para a
// outra misturando os pontos (sem salto). A borda de luz é a mesma figura
// desenhada um pouco maior, atrás, na cor da luz.

import React from "react";
import type { PoseDaFigura } from "./schema";

type Pt = [number, number];
export interface Pose {
  cabeca: Pt;
  pescoco: Pt;
  quadril: Pt;
  joelhoA: Pt;
  peA: Pt;
  joelhoB: Pt;
  peB: Pt;
  cotoveloA: Pt;
  maoA: Pt;
  cotoveloB: Pt;
  maoB: Pt;
  barraA: Pt;
  barraB: Pt;
}

// Os pés no (0, 0), virada para a direita (+x); A é o lado de trás, B o da frente
const DE_PE: Pose = {
  cabeca: [2, -137],
  pescoco: [0, -120],
  quadril: [0, -74],
  joelhoA: [-3, -38],
  peA: [-6, 0],
  joelhoB: [3, -38],
  peB: [6, 0],
  cotoveloA: [-9, -94],
  maoA: [-7, -70],
  cotoveloB: [9, -94],
  maoB: [8, -70],
  barraA: [-25, -1],
  barraB: [25, -1],
};

export const POSES: Record<PoseDaFigura, Pose> = {
  "de-pe": DE_PE,
  caminhando: { ...DE_PE, cabeca: [7, -135], pescoco: [4, -119], maoA: [-6, -72], maoB: [13, -72], barraA: [-24, -5], barraB: [27, -5] },
  "bracos-abertos": { ...DE_PE, cabeca: [1, -141], cotoveloA: [-24, -136], maoA: [-42, -166], cotoveloB: [24, -136], maoB: [42, -166] },
  ajoelhada: {
    cabeca: [8, -111],
    pescoco: [5, -95],
    quadril: [-2, -50],
    joelhoA: [22, -6],
    peA: [-24, -2],
    joelhoB: [24, -8],
    peB: [-22, -3],
    cotoveloA: [14, -70],
    maoA: [20, -86],
    cotoveloB: [16, -72],
    maoB: [21, -88],
    barraA: [-28, -1],
    barraB: [28, -2],
  },
  prostrada: {
    cabeca: [40, -50],
    pescoco: [26, -62],
    quadril: [-6, -46],
    joelhoA: [18, -6],
    peA: [-26, -2],
    joelhoB: [20, -6],
    peB: [-24, -3],
    cotoveloA: [36, -30],
    maoA: [48, -3],
    cotoveloB: [38, -32],
    maoB: [52, -4],
    barraA: [-30, -1],
    barraB: [26, -3],
  },
  sentada: {
    cabeca: [-2, -86],
    pescoco: [-4, -69],
    quadril: [-10, -20],
    joelhoA: [20, -42],
    peA: [34, -1],
    joelhoB: [22, -40],
    peB: [38, -1],
    cotoveloA: [6, -46],
    maoA: [22, -40],
    cotoveloB: [8, -48],
    maoB: [24, -42],
    barraA: [-30, -1],
    barraB: [28, -30],
  },
};

const CHAVES = Object.keys(DE_PE) as Array<keyof Pose>;
const misturarPose = (a: Pose, b: Pose, k: number): Pose =>
  Object.fromEntries(CHAVES.map((c) => [c, [a[c][0] + (b[c][0] - a[c][0]) * k, a[c][1] + (b[c][1] - a[c][1]) * k]])) as unknown as Pose;
const suave = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Quadros que a troca de pose leva */
export const QUADROS_DO_GESTO = 16;

/**
 * A pose no quadro `t` da cena: começa em `inicial` e, em cada gesto (quadro em
 * que a palavra é dita, um tico antes), vai suave para a pose nova. `andando`
 * (0 a 1) diz o quanto ela está caminhando (as pernas e o braço balançam).
 */
export function poseNoTempo(inicial: PoseDaFigura, gestos: ReadonlyArray<{ quadro: number; pose: PoseDaFigura }>, t: number) {
  let pose = POSES[inicial];
  let andando = inicial === "caminhando" ? 1 : 0;
  for (const g of [...gestos].sort((a, b) => a.quadro - b.quadro)) {
    const k = suave((t - (g.quadro - 4)) / QUADROS_DO_GESTO);
    if (k <= 0) break;
    pose = misturarPose(pose, POSES[g.pose], k);
    andando = andando + ((g.pose === "caminhando" ? 1 : 0) - andando) * k;
  }
  return { pose, andando };
}

/** A pose com o passo (as pernas e os braços balançando) e a respiração */
function comMovimento(p: Pose, andando: number, t: number): Pose {
  const f = Math.sin(t / 7);
  const sobe = Math.max(0, Math.cos(t / 7));
  const r = Math.sin(t / 26) * 1.2;
  const q = { ...p };
  const mexe = (pt: Pt, dx: number, dy = 0): Pt => [pt[0] + dx, pt[1] + dy];
  if (andando > 0.01) {
    q.peA = mexe(p.peA, -f * 15 * andando, -sobe * 3 * andando);
    q.peB = mexe(p.peB, f * 15 * andando, -(1 - sobe) * 3 * andando);
    q.joelhoA = mexe(p.joelhoA, -f * 8 * andando);
    q.joelhoB = mexe(p.joelhoB, f * 8 * andando);
    q.maoA = mexe(p.maoA, f * 7 * andando);
    q.maoB = mexe(p.maoB, -f * 7 * andando);
    q.barraA = mexe(p.barraA, -Math.abs(f) * 4 * andando);
    q.barraB = mexe(p.barraB, Math.abs(f) * 4 * andando);
  }
  // Respira: o tronco e a cabeça sobem e descem de leve
  q.cabeca = mexe(q.cabeca, 0, r);
  q.pescoco = mexe(q.pescoco, 0, r * 0.8);
  return q;
}

const linha = (...pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

/** O corpo inteiro numa cor; `extra` engrossa tudo (para a borda de luz atrás) */
const Corpo: React.FC<{ p: Pose; cor: string; extra: number }> = ({ p, cor, extra }) => {
  // O tronco: a largura vai na perpendicular da linha quadril → pescoço
  const dx = p.pescoco[0] - p.quadril[0];
  const dy = p.pescoco[1] - p.quadril[1];
  const n = Math.hypot(dx, dy) || 1;
  const nx = -dy / n;
  const ny = dx / n;
  const ombro: Pt = [p.pescoco[0] + (p.quadril[0] - p.pescoco[0]) * 0.1, p.pescoco[1] + (p.quadril[1] - p.pescoco[1]) * 0.1];
  const manto = [
    [p.pescoco[0] + nx * 12, p.pescoco[1] + ny * 12],
    [p.quadril[0] + nx * 17, p.quadril[1] + ny * 17],
    p.barraA,
    p.barraB,
    [p.quadril[0] - nx * 17, p.quadril[1] - ny * 17],
    [p.pescoco[0] - nx * 12, p.pescoco[1] - ny * 12],
  ] as Pt[];
  const traco = { fill: "none", stroke: cor, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g>
      <path d={linha(p.quadril, p.joelhoA, p.peA)} {...traco} strokeWidth={13 + extra} />
      <path d={linha(p.quadril, p.joelhoB, p.peB)} {...traco} strokeWidth={13 + extra} />
      <path d={`${linha(...manto)} Z`} fill={cor} stroke={cor} strokeWidth={6 + extra} strokeLinejoin="round" />
      <path d={linha(ombro, p.cotoveloA, p.maoA)} {...traco} strokeWidth={10 + extra} />
      <path d={linha(ombro, p.cotoveloB, p.maoB)} {...traco} strokeWidth={10 + extra} />
      {/* A cabeça com o manto por cima (um pouco para trás) */}
      <ellipse cx={p.cabeca[0] - 1.5} cy={p.cabeca[1]} rx={13.5 + extra / 2} ry={15 + extra / 2} fill={cor} />
    </g>
  );
};

export const FiguraArticulada: React.FC<{
  inicial: PoseDaFigura;
  gestos: ReadonlyArray<{ quadro: number; pose: PoseDaFigura }>;
  t: number;
  x: number;
  y: number;
  escala: number;
  cor: string;
  luz?: string;
  forcaDaLuz?: number;
  virada?: 1 | -1;
  /** Andar pela cena: quanto anda (x, y) do começo ao fim e o progresso (0 a 1) */
  anda?: { dx: number; dy: number; p: number; encolhe?: number };
}> = ({ inicial, gestos, t, x, y, escala, cor, luz, forcaDaLuz = 0.5, virada = 1, anda }) => {
  const { pose, andando } = poseNoTempo(inicial, gestos, t);
  const p = comMovimento(pose, andando, t);
  const ax = anda ? anda.dx * anda.p * andando : 0;
  const ay = anda ? anda.dy * anda.p * andando : 0;
  const e = escala * (anda?.encolhe ? 1 - anda.encolhe * anda.p * andando : 1);
  return (
    <g transform={`translate(${x + ax} ${y + ay}) scale(${e * virada} ${e})`}>
      {luz && (
        <g opacity={forcaDaLuz}>
          <Corpo p={p} cor={luz} extra={3.4 / e} />
        </g>
      )}
      <Corpo p={p} cor={cor} extra={0} />
    </g>
  );
};
