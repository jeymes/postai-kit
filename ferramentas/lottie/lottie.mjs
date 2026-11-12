// Peças para desenhar animações Lottie por código: vetores puros, fundo
// transparente, 30 quadros por segundo (o quadro do Lottie é o quadro do
// Remotion). Copiado e adaptado dos geradores de Lottie do Laços.
import { writeFileSync } from "node:fs";

export const hex = (h, a = 1) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
};

// Curvas: [x1, y1, x2, y2] do cubic-bezier
export const EASE = {
  entrada: [0.2, 0.75, 0.34, 0.94],
  assenta: [0.0, 0.65, 0.51, 0.99],
  pop: [0.94, 0.75, 0.34, 0.94],
  viagem: [1.0, 0.49, 0.0, 0.55],
  saida: [1.0, 0.02, 0.54, 0.42],
  sobe: [0.25, 0.6, 0.45, 1],
  cai: [0.55, 0, 0.75, 0.45],
  linear: [0.33, 0.33, 0.67, 0.67],
};

export const fixo = (k) => ({ a: 0, k });
const arr = (v) => (Array.isArray(v) ? v : [v]);
const animada = (v) => typeof v === "object" && v !== null && v.a !== undefined;

/** Propriedade animada: chaves = [[quadro, valor, easing?], ...]; o easing vale até a próxima chave */
export const anim = (chaves) => ({
  a: 1,
  k: chaves.map(([t, v, e = EASE.assenta], i) =>
    i === chaves.length - 1 ? { t, s: arr(v) } : { t, s: arr(v), o: { x: [e[0]], y: [e[1]] }, i: { x: [e[2]], y: [e[3]] } },
  ),
});

export const tr = ({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) => ({
  ty: "tr",
  p: animada(p) ? p : fixo(p),
  a: fixo(a),
  s: animada(s) ? s : fixo(s),
  r: animada(r) ? r : fixo(r),
  o: animada(o) ? o : fixo(o),
  sk: fixo(0),
  sa: fixo(0),
});

const ks = ({ p = [0, 0, 0], a = [0, 0, 0], s = [100, 100, 100], r = 0, o = 100 } = {}) => ({
  o: animada(o) ? o : fixo(o),
  r: animada(r) ? r : fixo(r),
  p: animada(p) ? p : fixo(p),
  a: fixo(a),
  s: animada(s) ? s : fixo(s),
});

export const grupo = (nm, itens, transform = {}) => ({ ty: "gr", nm, it: [...itens, tr(transform)] });
export const preenche = (c, o = 100) => ({ ty: "fl", c: fixo(c), o: animada(o) ? o : fixo(o), r: 1 });
export const contorno = (c, w, o = 100) => ({
  ty: "st",
  c: fixo(c),
  o: animada(o) ? o : fixo(o),
  w: fixo(w),
  lc: 2,
  lj: 2,
});
/** Desenha o traço de 0 a `fim` (%), para linhas que se desenham */
export const desenha = (fim, inicio = fixo(0)) => ({ ty: "tm", s: inicio, e: fim, o: fixo(0), m: 1 });
export const elipse = (w, h = w, p = [0, 0]) => ({ ty: "el", p: fixo(p), s: fixo([w, h]), d: 1 });
export const retangulo = (w, h, r = 0, p = [0, 0]) => ({ ty: "rc", p: fixo(p), s: fixo([w, h]), r: fixo(r), d: 1 });

/** Linha reta entre pontos */
export const linha = (pontos, fechado = false) => ({
  ty: "sh",
  ks: fixo({ v: pontos, i: pontos.map(() => [0, 0]), o: pontos.map(() => [0, 0]), c: fechado }),
});

/** Caminho com cúbicas: inicio [x,y] e segmentos [[c1, c2, ponto], ...] (como o "C" do SVG) */
export const curva = (inicio, segmentos, fechado = false) => {
  const v = [inicio];
  const o = [];
  const i = [[0, 0]];
  let atual = inicio;
  segmentos.forEach(([c1, c2, p], k) => {
    o.push([c1[0] - atual[0], c1[1] - atual[1]]);
    if (fechado && k === segmentos.length - 1) {
      i[0] = [c2[0] - inicio[0], c2[1] - inicio[1]];
    } else {
      v.push(p);
      i.push([c2[0] - p[0], c2[1] - p[1]]);
    }
    atual = p;
  });
  if (!fechado) o.push([0, 0]);
  return { ty: "sh", ks: fixo({ v, i, o, c: fechado }) };
};

/** Estrela de 4 pontas (brilho), centrada em 0 */
export const brilho4 = (r) => {
  const m = r * 0.22;
  return linha([[0, -r], [m, -m], [r, 0], [m, m], [0, r], [-m, m], [-r, 0], [-m, -m]], true);
};

/** Estrela de 5 pontas (avaliação), centrada em 0 */
export const estrela5 = (r) => {
  const pontos = [];
  for (let k = 0; k < 10; k++) {
    const raio = k % 2 === 0 ? r : r * 0.45;
    const ang = -Math.PI / 2 + (k * Math.PI) / 5;
    pontos.push([Math.cos(ang) * raio, Math.sin(ang) * raio]);
  }
  return linha(pontos, true);
};

/** Coração, centrado em 0, largura ~2r */
export const coracao = (r) => {
  const k = r / 6;
  const P = (x, y) => [x * k, y * k];
  return curva(P(0, 5), [[P(-7, -1), P(-4, -9), P(0, -4.5)], [P(4, -9), P(7, -1), P(0, 5)]], true);
};

/** Sorteio com semente: o arquivo sai sempre igual */
export const sorteio = (semente) => () => {
  semente = (semente + 0x6d2b79f5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Monta um arquivo: cada animação começa a contar as camadas do 1 */
export function arquivo(nome, { w, h, op, camadas }) {
  let indice = 0;
  const layers = camadas.map(({ nm, shapes, ip = 0, transform = {}, op: fim }) => ({
    ddd: 0,
    ind: ++indice,
    ty: 4,
    nm,
    sr: 1,
    ks: ks(transform),
    ao: 0,
    shapes,
    ip,
    op: fim ?? op,
    st: 0,
    bm: 0,
  }));
  return { v: "5.7.4", fr: 30, ip: 0, op, w, h, nm: nome, ddd: 0, assets: [], layers };
}

export function salvar(caminho, json) {
  writeFileSync(caminho, JSON.stringify(json));
  console.log(`✓ ${json.nm}.json  (${json.w}×${json.h}, ${json.op} quadros)`);
}
