import React from "react";
import { useCurrentFrame } from "remotion";
import { TRACO } from "../personagens/Boneco";
import { Atelie } from "./Atelie";

// Cenários 9:16 em vetor para o molde Conversa. Todos deixam o chão em
// y ≈ 1490 e o meio da tela livre, onde ficam os personagens.

const Piso: React.FC<{ cor: string; linha: string; tapete?: string }> = ({ cor, linha, tapete }) => (
  <>
    <rect x={0} y={1490} width={1080} height={430} fill={cor} />
    {[1580, 1680, 1790].map((y) => (
      <line key={y} x1={0} y1={y} x2={1080} y2={y} stroke={linha} strokeWidth={5} />
    ))}
    <rect x={0} y={1478} width={1080} height={22} fill="#FFFFFF" stroke={TRACO} strokeWidth={6} />
    {tapete && <ellipse cx={540} cy={1690} rx={430} ry={90} fill={tapete} stroke={TRACO} strokeWidth={6} opacity={0.9} />}
  </>
);

/** Escritório da Bia: mesa com notebook, calendário com a data marcada e mural de fotos */
export const Escritorio: React.FC = () => {
  const frame = useCurrentFrame();
  const brilho = 0.5 + 0.5 * Math.sin(frame / 20);
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <rect width={1080} height={1920} fill="#DFF3EC" />
      {Array.from({ length: 20 }, (_, i) =>
        Array.from({ length: 16 }, (_, j) => <circle key={`${i}-${j}`} cx={30 + i * 56 + (j % 2) * 28} cy={40 + j * 92} r={5} fill="#C9E9DE" />),
      )}

      {/* Mural de cortiça com fotos */}
      <rect x={90} y={520} width={360} height={280} rx={14} fill="#D9A877" stroke={TRACO} strokeWidth={7} />
      {[
        { x: 120, y: 545, r: -6, c: "#F6B8B0" },
        { x: 240, y: 560, r: 5, c: "#B9A6F0" },
        { x: 335, y: 548, r: -3, c: "#8FD3C1" },
        { x: 150, y: 670, r: 4, c: "#F5D36B" },
      ].map((f, i) => (
        <g key={i} transform={`rotate(${f.r} ${f.x + 45} ${f.y + 50})`}>
          <rect x={f.x} y={f.y} width={90} height={100} fill="#FFFFFF" stroke={TRACO} strokeWidth={5} />
          <rect x={f.x + 10} y={f.y + 10} width={70} height={60} fill={f.c} />
          <circle cx={f.x + 45} cy={f.y - 2} r={7} fill="#E0567A" stroke={TRACO} strokeWidth={3} />
        </g>
      ))}
      <g transform="rotate(3 330 720)">
        <rect x={270} y={680} width={150} height={90} fill="#FFFFFF" stroke={TRACO} strokeWidth={5} />
        <text x={345} y={718} textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize={20} fill="#A86166">
          SAVE THE
        </text>
        <text x={345} y={746} textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize={20} fill="#A86166">
          DATE
        </text>
      </g>

      {/* Calendário com a data circulada */}
      <g>
        <rect x={650} y={500} width={300} height={320} rx={16} fill="#FFFFFF" stroke={TRACO} strokeWidth={7} />
        <rect x={650} y={500} width={300} height={70} rx={16} fill="#A86166" stroke={TRACO} strokeWidth={7} />
        {Array.from({ length: 4 }, (_, l) =>
          Array.from({ length: 5 }, (_, c) => <rect key={`${l}-${c}`} x={680 + c * 52} y={600 + l * 52} width={36} height={36} rx={6} fill="#F1ECE6" />),
        )}
        <circle cx={854} cy={722} r={30} fill="none" stroke="#E0567A" strokeWidth={7} opacity={0.6 + 0.4 * brilho} />
      </g>

      {/* Mesa com notebook e caneca */}
      <rect x={560} y={1150} width={480} height={30} rx={10} fill="#E3B98F" stroke={TRACO} strokeWidth={7} />
      <rect x={590} y={1180} width={24} height={300} fill="#E3B98F" stroke={TRACO} strokeWidth={6} />
      <rect x={986} y={1180} width={24} height={300} fill="#E3B98F" stroke={TRACO} strokeWidth={6} />
      <path d="M700 1150 L720 1040 L900 1040 L880 1150 Z" fill="#8C93A8" stroke={TRACO} strokeWidth={6} strokeLinejoin="round" />
      <path d="M730 1060 L885 1060 L870 1135 L716 1135 Z" fill="#BDEBDD" opacity={0.6 + 0.4 * brilho} />
      <rect x={940} y={1090} width={56} height={60} rx={8} fill="#F59E8B" stroke={TRACO} strokeWidth={6} />
      <path d="M996 1105 Q1022 1118 996 1135" fill="none" stroke={TRACO} strokeWidth={6} />

      <Piso cor="#D8C3A5" linha="#C6AE8E" tapete="#BFE3D6" />
    </svg>
  );
};

/** Café: balcão com máquina de café, lousa do cardápio e luminárias */
export const Cafe: React.FC = () => {
  const frame = useCurrentFrame();
  const fumaca = (frame % 60) / 60;
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <rect width={1080} height={1920} fill="#FFF1D6" />
      {/* Tijolinhos na parte de baixo da parede */}
      {Array.from({ length: 9 }, (_, l) =>
        Array.from({ length: 12 }, (_, c) => (
          <rect key={`${l}-${c}`} x={c * 100 - (l % 2) * 50} y={1080 + l * 44} width={92} height={36} rx={4} fill="#F2CDA8" />
        )),
      )}

      {/* Luminárias */}
      {[220, 540, 860].map((x, i) => (
        <g key={x} transform={`rotate(${Math.sin(frame / 25 + i) * 2} ${x} 0)`}>
          <line x1={x} y1={0} x2={x} y2={420} stroke={TRACO} strokeWidth={5} />
          <path d={`M${x - 60} 480 Q${x} 400 ${x + 60} 480 Z`} fill="#7CC5A8" stroke={TRACO} strokeWidth={6} />
          <circle cx={x} cy={488} r={12} fill="#FFE08A" />
        </g>
      ))}

      {/* Lousa do cardápio */}
      <rect x={110} y={580} width={400} height={330} rx={14} fill="#3B4A44" stroke={TRACO} strokeWidth={8} />
      <text x={310} y={650} textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize={44} fill="#FFFFFF">
        CAFÉ
      </text>
      {[700, 750, 800, 850].map((y, i) => (
        <g key={y}>
          <rect x={150} y={y} width={180 - i * 20} height={14} rx={7} fill="#FFFFFF" opacity={0.7} />
          <rect x={410} y={y} width={60} height={14} rx={7} fill="#F5D36B" opacity={0.9} />
        </g>
      ))}

      {/* Balcão com a máquina de café */}
      <rect x={600} y={900} width={420} height={160} rx={12} fill="#FFFFFF" stroke={TRACO} strokeWidth={7} />
      <rect x={640} y={790} width={200} height={110} rx={12} fill="#C9CED6" stroke={TRACO} strokeWidth={6} />
      <rect x={700} y={900} width={80} height={14} fill={TRACO} />
      <rect x={880} y={840} width={60} height={60} rx={8} fill="#F59E8B" stroke={TRACO} strokeWidth={6} />
      {[0, 1].map((i) => {
        const p = (fumaca + i * 0.5) % 1;
        return <circle key={i} cx={910 + Math.sin(p * 6) * 6} cy={830 - p * 70} r={8 + p * 8} fill="#FFFFFF" opacity={1 - p} />;
      })}
      <rect x={600} y={1060} width={420} height={420} fill="#B5835A" stroke={TRACO} strokeWidth={7} />
      {[680, 800, 920].map((x) => (
        <line key={x} x1={x} y1={1070} x2={x} y2={1470} stroke="#9C6E48" strokeWidth={6} />
      ))}

      {/* Planta no canto */}
      <path d="M60 1480 L150 1480 L140 1400 L70 1400 Z" fill="#F5D36B" stroke={TRACO} strokeWidth={6} strokeLinejoin="round" />
      {["M105 1400 C70 1320 60 1260 90 1220 C120 1270 120 1340 105 1400 Z", "M105 1400 C140 1330 170 1300 195 1295 C185 1350 150 1390 105 1400 Z"].map((d) => (
        <path key={d} d={d} fill="#7CC5A8" stroke={TRACO} strokeWidth={6} strokeLinejoin="round" />
      ))}

      <Piso cor="#C98F63" linha="#B57D53" />
    </svg>
  );
};

export const CENARIOS = { atelie: Atelie, escritorio: Escritorio, cafe: Cafe } as const;
export type NomeDoCenario = keyof typeof CENARIOS;
