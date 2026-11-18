import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// Fundos dos estilos visuais que não são os cenários do Conversa: o papel
// claro do estilo palito e a noite (azul-noite, janela com lua, estrelas). O
// chão fica em y ≈ 1490, como nos cenários, e o meio da tela fica livre.

/** `janela`: false quando o cenário da história já tem a sua (o quarto) */
export const FundoNoite: React.FC<{ janela?: boolean }> = ({ janela = true }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="ceu-noite" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0A0F26" />
            <stop offset="1" stopColor="#1A2350" />
          </linearGradient>
          <radialGradient id="luz-tela" cx="0.5" cy="0.62" r="0.45">
            <stop offset="0" stopColor="#7FB2FF" stopOpacity={0.22} />
            <stop offset="1" stopColor="#7FB2FF" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#ceu-noite)" />
        {janela && (
          <>
        {/* Janela com a lua e estrelas piscando */}
        <rect x={620} y={560} width={330} height={420} rx={18} fill="#0E1636" stroke="#2C3870" strokeWidth={10} />
        <line x1={785} y1={560} x2={785} y2={980} stroke="#2C3870" strokeWidth={8} />
        <line x1={620} y1={770} x2={950} y2={770} stroke="#2C3870" strokeWidth={8} />
        <circle cx={880} cy={640} r={42} fill="#F3EBC8" />
        <circle cx={896} cy={628} r={38} fill="#0E1636" />
        {[
          [660, 610],
          [720, 700],
          [830, 860],
          [690, 900],
          [905, 720],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={4} fill="#FFFFFF" opacity={0.4 + 0.6 * Math.abs(Math.sin(frame / 25 + i))} />
        ))}
          </>
        )}
        <rect width={1080} height={1920} fill="url(#luz-tela)" />
        {/* Chão */}
        <rect x={0} y={1490} width={1080} height={430} fill="#131A3A" />
        <rect x={0} y={1478} width={1080} height={14} fill="#2C3870" />
      </svg>
    </AbsoluteFill>
  );
};

export const FundoPapel: React.FC = () => (
  <AbsoluteFill>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <rect width={1080} height={1920} fill="#F6F3EC" />
      {Array.from({ length: 18 }, (_, i) =>
        Array.from({ length: 30 }, (_, j) => <circle key={`${i}-${j}`} cx={30 + i * 60} cy={30 + j * 64} r={3} fill="#E3DDD0" />),
      )}
      <rect x={0} y={1490} width={1080} height={430} fill="#ECE6D9" />
      <line x1={0} y1={1490} x2={1080} y2={1490} stroke="#2B2340" strokeWidth={10} strokeLinecap="round" />
    </svg>
  </AbsoluteFill>
);

/** Põe um cenário claro no escuro: tinge de azul-noite e acende a luz da tela no meio. */
export const VeuDeNoite: React.FC = () => (
  <>
    {/* Tinge de azul-noite sem apagar os detalhes (a janela, os móveis continuam visíveis) */}
    <AbsoluteFill style={{ background: "#5563A8", mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ background: "rgba(10,14,40,0.18)" }} />
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse 50% 28% at 50% 62%, rgba(127,178,255,0.22), rgba(127,178,255,0) 70%)",
        mixBlendMode: "screen",
      }}
    />
  </>
);
