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
          GUARDE
        </text>
        <text x={345} y={746} textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize={20} fill="#A86166">
          A DATA
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

/** Cabeceira da cama (atrás de quem está sentado). Serve em qualquer estilo. */
export const CabeceiraDaCama: React.FC = () => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <rect x={30} y={1150} width={70} height={460} rx={20} fill="#5B4A7A" stroke={TRACO} strokeWidth={6} />
    <rect x={30} y={1150} width={70} height={60} rx={20} fill="#6E5C90" />
  </svg>
);

/** Quarto à noite (ou de dia, no fundo claro): parede, janela com a lua, criado-mudo e a cabeceira */
export const Quarto: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <rect width={1080} height={1920} fill="#D9DEF0" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={i * 124} y={0} width={62} height={1490} fill="#D2D8EC" />
        ))}
        <rect x={640} y={520} width={320} height={380} rx={14} fill="#1E2A5A" stroke={TRACO} strokeWidth={8} />
        <line x1={800} y1={520} x2={800} y2={900} stroke={TRACO} strokeWidth={7} />
        <line x1={640} y1={710} x2={960} y2={710} stroke={TRACO} strokeWidth={7} />
        <circle cx={880} cy={600} r={36} fill="#F3EBC8" />
        <circle cx={680} cy={580} r={4} fill="#fff" opacity={0.5 + 0.5 * Math.abs(Math.sin(frame / 25))} />
        <rect x={0} y={1490} width={1080} height={430} fill="#B9AFCF" />
        <rect x={0} y={1478} width={1080} height={22} fill="#FFFFFF" stroke={TRACO} strokeWidth={6} />
        <rect x={880} y={1300} width={150} height={190} rx={10} fill="#8C7BB0" stroke={TRACO} strokeWidth={6} />
        <rect x={925} y={1240} width={60} height={60} rx={8} fill="#F5D36B" stroke={TRACO} strokeWidth={5} />
      </svg>
      <CabeceiraDaCama />
    </>
  );
};

/** A cama na frente: o colchão e o cobertor cobrem as pernas de quem está sentado à esquerda */
export const CamaNaFrente: React.FC = () => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <rect x={40} y={1500} width={580} height={110} rx={18} fill="#4A3B66" stroke={TRACO} strokeWidth={6} />
    <path d="M110 1430 Q300 1380 610 1410 L610 1520 L110 1520 Z" fill="#6F7FC4" stroke={TRACO} strokeWidth={6} strokeLinejoin="round" />
    <path d="M140 1470 Q330 1440 590 1460" fill="none" stroke="#5A69AE" strokeWidth={6} strokeLinecap="round" />
  </svg>
);

/** Sala: parede, quadro, abajur e o sofá (o sofá fica na frente: use a pose sentado à esquerda) */
export const Sala: React.FC = () => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <rect width={1080} height={1920} fill="#E8DCCB" />
    <rect x={0} y={1180} width={1080} height={310} fill="#DCCDB7" />
    <rect x={140} y={560} width={300} height={220} rx={10} fill="#9CC3B4" stroke={TRACO} strokeWidth={8} />
    <path d="M170 740 L250 640 L310 700 L360 650 L410 740 Z" fill="#6F9E8C" />
    <rect x={700} y={520} width={300} height={380} rx={14} fill="#2E3A66" stroke={TRACO} strokeWidth={8} />
    <circle cx={900} cy={600} r={32} fill="#F3EBC8" />
    <rect x={0} y={1490} width={1080} height={430} fill="#B98F6A" />
    <rect x={0} y={1478} width={1080} height={22} fill="#FFFFFF" stroke={TRACO} strokeWidth={6} />
    <line x1={930} y1={1060} x2={930} y2={1478} stroke={TRACO} strokeWidth={8} />
    <path d="M870 1060 L990 1060 L960 980 L900 980 Z" fill="#F5D36B" stroke={TRACO} strokeWidth={6} strokeLinejoin="round" />
    <path d="M30 1290 Q30 1220 100 1220 L600 1220 Q670 1220 670 1290 L670 1340 L30 1340 Z" fill="#7A5C9E" stroke={TRACO} strokeWidth={6} />
  </svg>
);

/** O sofá na frente: o assento e os braços cobrem as pernas de quem está sentado à esquerda */
export const SofaNaFrente: React.FC = () => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <rect x={20} y={1410} width={660} height={160} rx={28} fill="#8D6DB5" stroke={TRACO} strokeWidth={6} />
    <rect x={0} y={1300} width={90} height={280} rx={36} fill="#7A5C9E" stroke={TRACO} strokeWidth={6} />
    <rect x={610} y={1300} width={90} height={280} rx={36} fill="#7A5C9E" stroke={TRACO} strokeWidth={6} />
    <rect x={60} y={1570} width={26} height={40} fill={TRACO} />
    <rect x={614} y={1570} width={26} height={40} fill={TRACO} />
  </svg>
);

/** Cozinha: azulejos, bancada com a pia e a geladeira à direita (de onde a criatura pode sair) */
export const Cozinha: React.FC = () => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <rect width={1080} height={1920} fill="#E3EEF2" />
    {Array.from({ length: 10 }, (_, i) =>
      Array.from({ length: 6 }, (_, j) => <rect key={`${i}-${j}`} x={i * 110} y={900 + j * 70} width={106} height={66} fill="#D3E3EA" />),
    )}
    <rect x={40} y={1180} width={560} height={310} fill="#C9A37A" stroke={TRACO} strokeWidth={6} />
    <rect x={30} y={1160} width={580} height={30} rx={6} fill="#EDEDED" stroke={TRACO} strokeWidth={6} />
    <rect x={200} y={1166} width={160} height={14} rx={6} fill="#B8C7CF" />
    <path d="M280 1160 L280 1100 Q280 1080 300 1080 L330 1080" fill="none" stroke={TRACO} strokeWidth={8} strokeLinecap="round" />
    <rect x={740} y={760} width={280} height={730} rx={26} fill="#F4F6F8" stroke={TRACO} strokeWidth={8} />
    <line x1={740} y1={1010} x2={1020} y2={1010} stroke={TRACO} strokeWidth={6} />
    {/* Puxadores na borda de fora, em cinza: perto do meio pareciam uma haste saindo da cabeça de quem fica à direita */}
    <rect x={988} y={820} width={12} height={140} rx={6} fill="#8E9AA3" stroke={TRACO} strokeWidth={3} />
    <rect x={988} y={1050} width={12} height={180} rx={6} fill="#8E9AA3" stroke={TRACO} strokeWidth={3} />
    <rect x={0} y={1490} width={1080} height={430} fill="#CFC3B5" />
    <rect x={0} y={1478} width={1080} height={22} fill="#FFFFFF" stroke={TRACO} strokeWidth={6} />
  </svg>
);

/** Banheiro: azulejos, a pia e o espelho à direita (de onde a criatura pode sair) */
export const Banheiro: React.FC = () => (
  <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <rect width={1080} height={1920} fill="#DDEAF0" />
    {Array.from({ length: 12 }, (_, i) =>
      Array.from({ length: 22 }, (_, j) => <rect key={`${i}-${j}`} x={i * 92} y={j * 68} width={88} height={64} fill="#D0E1E9" />),
    )}
    <rect x={660} y={560} width={340} height={460} rx={170} fill="#BFD7EA" stroke={TRACO} strokeWidth={10} />
    <path d="M720 700 Q760 640 820 620" fill="none" stroke="#FFFFFF" strokeWidth={14} strokeLinecap="round" opacity={0.7} />
    <rect x={680} y={1150} width={300} height={60} rx={20} fill="#F4F6F8" stroke={TRACO} strokeWidth={8} />
    <rect x={790} y={1210} width={80} height={280} fill="#E7ECEF" stroke={TRACO} strokeWidth={6} />
    <rect x={0} y={1490} width={1080} height={430} fill="#9FB7C4" />
    <rect x={0} y={1478} width={1080} height={22} fill="#FFFFFF" stroke={TRACO} strokeWidth={6} />
  </svg>
);

export const CENARIOS = { atelie: Atelie, escritorio: Escritorio, cafe: Cafe, quarto: Quarto, sala: Sala, cozinha: Cozinha, banheiro: Banheiro } as const;

/** Objetos do cenário de onde uma criatura pode sair (ponto na tela, 1080x1920) */
export const ORIGEM_NO_CENARIO: Partial<Record<keyof typeof CENARIOS, { objeto: string; x: number; y: number }>> = {
  cozinha: { objeto: "geladeira", x: 880, y: 1120 },
  banheiro: { objeto: "espelho", x: 830, y: 790 },
};
/** O que fica na frente dos personagens em alguns cenários (a cama do quarto) */
export const FRENTE_DO_CENARIO: Partial<Record<keyof typeof CENARIOS, React.FC>> = { quarto: CamaNaFrente, sala: SofaNaFrente };
export type NomeDoCenario = keyof typeof CENARIOS;

// ---- Cenários criados pela equipe ----
// Um lugar que o kit não tem (igreja, praia, carro...) a designer desenha em SVG
// no mesmo espaço (1080 x 1920, chão em y 1490, contorno #2B2340 para os
// estilos de traço trocarem a cor), confere a ficha (npm run cenario) e grava no
// canal. O roteiro recebe o desenho em "cenariosProprios" (npm run cenarios).

export type CenarioProprio = {
  id: string;
  nome: string;
  /** Tudo atrás das pessoas (SVG, só formas) */
  fundo: string;
  /** O que cobre as pernas de quem está sentado (encosto do banco, mesa, volante) */
  frente?: string;
  /** De onde uma criatura pode sair (um objeto do cenário), na tela */
  origem?: { objeto: string; x: number; y: number };
};

/** Os cenários do kit sem móveis da história: nos estilos de traço, só o fundo do estilo */
export const CENARIOS_SEM_HISTORIA = ["atelie", "escritorio", "cafe"];
export const ehCenarioDoKit = (nome: string): nome is NomeDoCenario => nome in CENARIOS;

const desenhos = new Map<string, React.FC>();
/** Um pedaço de SVG da equipe como camada de tela cheia (guardado: não remonta a cada quadro) */
function camadaDesenhada(chave: string, svg: string, frente: boolean): React.FC {
  const guardado = desenhos.get(chave);
  if (guardado) return guardado;
  const Camada: React.FC = () => (
    <svg
      viewBox="0 0 1080 1920"
      width={1080}
      height={1920}
      style={{ position: "absolute", inset: 0, ...(frente ? { pointerEvents: "none" as const } : {}) }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
  desenhos.set(chave, Camada);
  return Camada;
}

export type CenarioResolvido = { nome: string; Cenario: React.FC; Frente?: React.FC; origem?: { objeto: string; x: number; y: number } };

/** O cenário pelo nome: um do kit ou um criado pela equipe (sem achar: o ateliê) */
export function resolverCenario(nome: string | undefined, proprios: CenarioProprio[] = []): CenarioResolvido {
  const pedido = nome ?? "atelie";
  if (ehCenarioDoKit(pedido)) return { nome: pedido, Cenario: CENARIOS[pedido], Frente: FRENTE_DO_CENARIO[pedido], origem: ORIGEM_NO_CENARIO[pedido] };
  const proprio = proprios.find((c) => c.id === pedido);
  if (!proprio) return resolverCenario("atelie");
  const chave = `${proprio.id}:${proprio.fundo.length}:${proprio.frente?.length ?? 0}`;
  return {
    nome: proprio.id,
    Cenario: camadaDesenhada(`f:${chave}`, proprio.fundo, false),
    Frente: proprio.frente ? camadaDesenhada(`r:${chave}`, proprio.frente, true) : undefined,
    origem: proprio.origem,
  };
}
