// Silhueta: a paisagem de cada cena, desenhada por código em SVG. Camadas de
// silhueta (longe, meio, perto e a frente) com parallax na câmera lenta, o
// céu em degradê com sol ou lua, nuvens, névoa, chuva, relâmpago e raios de
// luz pelo clima, e no máximo uma figura humana pequena que faz parte da
// paisagem. Tudo é função do tempo `t` (quadros desde o começo da cena): a
// capa desenha um instante parado com o mesmo código.

import React from "react";
import { misturar, type CoresDaCena } from "./cores";
import { FiguraArticulada } from "./figura";
import type { CameraDaSilhueta, CenarioDaSilhueta, FiguraDaSilhueta, PoseDaFigura } from "./schema";

export const LARGURA = 1080;
export const ALTURA = 1920;
/** O ponto para onde a câmera aproxima (o meio da paisagem) */
const FOCO = { x: 540, y: 1120 };

type P = [number, number];

const suave = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

/** O movimento lento da câmera numa cena (p: 0 no começo, 1 no fim) */
export function movimentoDaCamera(tipo: CameraDaSilhueta, p: number) {
  const e = suave(p);
  switch (tipo) {
    case "zoom-in":
      return { zoom: 1 + 0.12 * e, pan: 0 };
    case "zoom-out":
      return { zoom: 1.12 - 0.12 * e, pan: 0 };
    case "pan-direita":
      return { zoom: 1.06, pan: 46 - 92 * e };
    case "pan-esquerda":
      return { zoom: 1.06, pan: -46 + 92 * e };
    default:
      return { zoom: 1.01 + 0.025 * e, pan: 0 };
  }
}
type Camera = ReturnType<typeof movimentoDaCamera>;

/** Uma camada da paisagem: quanto mais perto (k maior), mais ela anda com a câmera */
const Camada: React.FC<{ k: number; cam: Camera; children: React.ReactNode }> = ({ k, cam, children }) => (
  <g transform={`translate(${(FOCO.x + cam.pan * k).toFixed(2)} ${FOCO.y}) scale(${(1 + (cam.zoom - 1) * k).toFixed(4)}) translate(${-FOCO.x} ${-FOCO.y})`}>{children}</g>
);

// ---- Formas ----

/** Curva suave pelos pontos (Catmull-Rom em Bézier) */
function curva(p: P[]): string {
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}
/** Um morro: a curva de cima fechada até embaixo da tela */
const morro = (p: P[], fundo = 2050) => `${curva(p)} L${p[p.length - 1][0]} ${fundo} L${p[0][0]} ${fundo} Z`;
/** A altura da linha (reta entre os pontos) num x: para pôr cruz, árvore e gente em cima do morro */
function alturaNo(p: P[], x: number) {
  for (let i = 0; i < p.length - 1; i++) {
    if (x >= p[i][0] && x <= p[i + 1][0]) {
      const f = (x - p[i][0]) / (p[i + 1][0] - p[i][0] || 1);
      return p[i][1] + (p[i + 1][1] - p[i][1]) * f;
    }
  }
  return p[p.length - 1][1];
}

/** Números que parecem sorteados, mas são sempre os mesmos (o vídeo não muda a cada render) */
function sorteio(semente: number) {
  let s = semente * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** A borda de luz no alto de uma forma (contraluz) */
const Borda: React.FC<{ d: string; cor: string; ligada: boolean; largura?: number }> = ({ d, cor, ligada, largura = 3 }) =>
  ligada ? <path d={d} fill="none" stroke={cor} strokeWidth={largura} strokeOpacity={0.55} strokeLinejoin="round" /> : null;

const Cruz: React.FC<{ x: number; y: number; altura: number; cor: string }> = ({ x, y, altura, cor }) => {
  const w = altura * 0.056;
  const braco = altura * 0.56;
  const yb = y - altura * 0.76;
  return (
    <g fill={cor}>
      <rect x={x - w / 2} y={y - altura} width={w} height={altura + 30} rx={w * 0.2} />
      <rect x={x - braco / 2} y={yb} width={braco} height={w * 0.86} rx={w * 0.2} />
    </g>
  );
};

const Cipreste: React.FC<{ x: number; y: number; altura: number; cor: string; t: number }> = ({ x, y, altura: h, cor, t }) => {
  const balanco = Math.sin(t / 34 + x) * 3;
  const w = h * 0.13;
  return <path d={`M${x - w * 0.5} ${y + 10} C${x - w * 1.1} ${y - h * 0.35} ${x - w * 0.55 + balanco * 0.5} ${y - h * 0.82} ${x + balanco} ${y - h} C${x + w * 0.55 + balanco * 0.5} ${y - h * 0.82} ${x + w * 1.1} ${y - h * 0.35} ${x + w * 0.5} ${y + 10} Z`} fill={cor} />;
};

const Oliveira: React.FC<{ x: number; y: number; escala: number; cor: string; t: number; semente: number }> = ({ x, y, escala: e, cor, t, semente }) => {
  const r = sorteio(semente);
  const balanco = Math.sin(t / 45 + semente) * 2.5 * e;
  const copa = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + r();
    const dist = (40 + r() * 50) * e;
    return { cx: x + Math.cos(a) * dist * 1.5 + balanco, cy: y - 175 * e + Math.sin(a) * dist * 0.55, raio: (46 + r() * 30) * e };
  });
  return (
    <g fill={cor}>
      {/* O tronco torto da oliveira, aberto em dois galhos */}
      <path
        d={`M${x - 26 * e} ${y + 8} C${x - 34 * e} ${y - 50 * e} ${x + 18 * e} ${y - 70 * e} ${x - 4 * e} ${y - 120 * e} L${x - 40 * e} ${y - 165 * e} L${x - 26 * e} ${y - 170 * e} L${x + 6 * e} ${y - 135 * e} L${x + 30 * e} ${y - 175 * e} L${x + 42 * e} ${y - 168 * e} L${x + 16 * e} ${y - 118 * e} C${x + 36 * e} ${y - 70 * e} ${x + 4 * e} ${y - 50 * e} ${x + 24 * e} ${y + 8} Z`}
      />
      {copa.map((c, i) => (
        <ellipse key={i} cx={c.cx} cy={c.cy} rx={c.raio * 1.25} ry={c.raio * 0.8} />
      ))}
    </g>
  );
};

const Palmeira: React.FC<{ x: number; y: number; escala: number; cor: string; t: number; inclina?: number }> = ({ x, y, escala: e, cor, t, inclina = 1 }) => {
  const topo: P = [x + 70 * e * inclina, y - 380 * e];
  const balanco = Math.sin(t / 28 + x) * 2.2;
  const folhas = [-150, -115, -80, -40, -5, 25, 60].map((ang, i) => {
    const a = ((ang + balanco) * Math.PI) / 180;
    const comp = (150 + (i % 3) * 25) * e;
    const fim: P = [topo[0] + Math.cos(a) * comp, topo[1] + Math.sin(a) * comp * 0.55 + comp * 0.45];
    const meio: P = [topo[0] + Math.cos(a) * comp * 0.55, topo[1] + Math.sin(a) * comp * 0.5 - 18 * e];
    const lado = 16 * e;
    return `M${topo[0]} ${topo[1]} Q${meio[0]} ${meio[1] - lado} ${fim[0]} ${fim[1]} Q${meio[0]} ${meio[1] + lado} ${topo[0]} ${topo[1]} Z`;
  });
  return (
    <g fill={cor}>
      <path d={`M${x - 14 * e} ${y + 10} Q${x + 10 * e * inclina} ${y - 200 * e} ${topo[0] - 6 * e} ${topo[1]} L${topo[0] + 6 * e} ${topo[1]} Q${x + 24 * e * inclina} ${y - 200 * e} ${x + 14 * e} ${y + 10} Z`} />
      {folhas.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
};

const Barco: React.FC<{ x: number; y: number; escala: number; cor: string; t: number }> = ({ x, y, escala: e, cor, t }) => {
  const sobe = Math.sin(t / 22) * 3;
  const gira = Math.sin(t / 30) * 1.4;
  return (
    <g transform={`translate(${x} ${y + sobe}) rotate(${gira}) scale(${e})`} fill={cor}>
      <path d="M-96 -16 Q0 -4 96 -16 L74 14 Q0 22 -74 14 Z" />
      <rect x={-3} y={-196} width={6} height={182} />
      <path d="M6 -188 Q60 -110 84 -30 L6 -26 Z" />
      <path d="M-6 -170 Q-40 -100 -60 -34 L-6 -30 Z" />
    </g>
  );
};

const Pedra: React.FC<{ x: number; y: number; largura: number; altura: number; cor: string }> = ({ x, y, largura: w, altura: h, cor }) => (
  <path d={`M${x - w / 2} ${y + 6} C${x - w / 2} ${y - h * 0.7} ${x - w * 0.2} ${y - h} ${x + w * 0.05} ${y - h} C${x + w * 0.35} ${y - h} ${x + w / 2} ${y - h * 0.55} ${x + w / 2} ${y + 6} Z`} fill={cor} />
);

/** Tufos de capim na beira de um chão */
const Capim: React.FC<{ x: number; y: number; escala: number; cor: string; t: number }> = ({ x, y, escala: e, cor, t }) => {
  const b = Math.sin(t / 25 + x * 0.05) * 3 * e;
  return (
    <path
      fill={cor}
      d={[-24, -12, -2, 10, 22]
        .map((dx, i) => {
          const h = (34 + ((i * 17) % 22)) * e;
          return `M${x + dx * e - 4 * e} ${y + 4} Q${x + dx * e + b} ${y - h * 0.6} ${x + dx * e + b * 1.6 + (i % 2 ? 6 : -6) * e} ${y - h} Q${x + dx * e + 2 * e} ${y - h * 0.5} ${x + dx * e + 4 * e} ${y + 4} Z`;
        })
        .join(" ")}
    />
  );
};

/** Muralha com ameias, de x0 a x1, com o alto em y */
function muralha(x0: number, x1: number, y: number, ameia = 22): string {
  let d = `M${x0} 2050 L${x0} ${y}`;
  for (let x = x0; x < x1; x += ameia * 2) d += ` L${x} ${y - ameia * 0.75} L${x + ameia} ${y - ameia * 0.75} L${x + ameia} ${y} L${x + ameia * 2} ${y}`;
  return `${d} L${x1} 2050 Z`;
}

/** Casas e cúpulas de uma cidade antiga, vistas de longe */
const Cidade: React.FC<{ x0: number; x1: number; y: number; cor: string; semente: number; escala?: number }> = ({ x0, x1, y, cor, semente, escala: e = 1 }) => {
  const r = sorteio(semente);
  const pecas: React.ReactNode[] = [];
  let x = x0;
  let i = 0;
  while (x < x1) {
    const w = (40 + r() * 70) * e;
    const h = (40 + r() * 90) * e;
    pecas.push(<rect key={`c${i}`} x={x} y={y - h} width={w + 2} height={h + 300} />);
    const sorte = r();
    if (sorte > 0.72) pecas.push(<ellipse key={`d${i}`} cx={x + w / 2} cy={y - h} rx={w * 0.42} ry={w * 0.42} />);
    else if (sorte > 0.6) pecas.push(<rect key={`t${i}`} x={x + w * 0.3} y={y - h - 50 * e} width={w * 0.4} height={60 * e} />);
    x += w;
    i++;
  }
  return <g fill={cor}>{pecas}</g>;
};

/** Uma linha reta pelos pontos (a borda de luz dos rochedos) */
const linhaReta = (p: P[]) => p.map((q, i) => `${i ? "L" : "M"}${q[0]} ${q[1]}`).join(" ");

// ---- O céu e o clima (sem desfoque: o render na nuvem é por software) ----
// 2ª rodada (28/11/2026): as nuvens e a névoa eram formas com feGaussianBlur,
// o que fazia o render levar ~6 min para 55 s. Agora são elipses com degradê
// radial (macias, sem filtro) e faixas com degradê vertical.

const Ceu: React.FC<{ c: CoresDaCena; id: string; t: number }> = ({ c, id, t }) => {
  const r = sorteio(11);
  const estrelas = c.estrelas > 0 ? Array.from({ length: 80 }, () => ({ x: r() * 1300 - 110, y: r() * 1000, raio: 0.8 + r() * 2.2, fase: r() * 6 })) : [];
  const brilhoDoAstro = c.astro.tipo === "lua" ? 0.4 : 0.75;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-ceu`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.ceuTopo} />
          <stop offset="0.5" stopColor={c.ceuTopo} stopOpacity={0} />
          <stop offset="1" stopColor={c.ceuTopo} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}-ceu2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.ceuTopo} />
          <stop offset="0.45" stopColor={c.ceuMeio} />
          <stop offset="0.82" stopColor={c.ceuBase} />
          <stop offset="1" stopColor={misturar(c.ceuBase, c.luz, 0.4)} />
        </linearGradient>
        <mask id={`${id}-crescente`}>
          <rect x={-300} y={-300} width={1680} height={1700} fill="#FFFFFF" />
          <circle cx={c.astro.x + c.astro.raio * 0.42} cy={c.astro.y - c.astro.raio * 0.2} r={c.astro.raio * 0.86} fill="#000000" />
        </mask>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor={c.astro.cor} stopOpacity={brilhoDoAstro} />
          <stop offset="0.3" stopColor={c.astro.cor} stopOpacity={brilhoDoAstro * 0.3} />
          <stop offset="1" stopColor={c.astro.cor} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-300} y={-300} width={1680} height={1600} fill={`url(#${id}-ceu2)`} />
      {estrelas.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.raio} fill="#FFF8E6" opacity={c.estrelas * (0.5 + 0.4 * Math.sin(t / 14 + s.fase)) * (1 - s.y / 1300)} />
      ))}
      {c.astro.tipo !== "nenhum" && (
        <>
          <circle cx={c.astro.x} cy={c.astro.y} r={c.astro.raio * 7} fill={`url(#${id}-halo)`} />
          {/* A lua é crescente (a sombra é recortada, o céu aparece através) */}
          <circle cx={c.astro.x} cy={c.astro.y} r={c.astro.raio} fill={c.astro.cor} mask={c.astro.tipo === "lua" ? `url(#${id}-crescente)` : undefined} />
        </>
      )}
    </>
  );
};

/**
 * Nuvens finas e compridas que andam devagar: faixas com degradê radial (sem
 * filtro). No pôr do sol e no amanhecer pegam a luz (claras e quentes); na
 * tempestade e na noite, escuras e pesadas.
 */
const Nuvens: React.FC<{ c: CoresDaCena; id: string; t: number; semente: number }> = ({ c, id, t, semente }) => {
  if (c.nuvensForca <= 0.05) return null;
  const r = sorteio(semente + 3);
  const pesadas = c.chuva || c.estrelas >= 1;
  const quantas = Math.round(2 + c.nuvensForca * 4);
  const cor = pesadas ? c.nuvens : misturar(c.ceuMeio, c.luz, 0.32);
  const lista = Array.from({ length: quantas }, (_, i) => ({
    x: r() * 1400 - 200,
    y: (pesadas ? 560 : 820) + r() * (pesadas ? 380 : 220) - (i % 2) * 70,
    w: 360 + r() * 420,
    h: pesadas ? 40 + r() * 40 : 12 + r() * 14,
    v: 0.12 + r() * 0.2,
  }));
  return (
    <g opacity={pesadas ? 0.95 : 0.55 + c.nuvensForca * 0.3}>
      <defs>
        <radialGradient id={`${id}-nuvem`}>
          <stop offset="0" stopColor={cor} stopOpacity={1} />
          <stop offset="0.7" stopColor={cor} stopOpacity={0.8} />
          <stop offset="1" stopColor={cor} stopOpacity={0} />
        </radialGradient>
      </defs>
      {lista.map((n, i) => {
        const x = ((n.x + t * n.v + 200) % 1500) - 200;
        return (
          <g key={i}>
            <ellipse cx={x} cy={n.y} rx={n.w / 2} ry={n.h} fill={`url(#${id}-nuvem)`} />
            <ellipse cx={x + n.w * 0.12} cy={n.y - n.h * 1.1} rx={n.w * 0.3} ry={n.h * 0.8} fill={`url(#${id}-nuvem)`} />
          </g>
        );
      })}
    </g>
  );
};

/** Uma faixa de névoa: degradê vertical (some em cima e embaixo), sem filtro */
const Nevoa: React.FC<{ c: CoresDaCena; id: string; t: number; y: number; altura: number; forca: number; nome: string }> = ({ c, id, t, y, altura, forca, nome }) => {
  if (forca <= 0.02) return null;
  const respira = 0.85 + 0.15 * Math.sin(t / 40 + y);
  return (
    <g opacity={forca * respira}>
      <defs>
        <linearGradient id={`${id}-${nome}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.nevoa} stopOpacity={0} />
          <stop offset="0.5" stopColor={c.nevoa} stopOpacity={0.85} />
          <stop offset="1" stopColor={c.nevoa} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={-300} y={y - altura / 2} width={1680} height={altura} fill={`url(#${id}-${nome})`} />
    </g>
  );
};

const Raios: React.FC<{ c: CoresDaCena; id: string; t: number }> = ({ c, id, t }) => {
  const pulso = 0.8 + 0.2 * Math.sin(t / 30);
  const x0 = c.astro.x + 120;
  const y0 = -260;
  return (
    <g opacity={0.42 * pulso}>
      <defs>
        <linearGradient id={`${id}-raio`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.luz} stopOpacity={0.95} />
          <stop offset="0.75" stopColor={c.luz} stopOpacity={0.25} />
          <stop offset="1" stopColor={c.luz} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[-30, -17, -6, 4, 15].map((ang, i) => {
        const a = ((ang + Math.sin(t / 70 + i) * 1.2) * Math.PI) / 180;
        const largura = 0.03 + (i % 2) * 0.025;
        const comp = 1600;
        const p1 = [x0 + Math.sin(a - largura) * comp, y0 + Math.cos(a - largura) * comp];
        const p2 = [x0 + Math.sin(a + largura) * comp, y0 + Math.cos(a + largura) * comp];
        return <polygon key={i} points={`${x0},${y0} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`} fill={`url(#${id}-raio)`} opacity={0.5 + (i % 3) * 0.2} />;
      })}
    </g>
  );
};

/** O relâmpago: quanto clareia agora (0 a 1) e o raio que cai, pelo tempo da cena */
export function relampagoEm(t: number) {
  const ciclo = 96;
  const f = (t + 40) % ciclo;
  const indice = Math.floor((t + 40) / ciclo);
  const forca = f < 2 ? 1 : f < 4 ? 0.35 : f < 6 ? 0.8 : f < 14 ? ((14 - f) / 8) * 0.5 : 0;
  return { forca, indice };
}

const Chuva: React.FC<{ c: CoresDaCena; t: number }> = ({ c, t }) => {
  const r = sorteio(5);
  return (
    <g stroke={misturar(c.nevoa, "#FFFFFF", 0.4)} strokeWidth={2.2} strokeLinecap="round" opacity={0.32}>
      {Array.from({ length: 90 }, (_, i) => {
        const x0 = r() * 1400 - 160;
        const v = 34 + r() * 16;
        const y = ((r() * 2100 + t * v) % 2100) - 120;
        const x = x0 - (t * v) / 7;
        return <line key={i} x1={((x % 1400) + 1400) % 1400 - 160} y1={y} x2={((x % 1400) + 1400) % 1400 - 160 - 9} y2={y + 52} />;
      })}
    </g>
  );
};

const Passaros: React.FC<{ cor: string; t: number; semente: number }> = ({ cor, t, semente }) => {
  const r = sorteio(semente + 40);
  return (
    <g fill="none" stroke={cor} strokeWidth={3} strokeLinecap="round" opacity={0.7}>
      {Array.from({ length: 4 }, (_, i) => {
        const x = ((r() * 1200 + t * (0.9 + r() * 0.5)) % 1400) - 150;
        const y = 720 + r() * 180 + Math.sin(t / 20 + i) * 6;
        const asa = 4 + Math.sin(t / 4 + i * 2) * 5;
        const e = 0.8 + r() * 0.5;
        return <path key={i} d={`M${x - 12 * e} ${y - asa} Q${x - 5 * e} ${y - 2} ${x} ${y + 2} Q${x + 5 * e} ${y - 2} ${x + 12 * e} ${y - asa}`} />;
      })}
    </g>
  );
};

/** O brilho do sol (ou da lua) na água: tracinhos que piscam */
const Reflexo: React.FC<{ c: CoresDaCena; t: number; y0: number; y1: number }> = ({ c, t, y0, y1 }) => {
  const r = sorteio(17);
  const centro = c.astro.tipo === "nenhum" ? 540 : c.astro.x;
  return (
    <g fill={c.luz}>
      {Array.from({ length: 46 }, (_, i) => {
        const y = y0 + ((i + 0.5) / 46) * (y1 - y0);
        const perto = (y - y0) / (y1 - y0);
        const espalha = 80 + perto * 260;
        const x = centro + (r() - 0.5) * espalha * 2 + Math.sin(t / 18 + i) * 10;
        const w = 20 + r() * 70 * (0.5 + perto);
        const brilho = 0.15 + 0.4 * Math.max(0, Math.sin(t / 9 + i * 1.7));
        return <rect key={i} x={x - w / 2} y={y} width={w} height={2 + perto * 3} rx={2} opacity={brilho * (c.astro.tipo === "nenhum" ? 0.4 : 1)} />;
      })}
    </g>
  );
};



// ---- Os cenários (2 ou 3 composições de cada) ----
// 2ª rodada (28/11/2026): cada cenário tem composições diferentes (ângulo,
// horizonte alto ou baixo, outros elementos). Quando o mesmo cenário volta no
// vídeo, sai a composição seguinte. A pessoa fica sempre recortada contra o céu
// ou o longe (nunca preta sobre preto).

type Figurinha = { x: number; y: number; escala: number; virada?: 1 | -1; anda?: [number, number]; encolhe?: number };
type Desenho = { longe: React.ReactNode; meio: React.ReactNode; perto: React.ReactNode; frente?: React.ReactNode; figura: Figurinha; agua?: { y0: number; y1: number } };

/** Quantas composições cada cenário tem */
export const VARIACOES: Record<CenarioDaSilhueta, number> = { calvario: 3, estrada: 3, mar: 3, monte: 3, deserto: 3, "cidade-antiga": 3, jardim: 3 };

/** Gente de longe (a multidão no pé do monte): cabecinhas e mantos, sem rosto */
const Multidao: React.FC<{ x0: number; x1: number; y: number; cor: string; semente: number; escala?: number }> = ({ x0, x1, y, cor, semente, escala: e = 1 }) => {
  const r = sorteio(semente + 90);
  const gente: React.ReactNode[] = [];
  for (let x = x0, i = 0; x < x1; x += (16 + r() * 18) * e, i++) {
    const h = (40 + r() * 16) * e;
    gente.push(<path key={i} d={`M${x - 9 * e} ${y + 2} Q${x - 8 * e} ${y - h * 0.6} ${x - 4 * e} ${y - h * 0.78} L${x + 4 * e} ${y - h * 0.78} Q${x + 8 * e} ${y - h * 0.6} ${x + 9 * e} ${y + 2} Z`} />);
    gente.push(<circle key={`c${i}`} cx={x} cy={y - h * 0.86} r={6.5 * e} />);
  }
  return <g fill={cor}>{gente}</g>;
};

/** Tenda de pano (o acampamento do deserto) */
const Tenda: React.FC<{ x: number; y: number; largura: number; cor: string; porta: string }> = ({ x, y, largura: w, cor, porta }) => (
  <g>
    <path d={`M${x - w / 2} ${y} L${x - w * 0.08} ${y - w * 0.52} L${x + w * 0.08} ${y - w * 0.52} L${x + w / 2} ${y} Z`} fill={cor} />
    <path d={`M${x - w * 0.09} ${y} L${x} ${y - w * 0.3} L${x + w * 0.09} ${y} Z`} fill={porta} />
  </g>
);

/** Rochedo recortado (paredões do caminho entre as rochas, mesas do deserto) */
const rochedo = (p: P[]) => `M${p[0][0]} 2050 ${p.map((q) => `L${q[0]} ${q[1]}`).join(" ")} L${p[p.length - 1][0]} 2050 Z`;

function desenharCenario(cenario: CenarioDaSilhueta, c: CoresDaCena, t: number, v: number): Desenho {
  const longeEscuro = misturar(c.longe, c.meio, 0.45);
  const brilho = misturar(c.ceuBase, c.luz, 0.5);
  const contraluz = c.contraluz;
  switch (cenario) {
    case "calvario": {
      if (v === 1) {
        // De baixo: a encosta sobe da esquerda para a direita, as cruzes grandes à direita, a cidade lá longe
        const encosta: P[] = [[-200, 1250], [150, 1215], [420, 1130], [620, 1040], [780, 1000], [900, 1010], [1290, 1070]];
        return {
          longe: (
            <>
              <path d={morro([[-200, 1170], [200, 1150], [500, 1170], [1290, 1150]])} fill={c.longe} />
              <Cidade x0={-60} x1={380} y={1158} cor={longeEscuro} semente={31} escala={0.6} />
            </>
          ),
          meio: (
            <>
              <path d={morro(encosta)} fill={c.meio} />
              <Borda d={curva(encosta)} cor={c.luz} ligada={contraluz} />
              <Cruz x={650} y={alturaNo(encosta, 650) + 8} altura={250} cor={c.perto} />
              <Cruz x={940} y={alturaNo(encosta, 940) + 8} altura={250} cor={c.perto} />
              <Cruz x={790} y={1004} altura={340} cor={c.perto} />
            </>
          ),
          perto: (
            <>
              <path d={morro([[-200, 1318], [300, 1300], [700, 1322], [1290, 1306]])} fill={c.perto} />
              <Pedra x={210} y={1262} largura={260} altura={70} cor={c.perto} />
            </>
          ),
          figura: { x: 200, y: 1206, escala: 1, virada: 1 },
        };
      }
      if (v === 2) {
        // De longe: o monte com as três cruzes pequeno à direita; a muralha da cidade na frente, à esquerda, e o caminho entre eles
        const monte: P[] = [[480, 1190], [640, 1120], [760, 1086], [860, 1110], [1000, 1170], [1290, 1200]];
        return {
          longe: (
            <>
              <path d={morro([[-200, 1180], [300, 1160], [700, 1185], [1290, 1165]])} fill={c.longe} />
              <path d={morro(monte)} fill={longeEscuro} />
              <Cruz x={700} y={1104} altura={120} cor={c.meio} />
              <Cruz x={830} y={1104} altura={120} cor={c.meio} />
              <Cruz x={765} y={1090} altura={160} cor={c.meio} />
            </>
          ),
          meio: (
            <>
              <path d={muralha(-200, 420, 1120, 18)} fill={c.meio} />
              <path d={muralha(60, 220, 1010, 16)} fill={c.meio} />
              <path d={muralha(300, 400, 1050, 14)} fill={c.meio} />
              <Borda d="M-200 1120 L60 1120 L60 1010 L220 1010 L220 1120 L300 1120 L300 1050 L400 1050 L400 1120 L420 1120" cor={c.luz} ligada={contraluz} largura={2} />
            </>
          ),
          perto: (
            <>
              <path d={morro([[-200, 1300], [400, 1280], [800, 1298], [1290, 1286]])} fill={c.perto} />
              <path d={`M600 1200 C560 1250 470 1290 430 1400 L760 2050 L1040 2050 C860 1500 700 1300 640 1200 Z`} fill={misturar(c.perto, c.longe, 0.18)} />
            </>
          ),
          figura: { x: 560, y: 1262, escala: 0.75, virada: 1, anda: [60, -40], encolhe: 0.2 },
        };
      }
      // O monte com as três cruzes no meio, a cidade antiga ao fundo e a multidão no pé do monte
      const monte: P[] = [[-200, 1290], [80, 1260], [300, 1150], [440, 1040], [540, 1012], [640, 1040], [790, 1150], [1000, 1250], [1290, 1290]];
      return {
        longe: (
          <>
            <path d={morro([[-200, 1150], [140, 1130], [420, 1150], [700, 1120], [1000, 1140], [1290, 1126]])} fill={c.longe} />
            <path d={muralha(-200, 1290, 1140, 12)} fill={longeEscuro} />
            <Cidade x0={-120} x1={1220} y={1120} cor={longeEscuro} semente={7} escala={0.75} />
          </>
        ),
        meio: (
          <>
            <path d={morro(monte)} fill={c.meio} />
            <Borda d={curva(monte)} cor={c.luz} ligada={contraluz} />
            <Cruz x={395} y={alturaNo(monte, 395) + 8} altura={250} cor={c.perto} />
            <Cruz x={685} y={alturaNo(monte, 685) + 8} altura={250} cor={c.perto} />
            <Cruz x={540} y={1016} altura={360} cor={c.perto} />
            <Multidao x0={60} x1={270} y={1262} cor={c.perto} semente={1} />
            <Multidao x0={840} x1={1060} y={1262} cor={c.perto} semente={2} />
          </>
        ),
        perto: <path d={morro([[-200, 1296], [200, 1310], [540, 1294], [880, 1310], [1290, 1298]])} fill={c.perto} />,
        figura: { x: 300, y: 1156, escala: 0.8, virada: 1 },
      };
    }
    case "estrada": {
      if (v === 1) {
        // A estrada reta até a cidade no horizonte, entre pedras
        return {
          longe: (
            <>
              <path d={morro([[-200, 1160], [300, 1150], [700, 1160], [1290, 1150]])} fill={c.longe} />
              <path d={muralha(330, 760, 1130, 12)} fill={longeEscuro} />
              <Cidade x0={350} x1={740} y={1112} cor={longeEscuro} semente={12} escala={0.7} />
            </>
          ),
          meio: (
            <>
              <path d={rochedo([[-200, 1080], [20, 1060], [120, 1110], [260, 1150], [420, 1180], [440, 1186]])} fill={c.meio} />
              <path d={rochedo([[650, 1186], [700, 1170], [860, 1120], [980, 1060], [1100, 1040], [1290, 1070]])} fill={c.meio} />
              <Cipreste x={70} y={1090} altura={200} cor={c.meio} t={t} />
              <Cipreste x={1010} y={1070} altura={240} cor={c.meio} t={t} />
            </>
          ),
          perto: (
            <>
              <path d={morro([[-200, 1196], [400, 1186], [700, 1186], [1290, 1196]])} fill={c.perto} />
              <path d="M528 1188 L552 1188 L860 2050 L220 2050 Z" fill={misturar(c.perto, c.longe, 0.2)} />
              <Pedra x={120} y={1330} largura={300} altura={120} cor={c.perto} />
              <Pedra x={960} y={1300} largura={260} altura={90} cor={c.perto} />
            </>
          ),
          figura: { x: 560, y: 1330, escala: 0.95, virada: 1, anda: [-18, -90], encolhe: 0.4 },
        };
      }
      if (v === 2) {
        // O caminho entre paredões de rocha (o céu só no meio, horizonte alto)
        return {
          longe: <path d={morro([[-200, 1080], [300, 1040], [540, 1070], [800, 1030], [1290, 1060]])} fill={c.longe} />,
          meio: (
            <>
              <path d={rochedo([[-200, 820], [40, 800], [120, 880], [210, 900], [260, 1000], [330, 1040], [400, 1120], [470, 1160]])} fill={c.meio} />
              <path d={rochedo([[620, 1160], [700, 1110], [760, 1020], [840, 990], [900, 900], [980, 870], [1060, 780], [1290, 760]])} fill={c.meio} />
              <Borda d={linhaReta([[40, 800], [120, 880], [210, 900], [260, 1000], [330, 1040], [400, 1120], [470, 1160]])} cor={c.luz} ligada={contraluz} largura={2.5} />
              <Borda d={linhaReta([[620, 1160], [700, 1110], [760, 1020], [840, 990], [900, 900], [980, 870], [1060, 780]])} cor={c.luz} ligada={contraluz} largura={2.5} />
            </>
          ),
          perto: (
            <>
              <path d={morro([[-200, 1200], [400, 1170], [700, 1172], [1290, 1210]])} fill={c.perto} />
              <path d="M520 1170 C560 1230 640 1280 600 1380 C560 1480 380 1600 360 2050 L760 2050 C760 1650 800 1480 760 1380 C720 1270 600 1230 570 1170 Z" fill={misturar(c.perto, c.longe, 0.2)} />
            </>
          ),
          frente: <path d={rochedo([[-200, 1500], [-40, 1480], [60, 1560], [120, 1700], [170, 2050]])} fill={misturar(c.perto, "#000000", 0.4)} />,
          figura: { x: 560, y: 1196, escala: 0.62, virada: 1 },
        };
      }
      // A estrada em curva entre os morros e os ciprestes
      const esquerda: P[] = [[-220, 1010], [40, 1030], [250, 1100], [430, 1150], [560, 1170]];
      const direita: P[] = [[560, 1170], [700, 1130], [880, 1070], [1080, 1030], [1300, 1020]];
      return {
        longe: <path d={morro([[-200, 1130], [200, 1100], [540, 1140], [860, 1090], [1290, 1120]])} fill={c.longe} />,
        meio: (
          <>
            <path d={morro([...esquerda, [1300, 1180]])} fill={c.meio} />
            <path d={morro([[480, 1180], ...direita])} fill={c.meio} />
            <Borda d={curva(esquerda)} cor={c.luz} ligada={contraluz} />
            <Borda d={curva(direita)} cor={c.luz} ligada={contraluz} />
            {[
              [120, 1050, 240],
              [205, 1080, 190],
              [270, 1105, 150],
              [820, 1090, 180],
              [900, 1066, 230],
            ].map(([x, y, h]) => (
              <Cipreste key={x} x={x} y={y} altura={h} cor={c.meio} t={t} />
            ))}
          </>
        ),
        perto: (
          <>
            <path d={morro([[-200, 1210], [300, 1190], [540, 1178], [800, 1190], [1290, 1206]])} fill={c.perto} />
            <path d="M520 1180 C500 1270 380 1340 330 1470 C290 1590 300 1770 260 2050 L900 2050 C820 1770 760 1590 700 1470 C640 1340 560 1270 560 1180 Z" fill={misturar(c.perto, c.longe, 0.2)} />
          </>
        ),
        frente: (
          <>
            <Capim x={70} y={1930} escala={2.6} cor={misturar(c.perto, "#000000", 0.4)} t={t} />
            <Capim x={1010} y={1930} escala={2.2} cor={misturar(c.perto, "#000000", 0.4)} t={t} />
          </>
        ),
        figura: { x: 500, y: 1262, escala: 0.82, virada: 1, anda: [30, -60], encolhe: 0.25 },
      };
    }
    case "mar": {
      if (v === 1) {
        // O penhasco à esquerda, a pessoa na beira olhando o mar aberto
        const penhasco: P[] = [[-200, 930], [120, 925], [260, 936], [320, 960], [360, 1040], [420, 1160], [520, 1290], [600, 1310]];
        return {
          longe: <path d={morro([[700, 1150], [860, 1126], [1000, 1110], [1290, 1130]])} fill={c.longe} />,
          meio: (
            <>
              <rect x={-200} y={1150} width={1500} height={900} fill={misturar(c.meio, c.ceuBase, 0.22)} />
              <rect x={-200} y={1148} width={1500} height={4} fill={c.luz} opacity={0.45} />
              <Barco x={860} y={1180} escala={0.35} cor={c.meio} t={t} />
            </>
          ),
          perto: (
            <>
              <path d={`M-200 2050 L-200 930 ${penhasco.map((q) => `L${q[0]} ${q[1]}`).join(" ")} L1290 1320 L1290 2050 Z`} fill={c.perto} />
              <Borda d={linhaReta(penhasco.slice(0, 5))} cor={c.luz} ligada={contraluz} largura={2.5} />
            </>
          ),
          agua: { y0: 1156, y1: 1320 },
          figura: { x: 250, y: 932, escala: 1.05, virada: 1 },
        };
      }
      if (v === 2) {
        // A praia: o barco grande puxado na areia, a rede, o mar alto ao fundo
        return {
          longe: <path d={morro([[-200, 1050], [80, 1010], [300, 1040], [520, 1062]])} fill={c.longe} />,
          meio: (
            <>
              <rect x={-200} y={1060} width={1500} height={900} fill={misturar(c.meio, c.ceuBase, 0.22)} />
              <rect x={-200} y={1058} width={1500} height={4} fill={c.luz} opacity={0.4} />
            </>
          ),
          perto: (
            <>
              <path d={morro([[-200, 1250], [300, 1236], [700, 1262], [1290, 1244]])} fill={c.perto} />
              <Barco x={780} y={1236} escala={1.45} cor={c.perto} t={0} />
              {/* A rede estendida em estacas */}
              <path d="M160 1250 L160 1150 M320 1250 L320 1140 M160 1160 Q240 1200 320 1150" fill="none" stroke={c.perto} strokeWidth={6} strokeLinecap="round" />
              <path d="M170 1170 L310 1166 M180 1190 L300 1184 M200 1210 L290 1204" fill="none" stroke={c.perto} strokeWidth={2} opacity={0.8} />
            </>
          ),
          agua: { y0: 1066, y1: 1240 },
          figura: { x: 470, y: 1246, escala: 1, virada: 1 },
        };
      }
      return {
        longe: (
          <>
            <path d={morro([[-220, 1080], [-40, 1030], [130, 1070], [300, 1100], [460, 1132], [520, 1138]])} fill={c.longe} />
            <path d={morro([[760, 1138], [880, 1106], [1020, 1080], [1290, 1100]])} fill={c.longe} />
          </>
        ),
        meio: (
          <>
            <rect x={-200} y={1132} width={1500} height={900} fill={misturar(c.meio, c.ceuBase, 0.22)} />
            <rect x={-200} y={1130} width={1500} height={4} fill={c.luz} opacity={0.4} />
            <Barco x={330} y={1170} escala={0.9} cor={c.meio} t={t} />
          </>
        ),
        perto: (
          <>
            <path d={morro([[-200, 1340], [200, 1326], [520, 1346], [860, 1330], [1290, 1342]])} fill={c.perto} />
            <Pedra x={860} y={1336} largura={300} altura={150} cor={c.perto} />
          </>
        ),
        agua: { y0: 1140, y1: 1334 },
        figura: { x: 860, y: 1190, escala: 0.95, virada: -1 },
      };
    }
    case "monte": {
      if (v === 1) {
        // O cume perto: a pessoa no alto, recortada no céu; a serra lá embaixo
        const cume: P[] = [[-200, 1300], [60, 1220], [220, 1120], [340, 1050], [430, 1030], [520, 1052], [640, 1130], [800, 1220], [1000, 1270], [1290, 1300]];
        return {
          longe: (
            <>
              <path d={morro([[-200, 1150], [100, 1100], [260, 1140], [500, 1090], [720, 1130], [920, 1080], [1290, 1120]])} fill={c.longe} />
              <path d={morro([[-200, 1220], [300, 1190], [700, 1210], [1290, 1180]])} fill={longeEscuro} />
            </>
          ),
          meio: null,
          perto: (
            <>
              <path d={morro(cume)} fill={c.perto} />
              <Borda d={curva(cume)} cor={c.luz} ligada={contraluz} />
            </>
          ),
          figura: { x: 430, y: 1034, escala: 1.15, virada: 1 },
        };
      }
      if (v === 2) {
        // A serra de três picos acima das nuvens baixas
        const serra: P[] = [[-200, 1100], [60, 960], [180, 880], [300, 1000], [420, 940], [560, 780], [700, 930], [820, 880], [960, 980], [1100, 900], [1290, 1000]];
        return {
          longe: <path d={rochedo([[-200, 1080], [100, 1000], [240, 1060], [400, 990], [520, 1040], [700, 980], [880, 1050], [1060, 990], [1290, 1050]])} fill={c.longe} />,
          meio: (
            <>
              <path d={rochedo(serra)} fill={c.meio} />
              <Borda d={linhaReta(serra)} cor={c.luz} ligada={contraluz} largura={2.5} />
            </>
          ),
          perto: (
            <>
              <path d={morro([[-200, 1290], [250, 1250], [420, 1226], [600, 1250], [1290, 1296]])} fill={c.perto} />
            </>
          ),
          figura: { x: 430, y: 1232, escala: 0.95, virada: 1 },
        };
      }
      const montanha: P[] = [[-220, 1150], [40, 1000], [200, 880], [330, 770], [410, 710], [500, 790], [620, 910], [760, 1060], [900, 1150], [1300, 1200]];
      const rocha: P[] = [[-200, 1300], [300, 1296], [600, 1300], [760, 1262], [860, 1236], [960, 1252], [1290, 1300]];
      return {
        longe: <path d={morro([[-200, 1020], [90, 920], [230, 980], [380, 900], [560, 1000], [760, 890], [930, 960], [1100, 900], [1290, 960]])} fill={c.longe} />,
        meio: (
          <>
            <path d={morro(montanha)} fill={c.meio} />
            {/* A face do monte que pega a luz (um tom acima), com as ravinas */}
            <path d="M410 710 L500 790 L620 910 L760 1060 L900 1150 L1300 1200 L1300 2050 L600 2050 L540 1180 L585 1090 L500 1000 L540 930 L455 850 L470 780 Z" fill={misturar(c.meio, c.luz, 0.055)} />
            <Borda d={curva(montanha)} cor={c.luz} ligada={contraluz} />
          </>
        ),
        perto: <path d={morro(rocha)} fill={c.perto} />,
        figura: { x: 860, y: 1240, escala: 0.95, virada: -1 },
      };
    }
    case "deserto": {
      if (v === 1) {
        // As mesas de pedra (morros de topo reto) e a pessoa andando na areia
        return {
          longe: (
            <>
              <path d={morro([[-200, 1160], [300, 1140], [700, 1160], [1290, 1146]])} fill={c.longe} />
              <path d={rochedo([[620, 1150], [650, 1010], [700, 1000], [860, 1004], [890, 1060], [920, 1150]])} fill={longeEscuro} />
            </>
          ),
          meio: (
            <>
              <path d={rochedo([[-200, 1220], [-120, 930], [-60, 916], [180, 920], [220, 1000], [260, 1100], [330, 1200], [380, 1230]])} fill={c.meio} />
              <Borda d={linhaReta([[-120, 930], [-60, 916], [180, 920], [220, 1000], [260, 1100], [330, 1200]])} cor={c.luz} ligada={contraluz} largura={2.5} />
              <path d={morro([[300, 1240], [600, 1200], [900, 1220], [1290, 1196]])} fill={c.meio} />
            </>
          ),
          perto: <path d={morro([[-200, 1310], [300, 1296], [700, 1316], [1290, 1300]])} fill={c.perto} />,
          figura: { x: 560, y: 1208, escala: 0.8, virada: 1, anda: [80, 0] },
        };
      }
      if (v === 2) {
        // O acampamento: tendas, palmeiras e o fogo
        const fogo = 0.75 + 0.25 * Math.sin(t / 3) * Math.sin(t / 5.3);
        return {
          longe: <path d={morro([[-200, 1130], [200, 1100], [600, 1130], [1000, 1090], [1290, 1120]])} fill={c.longe} />,
          meio: (
            <>
              <path d={morro([[-200, 1230], [300, 1210], [700, 1230], [1290, 1214]])} fill={c.meio} />
              <Tenda x={250} y={1222} largura={230} cor={c.meio} porta={misturar(c.ceuBase, c.luz, 0.4)} />
              <Tenda x={470} y={1226} largura={160} cor={c.meio} porta={misturar(c.ceuBase, c.luz, 0.3)} />
              <Palmeira x={880} y={1220} escala={0.75} cor={c.meio} t={t} inclina={-1} />
              <Palmeira x={950} y={1222} escala={0.55} cor={c.meio} t={t} />
            </>
          ),
          perto: (
            <>
              <path d={morro([[-200, 1300], [400, 1290], [800, 1304], [1290, 1296]])} fill={c.perto} />
              <ellipse cx={660} cy={1290} rx={70 * fogo} ry={24 * fogo} fill={c.luz} opacity={0.35} />
              <path d={`M640 1294 Q648 ${1262 - 10 * fogo} 660 ${1246 - 14 * fogo} Q672 ${1262 - 8 * fogo} 680 1294 Z`} fill={c.luz} opacity={0.9} />
            </>
          ),
          figura: { x: 760, y: 1296, escala: 0.9, virada: -1 },
        };
      }
      const duna: P[] = [[-200, 1190], [100, 1160], [420, 1206], [700, 1170], [1000, 1140], [1290, 1180]];
      return {
        longe: <path d={morro([[-200, 1120], [180, 1090], [480, 1122], [760, 1080], [1060, 1110], [1290, 1090]])} fill={c.longe} />,
        meio: (
          <>
            <path d={morro(duna)} fill={c.meio} />
            <Borda d={curva(duna)} cor={c.luz} ligada={contraluz} />
            <Palmeira x={860} y={1160} escala={0.45} cor={c.meio} t={t} inclina={-1} />
            <Palmeira x={910} y={1156} escala={0.34} cor={c.meio} t={t} />
          </>
        ),
        perto: <path d={morro([[-200, 1310], [240, 1280], [600, 1310], [900, 1294], [1290, 1320]])} fill={c.perto} />,
        frente: <Palmeira x={60} y={1960} escala={1.45} cor={misturar(c.perto, "#000000", 0.4)} t={t} />,
        figura: { x: 420, y: 1204, escala: 0.8, virada: 1, anda: [70, 0] },
      };
    }
    case "cidade-antiga": {
      if (v === 1) {
        // Os telhados: casas, escadas e cúpulas perto; a pessoa no alto de um terraço
        return {
          longe: <Cidade x0={-120} x1={1220} y={1080} cor={c.longe} semente={44} />,
          meio: <Cidade x0={-160} x1={1260} y={1236} cor={c.meio} semente={45} escala={1.05} />,
          perto: (
            <>
              <path d="M-200 2050 L-200 1240 L260 1240 L260 1150 L520 1150 L520 1240 L1290 1240 L1290 2050 Z" fill={c.perto} />
              <path d="M520 1240 L560 1200 L600 1240 Z M520 1150 L520 1120 L540 1120 L540 1150 Z" fill={c.perto} />
            </>
          ),
          figura: { x: 400, y: 1152, escala: 0.95, virada: 1 },
        };
      }
      if (v === 2) {
        // A cidade no alto do monte, lá longe, e o caminho que sobe até ela
        const colina: P[] = [[-200, 1200], [200, 1150], [400, 1080], [540, 1050], [700, 1080], [900, 1150], [1290, 1190]];
        return {
          longe: (
            <>
              <path d={morro(colina)} fill={c.longe} />
              <path d={muralha(330, 760, 1052, 12)} fill={longeEscuro} />
              <Cidade x0={350} x1={740} y={1020} cor={longeEscuro} semente={9} escala={0.65} />
              <rect x={505} y={930} width={70} height={100} fill={longeEscuro} />
            </>
          ),
          meio: (
            <>
              <path d={morro([[-200, 1260], [200, 1230], [500, 1250], [800, 1226], [1290, 1250]])} fill={c.meio} />
              <Oliveira x={160} y={1240} escala={0.8} cor={c.meio} t={t} semente={14} />
              <Oliveira x={930} y={1236} escala={0.65} cor={c.meio} t={t} semente={16} />
            </>
          ),
          perto: (
            <>
              <path d={morro([[-200, 1310], [400, 1296], [800, 1312], [1290, 1300]])} fill={c.perto} />
              <path d="M520 1300 L560 1300 L800 2050 L280 2050 Z" fill={misturar(c.perto, c.longe, 0.16)} />
            </>
          ),
          figura: { x: 640, y: 1240, escala: 0.9, virada: -1 },
        };
      }
      return {
        longe: (
          <>
            <path d={morro([[-200, 1110], [300, 1090], [700, 1106], [1290, 1088]])} fill={c.longe} />
            <Cidade x0={-120} x1={1220} y={1070} cor={longeEscuro} semente={21} />
          </>
        ),
        meio: (
          <>
            <path d={muralha(-200, 1290, 1130, 20)} fill={c.meio} />
            <path d={muralha(130, 250, 1040, 15)} fill={c.meio} />
            <path d={muralha(830, 950, 1040, 15)} fill={c.meio} />
            <path d={muralha(440, 640, 1000, 18)} fill={c.meio} />
            <path d="M500 1260 L500 1140 Q540 1090 580 1140 L580 1260 Z" fill={brilho} />
            <Borda d="M-200 1130 L130 1130 L130 1040 L250 1040 L250 1130 L440 1130 L440 1000 L640 1000 L640 1130 L830 1130 L830 1040 L950 1040 L950 1130 L1290 1130" cor={c.luz} ligada={contraluz} largura={2} />
          </>
        ),
        perto: (
          <>
            <path d={morro([[-200, 1300], [300, 1290], [600, 1304], [1290, 1292]])} fill={c.perto} />
            <path d="M520 1300 L560 1300 L760 2050 L320 2050 Z" fill={misturar(c.perto, c.longe, 0.16)} />
          </>
        ),
        frente: <Cipreste x={1000} y={1980} altura={520} cor={misturar(c.perto, "#000000", 0.4)} t={t} />,
        // Diante do portão aceso: a pessoa recortada na luz
        figura: { x: 540, y: 1262, escala: 0.82, virada: -1 },
      };
    }
    case "jardim":
    default: {
      if (v === 1) {
        // A oliveira grande à esquerda emoldura; do outro lado do vale, a cidade
        return {
          longe: (
            <>
              <path d={morro([[-200, 1160], [300, 1120], [600, 1090], [900, 1110], [1290, 1100]])} fill={c.longe} />
              <path d={muralha(420, 1000, 1092, 12)} fill={longeEscuro} />
              <Cidade x0={440} x1={980} y={1070} cor={longeEscuro} semente={27} escala={0.7} />
            </>
          ),
          meio: <path d={morro([[-200, 1240], [300, 1220], [700, 1240], [1290, 1222]])} fill={c.meio} />,
          perto: (
            <>
              <path d={morro([[-200, 1300], [400, 1290], [800, 1306], [1290, 1296]])} fill={c.perto} />
              <Pedra x={640} y={1300} largura={240} altura={90} cor={c.perto} />
            </>
          ),
          frente: <Oliveira x={60} y={1380} escala={2.3} cor={misturar(c.perto, "#000000", 0.3)} t={t} semente={19} />,
          figura: { x: 700, y: 1212, escala: 0.95, virada: -1 },
        };
      }
      if (v === 2) {
        // O sepulcro na rocha, com a pedra redonda rolada para o lado
        return {
          longe: <path d={morro([[-200, 1120], [300, 1090], [700, 1110], [1290, 1080]])} fill={c.longe} />,
          meio: (
            <>
              <path d={rochedo([[-200, 1000], [100, 960], [300, 990], [460, 1040], [560, 1120], [600, 1240]])} fill={c.meio} />
              <path d="M220 1240 L220 1150 Q270 1090 320 1150 L320 1240 Z" fill={brilho} opacity={0.85} />
              <circle cx={400} cy={1180} r={64} fill={c.meio} />
              <Borda d={linhaReta([[100, 960], [300, 990], [460, 1040], [560, 1120]])} cor={c.luz} ligada={contraluz} largura={2.5} />
              <Oliveira x={900} y={1236} escala={0.8} cor={c.meio} t={t} semente={30} />
            </>
          ),
          perto: <path d={morro([[-200, 1250], [400, 1240], [800, 1260], [1290, 1250]])} fill={c.perto} />,
          figura: { x: 680, y: 1246, escala: 1, virada: -1 },
        };
      }
      return {
        longe: (
          <>
            <path d={morro([[-200, 1120], [160, 1070], [460, 1110], [800, 1060], [1290, 1100]])} fill={c.longe} />
            <Cidade x0={640} x1={980} y={1072} cor={longeEscuro} semente={4} escala={0.5} />
          </>
        ),
        meio: (
          <>
            <path d={morro([[-200, 1230], [200, 1206], [600, 1224], [1000, 1200], [1290, 1220]])} fill={c.meio} />
            <Oliveira x={210} y={1216} escala={0.9} cor={c.meio} t={t} semente={3} />
            <Oliveira x={800} y={1210} escala={0.7} cor={c.meio} t={t} semente={12} />
          </>
        ),
        perto: (
          <>
            <path d={morro([[-200, 1300], [260, 1286], [600, 1310], [900, 1292], [1290, 1306]])} fill={c.perto} />
            <Pedra x={480} y={1302} largura={220} altura={96} cor={c.perto} />
          </>
        ),
        frente: <Oliveira x={1080} y={2000} escala={2.1} cor={misturar(c.perto, "#000000", 0.35)} t={t} semente={5} />,
        figura: { x: 520, y: 1210, escala: 0.95, virada: 1 },
      };
    }
  }
}

// ---- A cena inteira ----

export interface PropsDaPaisagem {
  cenario: CenarioDaSilhueta;
  cores: CoresDaCena;
  figura: FiguraDaSilhueta;
  /** Os gestos da figura, já no quadro da cena em que a palavra é dita */
  gestos?: ReadonlyArray<{ quadro: number; pose: PoseDaFigura }>;
  camera: CameraDaSilhueta;
  /** Quadros desde o começo da cena e quantos ela dura (a câmera anda nesse tempo) */
  t: number;
  duracao: number;
  /** Prefixo dos ids do SVG (duas cenas na tela na troca: cada uma com os seus) */
  id: string;
  semente?: number;
  /** Qual composição do cenário (0, 1 ou 2) */
  variacao?: number;
  /** A paisagem espelhada (quando a mesma composição volta) */
  espelhar?: boolean;
}

export const Paisagem: React.FC<PropsDaPaisagem> = ({ cenario, cores: c, figura, gestos = [], camera, t, duracao, id, semente = 1, variacao = 0, espelhar = false }) => {
  const espelho = (no: React.ReactNode) => (espelhar ? <g transform={`matrix(-1 0 0 1 ${LARGURA} 0)`}>{no}</g> : no);
  const cam = movimentoDaCamera(camera, t / Math.max(1, duracao));
  const d = desenharCenario(cenario, c, t, variacao % VARIACOES[cenario]);
  const p = Math.min(1, Math.max(0, t / Math.max(1, duracao)));
  const f = d.figura;
  const pessoa =
    figura === "nenhuma" ? null : (
      <FiguraArticulada
        inicial={figura}
        gestos={gestos}
        t={t}
        x={f.x}
        y={f.y}
        escala={f.escala}
        cor={misturar(c.perto, "#000000", 0.2)}
        // Uma borda de luz sempre (a pessoa se separa do fundo); forte no contraluz
        luz={c.luz}
        forcaDaLuz={c.contraluz ? 0.7 : 0.35}
        virada={f.virada}
        anda={f.anda ? { dx: f.anda[0], dy: f.anda[1], p, encolhe: f.encolhe } : undefined}
      />
    );
  const raio = c.relampago ? relampagoEm(t) : { forca: 0, indice: 0 };
  const xDoRaio = 180 + ((raio.indice * 397) % 720);
  const passaros = !c.chuva && c.estrelas < 0.5;
  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} width={LARGURA} height={ALTURA} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id={`${id}-chao`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.ceuBase} stopOpacity={0} />
          <stop offset="0.12" stopColor={c.ceuBase} stopOpacity={0.13} />
          <stop offset="1" stopColor={c.ceuBase} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Camada k={0.12} cam={cam}>
        <Ceu c={c} id={id} t={t} />
      </Camada>
      {c.raios && (
        <Camada k={0.15} cam={cam}>
          <Raios c={c} id={id} t={t} />
        </Camada>
      )}
      <Camada k={0.25} cam={cam}>
        <Nuvens c={c} id={id} t={t} semente={semente} />
        {passaros && <Passaros cor={misturar(c.perto, c.ceuMeio, 0.2)} t={t} semente={semente} />}
        {raio.forca > 0.3 && (
          <path
            d={`M${xDoRaio} 560 L${xDoRaio - 30} 700 L${xDoRaio + 10} 710 L${xDoRaio - 40} 880 L${xDoRaio + 5} 890 L${xDoRaio - 30} 1040`}
            fill="none"
            stroke="#F3F6FF"
            strokeWidth={5}
            strokeLinejoin="round"
            opacity={raio.forca}
          />
        )}
      </Camada>
      <Camada k={0.4} cam={cam}>
        {espelho(d.longe)}
      </Camada>
      {/* Névoa só no clima que pede (e um fio de ar no horizonte, para o longe ficar longe) */}
      <Camada k={0.5} cam={cam}>
        <Nevoa c={c} id={id} t={t} y={1150} altura={c.nevoaForca > 0 ? 260 : 90} forca={c.nevoaForca > 0 ? 0.75 : 0.18} nome="nevoa1" />
      </Camada>
      <Camada k={0.7} cam={cam}>
        {espelho(d.meio)}
        {d.agua && <Reflexo c={c} t={t} y0={d.agua.y0} y1={d.agua.y1} />}
      </Camada>
      {c.nevoaForca > 0 && (
        <Camada k={0.82} cam={cam}>
          <Nevoa c={c} id={id} t={t} y={1250} altura={200} forca={0.5 * c.nevoaForca} nome="nevoa2" />
        </Camada>
      )}
      <Camada k={1} cam={cam}>
        {espelho(
          <>
            {d.perto}
            {pessoa}
          </>,
        )}
        {/* O chão perto recebe um resto da luz do horizonte (não é um buraco preto) */}
        <rect x={-300} y={1170} width={1680} height={560} fill={`url(#${id}-chao)`} />
      </Camada>
      {d.frente && (
        <Camada k={1.35} cam={cam}>
          {espelho(d.frente)}
        </Camada>
      )}
      {c.chuva && <Chuva c={c} t={t} />}
      {raio.forca > 0 && <rect x={0} y={0} width={LARGURA} height={ALTURA} fill="#E8EEFF" opacity={raio.forca * 0.35} />}
    </svg>
  );
};
