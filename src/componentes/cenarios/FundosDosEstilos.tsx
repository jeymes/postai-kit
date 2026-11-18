import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// Fundos dos estilos de traço e de quadrinhos. O chão fica em y ≈ 1490, como
// nos cenários, e o meio da tela fica livre para os personagens.

/** Lousa: verde (claro) ou preta (noite), com pó de giz e o apoio de madeira embaixo */
export const FundoLousa: React.FC<{ noite: boolean }> = ({ noite }) => (
  <AbsoluteFill>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="po-de-giz">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={3} seed={9} />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0" />
        </filter>
      </defs>
      <rect width={1080} height={1920} fill={noite ? "#1D2124" : "#2F4A3E"} />
      <rect width={1080} height={1920} filter="url(#po-de-giz)" />
      {/* Restos de giz apagado */}
      <path d="M120 420 Q320 380 520 430 M640 300 Q820 270 960 320" stroke="rgba(255,255,255,0.06)" strokeWidth={60} strokeLinecap="round" fill="none" />
      <rect x={0} y={1490} width={1080} height={430} fill={noite ? "#2A2421" : "#6B4A2F"} />
      <rect x={0} y={1490} width={1080} height={26} fill={noite ? "#3A322D" : "#8A6240"} />
      {[180, 260, 860].map((x, i) => (
        <rect key={x} x={x} y={1468} width={i === 2 ? 90 : 60} height={22} rx={8} fill={["#F4F1E8", "#F6E27A", "#F2A7B8"][i]} />
      ))}
    </svg>
  </AbsoluteFill>
);

/** Neon: escuro, com uma grade em perspectiva brilhando de leve no chão */
export const FundoNeon: React.FC<{ noite: boolean }> = ({ noite }) => {
  const frame = useCurrentFrame();
  const pulso = 0.55 + 0.25 * Math.sin(frame / 20);
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="ceu-neon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={noite ? "#020308" : "#0B1030"} />
            <stop offset="1" stopColor={noite ? "#0A0614" : "#1B1046"} />
          </linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#ceu-neon)" />
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={(i * 263) % 1080} cy={(i * 457) % 1400} r={2} fill="#FFFFFF" opacity={0.15 + 0.2 * ((i * 7) % 3)} />
        ))}
        <g stroke="#B04CFF" strokeWidth={3} opacity={pulso * 0.6}>
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={1490 + i * i * 6} x2={1080} y2={1490 + i * i * 6} />
          ))}
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`v${i}`} x1={540} y1={1490} x2={-600 + i * 190} y2={1920} />
          ))}
        </g>
        <line x1={0} y1={1490} x2={1080} y2={1490} stroke="#22E1FF" strokeWidth={5} opacity={pulso} />
      </svg>
    </AbsoluteFill>
  );
};

/** Quadrinhos: cor chapada com retícula de pontos e raios de explosão atrás */
export const FundoQuadrinhos: React.FC<{ noite: boolean }> = ({ noite }) => {
  const frame = useCurrentFrame();
  const fundo = noite ? "#1B2A6B" : "#FFD93D";
  const ponto = noite ? "#2E44A0" : "#F5A623";
  const raio = noite ? "#24368A" : "#FFE873";
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="reticula" width={28} height={28} patternUnits="userSpaceOnUse">
            <circle cx={7} cy={7} r={6} fill={ponto} />
            <circle cx={21} cy={21} r={6} fill={ponto} />
          </pattern>
        </defs>
        <rect width={1080} height={1920} fill={fundo} />
        <g transform={`rotate(${frame * 0.15} 540 1000)`}>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            const b = a + Math.PI / 16;
            return <polygon key={i} points={`540,1000 ${540 + Math.cos(a) * 1600},${1000 + Math.sin(a) * 1600} ${540 + Math.cos(b) * 1600},${1000 + Math.sin(b) * 1600}`} fill={raio} />;
          })}
        </g>
        <rect width={1080} height={1920} fill="url(#reticula)" opacity={0.55} />
        <rect x={0} y={1490} width={1080} height={430} fill={noite ? "#0F1A4A" : "#2D5BD8"} />
        <line x1={0} y1={1490} x2={1080} y2={1490} stroke="#111111" strokeWidth={14} />
      </svg>
    </AbsoluteFill>
  );
};
