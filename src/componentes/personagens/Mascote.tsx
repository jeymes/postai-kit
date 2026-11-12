import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { cores } from "../../nucleo/marca";
import type { Legenda } from "../texto/Legendas";

// Mascote que fala junto com a narração, na cor da marca (desenho do kit).
// A boca usa as formas do Rhubarb Lip Sync (A a H e X): com "boca" (do
// `npm run narrar` com o Rhubarb instalado) ela é exata; sem, abre e fecha
// no tempo das palavras da legenda.

export type Boca = Array<{ inicio: number; forma: string }>;

// Formas da boca: largura e altura da abertura, e se mostra dentes ou língua
const FORMAS: Record<string, { l: number; a: number; dentes?: boolean; lingua?: boolean }> = {
  X: { l: 26, a: 3 }, // em repouso
  A: { l: 30, a: 3 }, // M, B, P: lábios fechados
  B: { l: 34, a: 10, dentes: true }, // a maioria das consoantes
  C: { l: 38, a: 20, lingua: true }, // é, ê
  D: { l: 44, a: 30, lingua: true }, // á
  E: { l: 28, a: 22 }, // ó
  F: { l: 16, a: 16 }, // u, w: bico
  G: { l: 34, a: 9, dentes: true }, // f, v
  H: { l: 34, a: 22, lingua: true }, // l
};

const FALANDO = ["C", "B", "D", "B", "E", "C", "F", "B"];

function formaAgora(segundo: number, quadro: number, boca?: Boca, legendas?: Legenda[]) {
  if (boca?.length) {
    let forma = "X";
    for (const b of boca) {
      if (b.inicio > segundo) break;
      forma = b.forma;
    }
    return forma;
  }
  const ms = segundo * 1000;
  const palavra = legendas?.some((l) => l.inicioMs <= ms && ms < l.fimMs);
  return palavra ? FALANDO[Math.floor(quadro / 3) % FALANDO.length] : "X";
}

export const Mascote: React.FC<{
  boca?: Boca;
  legendas?: Legenda[];
  /** Quadro da cena em que a voz começa */
  atraso?: number;
  tamanho?: number;
  cor?: string;
  style?: React.CSSProperties;
}> = ({ boca, legendas, atraso = 0, tamanho = 260, cor = cores.destaque, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const segundo = (frame - atraso) / fps;
  const forma = FORMAS[formaAgora(segundo, frame, boca, legendas)] ?? FORMAS.X;
  const piscando = frame % 110 < 4;
  const balanco = Math.sin(frame / 9) * 4;
  return (
    <svg viewBox="0 0 200 200" width={tamanho} height={tamanho} style={{ overflow: "visible", ...style }}>
      <g transform={`translate(0 ${balanco})`}>
        <ellipse cx="100" cy="192" rx="62" ry="8" fill="rgba(0,0,0,0.18)" transform={`translate(0 ${-balanco})`} />
        <path d="M100 18 C152 18 182 58 182 112 C182 160 146 186 100 186 C54 186 18 160 18 112 C18 58 48 18 100 18 Z" fill={cor} />
        <ellipse cx="72" cy="58" rx="22" ry="12" fill="#fff" opacity="0.22" transform="rotate(-25 72 58)" />
        {[70, 130].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="92" rx="17" ry={piscando ? 2 : 20} fill="#fff" />
            {!piscando && <circle cx={x + 3} cy="96" r="9" fill="#1b1b1b" />}
          </g>
        ))}
        <ellipse cx="46" cy="124" rx="12" ry="7" fill="#ff7a8a" opacity="0.45" />
        <ellipse cx="154" cy="124" rx="12" ry="7" fill="#ff7a8a" opacity="0.45" />
        <g transform="translate(100 138)">
          <ellipse rx={forma.l} ry={Math.max(forma.a, 3)} fill="#2a1416" />
          {forma.dentes && <rect x={-forma.l * 0.7} y={-forma.a} width={forma.l * 1.4} height={forma.a * 0.7} rx="3" fill="#fff" />}
          {forma.lingua && <ellipse cy={forma.a * 0.45} rx={forma.l * 0.55} ry={forma.a * 0.4} fill="#e06070" />}
        </g>
      </g>
    </svg>
  );
};
