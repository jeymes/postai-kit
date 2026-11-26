// Quadro de evidências: o insert de cinema mudo. A tela fecha em íris (um
// círculo), entra um trecho de filme antigo em sépia (grão, riscos, poeira,
// tremor de projetor e luz piscando) e a íris abre de volta para o quadro.
// Três tipos: o mapa com a rota (o da cena ou um esquema desenhado), o
// intertítulo com moldura dupla e a cena de ação em silhuetas (pessoas,
// cavalos, navios, carros, soldados, canhão), chapadas em preto e "fervendo"
// a 12 quadros por segundo. Tudo desenhado aqui, sem arquivo de ninguém.
// Nada de violência gráfica: no máximo o clarão e a fumaça de um tiro de canhão.

import React from "react";
import { AbsoluteFill, Freeze, interpolate, random, useCurrentFrame } from "remotion";
import { fonteDoKit, type Aparencia } from "../../../estilos/narrado";
import { MapaAnimado } from "../apresentacoes";
import { sorteio, type CenaDoQuadro, type TipoDeInsert } from "./plano";

const preso = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SEPIA = "sepia(0.92) contrast(1.12) brightness(0.96)";
const RAIO_ABERTO = 1150;

export const SILHUETAS = ["pessoa", "soldado", "cavalo", "navio", "carro", "canhao"] as const;
export type Silhueta = (typeof SILHUETAS)[number];

/** Os tempos da íris, encolhidos se a cena for curta */
function tempos(duracao: number) {
  const k = Math.min(1, duracao / 90);
  const fecha = Math.round(12 * k) || 1;
  return { fecha, abre: Math.round(16 * k) || 1 };
}

/** A tela preta com um furo redondo no meio (a íris da câmera antiga) */
const Iris: React.FC<{ raio: number }> = ({ raio }) =>
  raio >= RAIO_ABERTO ? null : (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) ${Math.max(0, raio)}px, #000 ${Math.max(0, raio) + 2}px)` }} />
  );

export const InsertDeCinema: React.FC<{ tipo: TipoDeInsert; cena: CenaDoQuadro; duracao: number; indice: number; ap: Aparencia }> = ({
  tipo,
  cena,
  duracao,
  indice,
  ap,
}) => {
  const frame = useCurrentFrame();
  const { fecha, abre } = tempos(duracao);
  // 1) A íris fecha sobre o quadro
  if (frame < fecha) return <Iris raio={interpolate(frame, [0, fecha], [RAIO_ABERTO, 0], preso)} />;
  // 3) A íris abre de volta, já no quadro (o filme acabou)
  if (frame >= duracao - fecha) return <Iris raio={interpolate(frame, [duracao - fecha, duracao - fecha + abre], [0, RAIO_ABERTO], preso)} />;
  // 2) O filme: abre em íris, roda, fecha em íris
  const local = frame - fecha;
  const fimDoFilme = duracao - 2 * fecha;
  const raio = Math.min(interpolate(local, [0, abre], [0, RAIO_ABERTO], preso), interpolate(local, [fimDoFilme - abre, fimDoFilme], [RAIO_ABERTO, 0], preso));
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Projetor quadro={frame} semente={`ins-${indice}`}>
        {/* 12 quadros por segundo: o filme anda de 2 em 2 */}
        <Freeze frame={local - (local % 2)}>
          {tipo === "mapa" ? (
            cena.foto && cena.rota ? (
              <MapaAnimado src={cena.foto} duracao={fimDoFilme} rota={cena.rota} lugares={cena.lugares} filtro="grayscale(1) contrast(1.1)" destaque="#2b1d10" fonte={fonteDoKit("classica") ?? ap.fonteTexto} />
            ) : (
              <MapaEsquematico rota={cena.rota} lugares={cena.lugares} duracao={fimDoFilme} />
            )
          ) : tipo === "intertitulo" ? (
            <Intertitulo texto={textoDoIntertitulo(cena)} />
          ) : (
            <CenaDeAcao silhuetas={silhuetasDa(cena)} duracao={fimDoFilme} semente={`acao-${indice}`} />
          )}
        </Freeze>
      </Projetor>
      <Iris raio={raio} />
    </AbsoluteFill>
  );
};

/** O que o intertítulo diz: o `texto` da cena ou a primeira frase da fala (curta) */
export function textoDoIntertitulo(cena: CenaDoQuadro) {
  if (cena.texto?.trim()) return cena.texto.trim();
  const frase = (cena.fala.match(/[^.!?…]+[.!?…]?/)?.[0] ?? cena.fala).trim();
  if (frase.length <= 90) return frase;
  return `${frase.slice(0, 88).replace(/\s+\S*$/, "")}…`;
}

const silhuetasDa = (cena: CenaDoQuadro): Silhueta[] => {
  const validas = (cena.silhuetas ?? []).filter((s): s is Silhueta => (SILHUETAS as readonly string[]).includes(s));
  return validas.length ? validas.slice(0, 4) : ["pessoa", "cavalo"];
};

/** O projetor antigo: sépia, a luz piscando, a imagem tremendo, riscos e poeira */
const Projetor: React.FC<{ quadro: number; semente: string; children: React.ReactNode }> = ({ quadro, semente, children }) => {
  const passo = quadro - (quadro % 2);
  const dx = (random(`${semente}-x-${passo}`) - 0.5) * 6;
  // De vez em quando o quadro "escorrega" para cima (a película pulando na janela)
  const escorrega = random(`${semente}-e-${Math.floor(quadro / 3)}`) > 0.93 ? -18 : 0;
  const dy = (random(`${semente}-y-${passo}`) - 0.5) * 4 + escorrega;
  const luz = 0.9 + random(`${semente}-l-${passo}`) * 0.16;
  const riscos = [0, 1, 2].filter((i) => random(`${semente}-r-${passo}-${i}`) > 0.6);
  const poeira = Array.from({ length: 7 }, (_, i) => i).filter((i) => random(`${semente}-p-${passo}-${i}`) > 0.55);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ translate: `${dx}px ${dy}px`, scale: "1.03", filter: `${SEPIA} brightness(${luz.toFixed(3)})` }}>{children}</AbsoluteFill>
      {/* Riscos verticais e pontos de poeira (claros e escuros) */}
      {riscos.map((i) => (
        <div
          key={`r${i}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${random(`${semente}-rx-${passo}-${i}`) * 100}%`,
            width: 1.5 + random(`${semente}-rw-${passo}-${i}`) * 2,
            backgroundColor: i % 2 ? "rgba(20,12,4,0.45)" : "rgba(255,246,226,0.4)",
          }}
        />
      ))}
      {poeira.map((i) => {
        const t = 3 + random(`${semente}-pt-${passo}-${i}`) * 9;
        return (
          <div
            key={`p${i}`}
            style={{
              position: "absolute",
              left: `${random(`${semente}-px-${passo}-${i}`) * 100}%`,
              top: `${random(`${semente}-py-${passo}-${i}`) * 100}%`,
              width: t,
              height: t * (0.6 + random(`${semente}-ph-${passo}-${i}`)),
              borderRadius: "50%",
              backgroundColor: random(`${semente}-pc-${passo}-${i}`) > 0.5 ? "rgba(20,12,4,0.7)" : "rgba(255,246,226,0.6)",
            }}
          />
        );
      })}
      {/* A janela do projetor: cantos arredondados e escuros */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(12,7,2,0.75) 100%)" }} />
      <AbsoluteFill style={{ boxShadow: "inset 0 0 0 26px #000", borderRadius: 60 }} />
    </AbsoluteFill>
  );
};

// ---- Intertítulo ----

const Intertitulo: React.FC<{ texto: string }> = ({ texto }) => {
  const fonte = fonteDoKit("classica") ?? "serif";
  const tamanho = texto.length > 60 ? 70 : texto.length > 30 ? 84 : 100;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e0b08", alignItems: "center", justifyContent: "center" }}>
      {/* Moldura dupla com cantos recortados */}
      <div style={{ position: "absolute", inset: 90, border: "5px solid #e9e1cf" }} />
      <div style={{ position: "absolute", inset: 112, border: "2px solid #e9e1cf" }} />
      {[
        [90, 90],
        [1830, 90],
        [90, 990],
        [1830, 990],
      ].map(([x, y], i) => (
        <div key={i} style={{ position: "absolute", left: x - 20, top: y - 20, width: 40, height: 40, rotate: "45deg", border: "4px solid #e9e1cf", backgroundColor: "#0e0b08" }} />
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 46 }}>
        <div style={{ width: 160, height: 2, backgroundColor: "#e9e1cf" }} />
        <div style={{ width: 16, height: 16, rotate: "45deg", backgroundColor: "#e9e1cf" }} />
        <div style={{ width: 160, height: 2, backgroundColor: "#e9e1cf" }} />
      </div>
      <div style={{ maxWidth: 1380, textAlign: "center", fontFamily: fonte, fontStyle: "italic", fontSize: tamanho, lineHeight: 1.22, color: "#efe7d4" }}>{texto}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 52 }}>
        <div style={{ width: 160, height: 2, backgroundColor: "#e9e1cf" }} />
        <div style={{ width: 16, height: 16, rotate: "45deg", backgroundColor: "#e9e1cf" }} />
        <div style={{ width: 160, height: 2, backgroundColor: "#e9e1cf" }} />
      </div>
    </AbsoluteFill>
  );
};

// ---- Mapa desenhado (rota sem foto de mapa) ----

const MapaEsquematico: React.FC<{ rota?: [number, number][]; lugares?: string[]; duracao: number }> = ({ rota, lugares = [], duracao }) => {
  const frame = useCurrentFrame();
  const fonte = fonteDoKit("classica") ?? "serif";
  const pontos: [number, number][] = rota && rota.length >= 2 ? rota : [
    [20, 40],
    [50, 60],
    [80, 45],
  ];
  const progresso = interpolate(frame, [20, Math.max(40, duracao * 0.75)], [0, 1], preso);
  const xy = pontos.map(([x, y]) => [180 + (x / 100) * 1560, 140 + (y / 100) * 800] as const);
  const linha = xy.map((p) => p.join(",")).join(" ");
  // Onde a rota chega em cada ponto (fração do comprimento)
  const trechos = xy.slice(1).map((p, i) => Math.hypot(p[0] - xy[i][0], p[1] - xy[i][1]));
  const comprimento = trechos.reduce((a, b) => a + b, 0) || 1;
  const chegadas = xy.map((_, i) => trechos.slice(0, i).reduce((a, b) => a + b, 0) / comprimento);
  return (
    <AbsoluteFill style={{ backgroundColor: "#e6dcc4" }}>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
        <rect x={70} y={60} width={1780} height={960} fill="none" stroke="#3a2b18" strokeWidth={4} />
        <rect x={86} y={76} width={1748} height={928} fill="none" stroke="#3a2b18" strokeWidth={1.5} />
        {/* Linhas de latitude e longitude */}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={86 + (i + 1) * 175} y1={76} x2={86 + (i + 1) * 175} y2={1004} stroke="#6b5537" strokeOpacity={0.35} strokeWidth={1.5} />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <line key={`h${i}`} x1={86} y1={76 + (i + 1) * 155} x2={1834} y2={76 + (i + 1) * 155} stroke="#6b5537" strokeOpacity={0.35} strokeWidth={1.5} />
        ))}
        {/* Rosa dos ventos */}
        <g transform="translate(1700 210)" stroke="#3a2b18" fill="#3a2b18">
          <circle r={70} fill="none" strokeWidth={2} />
          <polygon points="0,-90 10,0 0,90 -10,0" />
          <polygon points="-90,0 0,10 90,0 0,-10" fillOpacity={0.5} />
          <text y={-100} textAnchor="middle" fontFamily={fonte} fontSize={34} stroke="none">
            N
          </text>
        </g>
        <polyline points={linha} fill="none" stroke="#2b1d10" strokeWidth={7} strokeDasharray="22 14" strokeLinecap="round" opacity={0.25} />
        <polyline points={linha} fill="none" stroke="#2b1d10" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progresso} />
        {xy.map(([x, y], i) => {
          const chegou = interpolate(progresso, [chegadas[i] - 0.04, chegadas[i]], [0, 1], preso);
          return (
            <g key={i} opacity={chegou}>
              <circle cx={x} cy={y} r={16} fill="#e6dcc4" stroke="#2b1d10" strokeWidth={6} />
              {lugares[i] && (
                <text x={x} y={y - 34} textAnchor="middle" fontFamily={fonte} fontStyle="italic" fontSize={46} fill="#2b1d10">
                  {lugares[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ---- Ação em silhuetas ----

const PRETO = "#120e0a";
const CHAO = 850;
/** O cais (na frente do mar), onde anda quem não é navio */
const CAIS = 960;

/**
 * Cena de ação em silhuetas, vista de lado: cada figura atravessa a tela num
 * ritmo, em profundidades diferentes. O "fervido" (o traço que treme a cada
 * desenho, como animação feita à mão) vem de um pequeno sorteio por quadro.
 */
const CenaDeAcao: React.FC<{ silhuetas: Silhueta[]; duracao: number; semente: string }> = ({ silhuetas, duracao, semente }) => {
  const frame = useCurrentFrame();
  const temMar = silhuetas.includes("navio");
  const canhao = silhuetas.includes("canhao");
  const tiro = Math.round(duracao * 0.5);
  const clarao = canhao ? interpolate(frame - tiro, [0, 2, 10], [0, 0.85, 0], preso) : 0;
  const moveis = silhuetas.filter((s) => s !== "canhao");
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #d8ccb0 0%, #c9bb9b 60%, #b3a483 100%)" }}>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
        {/* Morros ao longe */}
        <path d="M0 760 C 200 690, 340 720, 520 700 S 900 640, 1100 690 S 1500 720, 1700 670 S 1880 690, 1920 700 L 1920 1080 L 0 1080 Z" fill="#9c8e72" />
        {temMar ? <Mar frame={frame} /> : <rect x={0} y={CHAO} width={1920} height={1080 - CHAO} fill="#2c241a" />}
        {temMar && moveis.some((m) => m !== "navio") && <rect x={0} y={CAIS} width={1920} height={1080 - CAIS} fill="#241d15" />}
        {/* O navio fica atrás (no mar); o resto passa na frente */}
        {moveis
          .map((s, i) => [s, i] as const)
          .sort((a, b) => Number(b[0] === "navio") - Number(a[0] === "navio"))
          .map(([s, i]) => {
          // Cada figura numa faixa de profundidade, atravessando a tela no tempo do filme
          const profundidade = [1, 0.78, 0.9, 0.68][i % 4];
          const sentido = i % 2 === 0 ? 1 : -1;
          const velocidade = s === "navio" ? 0.35 : s === "carro" ? 1.25 : s === "cavalo" ? 1.1 : 0.8;
          const percurso = 1920 + 700;
          const t = frame / Math.max(1, duracao);
          const inicio = -350 + sorteio(`${semente}-${i}`) * 500;
          let x = inicio + t * percurso * velocidade;
          if (s === "navio") x = 380 + i * 260 + t * 520;
          if (sentido < 0 && s !== "navio") x = 1920 - x;
          // Com mar, quem não é navio anda no cais, na frente da água
          const y = temMar && s !== "navio" ? CAIS : CHAO + (1 - profundidade) * -60;
          return (
            <g key={i} transform={`translate(${x.toFixed(1)} ${y}) scale(${(profundidade * sentido).toFixed(3)} ${profundidade})`}>
              <Figura tipo={s} frame={frame} semente={`${semente}-${i}`} />
            </g>
          );
        })}
        {canhao && (
          <g transform={`translate(260 ${temMar ? CAIS : CHAO})`}>
            <Canhao frame={frame} tiro={tiro} semente={semente} />
          </g>
        )}
      </svg>
      {clarao > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(255,250,235,${clarao})` }} />}
    </AbsoluteFill>
  );
};

/** Um número que treme de leve a cada desenho (o "fervido") */
const ferve = (v: number, chave: string, frame: number, forca = 2.2) => v + (sorteio(`${chave}-${frame - (frame % 2)}`) - 0.5) * forca;

const Mar: React.FC<{ frame: number }> = ({ frame }) => {
  const ondas = (desvio: number, y: number) => {
    let d = `M 0 ${y}`;
    for (let x = 0; x <= 1920; x += 60) d += ` Q ${x + 30} ${y - 14 + Math.sin((x + frame * 6 + desvio) / 70) * 6} ${x + 60} ${y}`;
    return `${d} L 1920 1080 L 0 1080 Z`;
  };
  return (
    <>
      <path d={ondas(0, CHAO - 60)} fill="#6f644f" />
      <path d={ondas(140, CHAO)} fill="#3a3123" />
    </>
  );
};

/** Um membro com joelho: do quadril, num ângulo, e a canela dobrando */
function perna(ox: number, oy: number, angulo: number, dobra: number, coxa: number, canela: number) {
  const a = (angulo * Math.PI) / 180;
  const jx = ox + Math.sin(a) * coxa;
  const jy = oy + Math.cos(a) * coxa;
  const b = ((angulo - dobra) * Math.PI) / 180;
  return { jx, jy, px: jx + Math.sin(b) * canela, py: jy + Math.cos(b) * canela };
}

/** Perna ou braço que afina: da raiz (grossa) à ponta (fina), com o joelho no meio */
const Membro: React.FC<{ pontos: [number, number][]; grossura: [number, number] }> = ({ pontos, grossura }) => (
  <>
    {pontos.slice(1).map((p, i) => {
      const a = pontos[i];
      const g = grossura[0] + ((grossura[1] - grossura[0]) * i) / Math.max(1, pontos.length - 2);
      return <line key={i} x1={a[0]} y1={a[1]} x2={p[0]} y2={p[1]} stroke={PRETO} strokeWidth={g} strokeLinecap="round" />;
    })}
  </>
);

/** As pernas de quem anda: a coxa balança, a canela dobra quando a perna volta */
function pernaQueAnda(ox: number, oy: number, fase: number, amplitude: number, coxa: number, canela: number): [number, number][] {
  const p = perna(ox, oy, Math.sin(fase) * amplitude, Math.max(0, -Math.cos(fase)) * 38, coxa, canela);
  return [
    [ox, oy],
    [p.jx, p.jy],
    [p.px, p.py],
    [p.px + 18, p.py],
  ];
}

const Figura: React.FC<{ tipo: Silhueta; frame: number; semente: string }> = ({ tipo, frame, semente }) => {
  const f = frame - (frame % 2);
  const k = (v: number, chave: string, forca?: number) => ferve(v, `${semente}-${chave}`, frame, forca);
  if (tipo === "pessoa" || tipo === "soldado") {
    // De lado, olhando para a direita. Pessoa: casaco comprido e cartola. Soldado: em fila
    // de três, barretina, mochila e o mosquete em pé no ombro (sem apontar para ninguém)
    const soldado = tipo === "soldado";
    const quantos = soldado ? 3 : 1;
    return (
      <>
        {Array.from({ length: quantos }, (_, n) => {
          const fase = f * 0.3 + n * 0.5;
          const sobe = Math.abs(Math.cos(fase)) * 6;
          const quadril = -165;
          return (
            <g key={n} transform={`translate(${-n * 135} ${-sobe})`}>
              <Membro pontos={pernaQueAnda(-4, quadril, fase + Math.PI, soldado ? 24 : 28, 80, 80)} grossura={[26, 17]} />
              <Membro pontos={pernaQueAnda(4, quadril, fase, soldado ? 24 : 28, 80, 80)} grossura={[26, 17]} />
              {/* O tronco e o casaco que abre embaixo */}
              <path
                d={`M ${k(-26, `a${n}`)} -282 C -34 -240, ${k(-40, `b${n}`)} -190, ${k(-44, `c${n}`)} ${soldado ? -160 : -128} L ${k(30, `d${n}`)} ${soldado ? -150 : -132} C 32 -200, 30 -250, ${k(24, `e${n}`)} -282 Q 0 -294 -26 -282 Z`}
                fill={PRETO}
              />
              <rect x={-9} y={-300} width={18} height={24} fill={PRETO} />
              {/* Cabeça de perfil: o nariz para a direita */}
              <path d={`M ${k(-20, `f${n}`)} -318 C -22 -350, 12 -356, 20 -332 L ${k(28, `g${n}`)} -322 L 20 -316 C 16 -300, -14 -296, -20 -318 Z`} fill={PRETO} />
              {soldado ? (
                <>
                  <path d={`M -20 -340 L -18 ${k(-384, `h${n}`)} L 22 -386 L 22 -338 Z`} fill={PRETO} />
                  <path d={`M 20 -342 L 40 -336 L 20 -334 Z`} fill={PRETO} />
                  <circle cx={2} cy={k(-392, `i${n}`)} r={7} fill={PRETO} />
                  <rect x={-58} y={-276} width={30} height={64} rx={6} fill={PRETO} />
                  {/* Mosquete em pé, encostado no ombro, e o braço segurando */}
                  <Membro pontos={[[12, -270], [k(26, `j${n}`), -220], [14, -196]]} grossura={[16, 13]} />
                  <line x1={18} y1={-160} x2={k(6, `k${n}`)} y2={-410} stroke={PRETO} strokeWidth={8} strokeLinecap="round" />
                </>
              ) : (
                <>
                  <ellipse cx={0} cy={-338} rx={k(36, `l${n}`, 1.2)} ry={6} fill={PRETO} />
                  <path d={`M -20 -340 L ${k(-18, `m${n}`)} -392 L 22 -394 L 22 -340 Z`} fill={PRETO} />
                  <Membro pontos={[[0, -270], [Math.sin(fase) * 30, -222], [Math.sin(fase) * 44 + 8, -180]]} grossura={[16, 12]} />
                </>
              )}
            </g>
          );
        })}
      </>
    );
  }
  if (tipo === "cavalo") {
    // Cavalo a galope, olhando para a direita, com o cavaleiro
    const fase = f * 0.42;
    const sobe = Math.sin(fase * 2) * 7;
    const pata = (ox: number, oy: number, desloca: number, frente: boolean) => {
      const a = Math.sin(fase + desloca) * 36;
      const dobra = (frente ? 1 : -1) * Math.max(0, Math.sin(fase + desloca + 1.3)) * 60;
      const p = perna(ox, oy, a, dobra, 78, 82);
      return <Membro key={`${ox}-${desloca}`} pontos={[[ox, oy], [p.jx, p.jy], [p.px, p.py]]} grossura={[30, 14]} />;
    };
    return (
      <g transform={`translate(0 ${-sobe})`}>
        {pata(-110, -168, 0.5, false)}
        {pata(120, -168, Math.PI + 0.5, true)}
        {/* Corpo, pescoço e cabeça num traço só */}
        <path
          d={`M -140 ${k(-206, "c1")} C -70 -232, 50 -228, 112 ${k(-214, "c2")} C 140 -240, 170 -298, ${k(214, "c3")} -330 L 232 -338 C 262 -318, 296 -288, ${k(312, "c4")} -262 C 316 -250, 306 -240, 290 -242 C 262 -252, 236 -262, 214 -252 C 196 -226, 170 -186, 140 -164 C 110 -144, 40 -140, -10 -146 C -70 -144, -120 -150, -150 -168 C -170 -182, -166 -200, -140 -206 Z`}
          fill={PRETO}
        />
        <path d={`M 222 -332 L ${k(228, "o1")} -366 L 242 -334 Z`} fill={PRETO} />
        {/* Crina ao vento */}
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M ${150 + i * 18} ${-250 - i * 22} L ${k(128 + i * 16, `cr${i}`)} ${-246 - i * 22 + Math.sin(fase + i) * 6} L ${160 + i * 18} ${-262 - i * 22} Z`} fill={PRETO} />
        ))}
        <path d={`M -146 -196 C ${k(-200, "r1")} ${-200 + Math.sin(fase) * 14}, -220 -170, ${k(-250, "r2")} ${-150 + Math.sin(fase) * 22}`} stroke={PRETO} strokeWidth={22} fill="none" strokeLinecap="round" />
        {pata(-90, -168, 0, false)}
        {pata(100, -168, Math.PI, true)}
        {/* Cavaleiro inclinado para a frente */}
        <path d={`M -14 -214 C -10 -260, 6 -300, ${k(30, "v1")} -322 L 58 -312 C 44 -280, 34 -246, 34 -214 Z`} fill={PRETO} />
        <path d={`M 32 -334 C 30 -366, 66 -372, 72 -346 L 80 -338 L 72 -332 C 68 -316, 40 -314, 32 -334 Z`} fill={PRETO} />
        <path d={`M 28 -350 L 30 -384 L 70 -386 L 70 -350 Z`} fill={PRETO} />
        <Membro pontos={[[44, -300], [k(96, "b1"), -276], [150, -268]]} grossura={[16, 11]} />
        <Membro pontos={[[10, -222], [44, -186], [30, -150]]} grossura={[22, 14]} />
      </g>
    );
  }
  if (tipo === "carro") {
    // Carro antigo: carroceria alta, capota, farol e rodas raiadas girando
    const giro = f * 14;
    const roda = (cx: number) => (
      <g key={cx} transform={`translate(${cx} -62) rotate(${giro})`}>
        <circle r={k(60, `rd${cx}`, 1.4)} fill="none" stroke={PRETO} strokeWidth={14} />
        {[0, 45, 90, 135].map((a) => (
          <line key={a} x1={-56} y1={0} x2={56} y2={0} stroke={PRETO} strokeWidth={6} transform={`rotate(${a})`} />
        ))}
        <circle r={14} fill={PRETO} />
      </g>
    );
    const sacode = Math.sin(f * 0.9) * 2;
    return (
      <g transform={`translate(0 ${sacode})`}>
        {roda(-150)}
        {roda(165)}
        <path d={`M -250 -86 L -250 ${k(-150, "c1")} L -150 -160 L -126 ${k(-292, "c2")} L 70 ${k(-292, "c3")} L 96 -176 L 250 ${k(-160, "c4")} C 268 -140, 266 -100, 262 -86 Z`} fill={PRETO} />
        <path d="M -200 -86 C -200 -130, -100 -130, -100 -86 Z M 115 -86 C 115 -130, 215 -130, 215 -86 Z" fill="#c9bb9b" />
        <rect x={-100} y={-272} width={70} height={80} fill="#c9bb9b" opacity={0.3} />
        <circle cx={262} cy={-150} r={14} fill={PRETO} />
      </g>
    );
  }
  // Navio a vela: casco curvo, gurupés, três mastros com velas enfunadas, balançando no mar
  const balanco = Math.sin(f * 0.12) * 2.5;
  const sobe = Math.sin(f * 0.12 + 1) * 8;
  const vela = (mx: number, topo: number, base: number, largura: number, i: number) =>
    `M ${mx - largura} ${topo} Q ${mx + k(26, `v${i}`)} ${topo + 14} ${mx + largura} ${topo} Q ${mx + largura + 26} ${(topo + base) / 2} ${mx + largura * 1.06} ${base} Q ${mx + k(40, `w${i}`)} ${base + 26} ${mx - largura * 1.06} ${base} Q ${mx - largura + 18} ${(topo + base) / 2} ${mx - largura} ${topo} Z`;
  const mastros: [number, number][] = [
    [-170, 360],
    [10, 450],
    [190, 330],
  ];
  return (
    <g transform={`translate(0 ${sobe}) rotate(${balanco})`}>
      {/* Cordame (fino) */}
      {mastros.map(([mx, alt], i) => (
        <React.Fragment key={`c${i}`}>
          <line x1={mx} y1={-70 - alt} x2={i === 2 ? 430 : mastros[i + 1][0]} y2={i === 2 ? -150 : -70 - mastros[i + 1][1] + 20} stroke={PRETO} strokeWidth={3} />
          <line x1={mx} y1={-70 - alt} x2={mx - 130} y2={-74} stroke={PRETO} strokeWidth={2.5} />
        </React.Fragment>
      ))}
      <line x1={290} y1={-96} x2={k(440, "gp")} y2={-150} stroke={PRETO} strokeWidth={10} strokeLinecap="round" />
      <path d={`M -330 ${k(-110, "h0")} L -290 -70 Q 0 -50 300 -100 L ${k(250, "h1")} 18 Q 0 34 ${k(-262, "h2")} 18 Z`} fill={PRETO} />
      {mastros.map(([mx, alt], i) => (
        <g key={mx}>
          <line x1={mx} y1={-60} x2={mx} y2={-70 - alt} stroke={PRETO} strokeWidth={11} />
          <path d={vela(mx, -70 - alt + 34, -70 - alt * 0.62, 82 - i * 4, i * 3)} fill={PRETO} />
          <path d={vela(mx, -70 - alt * 0.58, -70 - alt * 0.27, 108 - i * 6, i * 3 + 1)} fill={PRETO} />
          <path d={vela(mx, -70 - alt * 0.24, -96, 120 - i * 6, i * 3 + 2)} fill={PRETO} />
          <polygon points={`${mx},${-70 - alt} ${mx + k(54, `bd${i}`)},${-60 - alt} ${mx},${-48 - alt}`} fill={PRETO} />
        </g>
      ))}
    </g>
  );
};

/** O canhão: atira na metade do filme (recuo, clarão na boca e fumaça que sobe e se espalha) */
const Canhao: React.FC<{ frame: number; tiro: number; semente: string }> = ({ frame, tiro, semente }) => {
  const q = frame - tiro;
  const recuo = q >= 0 ? interpolate(q, [0, 3, 14], [0, -26, 0], preso) : 0;
  const k = (v: number, chave: string) => ferve(v, `${semente}-cn-${chave}`, frame, 1.6);
  return (
    <g>
      <g transform={`translate(${recuo} 0)`}>
        <path d={`M -40 -120 L ${k(230, "b")} -175 L 236 -142 L -30 -78 Z`} fill={PRETO} />
        <circle cx={-40} cy={-100} r={k(30, "c")} fill={PRETO} />
      </g>
      <circle cx={0} cy={-58} r={58} fill="none" stroke={PRETO} strokeWidth={14} />
      {[0, 60, 120].map((a) => (
        <line key={a} x1={-52} y1={-58} x2={52} y2={-58} stroke={PRETO} strokeWidth={6} transform={`rotate(${a + frame * 0} 0 -58)`} />
      ))}
      {/* Clarão na boca e fumaça (sem nada de violência: só luz e fumaça) */}
      {q >= 0 && q < 6 && <circle cx={270} cy={-160} r={interpolate(q, [0, 2, 6], [30, 90, 40], preso)} fill="#fff8e8" opacity={interpolate(q, [0, 6], [1, 0], preso)} />}
      {q >= 0 &&
        Array.from({ length: 7 }, (_, i) => {
          const t = Math.max(0, q - i * 1.5);
          const r = Math.min(150, 20 + t * 4.2) * (0.7 + sorteio(`${semente}-fm-${i}`) * 0.6);
          const x = 280 + t * (2.2 + i * 0.6) + i * 18;
          const y = -165 - t * (0.9 + sorteio(`${semente}-fy-${i}`) * 1.2);
          const op = interpolate(t, [0, 6, 90], [0, 0.85, 0], preso);
          return op > 0 ? <circle key={i} cx={x} cy={y} r={r} fill="#8a8170" opacity={op} /> : null;
        })}
    </g>
  );
};
