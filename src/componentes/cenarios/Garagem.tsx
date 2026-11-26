import React from "react";
import { useCurrentFrame } from "remotion";

// Garagem e dentro do carro (26/11/2026, pedido da crítica: "não existe
// carro/garagem; o quarto cobriu a cena 5"). Mesmo espaço dos outros cenários
// do Conversa: 1080 x 1920, chão em y 1490, o meio livre para as pessoas, o
// alto (título) e o pé (legenda) só com parede ou chão, contorno #2B2340.

const TRACO = "#2B2340";
const tr = { stroke: TRACO, strokeWidth: 6, strokeLinejoin: "round" as const };

/** Garagem: portão de enrolar ao fundo, o carro de lado, ferramentas na parede e a lâmpada */
export const Garagem: React.FC = () => {
  const frame = useCurrentFrame();
  const lampada = 0.85 + 0.15 * Math.abs(Math.sin(frame / 31));
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <rect width={1080} height={1920} fill="#D5D9DF" />
      {/* Faixa de tijolinho embaixo da parede */}
      <rect x={0} y={1180} width={1080} height={310} fill="#C7CCD3" />
      {/* O portão de enrolar (as ripas ficam atrás das cabeças: linhas calmas) */}
      <rect x={200} y={430} width={680} height={1060} fill="#B9C2CC" {...tr} strokeWidth={8} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={204} x2={876} y1={500 + i * 82} y2={500 + i * 82} stroke="#9AA5B1" strokeWidth={6} />
      ))}
      <rect x={186} y={410} width={708} height={34} rx={8} fill="#8E99A6" {...tr} />
      <rect x={510} y={1440} width={60} height={14} rx={6} fill="#6E7884" />
      {/* A lâmpada do teto, abaixo do título */}
      <line x1={540} y1={360} x2={540} y2={396} stroke={TRACO} strokeWidth={6} />
      <circle cx={540} cy={410} r={60} fill="#FFF3B0" opacity={0.35 * lampada} />
      <path d="M512 396 L568 396 L556 420 L524 420 Z" fill="#F5D36B" {...tr} strokeWidth={4} />
      {/* Painel de ferramentas à esquerda */}
      <rect x={30} y={470} width={150} height={330} rx={8} fill="#C9A37A" {...tr} />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={60 + (i % 2) * 90} cy={510 + Math.floor(i / 2) * 140} r={5} fill="#8A6A48" />
      ))}
      <path d="M70 520 L70 640 M52 520 L88 520" stroke="#5B6470" strokeWidth={12} strokeLinecap="round" />
      <path d="M140 530 Q160 560 140 590 L140 680" fill="none" stroke="#B23A3A" strokeWidth={12} strokeLinecap="round" />
      <rect x={52} y={700} width={110} height={70} rx={10} fill="#5B8DEF" {...tr} strokeWidth={5} />
      {/* Prateleira com latas à direita */}
      <rect x={900} y={640} width={160} height={16} fill="#8A6A48" {...tr} strokeWidth={4} />
      <rect x={914} y={570} width={50} height={70} rx={6} fill="#E8572A" {...tr} strokeWidth={4} />
      <rect x={980} y={590} width={60} height={50} rx={6} fill="#4FA37A" {...tr} strokeWidth={4} />
      <rect x={900} y={800} width={160} height={16} fill="#8A6A48" {...tr} strokeWidth={4} />
      <rect x={920} y={740} width={110} height={60} rx={8} fill="#F2C14E" {...tr} strokeWidth={4} />
      {/* O carro de lado, atrás das pessoas: rodas e faróis aparecem nas pontas */}
      <path
        d="M-30 1440 L-30 1300 Q-30 1250 30 1240 L250 1220 L350 1110 Q370 1090 400 1090 L700 1090 Q730 1090 750 1110 L860 1220 L1050 1240 Q1110 1250 1110 1300 L1110 1440 Z"
        fill="#C8453A"
        {...tr}
        strokeWidth={8}
      />
      <path d="M380 1120 L520 1120 L520 1220 L290 1220 Z" fill="#BFE0F2" {...tr} />
      <path d="M560 1120 L700 1120 L800 1220 L560 1220 Z" fill="#BFE0F2" {...tr} />
      <line x1={-30} y1={1330} x2={1110} y2={1330} stroke="#9E3329" strokeWidth={6} />
      <rect x={1020} y={1262} width={60} height={34} rx={10} fill="#FFF3B0" {...tr} strokeWidth={4} />
      <rect x={0} y={1262} width={40} height={34} rx={8} fill="#B23A3A" {...tr} strokeWidth={4} />
      {[150, 920].map((x) => (
        <g key={x}>
          <circle cx={x} cy={1430} r={74} fill="#2E2A36" {...tr} />
          <circle cx={x} cy={1430} r={34} fill="#B9C2CC" {...tr} strokeWidth={5} />
        </g>
      ))}
      {/* Chão de cimento */}
      <rect x={0} y={1490} width={1080} height={430} fill="#A9AEB5" />
      <rect x={0} y={1478} width={1080} height={22} fill="#FFFFFF" {...tr} />
    </svg>
  );
};

/** Dentro do carro: o teto, o vidro de trás com a rua passando, os bancos da frente e o retrovisor */
export const Carro: React.FC = () => {
  const frame = useCurrentFrame();
  // A rua passa devagar pelo vidro de trás (o carro andando)
  const passa = (frame * 3) % 360;
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <clipPath id="vidro-de-tras">
          <rect x={130} y={440} width={820} height={380} rx={60} />
        </clipPath>
      </defs>
      {/* O teto e as laterais do carro */}
      <rect width={1080} height={1920} fill="#4A4F5C" />
      <rect x={0} y={0} width={1080} height={400} fill="#5A6070" />
      {/* A rua lá fora, pelo vidro de trás */}
      <g clipPath="url(#vidro-de-tras)">
        <rect x={130} y={440} width={820} height={380} fill="#9ED2F6" />
        {Array.from({ length: 6 }, (_, i) => {
          const x = 130 + ((i * 180 + passa) % 1080) - 180;
          const alto = [150, 220, 180, 260, 130, 200][i];
          return <rect key={i} x={x} y={760 - alto} width={150} height={alto + 60} fill={["#C9B8A6", "#B5C3D1", "#D8C3A5", "#A9B7C6", "#CFAF9B", "#BAC8B5"][i]} {...tr} strokeWidth={5} />;
        })}
        <rect x={130} y={760} width={820} height={60} fill="#6F7580" />
      </g>
      <rect x={130} y={440} width={820} height={380} rx={60} fill="none" {...tr} strokeWidth={10} />
      {/* O retrovisor, pendurado no teto (no meio, entre as cabeças) */}
      <line x1={540} y1={400} x2={540} y2={440} stroke={TRACO} strokeWidth={8} />
      <rect x={460} y={430} width={160} height={52} rx={18} fill="#2E3340" {...tr} />
      <rect x={474} y={440} width={132} height={32} rx={12} fill="#BFE0F2" />
      {/* Os bancos da frente, atrás das pessoas (encosto e apoio de cabeça) */}
      {[320, 760].map((x) => (
        <g key={x}>
          <rect x={x - 90} y={880} width={180} height={150} rx={50} fill="#2F3440" {...tr} />
          <rect x={x - 24} y={1026} width={14} height={30} fill="#9AA0AA" />
          <rect x={x + 10} y={1026} width={14} height={30} fill="#9AA0AA" />
          <rect x={x - 170} y={1050} width={340} height={460} rx={70} fill="#363C4A" {...tr} />
          <path d={`M${x - 110} 1120 L${x - 110} 1460 M${x + 110} 1120 L${x + 110} 1460`} stroke="#2B303C" strokeWidth={8} />
        </g>
      ))}
      <rect x={0} y={1490} width={1080} height={430} fill="#2B2F3A" />
    </svg>
  );
};

/** O painel e o volante, na frente das pessoas: cobrem o colo de quem está sentado */
export const PainelDoCarro: React.FC = () => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <path d="M-20 1420 Q540 1340 1100 1420 L1100 1940 L-20 1940 Z" fill="#3B4150" {...tr} strokeWidth={8} />
    <path d="M-20 1470 Q540 1400 1100 1470" fill="none" stroke="#2B303C" strokeWidth={10} />
    {/* O rádio no meio */}
    <rect x={470} y={1430} width={140} height={74} rx={12} fill="#22262F" {...tr} strokeWidth={5} />
    <rect x={484} y={1442} width={112} height={34} rx={6} fill="#5FD0B5" />
    {/* As saídas de ar dos lados */}
    <rect x={60} y={1470} width={110} height={44} rx={12} fill="#2B303C" {...tr} strokeWidth={4} />
    <rect x={910} y={1470} width={110} height={44} rx={12} fill="#2B303C" {...tr} strokeWidth={4} />
    {/* O volante, na frente de quem está à esquerda (quem dirige) */}
    <circle cx={320} cy={1400} r={160} fill="none" stroke={TRACO} strokeWidth={46} />
    <circle cx={320} cy={1400} r={160} fill="none" stroke="#1E2129" strokeWidth={30} />
    <path d="M170 1420 L470 1420" stroke="#1E2129" strokeWidth={34} strokeLinecap="round" />
    <circle cx={320} cy={1420} r={58} fill="#2B303C" {...tr} />
    <circle cx={320} cy={1420} r={18} fill="#9AA0AA" />
  </svg>
);
