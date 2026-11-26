import React from "react";
import { useCurrentFrame } from "remotion";
import { QrCode, textoDoQr } from "../midia/QrCode";

// O contorno do kit (o mesmo TRACO do Boneco; aqui sem importar, para não fazer ciclo com ele)
const TRACO = "#2B2340";

// Objetos de apoio do molde Conversa (26/11/2026, pedido da crítica: "sem como
// desenhar objetos de apoio, terno, aliança, nas cenas"). Desenho chapado com o
// contorno #2B2340 (os estilos de traço trocam a cor dele), no espaço do
// desenho do personagem (ele tem 1000 de altura). Cada objeto aparece:
//   - na mão: o Boneco, o Liso e o Palito desenham na mão livre (a do celular
//     fica com o celular), pelo contexto ObjetoNaMaoContexto;
//   - ao lado: de pé no chão, ao lado da pessoa (os pequenos numa mesinha, as
//     roupas num cabideiro).
// O ponto (0, 0) de cada desenho é onde a mão segura.

export const APOIOS = ["alianca", "caixinha-de-alianca", "terno", "vestido-de-noiva", "buque", "bolo", "presente", "convite", "tacas"] as const;
export type TipoDeApoio = (typeof APOIOS)[number];

const OURO = "#F2C14E";
const tr = { stroke: TRACO, strokeWidth: 6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Um brilho de 4 pontas que pisca (aliança, taças) */
const Faisca: React.FC<{ x: number; y: number; r: number; fase?: number }> = ({ x, y, r, fase = 0 }) => {
  const frame = useCurrentFrame();
  const s = 0.6 + 0.4 * Math.abs(Math.sin(frame / 9 + fase));
  return <path d={`M${x} ${y - r * s} L${x + r * 0.25 * s} ${y} L${x} ${y + r * s} L${x - r * 0.25 * s} ${y} Z M${x - r * s} ${y} L${x} ${y + r * 0.25 * s} L${x + r * s} ${y} L${x} ${y - r * 0.25 * s} Z`} fill="#FFFFFF" />;
};

const Alianca: React.FC = () => (
  <g>
    <circle cx={0} cy={-34} r={24} fill="none" stroke={TRACO} strokeWidth={16} />
    <circle cx={0} cy={-34} r={24} fill="none" stroke={OURO} strokeWidth={8} />
    <path d="M-10 -62 L0 -74 L10 -62 L0 -54 Z" fill="#DDF3FF" {...tr} strokeWidth={4} />
    <Faisca x={20} y={-70} r={14} />
  </g>
);

const Caixinha: React.FC = () => (
  <g>
    {/* A tampa aberta, atrás */}
    <path d="M-40 -46 L-36 -96 L36 -96 L40 -46 Z" fill="#B23A57" {...tr} />
    <path d="M-28 -52 L-26 -86 L26 -86 L28 -52 Z" fill="#7E1F3A" />
    {/* A caixa, com o veludo e a aliança */}
    <rect x={-44} y={-48} width={88} height={48} rx={8} fill="#C9486A" {...tr} />
    <rect x={-32} y={-48} width={64} height={14} rx={6} fill="#7E1F3A" />
    <circle cx={0} cy={-56} r={15} fill="none" stroke={TRACO} strokeWidth={12} />
    <circle cx={0} cy={-56} r={15} fill="none" stroke={OURO} strokeWidth={6} />
    <path d="M-7 -74 L0 -82 L7 -74 L0 -69 Z" fill="#DDF3FF" {...tr} strokeWidth={3} />
    <Faisca x={22} y={-84} r={12} fase={1} />
  </g>
);

/** Cabide com o gancho em (0, 0) e a roupa pendurada embaixo */
const Cabide: React.FC = () => (
  <>
    <path d="M0 0 Q14 0 14 14 Q14 26 0 30" fill="none" stroke="#8E9AA3" strokeWidth={6} strokeLinecap="round" />
    <path d="M0 30 L-78 64 L78 64 Z" fill="none" stroke="#7A5230" strokeWidth={8} strokeLinejoin="round" />
  </>
);

const Terno: React.FC = () => (
  <g>
    <Cabide />
    {/* O paletó escuro, a camisa branca e a gravata */}
    <path d="M-80 66 L80 66 L92 270 L-92 270 Z" fill="#2E3550" {...tr} />
    <path d="M-28 66 L0 150 L28 66 Z" fill="#FFFFFF" {...tr} strokeWidth={5} />
    <path d="M-7 76 L7 76 L11 150 L0 166 L-11 150 Z" fill="#B23A3A" {...tr} strokeWidth={4} />
    <path d="M-30 66 L-4 170 L-50 120 Z" fill="#3B4466" {...tr} strokeWidth={5} />
    <path d="M30 66 L4 170 L50 120 Z" fill="#3B4466" {...tr} strokeWidth={5} />
    <line x1={0} y1={170} x2={0} y2={270} stroke={TRACO} strokeWidth={4} />
    <circle cx={12} cy={200} r={6} fill="#C9CED8" />
    <circle cx={12} cy={235} r={6} fill="#C9CED8" />
    <path d="M44 150 L72 150" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
  </g>
);

const Vestido: React.FC = () => (
  <g>
    <Cabide />
    <path d="M-40 66 L40 66 L46 140 L-46 140 Z" fill="#FFFFFF" {...tr} />
    <path d="M-46 140 L46 140 Q100 250 112 320 Q0 340 -112 320 Q-100 250 -46 140 Z" fill="#FFFFFF" {...tr} />
    <path d="M-46 140 Q0 156 46 140" fill="none" stroke={OURO} strokeWidth={8} strokeLinecap="round" />
    <path d="M-30 190 Q-50 260 -60 312 M20 190 Q30 260 40 318" fill="none" stroke="#E2DDF0" strokeWidth={6} strokeLinecap="round" />
  </g>
);

const Buque: React.FC = () => (
  <g>
    {/* Os talos amarrados, saindo da mão */}
    <path d="M-16 40 L-8 -60 L8 -60 L16 40 Z" fill="#5E9E4A" {...tr} />
    <path d="M-14 -16 L14 -16 L10 4 L-10 4 Z" fill="#FFFFFF" {...tr} strokeWidth={4} />
    {/* As flores */}
    {(
      [
        [-36, -86, "#F7C6D0"],
        [36, -86, "#F7C6D0"],
        [0, -112, "#FFFFFF"],
        [-24, -128, "#E86A8A"],
        [26, -126, "#FFFFFF"],
        [0, -80, "#E86A8A"],
      ] as const
    ).map(([x, y, cor], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r={26} fill={cor} {...tr} />
        <circle cx={x} cy={y} r={8} fill={OURO} />
      </g>
    ))}
    <path d="M-52 -64 Q-62 -52 -58 -40 M52 -64 Q62 -52 58 -40" fill="none" stroke="#5E9E4A" strokeWidth={10} strokeLinecap="round" />
  </g>
);

const Bolo: React.FC = () => (
  <g>
    <ellipse cx={0} cy={-4} rx={86} ry={14} fill="#E7ECEF" {...tr} />
    <rect x={-70} y={-74} width={140} height={66} rx={10} fill="#FFFFFF" {...tr} />
    <rect x={-50} y={-128} width={100} height={56} rx={10} fill="#FFFFFF" {...tr} />
    <rect x={-32} y={-174} width={64} height={48} rx={10} fill="#FFFFFF" {...tr} />
    {/* Os enfeites rosados de cada andar */}
    <path d="M-70 -56 Q-52 -42 -35 -56 Q-17 -42 0 -56 Q17 -42 35 -56 Q52 -42 70 -56" fill="none" stroke="#E86A8A" strokeWidth={6} strokeLinecap="round" />
    <path d="M-50 -110 Q-33 -98 -17 -110 Q0 -98 17 -110 Q33 -98 50 -110" fill="none" stroke="#E86A8A" strokeWidth={6} strokeLinecap="round" />
    <circle cx={0} cy={-186} r={12} fill="#E86A8A" {...tr} strokeWidth={4} />
  </g>
);

const Presente: React.FC = () => (
  <g>
    <rect x={-52} y={-90} width={104} height={90} rx={8} fill="#5B8DEF" {...tr} />
    <rect x={-60} y={-112} width={120} height={28} rx={8} fill="#7AA4F5" {...tr} />
    <rect x={-10} y={-112} width={20} height={112} fill="#F2C14E" stroke={TRACO} strokeWidth={4} />
    <path d="M0 -112 Q-40 -150 -42 -124 Q-40 -108 0 -112 Z M0 -112 Q40 -150 42 -124 Q40 -108 0 -112 Z" fill="#F2C14E" {...tr} strokeWidth={5} />
  </g>
);

/** O convite com um QR pequeno (o do site da marca; ilustrativo, pequeno demais para ler) */
const Convite: React.FC = () => {
  const qr = textoDoQr();
  return (
    <g transform="rotate(-6)">
      <rect x={-48} y={-136} width={96} height={130} rx={8} fill="#FFFDF7" {...tr} />
      <rect x={-38} y={-126} width={76} height={110} rx={4} fill="none" stroke={OURO} strokeWidth={4} />
      <path d="M-22 -112 Q0 -122 22 -112" fill="none" stroke={TRACO} strokeWidth={5} strokeLinecap="round" />
      {qr ? (
        <g transform="translate(-24 -96)">
          <QrCode texto={qr} tamanho={48} cor={TRACO} />
        </g>
      ) : (
        <path d="M-14 -80 Q0 -96 14 -80 Q0 -62 -14 -80 Z" fill="#E86A8A" />
      )}
      <path d="M-24 -36 L24 -36 M-16 -24 L16 -24" stroke="#B6ABC9" strokeWidth={5} strokeLinecap="round" />
    </g>
  );
};

const Tacas: React.FC = () => (
  <g>
    {[-1, 1].map((lado) => (
      <g key={lado} transform={`rotate(${lado * 14} 0 0)`}>
        <path d={`M${lado * 18 - 18} -130 L${lado * 18 + 18} -130 L${lado * 18 + 10} -70 Q${lado * 18} -60 ${lado * 18 - 10} -70 Z`} fill="#FFE9A8" {...tr} strokeWidth={5} />
        <path d={`M${lado * 18 - 16} -116 L${lado * 18 + 16} -116`} stroke="#FFFFFF" strokeWidth={4} opacity={0.8} />
        <line x1={lado * 18} y1={-64} x2={lado * 18} y2={-10} stroke={TRACO} strokeWidth={6} />
        <ellipse cx={lado * 18} cy={-8} rx={16} ry={5} fill="#FFFFFF" {...tr} strokeWidth={4} />
      </g>
    ))}
    <Faisca x={0} y={-146} r={16} fase={2} />
  </g>
);

const DESENHOS: Record<TipoDeApoio, React.FC> = {
  alianca: Alianca,
  "caixinha-de-alianca": Caixinha,
  terno: Terno,
  "vestido-de-noiva": Vestido,
  buque: Buque,
  bolo: Bolo,
  presente: Presente,
  convite: Convite,
  tacas: Tacas,
};

/** Os que vão pendurados (no cabide, na mão pelo gancho; ao lado, num cabideiro) */
const PENDURADOS = new Set<TipoDeApoio>(["terno", "vestido-de-noiva"]);

/** O objeto como ele é segurado (0, 0 = a mão). `escala` sobre o tamanho do personagem */
export const DesenhoDoApoio: React.FC<{ tipo: TipoDeApoio; escala?: number }> = ({ tipo, escala = 1 }) => {
  const Desenho = DESENHOS[tipo];
  return Desenho ? (
    <g transform={`scale(${escala})`}>
      <Desenho />
    </g>
  ) : null;
};

// ---- Na mão ----

/** O objeto que este personagem segura agora (o molde põe por pessoa) */
export const ObjetoNaMaoContexto = React.createContext<TipoDeApoio | null>(null);

/**
 * Desenha, na ponta do braço, o objeto do contexto (se houver). Fica dentro da
 * transformação do braço; `angulo` desvira o objeto (como o celular), para ele
 * ficar de pé qualquer que seja a pose.
 */
export const ObjetoNaMao: React.FC<{ angulo: number; y: number }> = ({ angulo, y }) => {
  const tipo = React.useContext(ObjetoNaMaoContexto);
  if (!tipo) return null;
  // O cabide pendura da mão; os outros ficam um pouco acima dela (na palma)
  const pendurado = PENDURADOS.has(tipo);
  return (
    <g transform={`translate(0 ${y}) rotate(${angulo})`}>
      <g transform={pendurado ? "translate(0 -6) scale(0.9)" : "translate(0 14)"}>
        <DesenhoDoApoio tipo={tipo} />
      </g>
    </g>
  );
};

// ---- Ao lado (de pé no chão) ----

const Mesinha: React.FC = () => (
  <g>
    <ellipse cx={0} cy={-300} rx={92} ry={20} fill="#C9A37A" {...tr} />
    <rect x={-12} y={-292} width={24} height={270} fill="#A27B54" {...tr} />
    <ellipse cx={0} cy={-14} rx={64} ry={14} fill="#A27B54" {...tr} />
  </g>
);

const Cabideiro: React.FC = () => (
  <g>
    <rect x={-9} y={-640} width={18} height={620} rx={8} fill="#8A6040" {...tr} />
    <path d="M-60 -12 L0 -40 L60 -12" fill="none" stroke="#8A6040" strokeWidth={14} strokeLinecap="round" {...{ strokeLinejoin: "round" as const }} />
    <circle cx={0} cy={-648} r={14} fill="#8A6040" {...tr} />
  </g>
);

/** Meia largura (px na tela, na escala padrão) do objeto ao lado, com o suporte: para caber inteiro */
export const metadeDaLargura = (tipo: TipoDeApoio) => (PENDURADOS.has(tipo) ? 160 : tipo === "presente" ? 100 : 90);

/** Quanto o desenho passa da mão para baixo (na mesinha, ele sobe isso) */
const BASE_NA_MESA: Partial<Record<TipoDeApoio, number>> = { buque: 60, alianca: -12 };

/**
 * O objeto de pé ao lado da pessoa, numa camada de tela cheia (1080 x 1920):
 * `x` é o meio dele e `chao` a altura dos pés na tela. Os pequenos vão numa
 * mesinha; as roupas, num cabideiro; o presente, no chão.
 */
export const ApoioAoLado: React.FC<{ tipo: TipoDeApoio; x: number; chao: number; escala?: number }> = ({ tipo, x, chao, escala = 0.9 }) => {
  const pendurado = PENDURADOS.has(tipo);
  const noChao = tipo === "presente";
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <g transform={`translate(${x} ${chao}) scale(${escala})`}>
        <ellipse cx={0} cy={0} rx={110} ry={16} fill="rgba(43,35,64,0.16)" />
        {pendurado ? (
          <>
            <Cabideiro />
            <g transform="translate(0 -630)">
              <DesenhoDoApoio tipo={tipo} escala={1.4} />
            </g>
          </>
        ) : noChao ? (
          <DesenhoDoApoio tipo={tipo} escala={1.7} />
        ) : (
          <>
            <Mesinha />
            <g transform={`translate(0 ${-316 - (BASE_NA_MESA[tipo] ?? 0)})`}>
              <DesenhoDoApoio tipo={tipo} escala={tipo === "bolo" ? 1.15 : 1.5} />
            </g>
          </>
        )}
      </g>
    </svg>
  );
};
