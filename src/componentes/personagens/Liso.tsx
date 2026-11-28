import React from "react";
import { ObjetoNaMao } from "../objetos/ObjetosDeApoio";
import { MarcaNaTesta } from "./MarcaNaTesta";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  BRACO,
  corpoAgora,
  DESCIDA_SENTADO,
  FALANDO,
  formaDoRhubarb,
  CostasDoCelular,
  OMBRO,
  TelaDoCelular,
  type Angulos,
  type ModoDoCelular,
  type Expressao,
  type PropsDoBoneco,
  type Visual,
} from "./Boneco";
import { Acessorio, corDaManga, escurecerCor, Estampa, mangaComprida } from "./figurino";
import { MaoDoObjetoContexto, maosDoObjeto } from "./movimento";

// Estilo "liso": gente desenhada em formas lisas, sem contorno (cabeça redonda
// com o cabelo por cima, tronco arredondado, braços grossos), o jeito dos
// storyboards. Mesmo espaço e mesmas poses do Boneco; o rosto é discreto
// (olhos e boca pequenos, num tom mais escuro da pele).

const escurecer = (hex: string, quanto: number) => {
  const n = parseInt(hex.slice(1), 16);
  const canal = (deslocamento: number) => Math.max(0, Math.round(((n >> deslocamento) & 255) * (1 - quanto)));
  return `rgb(${canal(16)}, ${canal(8)}, ${canal(0)})`;
};

// O rosto do Liso: discreto, mas com a emoção clara (sobrancelhas, olhos e boca
// mudam com a expressão do roteiro)
const SOBRANCELHAS: Record<Expressao, [string, string] | null> = {
  neutra: null,
  feliz: ["M166 212 Q178 206 190 211", "M210 211 Q222 206 234 212"],
  radiante: ["M166 208 Q178 200 190 207", "M210 207 Q222 200 234 208"],
  preocupada: ["M166 214 Q178 212 190 204", "M210 204 Q222 212 234 214"],
  surpresa: ["M166 204 Q178 194 190 202", "M210 202 Q222 194 234 204"],
  brava: ["M166 206 Q180 210 192 218", "M208 218 Q220 210 234 206"],
  "sem-graca": ["M166 212 Q178 208 190 212", "M210 212 Q222 208 234 212"],
  medo: ["M166 212 Q176 198 192 198", "M208 198 Q224 198 234 212"],
  aliviada: ["M166 212 Q178 209 190 214", "M210 214 Q222 209 234 212"],
};

const Rosto: React.FC<{ expressao: Expressao; forma: string | null; piscando: boolean; cor: string }> = ({ expressao, forma, piscando, cor }) => {
  const fechados = piscando || expressao === "radiante" || expressao === "aliviada";
  const olhos = [178, 222].map((x) =>
    fechados ? (
      <path key={x} d={`M${x - 9} 236 Q${x} ${expressao === "radiante" || expressao === "aliviada" ? 226 : 239} ${x + 9} 236`} stroke={cor} strokeWidth={5} fill="none" strokeLinecap="round" />
    ) : (
      <g key={x}>
        <ellipse cx={x + (expressao === "sem-graca" ? 5 : 0)} cy={234} rx={expressao === "surpresa" || expressao === "medo" ? 9 : 7} ry={expressao === "surpresa" || expressao === "medo" ? 11 : 8} fill={cor} />
        {expressao === "medo" && <circle cx={x} cy={232} r={3} fill="#FFFFFF" />}
      </g>
    ),
  );
  const sobrancelhas = SOBRANCELHAS[expressao];
  const traco = { stroke: cor, strokeWidth: 5, fill: "none", strokeLinecap: "round" as const };
  let boca: React.ReactNode;
  if (forma) {
    const aberta = ["C", "D", "E", "H"].includes(forma);
    boca = <ellipse cx={200} cy={272} rx={aberta ? 13 : 9} ry={aberta ? 10 : 3} fill={cor} />;
  } else if (expressao === "feliz" || expressao === "aliviada") boca = <path d="M186 266 Q200 282 214 266" {...traco} />;
  else if (expressao === "radiante") boca = <path d="M184 264 Q200 290 216 264 Z" fill={cor} />;
  else if (expressao === "preocupada") boca = <path d="M188 276 Q200 266 212 276" {...traco} />;
  else if (expressao === "surpresa") boca = <ellipse cx={200} cy={274} rx={8} ry={11} fill={cor} />;
  else if (expressao === "medo") boca = <path d="M186 276 Q191 268 196 275 Q201 268 206 275 Q211 268 216 276" {...traco} />;
  else if (expressao === "brava") boca = <path d="M188 274 L212 274" {...traco} />;
  else if (expressao === "sem-graca") boca = <path d="M186 272 Q193 267 200 272 Q207 277 214 272" {...traco} />;
  else boca = <path d="M190 270 L210 270" {...traco} />;
  return (
    <>
      {sobrancelhas?.map((d) => <path key={d} d={d} {...traco} />)}
      {olhos}
      {boca}
    </>
  );
};

const Braco: React.FC<{ angulos: Angulos; visual: Visual; celular?: ModoDoCelular; escalaDoCelular?: number; segura?: number }> = ({
  angulos: [ombro, cotovelo],
  visual,
  celular,
  escalaDoCelular = 1,
  segura = 0,
}) => {
  const manga = corDaManga(visual.roupa, visual.figurino);
  return (
    <g transform={`translate(${OMBRO.x + 12} ${OMBRO.y - 26}) rotate(${ombro})`}>
      <line x1={0} y1={0} x2={0} y2={BRACO} stroke={manga} strokeWidth={46} strokeLinecap="round" />
      <g transform={`translate(0 ${BRACO}) rotate(${cotovelo})`}>
        <line x1={0} y1={0} x2={0} y2={BRACO - 6} stroke={mangaComprida(visual.mangaLonga, visual.figurino) ? manga : visual.pele} strokeWidth={42} strokeLinecap="round" />
        <circle cx={0} cy={BRACO + 4} r={20} fill={visual.pele} />
        {celular && escalaDoCelular > 0.01 && (
          <g transform={`translate(0 ${BRACO}) rotate(${-(ombro + cotovelo)}) scale(${escalaDoCelular})`}>
            {celular === "costas" ? (
              <CostasDoCelular largura={44} altura={74} cor="#1E1A24" />
            ) : (
              <>
                <rect x={-22} y={-42} width={44} height={74} rx={8} fill="#1E1A24" />
                <TelaDoCelular x={-17} y={-36} largura={34} altura={60} cor="#D8E8FF" />
              </>
            )}
          </g>
        )}
        {segura > 0.01 && (
          <g transform={`translate(0 ${BRACO}) scale(${segura}) translate(0 ${-BRACO})`}>
            <ObjetoNaMao angulo={-(ombro + cotovelo)} y={BRACO} />
          </g>
        )}
      </g>
    </g>
  );
};

export const Liso: React.FC<PropsDoBoneco & { noite?: boolean }> = (props) => {
  const { visual, palavras, boca, altura, espelhar = false, semente = 0, noite = false, style } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const corpo = corpoAgora(props, frame, fps);
  const { estado, respira } = corpo;
  const maoDoObjeto = React.useContext(MaoDoObjetoContexto);
  const falando = palavras.some((p) => p.inicio <= frame && frame < p.fim);
  const forma = boca?.length ? formaDoRhubarb(boca, frame) : falando ? FALANDO[Math.floor(frame / 3) % FALANDO.length] : null;
  const piscando = (frame + semente * 37 + 50) % 97 < 4 && estado.expressao !== "radiante";
  const celular = estado.celular;
  const objeto = maosDoObjeto(maoDoObjeto, Boolean(celular.modo) && celular.escala > 0.5, estado.pose);
  const largura = altura * 0.6;
  const descida = estado.descida * DESCIDA_SENTADO;
  const sentado = estado.descida > 0.35;
  const costas = corpo.virado.costas;
  const giro = `${espelhar ? "translate(400 0) scale(-1 1) " : ""}translate(200 0) scale(${corpo.virado.lado} 1) translate(-200 0)`;
  const figurino = visual.figurino;
  const bracos = (
    <g transform={estado.sobe ? `translate(0 ${-estado.sobe})` : undefined}>
      {/* O objeto de apoio na mão que o Conversa escolheu (sem escolha: a livre) */}
      <Braco angulos={corpo.esq} visual={visual} segura={objeto.esq} />
      <g transform="translate(400 0) scale(-1 1)">
        <Braco angulos={corpo.dir} visual={visual} celular={celular.modo} escalaDoCelular={celular.escala} segura={objeto.dir} />
      </g>
    </g>
  );
  return (
    <svg viewBox="-100 0 600 1000" width={largura} height={altura} style={{ overflow: "visible", ...style }}>
      <g transform={giro}>
        {estado.descida < 0.5 && <ellipse cx={200} cy={958} rx={130} ry={16} fill={noite ? "rgba(0,0,0,0.35)" : "rgba(43,35,64,0.14)"} />}
        <g transform={`translate(${estado.treme} ${estado.pulo + descida + corpo.balancoDoPasso})`}>
          {!sentado &&
            [170, 230].map((x, k) => (
              <g key={x} transform={corpo.perna ? `rotate(${(k ? -1 : 1) * corpo.perna} ${x} 610)` : undefined}>
                <rect x={x - 28} y={600} width={56} height={320} rx={26} fill={visual.calca} />
                <ellipse cx={x + (x < 200 ? -10 : 10)} cy={928} rx={38} ry={18} fill={visual.sapato} />
              </g>
            ))}
          <g transform={`translate(0 ${respira})`}>
            {costas && bracos}
            {/* Cabelo de trás (comprido, chanel ou coque) */}
            {visual.penteado === "ondulado" && <path d="M126 232 Q118 330 150 360 L250 360 Q282 330 274 232 Z" fill={visual.cabelo} />}
            {visual.penteado === "chanel" && <path d="M122 226 L126 300 Q200 318 274 300 L278 226 Z" fill={visual.cabelo} />}
            {visual.penteado === "coque" && <circle cx={200} cy={150} r={34} fill={visual.cabelo} />}
            <rect x={130} y={318} width={140} height={320} rx={56} fill={visual.roupa} />
            {figurino?.estampa && (
              <Estampa id={`estampa-liso-${semente}`} forma={<rect x={130} y={318} width={140} height={320} rx={56} />} tipo={figurino.estampa} roupa={visual.roupa} caixa={[130, 318, 140, 320]} />
            )}
            {figurino?.casaco && !costas && (
              <g fill={figurino.casaco.cor}>
                <path d="M186 318 L150 318 Q130 318 130 374 L130 600 Q130 638 170 638 L184 638 Z" />
                <path d="M214 318 L250 318 Q270 318 270 374 L270 600 Q270 638 230 638 L216 638 Z" />
                {figurino.casaco.estilo === "jaqueta" && <path d="M186 318 L170 380 L190 372 Z M214 318 L230 380 L210 372 Z" fill={escurecerCor(figurino.casaco.cor, 0.18)} />}
              </g>
            )}
            {figurino?.casaco && costas && <rect x={130} y={318} width={140} height={320} rx={56} fill={figurino.casaco.cor} />}
            <rect x={186} y={290} width={28} height={40} fill={visual.pele} />
            {figurino?.acessorio && !costas && <Acessorio acessorio={figurino.acessorio} y={328} contorno={false} escala={0.85} />}
            <g transform={`rotate(${corpo.inclina * 0.6} 200 320)`}>
              <circle cx={200} cy={236} r={76} fill={visual.pele} />
              {costas ? (
                <circle cx={200} cy={226} r={78} fill={visual.cabelo} />
              ) : (
                <>
                  <path d="M124 228 Q124 150 200 150 Q276 150 276 228 Q250 196 200 196 Q150 196 124 228 Z" fill={visual.cabelo} />
                  <g transform={corpo.olho ? `translate(${corpo.olho * 0.6} 0)` : undefined}>
                    <Rosto expressao={estado.expressao} forma={forma} piscando={piscando} cor={escurecer(visual.pele, 0.55)} />
                  </g>
                  {visual.oculos && (
                    <g fill="none" stroke={escurecer(visual.pele, 0.6)} strokeWidth={4}>
                      <circle cx={178} cy={234} r={17} />
                      <circle cx={222} cy={234} r={17} />
                    </g>
                  )}
                  <MarcaNaTesta x={200} y={200} escala={0.7} />
                </>
              )}
            </g>
            {!costas && bracos}
          </g>
        </g>
      </g>
    </svg>
  );
};
