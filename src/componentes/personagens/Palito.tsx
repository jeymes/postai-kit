import React from "react";
import { ObjetoNaMao } from "../objetos/ObjetosDeApoio";
import { MarcaNaTesta } from "./MarcaNaTesta";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  BRACO,
  corpoAgora,
  DESCIDA_SENTADO,
  CostasDoCelular,
  TelaDoCelular,
  type ModoDoCelular,
  FALANDO,
  formaDoRhubarb,
  OMBRO,
  POSES,
  type Angulos,
  type Expressao,
  type FormaDaBoca,
  type Momento,
  type Palavra,
  type Visual,
} from "./Boneco";
import { Acessorio } from "./figurino";
import { MaoDoObjetoContexto, maosDoObjeto, tabelaCompleta, type Momento2D } from "./movimento";

// Estilo "palito": boneco de traço (cabeça redonda, corpo, braços e pernas de
// linha grossa), no mesmo espaço do Boneco (viewBox -100 0 600 1000, cabeça em
// (200, 232), ombros em y 392, quadril em 640, pés em 940) e com as mesmas
// poses, expressões e boca. A cor do traço é a roupa do personagem (cada um
// tem a sua). `noite`: cabeça escura com a luz da tela no rosto.

const CABECA = { x: 200, y: 232, r: 96 };

/** O que vai na cabeça (mundo medieval do molde Mundo3D): coroa, capacete ou faixa */
export type ChapeuDoPalito = "coroa" | "capacete" | "faixa";

const Chapeu: React.FC<{ tipo: ChapeuDoPalito; traco: string }> = ({ tipo, traco }) => {
  if (tipo === "coroa")
    return (
      <g stroke={traco} strokeWidth={6} strokeLinejoin="round">
        <path d="M134 168 L134 146 L152 104 L174 140 L200 90 L226 140 L248 104 L266 146 L266 168 Z" fill="#F2C230" />
        <circle cx={200} cy={150} r={9} fill="#E8453C" />
      </g>
    );
  if (tipo === "capacete")
    return (
      <g stroke={traco} strokeWidth={6} strokeLinejoin="round">
        <path d="M104 214 A96 96 0 0 1 296 214 Z" fill="#A7B0BA" />
        <rect x={94} y={206} width={212} height={20} rx={10} fill="#8C96A1" />
        <path d="M200 120 L200 206" stroke="#8C96A1" strokeWidth={10} />
      </g>
    );
  return <path d="M108 176 Q200 160 292 176 L292 198 Q200 182 108 198 Z" fill="#F4F1E8" stroke={traco} strokeWidth={6} strokeLinejoin="round" />;
};

// No palito os braços saem do meio do corpo, logo embaixo da cabeça: nas poses
// de braço para cima, ângulos próprios para as mãos irem ao lado da cabeça
// (sem cruzar o rosto). O Braco ainda soma 16° para fora.
const POSES_DO_PALITO = {
  ...POSES,
  cabeca: { esq: [84, 85], dir: [84, 85] },
  comemorando: { esq: [98, 51], dir: [98, 51] },
} satisfies typeof POSES;
// As poses novas no palito: os braços saem do meio do corpo, então os que cruzam o peito abrem menos
const TABELA_DO_PALITO = tabelaCompleta(POSES_DO_PALITO, {
  "bracos-cruzados": { esq: [-4, -118], dir: [2, -110] },
  "maos-juntas": { esq: [-10, -110], dir: [-10, -110] },
  queixo: { esq: [-4, -110], dir: [-70, -118] },
  ombros: { esq: [14, 70], dir: [14, 70], sobe: 14 },
  // O aceno ao lado da cabeça (reto para cima, o braço cruzava o rosto)
  acenando: { esq: [10, -6], dir: [96, 58] },
});
const LINHA = 26;

const Olhos: React.FC<{ expressao: Expressao; piscando: boolean; cor: string }> = ({ expressao, piscando, cor }) => (
  <>
    {[166, 234].map((x) => {
      if (expressao === "radiante" || expressao === "aliviada")
        return <path key={x} d={`M${x - 14} 244 Q${x} 228 ${x + 14} 244`} fill="none" stroke={cor} strokeWidth={8} strokeLinecap="round" />;
      if (piscando) return <path key={x} d={`M${x - 12} 240 L${x + 12} 240`} stroke={cor} strokeWidth={8} strokeLinecap="round" />;
      const grande = expressao === "surpresa" || expressao === "medo";
      const olhar = expressao === "sem-graca" ? 8 : 0;
      return <circle key={x} cx={x + olhar} cy={238} r={grande ? 15 : 11} fill={cor} />;
    })}
    {expressao === "brava" && (
      <>
        <path d="M146 210 L184 222" stroke={cor} strokeWidth={8} strokeLinecap="round" />
        <path d="M254 210 L216 222" stroke={cor} strokeWidth={8} strokeLinecap="round" />
      </>
    )}
    {(expressao === "medo" || expressao === "aliviada") && (
      <>
        <path d={expressao === "medo" ? "M146 214 L184 202" : "M148 212 Q166 206 184 212"} stroke={cor} strokeWidth={8} strokeLinecap="round" fill="none" />
        <path d={expressao === "medo" ? "M254 214 L216 202" : "M252 212 Q234 206 216 212"} stroke={cor} strokeWidth={8} strokeLinecap="round" fill="none" />
      </>
    )}
    {expressao === "preocupada" && (
      <>
        <path d="M148 220 L184 208" stroke={cor} strokeWidth={8} strokeLinecap="round" />
        <path d="M252 220 L216 208" stroke={cor} strokeWidth={8} strokeLinecap="round" />
      </>
    )}
  </>
);

const Boca: React.FC<{ expressao: Expressao; forma: string | null; cor: string }> = ({ expressao, forma, cor }) => {
  const traco = { fill: "none", stroke: cor, strokeWidth: 8, strokeLinecap: "round" as const };
  if (forma) {
    const aberta = ["C", "D", "E", "H"].includes(forma);
    const meio = ["B", "G", "F"].includes(forma);
    return <ellipse cx={200} cy={290} rx={aberta ? 20 : meio ? 16 : 13} ry={aberta ? 15 : meio ? 7 : 3} fill={cor} />;
  }
  switch (expressao) {
    case "feliz":
      return <path d="M172 280 Q200 310 228 280" {...traco} />;
    case "radiante":
      return <path d="M168 276 Q200 326 232 276 Z" fill={cor} stroke={cor} strokeWidth={6} strokeLinejoin="round" />;
    case "preocupada":
      return <path d="M178 298 Q200 280 222 298" {...traco} />;
    case "surpresa":
      return <ellipse cx={200} cy={292} rx={12} ry={16} fill={cor} />;
    case "brava":
      return <path d="M176 292 L224 292" {...traco} />;
    case "sem-graca":
      return <path d="M176 290 Q188 282 200 290 Q212 298 224 290" {...traco} />;
    case "medo":
      return <path d="M176 296 Q182 284 190 294 Q198 284 206 294 Q214 284 224 296" {...traco} />;
    case "aliviada":
      return <path d="M178 282 Q200 302 222 282" {...traco} />;
    default:
      return <path d="M182 288 L218 288" {...traco} />;
  }
};

const Celular: React.FC<{ noite: boolean }> = ({ noite }) => (
  <g>
    <rect x={-24} y={-44} width={48} height={80} rx={9} fill="#1E1A24" />
    <TelaDoCelular x={-18} y={-37} largura={36} altura={64} cor={noite ? "#CFE6FF" : "#BDEBDD"} />
  </g>
);

// Um braço de traço: ombro e cotovelo nos ângulos da pose (como no Boneco)
// No palito os braços saem do meio do corpo: abre um pouco para não colarem nele
const Braco: React.FC<{ angulos: Angulos; cor: string; celular?: ModoDoCelular; escalaDoCelular?: number; noite: boolean; segura?: number }> = ({
  angulos: [ombroDaPose, cotovelo],
  cor,
  celular,
  escalaDoCelular = 1,
  noite,
  segura = 0,
}) => {
  const ombro = ombroDaPose + 16;
  return (
  <g transform={`translate(200 ${OMBRO.y - 14}) rotate(${ombro})`}>
    <line x1={0} y1={0} x2={0} y2={BRACO} stroke={cor} strokeWidth={LINHA} strokeLinecap="round" />
    <g transform={`translate(0 ${BRACO}) rotate(${cotovelo})`}>
      <line x1={0} y1={0} x2={0} y2={BRACO} stroke={cor} strokeWidth={LINHA} strokeLinecap="round" />
      <circle cx={0} cy={BRACO + 6} r={20} fill={cor} />
      {celular && escalaDoCelular > 0.01 && (
        <g transform={`translate(0 ${BRACO + 2}) rotate(${-(ombro + cotovelo)}) scale(${escalaDoCelular})`}>
          {celular === "costas" ? <CostasDoCelular largura={48} altura={80} cor="#1E1A24" /> : <Celular noite={noite} />}
        </g>
      )}
      {segura > 0.01 && (
        <g transform={`translate(0 ${BRACO + 2}) scale(${segura}) translate(0 ${-(BRACO + 2)})`}>
          <ObjetoNaMao angulo={-(ombro + cotovelo)} y={BRACO + 2} />
        </g>
      )}
    </g>
  </g>
  );
};

// O figurino no palito (o traço é a cor da roupa): um enfeite no pescoço ou a bolsa a tiracolo
type Enfeite = { tipo: "cachecol" | "gravata" | "bolsa"; cor: string };
// 28/11/2026 (o dono: "bug no meio do peito"): gravata e cachecol no traço fino do palito
// viravam um losango escuro no peito e o pescoço cinza, com cara de mancha. No palito, a
// variação de roupa não aparece (o resto dos estilos continua variando)
function enfeiteDoPalito(visual: Visual): Enfeite | null {
  const f = visual.figurino;
  if (!f) return null;
  // 28/11/2026: a alça da bolsa atravessando o peito também parecia um braço a mais.
  // O palito não leva enfeite nenhum: a identidade dele é a cor
  void f;
  return null;
}
const EnfeiteDoPalito: React.FC<Enfeite & { traco: string }> = ({ tipo, cor, traco }) => {
  if (tipo === "bolsa")
    return (
      <g stroke={traco} strokeWidth={6} strokeLinejoin="round">
        <path d="M168 340 L262 560" fill="none" stroke={cor} strokeWidth={12} />
        <rect x={236} y={540} width={74} height={58} rx={12} fill={cor} />
      </g>
    );
  return <Acessorio acessorio={{ tipo, cor }} y={338} />;
};

export const Palito: React.FC<{
  visual: Visual;
  momentos: Array<Momento | Momento2D>;
  palavras: Palavra[];
  boca?: FormaDaBoca[];
  altura: number;
  espelhar?: boolean;
  semente?: number;
  /** Vida e olhar (o Conversa liga): ver Boneco */
  vida?: boolean;
  olhar?: Palavra[];
  /** Fundo noite: cabeça escura e luz da tela no rosto */
  noite?: boolean;
  /** Para os estilos de traço (giz, neon): a cor de dentro da cabeça e a do rosto */
  cores?: { cabeca?: string; rosto?: string };
  /** Túnica por cima do corpo (a cor), no mundo medieval do Mundo3D */
  veste?: string;
  chapeu?: ChapeuDoPalito;
  style?: React.CSSProperties;
}> = (props) => {
  const { visual, palavras, boca, altura, espelhar = false, semente = 0, noite = false, cores, veste, chapeu, style } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const corpo = corpoAgora(props, frame, fps, TABELA_DO_PALITO);
  const { estado } = corpo;
  const maoDoObjeto = React.useContext(MaoDoObjetoContexto);
  const falando = palavras.some((p) => p.inicio <= frame && frame < p.fim);
  const forma = boca?.length ? formaDoRhubarb(boca, frame) : falando ? FALANDO[Math.floor(frame / 3) % FALANDO.length] : null;
  const piscando = (frame + semente * 37 + 50) % 97 < 4 && estado.expressao !== "radiante";
  const { respira, inclina } = corpo;
  const cor = visual.roupa;
  const rosto = cores?.rosto ?? (noite ? "#F4F6FF" : "#2B2340");
  const cabeca = cores?.cabeca ?? (noite ? "#1C2547" : "#FFFFFF");
  const largura = altura * 0.6;
  const celular = Boolean(estado.celular.modo) && estado.celular.escala > 0.5;
  const objeto = maosDoObjeto(maoDoObjeto, celular, estado.pose);
  const id = `luz-${semente}`;
  const descida = estado.descida * DESCIDA_SENTADO;
  const sentado = estado.descida > 0.35;
  const giro = `${espelhar ? "translate(400 0) scale(-1 1) " : ""}translate(200 0) scale(${corpo.virado.lado} 1) translate(-200 0)`;
  const enfeite = enfeiteDoPalito(visual);
  return (
    <svg viewBox="-100 0 600 1000" width={largura} height={altura} style={{ overflow: "visible", ...style }}>
      <defs>
        <radialGradient id={id} cx="0.5" cy="0.62" r="0.6">
          <stop offset="0" stopColor="#9CC8FF" stopOpacity={celular ? 0.55 : 0.28} />
          <stop offset="1" stopColor="#9CC8FF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={giro}>
        {estado.descida < 0.5 && <ellipse cx={200} cy={958} rx={120} ry={16} fill={noite ? "rgba(0,0,0,0.35)" : "rgba(43,35,64,0.14)"} />}
        <g transform={`translate(${estado.treme} ${estado.pulo + descida + corpo.balancoDoPasso})`}>
          {/* Pernas (sentado, ficam embaixo da coberta); andando, abrem e fecham */}
          <path
            d={
              sentado
                ? "M200 640 L200 700"
                : `M200 640 L${156 + corpo.perna * 3} 936 M200 640 L${244 - corpo.perna * 3} 936`
            }
            stroke={cor}
            strokeWidth={LINHA}
            strokeLinecap="round"
            fill="none"
          />
          <g transform={`translate(0 ${respira})`}>
            {/* Corpo */}
            <line x1={200} y1={CABECA.y + CABECA.r - 4} x2={200} y2={640} stroke={cor} strokeWidth={LINHA} strokeLinecap="round" />
            {veste && (
              <g stroke={rosto} strokeWidth={6} strokeLinejoin="round">
                <path d="M156 326 L244 326 L288 704 L112 704 Z" fill={veste} />
                <path d="M178 326 L200 372 L222 326" fill="none" />
                <path d="M126 560 L274 560" stroke="#5A3A1E" strokeWidth={14} />
              </g>
            )}
            <g transform={`rotate(${inclina} 200 360)`}>
              <circle cx={CABECA.x} cy={CABECA.y} r={CABECA.r} fill={cabeca} stroke={cor} strokeWidth={LINHA - 6} />
              {noite && <circle cx={CABECA.x} cy={CABECA.y} r={CABECA.r - 10} fill={`url(#${id})`} />}
              {!corpo.virado.costas && (
                <g transform={corpo.olho ? `translate(${corpo.olho * 0.6} 0)` : undefined}>
                  <Olhos expressao={estado.expressao} piscando={piscando} cor={rosto} />
                  <Boca expressao={estado.expressao} forma={forma} cor={rosto} />
                </g>
              )}
              {chapeu && <Chapeu tipo={chapeu} traco={rosto} />}
              {visual.oculos && (
                <g fill="none" stroke={rosto} strokeWidth={6}>
                  <circle cx={166} cy={238} r={27} />
                  <circle cx={234} cy={238} r={27} />
                  <path d="M193 236 L207 236" />
                </g>
              )}
              <MarcaNaTesta x={200} y={176} />
            </g>
            {enfeite && <EnfeiteDoPalito {...enfeite} traco={rosto} />}
            {/* Braços: o direito é o esquerdo espelhado no meio do corpo; o objeto de apoio na mão escolhida */}
            <g transform={estado.sobe ? `translate(0 ${-estado.sobe})` : undefined}>
              <Braco angulos={corpo.esq} cor={cor} noite={noite} segura={objeto.esq} />
              <g transform="translate(400 0) scale(-1 1)">
                <Braco angulos={corpo.dir} cor={cor} celular={estado.celular.modo} escalaDoCelular={estado.celular.escala} noite={noite} segura={objeto.dir} />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};
