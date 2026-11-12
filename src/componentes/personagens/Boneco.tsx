import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

// Personagem de corpo inteiro, desenhado em vetor e montado em peças (cabeça,
// olhos, sobrancelhas, boca, braços com cotovelo), no estilo 2D chapado com
// contorno. Cada personagem segue uma linha do tempo de "momentos" (pose +
// expressão); a troca de pose é animada com mola e a boca mexe nas palavras.
//
// Com a narração, a boca usa as formas do Rhubarb ("boca"); sem ela, abre e
// fecha no tempo das palavras.

export const TRACO = "#2B2340";
const BOCA_ESCURA = "#5A1F2B";
const LINGUA = "#E0607A";
const BOCHECHA = "#FF8FA3";

export type Expressao = "neutra" | "feliz" | "radiante" | "preocupada" | "surpresa" | "brava" | "sem-graca";
export type Pose = "normal" | "cintura" | "celular" | "cabeca" | "explicando" | "comemorando" | "pensando";
export type Momento = { em: number; pose: Pose; expressao: Expressao };
/** Intervalo de uma palavra dita pelo personagem, em quadros */
export type Palavra = { inicio: number; fim: number };
/** Forma da boca (Rhubarb) a partir de um quadro */
export type FormaDaBoca = { quadro: number; forma: string };

/**
 * Desenho próprio do personagem (feito pela agente designer-de-personagens a
 * partir dos exemplos do dono): pedaços de SVG no mesmo espaço do Boneco
 * (viewBox -100 0 600 1000; cabeça em torno de (200, 232), pescoço em
 * y 320-375, ombros em (128, 392) e (272, 392), quadril em y 640, pés em
 * y 940). Os braços continuam do kit, nas cores do `visual`, para as poses
 * funcionarem. Guia: src/componentes/personagens/desenho/GUIA.md.
 */
export type Desenho = {
  /** Atrás de tudo (cabelo de trás, capa, rabo) */
  atras?: string;
  /** Tronco, pernas, sapatos e roupa (sem os braços) */
  corpo: string;
  /** Cabeça sem olhos nem boca: rosto, orelhas, cabelo da frente, chapéu, bigode */
  cabeca: string;
  olhos: { abertos: string; fechados: string };
  bocas: { fechada: string; aberta: string; sorriso: string; triste?: string };
  /** false = o desenho já tem sobrancelhas (ou não usa); senão o kit desenha */
  sobrancelhas?: boolean;
};

const BOCA_ABERTA = new Set(["C", "D", "E", "H"]);

function pecasDoRosto(desenho: Desenho, expressao: Expressao, forma: string | null, piscando: boolean) {
  const olhos = piscando || expressao === "radiante" ? desenho.olhos.fechados : desenho.olhos.abertos;
  let boca: string;
  if (forma) boca = BOCA_ABERTA.has(forma) ? desenho.bocas.aberta : desenho.bocas.fechada;
  else if (expressao === "feliz" || expressao === "radiante") boca = desenho.bocas.sorriso;
  else if (expressao === "surpresa") boca = desenho.bocas.aberta;
  else if (expressao === "preocupada" || expressao === "sem-graca") boca = desenho.bocas.triste ?? desenho.bocas.fechada;
  else boca = desenho.bocas.fechada;
  return { olhos, boca };
}

const Svg: React.FC<{ html?: string }> = ({ html }) => (html ? <g dangerouslySetInnerHTML={{ __html: html }} /> : null);

export const PENTEADOS = ["ondulado", "chanel", "curto", "coque"] as const;
export type Penteado = (typeof PENTEADOS)[number];

export type Visual = {
  pele: string;
  cabelo: string;
  roupa: string;
  calca: string;
  sapato: string;
  penteado: Penteado;
  /** "faixa-noiva" = blusa com a faixa "NOIVA" (o jeito antigo; prefira blusa + faixa) */
  roupaEstilo: "blusa" | "blazer" | "faixa-noiva";
  /** Texto de uma faixa atravessada no peito (até 12 letras), ex.: "NOIVA", "MADRINHA" */
  faixa?: string;
  mangaLonga?: boolean;
  oculos?: boolean;
  tiara?: boolean;
};

// Ângulos de cada braço: [ombro, cotovelo] em graus. 0 = para baixo; positivo =
// para fora do corpo. O cotovelo é relativo ao braço.
type Angulos = [number, number];
const POSES: Record<Pose, { esq: Angulos; dir: Angulos }> = {
  normal: { esq: [10, -6], dir: [10, -6] },
  cintura: { esq: [10, -6], dir: [42, -100] },
  celular: { esq: [10, -6], dir: [6, -125] },
  cabeca: { esq: [150, 51], dir: [150, 51] },
  explicando: { esq: [10, -6], dir: [25, 95] },
  comemorando: { esq: [150, 15], dir: [150, 15] },
  pensando: { esq: [10, -6], dir: [-66, -130] },
};

// Formas da boca (as mesmas letras do Rhubarb), no tamanho do rosto
const FORMAS: Record<string, { l: number; a: number; dentes?: boolean; lingua?: boolean }> = {
  A: { l: 14, a: 2 },
  B: { l: 17, a: 6, dentes: true },
  C: { l: 19, a: 11, lingua: true },
  D: { l: 22, a: 16, lingua: true },
  E: { l: 14, a: 12 },
  F: { l: 9, a: 9 },
  G: { l: 17, a: 5, dentes: true },
  H: { l: 17, a: 12, lingua: true },
};
const FALANDO = ["C", "B", "D", "B", "E", "C", "F", "B", "A"];

function formaDoRhubarb(boca: FormaDaBoca[], frame: number) {
  let forma: string | null = null;
  for (const b of boca) {
    if (b.quadro > frame) break;
    forma = b.forma === "X" ? null : b.forma;
  }
  return forma;
}

const OMBRO = { x: 128, y: 392 };
const BRACO = 112;

function estadoAgora(momentos: Momento[], frame: number, fps: number) {
  let i = 0;
  momentos.forEach((m, k) => {
    if (m.em <= frame) i = k;
  });
  const atual = momentos[i];
  const antes = momentos[Math.max(0, i - 1)];
  const p = i === 0 ? 1 : spring({ frame: frame - atual.em, fps, config: { damping: 13, stiffness: 140 } });
  const de = POSES[antes.pose];
  const para = POSES[atual.pose];
  const mistura = (x: Angulos, y: Angulos): Angulos => [x[0] + (y[0] - x[0]) * p, x[1] + (y[1] - x[1]) * p];
  // Pulinho quando a expressão muda: o personagem "reage"
  const desde = frame - atual.em;
  const pulo = i > 0 && antes.expressao !== atual.expressao && desde < 12 ? -Math.sin((desde / 12) * Math.PI) * 18 : 0;
  return { esq: mistura(de.esq, para.esq), dir: mistura(de.dir, para.dir), expressao: atual.expressao, pose: atual.pose, pulo };
}

const Celular: React.FC = () => (
  <g>
    <rect x={-24} y={-44} width={48} height={80} rx={9} fill={TRACO} />
    <rect x={-18} y={-37} width={36} height={64} rx={5} fill="#BDEBDD" />
    <rect x={-12} y={-28} width={24} height={5} rx={2} fill="#fff" />
    <rect x={-12} y={-18} width={18} height={5} rx={2} fill="#fff" />
    <rect x={-12} y={-8} width={22} height={5} rx={2} fill="#fff" />
  </g>
);

const Braco: React.FC<{
  angulos: Angulos;
  visual: Visual;
  camada: "contorno" | "cor";
  celular?: boolean;
}> = ({ angulos: [ombro, cotovelo], visual, camada, celular }) => {
  const contorno = camada === "contorno";
  const largura = contorno ? 46 : 34;
  const corBraco = contorno ? TRACO : visual.roupa;
  const corAntebraco = contorno ? TRACO : visual.mangaLonga ? visual.roupa : visual.pele;
  return (
    <g transform={`translate(${OMBRO.x} ${OMBRO.y}) rotate(${ombro})`}>
      <line x1={0} y1={0} x2={0} y2={BRACO} stroke={corBraco} strokeWidth={largura} strokeLinecap="round" />
      <g transform={`translate(0 ${BRACO}) rotate(${cotovelo})`}>
        <line x1={0} y1={0} x2={0} y2={BRACO} stroke={corAntebraco} strokeWidth={largura} strokeLinecap="round" />
        {!contorno && visual.mangaLonga && <circle cx={0} cy={BRACO - 4} r={15} fill={visual.roupa} />}
        <circle cx={0} cy={BRACO + 10} r={contorno ? 25 : 19} fill={contorno ? TRACO : visual.pele} />
        {celular && !contorno && (
          <g transform={`translate(0 ${BRACO + 2}) rotate(${-(ombro + cotovelo)})`}>
            <Celular />
          </g>
        )}
      </g>
    </g>
  );
};

// Os dois braços: o direito é o esquerdo espelhado no meio do corpo (x = 200)
const Bracos: React.FC<{ esq: Angulos; dir: Angulos; visual: Visual; celular: boolean }> = ({ esq, dir, visual, celular }) => (
  <>
    {(["contorno", "cor"] as const).map((camada) => (
      <g key={camada}>
        <Braco angulos={esq} visual={visual} camada={camada} />
        <g transform="translate(400 0) scale(-1 1)">
          <Braco angulos={dir} visual={visual} camada={camada} celular={celular} />
        </g>
      </g>
    ))}
  </>
);

const contornoDoCabelo = (visual: Visual) => ({ fill: visual.cabelo, stroke: TRACO, strokeWidth: 6, strokeLinejoin: "round" as const });

// Cabelo atrás da cabeça (o curto não tem)
const CabeloAtras: React.FC<{ visual: Visual }> = ({ visual }) => {
  const estilo = contornoDoCabelo(visual);
  switch (visual.penteado) {
    case "ondulado":
      return (
        <path
          d="M92 210 C70 120 130 96 200 96 C270 96 330 120 308 210 C318 260 300 300 326 340 C346 380 318 430 290 420 C270 412 276 370 262 330 L138 330 C124 370 130 412 110 420 C82 430 54 380 74 340 C100 300 82 260 92 210 Z"
          {...estilo}
        />
      );
    case "chanel":
      return <path d="M86 236 C78 112 136 98 200 98 C264 98 322 112 314 236 L318 326 C290 342 110 342 82 326 Z" {...estilo} />;
    case "coque":
      return (
        <>
          <circle cx={200} cy={86} r={46} {...estilo} />
          <path d="M90 230 C80 116 136 100 200 100 C264 100 320 116 310 230 Z" {...estilo} />
        </>
      );
    default:
      return null;
  }
};

// Cabelo na frente (franja, topo)
const CabeloFrente: React.FC<{ visual: Visual }> = ({ visual }) => {
  const estilo = contornoDoCabelo(visual);
  switch (visual.penteado) {
    case "ondulado":
      return (
        <path
          d="M94 222 C92 128 140 104 200 104 C264 104 308 128 306 214 C286 168 248 150 214 160 C186 190 140 186 118 172 C104 186 98 204 94 222 Z"
          {...estilo}
        />
      );
    case "chanel":
      return <path d="M94 218 C94 122 140 102 200 102 C260 102 306 122 306 218 L298 190 C250 180 150 180 102 190 Z" {...estilo} />;
    case "curto":
      return (
        <path
          d="M96 206 C88 120 136 92 200 92 C266 92 314 120 304 206 C298 176 284 158 262 150 C240 162 214 160 196 150 C170 162 138 160 120 154 C106 166 100 184 96 206 Z"
          {...estilo}
        />
      );
    default:
      return <path d="M94 214 C92 120 140 100 200 100 C262 100 308 120 306 214 C300 170 262 142 200 142 C138 142 100 170 94 214 Z" {...estilo} />;
  }
};

const Sobrancelhas: React.FC<{ expressao: Expressao }> = ({ expressao }) => {
  const caminhos: Record<Expressao, [string, string]> = {
    neutra: ["M140 204 Q160 197 180 203", "M220 203 Q240 197 260 204"],
    feliz: ["M140 196 Q160 187 180 194", "M220 194 Q240 187 260 196"],
    radiante: ["M140 192 Q160 182 180 190", "M220 190 Q240 182 260 192"],
    preocupada: ["M140 206 Q160 202 180 192", "M220 192 Q240 202 260 206"],
    surpresa: ["M140 186 Q160 174 180 184", "M220 184 Q240 174 260 186"],
    brava: ["M140 194 Q162 198 182 210", "M218 210 Q238 198 260 194"],
    "sem-graca": ["M140 202 Q160 196 180 200", "M220 200 Q240 196 260 202"],
  };
  return (
    <>
      {caminhos[expressao].map((d) => (
        <path key={d} d={d} fill="none" stroke={TRACO} strokeWidth={8} strokeLinecap="round" />
      ))}
    </>
  );
};

const Olhos: React.FC<{ expressao: Expressao; piscando: boolean }> = ({ expressao, piscando }) => (
  <>
    {[160, 240].map((x) => {
      if (expressao === "radiante")
        return <path key={x} d={`M${x - 14} 250 Q${x} 234 ${x + 14} 250`} fill="none" stroke={TRACO} strokeWidth={7} strokeLinecap="round" />;
      if (piscando) return <path key={x} d={`M${x - 13} 246 Q${x} 252 ${x + 13} 246`} fill="none" stroke={TRACO} strokeWidth={6} strokeLinecap="round" />;
      const grande = expressao === "surpresa";
      // Sem graça: olha para o lado
      const olhar = expressao === "sem-graca" ? 7 : 0;
      return (
        <g key={x}>
          <ellipse cx={x + olhar} cy={244} rx={grande ? 15 : 13} ry={grande ? 20 : 17} fill={TRACO} />
          <circle cx={x + olhar + 4} cy={237} r={5} fill="#fff" />
        </g>
      );
    })}
  </>
);

const Boca: React.FC<{ expressao: Expressao; forma: string | null }> = ({ expressao, forma }) => {
  if (forma && FORMAS[forma]) {
    const f = FORMAS[forma];
    return (
      <g transform="translate(200 304)">
        <ellipse rx={f.l} ry={Math.max(f.a, 2.5)} fill={BOCA_ESCURA} stroke={TRACO} strokeWidth={4} />
        {f.dentes && <rect x={-f.l * 0.65} y={-f.a} width={f.l * 1.3} height={f.a * 0.7} rx={2} fill="#fff" />}
        {f.lingua && <ellipse cy={f.a * 0.45} rx={f.l * 0.55} ry={f.a * 0.4} fill={LINGUA} />}
      </g>
    );
  }
  switch (expressao) {
    case "feliz":
      return <path d="M178 296 Q200 320 222 296" fill="none" stroke={TRACO} strokeWidth={6} strokeLinecap="round" />;
    case "radiante":
      return (
        <g>
          <path d="M174 292 Q200 336 226 292 Z" fill={BOCA_ESCURA} stroke={TRACO} strokeWidth={5} strokeLinejoin="round" />
          <path d="M186 318 Q200 310 214 318 Q200 328 186 318 Z" fill={LINGUA} />
        </g>
      );
    case "preocupada":
      return <path d="M184 310 Q200 298 216 310" fill="none" stroke={TRACO} strokeWidth={6} strokeLinecap="round" />;
    case "surpresa":
      return <ellipse cx={200} cy={306} rx={10} ry={13} fill={BOCA_ESCURA} stroke={TRACO} strokeWidth={4} />;
    case "brava":
      return <path d="M184 306 L216 306" fill="none" stroke={TRACO} strokeWidth={6} strokeLinecap="round" />;
    case "sem-graca":
      return <path d="M182 304 Q191 297 200 304 Q209 311 218 304" fill="none" stroke={TRACO} strokeWidth={5} strokeLinecap="round" />;
    default:
      return <path d="M186 302 Q200 308 214 302" fill="none" stroke={TRACO} strokeWidth={6} strokeLinecap="round" />;
  }
};

const textoDaFaixa = (visual: Visual) =>
  (visual.faixa ?? (visual.roupaEstilo === "faixa-noiva" ? "NOIVA" : "")).trim().toUpperCase().slice(0, 12);

// `espelhar`: o personagem está virado; o texto da faixa desvira para ler certo
const Roupa: React.FC<{ visual: Visual; espelhar?: boolean }> = ({ visual, espelhar }) => (
  <>
    <path
      d="M118 405 Q122 366 166 360 L234 360 Q278 366 282 405 L292 640 Q200 662 108 640 Z"
      fill={visual.roupa}
      stroke={TRACO}
      strokeWidth={6}
      strokeLinejoin="round"
    />
    {visual.roupaEstilo === "blazer" && (
      <>
        <path d="M172 361 L200 440 L228 361 Z" fill="#FFFFFF" stroke={TRACO} strokeWidth={5} strokeLinejoin="round" />
        <path d="M166 362 L200 452 L180 396 Z" fill={visual.roupa} stroke={TRACO} strokeWidth={5} strokeLinejoin="round" />
        <path d="M234 362 L200 452 L220 396 Z" fill={visual.roupa} stroke={TRACO} strokeWidth={5} strokeLinejoin="round" />
        <line x1={200} y1={452} x2={200} y2={640} stroke={TRACO} strokeWidth={4} />
        <circle cx={212} cy={505} r={6} fill="#F5D36B" stroke={TRACO} strokeWidth={3} />
        <circle cx={212} cy={555} r={6} fill="#F5D36B" stroke={TRACO} strokeWidth={3} />
      </>
    )}
    {textoDaFaixa(visual) && (
      <>
        <path d="M136 372 L168 360 L290 586 L266 612 Z" fill="#FFFFFF" stroke={TRACO} strokeWidth={5} strokeLinejoin="round" />
        <text
          x={0}
          y={0}
          transform={`translate(214 492) rotate(61)${espelhar ? " scale(-1 1)" : ""}`}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Arial Black, Arial, sans-serif"
          fontWeight={900}
          fontSize={Math.min(22, Math.floor(190 / textoDaFaixa(visual).length))}
          letterSpacing={3}
          fill="#E0567A"
        >
          {textoDaFaixa(visual)}
        </text>
      </>
    )}
  </>
);

export const Boneco: React.FC<{
  visual: Visual;
  momentos: Momento[];
  palavras: Palavra[];
  boca?: FormaDaBoca[];
  /** Desenho próprio: substitui o corpo e o rosto do kit */
  desenho?: Desenho;
  /** Altura na tela, em px (a largura sai da proporção) */
  altura: number;
  /** Vira o personagem para o outro lado */
  espelhar?: boolean;
  /** Para os personagens não piscarem e respirarem juntos */
  semente?: number;
  style?: React.CSSProperties;
}> = ({ visual, momentos, palavras, boca, desenho, altura, espelhar = false, semente = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const estado = estadoAgora(momentos, frame, fps);
  const falando = palavras.some((p) => p.inicio <= frame && frame < p.fim);
  const forma = boca?.length ? formaDoRhubarb(boca, frame) : falando ? FALANDO[Math.floor(frame / 3) % FALANDO.length] : null;
  const emFala = palavras.length > 0 && palavras[0].inicio <= frame && frame < palavras[palavras.length - 1].fim + 4;
  const piscando = (frame + semente * 37) % 97 < 4 && estado.expressao !== "radiante";
  const respira = Math.sin(frame / 14 + semente) * 3;
  const inclina = emFala ? Math.sin(frame / 6 + semente) * 2.5 : Math.sin(frame / 40 + semente) * 1.2;
  const largura = altura * 0.6;
  if (desenho) {
    const rosto = pecasDoRosto(desenho, estado.expressao, forma, piscando);
    return (
      <svg viewBox="-100 0 600 1000" width={largura} height={altura} style={{ overflow: "visible", ...style }}>
        <g transform={espelhar ? "translate(400 0) scale(-1 1)" : undefined}>
          <ellipse cx={200} cy={958} rx={150} ry={20} fill="rgba(43,35,64,0.16)" />
          <g transform={`translate(0 ${estado.pulo})`}>
            <g transform={`translate(0 ${respira})`}>
              <g transform={`rotate(${inclina} 200 360)`}>
                <Svg html={desenho.atras} />
              </g>
              <Svg html={desenho.corpo} />
              <g transform={`rotate(${inclina} 200 360)`}>
                <Svg html={desenho.cabeca} />
                <Svg html={rosto.olhos} />
                {desenho.sobrancelhas !== false && <Sobrancelhas expressao={estado.expressao} />}
                <Svg html={rosto.boca} />
              </g>
              <Bracos esq={estado.esq} dir={estado.dir} visual={visual} celular={estado.pose === "celular"} />
            </g>
          </g>
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="-100 0 600 1000" width={largura} height={altura} style={{ overflow: "visible", ...style }}>
      <g transform={espelhar ? "translate(400 0) scale(-1 1)" : undefined}>
        <ellipse cx={200} cy={958} rx={150} ry={20} fill="rgba(43,35,64,0.16)" />
        <g transform={`translate(0 ${estado.pulo})`}>
          {/* Pernas e sapatos */}
          {[172, 228].map((x) => (
            <g key={x}>
              <rect x={x - 26} y={600} width={52} height={330} rx={22} fill={visual.calca} stroke={TRACO} strokeWidth={6} />
              <ellipse cx={x + (x < 200 ? -8 : 8)} cy={938} rx={38} ry={20} fill={visual.sapato} stroke={TRACO} strokeWidth={6} />
            </g>
          ))}
          <g transform={`translate(0 ${respira})`}>
            <g transform={`rotate(${inclina} 200 360)`}>
              <CabeloAtras visual={visual} />
            </g>
            <rect x={181} y={318} width={38} height={60} fill={visual.pele} stroke={TRACO} strokeWidth={6} />
            <Roupa visual={visual} espelhar={espelhar} />
            <g transform={`rotate(${inclina} 200 360)`}>
              {[95, 305].map((x) => (
                <g key={x}>
                  <circle cx={x} cy={248} r={19} fill={visual.pele} stroke={TRACO} strokeWidth={6} />
                  <circle cx={x} cy={272} r={6} fill="#F5D36B" stroke={TRACO} strokeWidth={3} />
                </g>
              ))}
              <ellipse cx={200} cy={232} rx={106} ry={112} fill={visual.pele} stroke={TRACO} strokeWidth={6} />
              <ellipse cx={136} cy={282} rx={19} ry={10} fill={BOCHECHA} opacity={estado.expressao === "sem-graca" ? 0.95 : 0.5} />
              <ellipse cx={264} cy={282} rx={19} ry={10} fill={BOCHECHA} opacity={estado.expressao === "sem-graca" ? 0.95 : 0.5} />
              <Olhos expressao={estado.expressao} piscando={piscando} />
              <Sobrancelhas expressao={estado.expressao} />
              <path d="M195 270 Q200 277 205 270" fill="none" stroke={TRACO} strokeWidth={5} strokeLinecap="round" />
              <Boca expressao={estado.expressao} forma={forma} />
              <CabeloFrente visual={visual} />
              {visual.oculos && (
                <g fill="rgba(255,255,255,0.18)" stroke={TRACO} strokeWidth={6}>
                  <circle cx={160} cy={244} r={31} />
                  <circle cx={240} cy={244} r={31} />
                  <path d="M191 240 Q200 234 209 240" fill="none" />
                </g>
              )}
              {visual.tiara && (
                <path
                  d="M138 128 L150 100 L166 122 L184 90 L200 118 L216 90 L234 122 L250 100 L262 128 Q200 112 138 128 Z"
                  fill="#F5D36B"
                  stroke={TRACO}
                  strokeWidth={5}
                  strokeLinejoin="round"
                />
              )}
            </g>
            <Bracos esq={estado.esq} dir={estado.dir} visual={visual} celular={estado.pose === "celular"} />
          </g>
        </g>
      </g>
    </svg>
  );
};
