import React from "react";
import { useCurrentFrame } from "remotion";
import { TRACO } from "../personagens/Boneco";

// Cenário 9:16 em vetor: ateliê de festas com bandeirinhas, janela de dia,
// prateleira com presentes e piso de madeira. Mexe pouco (bandeirinhas,
// cortina e nuvens) para a cena não ficar parada.

const CORES_BANDEIRA = ["#F59E8B", "#F5D36B", "#8FD3C1", "#B9A6F0"];

export const Atelie: React.FC = () => {
  const frame = useCurrentFrame();
  const vento = Math.sin(frame / 18);
  const bandeiras = Array.from({ length: 13 }, (_, i) => {
    const t = (i + 0.5) / 13;
    const x = 40 + t * 1000;
    const y = 440 + Math.sin(t * Math.PI) * 70;
    return { x, y, cor: CORES_BANDEIRA[i % CORES_BANDEIRA.length], giro: Math.sin(frame / 14 + i) * 5 };
  });
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {/* Parede com listras */}
      <rect width={1080} height={1920} fill="#FBE7DA" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 96} y={0} width={48} height={1500} fill="#F7DCCB" />
      ))}

      {/* Janela */}
      <g>
        <rect x={630} y={560} width={340} height={420} rx={10} fill="#CFEAF7" stroke={TRACO} strokeWidth={8} />
        <circle cx={880} cy={650} r={36} fill="#FFE08A" />
        {[0, 1].map((i) => {
          const x = 660 + ((frame * 0.6 + i * 170) % 380) - 40;
          return (
            <g key={i} fill="#FFFFFF">
              <ellipse cx={x} cy={760 + i * 90} rx={50} ry={20} />
              <ellipse cx={x + 30} cy={748 + i * 90} rx={34} ry={20} />
            </g>
          );
        })}
        <line x1={800} y1={560} x2={800} y2={980} stroke={TRACO} strokeWidth={8} />
        <line x1={630} y1={770} x2={970} y2={770} stroke={TRACO} strokeWidth={8} />
        <rect x={610} y={970} width={380} height={26} rx={8} fill="#FFFFFF" stroke={TRACO} strokeWidth={6} />
        <line x1={590} y1={540} x2={1000} y2={540} stroke={TRACO} strokeWidth={10} strokeLinecap="round" />
        <path d={`M600 540 L700 540 Q${690 + vento * 6} 760 ${660 + vento * 10} 1000 L600 1000 Z`} fill="#F6B8B0" stroke={TRACO} strokeWidth={6} strokeLinejoin="round" />
        <path d={`M990 540 L900 540 Q${910 - vento * 6} 760 ${940 - vento * 10} 1000 L990 1000 Z`} fill="#F6B8B0" stroke={TRACO} strokeWidth={6} strokeLinejoin="round" />
      </g>

      {/* Quadro de coração e prateleira com presentes */}
      <g>
        <rect x={110} y={560} width={220} height={170} rx={10} fill="#FFFFFF" stroke={TRACO} strokeWidth={7} />
        <path d="M220 690 C160 650 160 600 195 600 C210 600 220 612 220 620 C220 612 230 600 245 600 C280 600 280 650 220 690 Z" fill="#F59E8B" />
        <rect x={70} y={860} width={400} height={22} rx={8} fill="#E3B98F" stroke={TRACO} strokeWidth={6} />
        <rect x={100} y={790} width={80} height={70} rx={6} fill="#B9A6F0" stroke={TRACO} strokeWidth={6} />
        <rect x={132} y={790} width={16} height={70} fill="#F5D36B" />
        <rect x={200} y={815} width={60} height={45} rx={6} fill="#8FD3C1" stroke={TRACO} strokeWidth={6} />
        {/* Bolo de casamento */}
        <rect x={300} y={800} width={110} height={60} rx={8} fill="#FFFFFF" stroke={TRACO} strokeWidth={6} />
        <rect x={320} y={758} width={70} height={44} rx={8} fill="#FFFFFF" stroke={TRACO} strokeWidth={6} />
        <path d="M300 826 Q328 840 355 826 Q382 840 410 826" fill="none" stroke="#F59E8B" strokeWidth={6} />
        <circle cx={355} cy={748} r={10} fill="#F59E8B" stroke={TRACO} strokeWidth={4} />
      </g>

      {/* Bandeirinhas */}
      <path d="M40 440 Q540 580 1040 440" fill="none" stroke={TRACO} strokeWidth={5} />
      {bandeiras.map((b, i) => (
        <path
          key={i}
          d={`M${b.x - 30} ${b.y} L${b.x + 30} ${b.y} L${b.x} ${b.y + 64} Z`}
          fill={b.cor}
          stroke={TRACO}
          strokeWidth={5}
          strokeLinejoin="round"
          transform={`rotate(${b.giro} ${b.x} ${b.y})`}
        />
      ))}

      {/* Piso */}
      <rect x={0} y={1490} width={1080} height={430} fill="#E9C39D" />
      {[1580, 1680, 1790].map((y) => (
        <line key={y} x1={0} y1={y} x2={1080} y2={y} stroke="#D9AE84" strokeWidth={5} />
      ))}
      <rect x={0} y={1478} width={1080} height={22} fill="#FFFFFF" stroke={TRACO} strokeWidth={6} />
      <ellipse cx={540} cy={1690} rx={430} ry={90} fill="#F3B6C2" stroke={TRACO} strokeWidth={6} opacity={0.9} />

      {/* Planta */}
      <g transform={`rotate(${vento * 1.5} 960 1500)`}>
        {[
          "M960 1420 C900 1330 880 1250 920 1200 C960 1260 970 1340 960 1420 Z",
          "M960 1420 C1000 1320 1040 1270 1070 1260 C1060 1330 1010 1390 960 1420 Z",
          "M960 1420 C920 1380 860 1360 830 1370 C850 1410 910 1430 960 1420 Z",
        ].map((d) => (
          <path key={d} d={d} fill="#7CC5A8" stroke={TRACO} strokeWidth={6} strokeLinejoin="round" />
        ))}
      </g>
      <path d="M900 1410 L1020 1410 L1005 1510 L915 1510 Z" fill="#F5D36B" stroke={TRACO} strokeWidth={6} strokeLinejoin="round" />
    </svg>
  );
};
