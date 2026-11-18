import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { cores } from "../../nucleo/marca";

// "Objeto acende": o objeto na mão (o celular) acende na cor de destaque do
// canal, um brilho redondo abre em volta do personagem e espanta a criatura (no Conversa, a cena com "luz" faz a Sombra
// encolher). Serve para qualquer estilo. `em`: quadro em que acende.

// A cor de destaque do canal em "r, g, b" (para as transparências)
const rgbDe = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

export const LuzDoAviso: React.FC<{ em: number; x?: number; y?: number; cor?: string }> = ({ em, x = 540, y = 1250, cor = cores.destaque }) => {
  const DOURADO = rgbDe(cor);
  const frame = useCurrentFrame() - em;
  if (frame < 0) return null;
  const abre = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  const clarao = interpolate(frame, [0, 5, 18], [0, 0.4, 0], { extrapolateRight: "clamp" });
  const raio = 120 + 900 * abre;
  // Os raios aparecem no clarão e somem; fica só o brilho dourado
  const raios = interpolate(frame, [0, 10, 45], [0, 0.6, 0], { extrapolateRight: "clamp" });
  const brilho = interpolate(frame, [20, 60], [0.55, 0.28], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle ${raio}px at ${x}px ${y}px, rgba(${DOURADO}, ${brilho}), rgba(${DOURADO}, 0) 70%)`,
          mixBlendMode: "screen",
        }}
      />
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + frame / 60;
          const comprimento = 120 + 90 * abre;
          return (
            <line
              key={i}
              x1={x + Math.cos(a) * 70}
              y1={y + Math.sin(a) * 70}
              x2={x + Math.cos(a) * comprimento}
              y2={y + Math.sin(a) * comprimento}
              stroke={`rgba(${DOURADO}, ${raios})`}
              strokeWidth={6}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={x} cy={y} r={30} fill={`rgba(${DOURADO}, 0.9)`} />
        <circle cx={x} cy={y} r={60} fill={`rgba(${DOURADO}, 0.25)`} />
      </svg>
      <AbsoluteFill style={{ background: `rgba(255, 244, 214, ${clarao})` }} />
    </AbsoluteFill>
  );
};
