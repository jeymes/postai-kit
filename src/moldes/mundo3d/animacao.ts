import * as THREE from "three";
import type { Expressao, Pose } from "../../componentes/personagens/Boneco";

// A animação dos bonecos de peças (27/11/2026): o boneco ganhou cotovelo, joelho,
// tronco e cabeça que giram, e cada pose virou uma "postura" (os ângulos de todas
// as juntas). Entre duas posturas, as juntas se misturam com suavidade (nada pula),
// e por cima vem a vida: respirar, piscar, trocar o peso de perna, a cabeça
// acompanhando quem fala, os gestos no ritmo das palavras e o andar com o passo
// do tamanho da perna (o pé não escorrega).
//
// Tudo aqui é conta pura (sem React): o mesmo quadro dá sempre o mesmo boneco,
// e o render em várias abas e em blocos sai igual.

/** Sorteio com semente (mulberry32): o mesmo número, a mesma sequência */
export function sorteio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Graus para radianos */
export const GRAUS = Math.PI / 180;

/** Medidas do boneco (metros); o BonecoDePecas usa as mesmas */
export const CORPO = {
  quadril: 0.5,
  pernaX: 0.12,
  coxa: 0.23,
  canela: 0.21,
  pe: 0.09,
  ombroX: 0.37,
  ombroY: 1.0,
  bracoCima: 0.25,
  antebraco: 0.23,
  mao: 0.085,
  pescoco: 1.1,
};

/**
 * Um braço: o giro do ombro (quatérnio, para misturar duas posturas pelo caminho
 * mais curto, sem o braço dar volta), o cotovelo dobrado (graus) e um balanço por
 * cima, em graus no corpo: [para a frente, para fora] (respirar, gesticular, andar).
 */
export type Braco = { q: [number, number, number, number]; cotovelo: number; mais: [number, number] };

const _eb = new THREE.Euler();
const _qb = new THREE.Quaternion();
/** Um braço pelos ângulos: [frente, abre, torce] em graus e o cotovelo */
export function braco(lado: 1 | -1, ombro: [number, number, number], cotovelo: number): Braco {
  _eb.set(-ombro[0] * GRAUS, lado * ombro[2] * GRAUS, lado * ombro[1] * GRAUS, "ZXY");
  _qb.setFromEuler(_eb);
  return { q: [_qb.x, _qb.y, _qb.z, _qb.w], cotovelo, mais: [0, 0] };
}
const par = (ombro: [number, number, number], cotovelo: number) => ({ dir: braco(1, ombro, cotovelo), esq: braco(-1, ombro, cotovelo) });
/** Soma um balanço ao braço (graus para a frente e para fora) */
export const balancar = (b: Braco, frente: number, fora: number, cotovelo = 0): Braco => ({ q: b.q, cotovelo: b.cotovelo + cotovelo, mais: [b.mais[0] + frente, b.mais[1] + fora] });
/** Uma perna: o quadril [frente, abre] (graus) e o joelho dobrado (graus) */
export type Perna = { quadril: [number, number]; joelho: number };

export type Postura = {
  esq: Braco;
  dir: Braco;
  pernaEsq: Perna;
  pernaDir: Perna;
  /** [frente, torce, lado] em graus (inclina o tronco no quadril) */
  tronco: [number, number, number];
  /** [baixo, vira, inclina] em graus (no pescoço) */
  cabeca: [number, number, number];
  /** Encolhe os ombros (metros) */
  ombros: number;
  /** Sentado no chão: o quadril desce até o chão */
  sentado: number;
  /** Deitado de lado (0 a 1) */
  deitado: number;
  /** Quanto cada braço fica livre para balançar e gesticular (0 a 1) */
  livreEsq: number;
  livreDir: number;
  /** Para onde os olhos olham (-1 a 1): [lado, cima] */
  olhos: [number, number];
};


/**
 * O braço por alvo (IK de dois ossos, feito uma vez ao carregar): a mão vai até
 * "alvo" e o cotovelo aponta para "polo". Medidas no tronco (a partir do quadril):
 * x para o lado do braço direito, y para cima, z para a frente. Assim a mão
 * encosta mesmo no quadril, no queixo, no rosto e na outra mão; a postura guarda
 * os ângulos (a mistura entre posturas continua suave).
 */
export function bracoAte(lado: 1 | -1, alvo: [number, number, number], polo: [number, number, number]): Braco {
  const S = new THREE.Vector3(lado * CORPO.ombroX, CORPO.ombroY - CORPO.quadril, 0);
  const a = CORPO.bracoCima;
  const b = CORPO.antebraco + 0.075;
  const st = new THREE.Vector3(...alvo).sub(S);
  const d = Math.min(a + b - 0.005, Math.max(Math.abs(a - b) + 0.01, st.length()));
  const t = st.normalize();
  const p = new THREE.Vector3(...polo).normalize();
  p.sub(t.clone().multiplyScalar(p.dot(t))).normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const u = t.clone().multiplyScalar(cosA).add(p.clone().multiplyScalar(sinA)).normalize();
  const E = S.clone().add(u.clone().multiplyScalar(a));
  const T = S.clone().add(t.clone().multiplyScalar(d));
  const f = T.sub(E).normalize();
  const cosG = Math.min(1, Math.max(-1, (a * a + b * b - d * d) / (2 * a * b)));
  const cotovelo = 180 - Math.acos(cosG) / GRAUS;
  const w = f.clone().sub(u.clone().multiplyScalar(f.dot(u)));
  if (w.length() < 1e-4) w.copy(p);
  w.normalize();
  const Y = u.clone().negate();
  const X = new THREE.Vector3().crossVectors(Y, w);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, w));
  return { q: [q.x, q.y, q.z, q.w], cotovelo, mais: [0, 0] };
}
/** Os dois braços por alvo, espelhados (alvo e polo do braço direito) */
const osDois = (alvo: [number, number, number], polo: [number, number, number]) => ({
  dir: bracoAte(1, alvo, polo),
  esq: bracoAte(-1, [-alvo[0], alvo[1], alvo[2]], [-polo[0], polo[1], polo[2]]),
});

const SOLTOS = par([4, 7, 0], 12);
const PERNA_DE_PE: Perna = { quadril: [0, 2], joelho: 3 };

const BASE: Postura = {
  esq: SOLTOS.esq,
  dir: SOLTOS.dir,
  pernaEsq: PERNA_DE_PE,
  pernaDir: PERNA_DE_PE,
  tronco: [0, 0, 0],
  cabeca: [0, 0, 0],
  ombros: 0,
  sentado: 0,
  deitado: 0,
  livreEsq: 1,
  livreDir: 1,
  olhos: [0, 0],
};

const com = (mudar: Partial<Postura>): Postura => ({ ...BASE, ...mudar });
const AJOELHADO: Partial<Postura> = { pernaEsq: { quadril: [-4, 3], joelho: 92 }, pernaDir: { quadril: [-4, 3], joelho: 92 } };
// As mãos juntas na frente do peito (as duas palmas se encostam)
const MAOS_JUNTAS = osDois([0.045, 0.44, 0.3], [1, -1, -0.2]);

/**
 * As ações que o roteiro pode pedir (`acoes` da cena) e as poses de sempre.
 * Cada uma vira uma postura; algumas também movem (andar, correr), giram
 * (virar) ou passam um objeto de mão (entregar).
 */
export const ACOES = [
  // As poses de sempre (as mesmas do 2D)
  "normal",
  "cintura",
  "celular",
  "celular-baixo",
  "cabeca",
  "explicando",
  "comemorando",
  "pensando",
  "sentado",
  "apontando",
  "caido",
  "abraco",
  // As ações do 3D (27/11/2026)
  "andar",
  "correr",
  "virar",
  "olhar",
  "olhar-cima",
  "olhar-baixo",
  "ajoelhar",
  "orar",
  "ajoelhar-orando",
  "levantar-bracos",
  "chorar",
  "acenar",
  "entregar",
  "abracar",
  "sentar",
  "levantar",
  "cair",
  "assustar",
  "cruzar-bracos",
  "mostrar",
  // Os verbos das poses (o mesmo que a pose)
  "apontar",
  "comemorar",
  "pensar",
  "explicar",
] as const;
export type Acao = (typeof ACOES)[number];

/** Postura de cada pose e de cada ação (as que só movem ficam com a postura de antes) */
export const POSTURAS: Record<string, Postura> = {
  normal: BASE,
  cintura: com({ dir: bracoAte(1, [0.31, 0.1, 0.03], [1, 0.1, -0.6]), livreDir: 0.15 }),
  celular: com({ dir: bracoAte(1, [0.1, 0.4, 0.36], [1, -1, 0]), cabeca: [20, 4, 0], livreDir: 0.1, olhos: [0, -0.9] }),
  "celular-baixo": com({ dir: braco(1, [8, 9, 0], 22), cabeca: [12, 0, 0], livreDir: 0.4 }),
  cabeca: com({ ...osDois([0.34, 0.98, 0.04], [1, 0.1, -0.2]), cabeca: [8, 0, 0], ombros: 0.03, livreEsq: 0.1, livreDir: 0.1 }),
  explicando: com({ dir: bracoAte(1, [0.36, 0.4, 0.42], [1, -1, -0.2]), tronco: [3, -6, 0], livreDir: 0.7 }),
  comemorando: com({ esq: braco(-1, [8, 148, 0], 18), dir: braco(1, [8, 148, 0], 18), cabeca: [-12, 0, 0], livreEsq: 0.3, livreDir: 0.3 }),
  pensando: com({
    // A mão no queixo; a outra segura o cotovelo
    dir: bracoAte(1, [0.04, 0.66, 0.34], [0.5, -1, 0.1]),
    esq: bracoAte(-1, [0.12, 0.38, 0.26], [-1, -1, 0]),
    cabeca: [4, 6, 8],
    livreEsq: 0.1,
    livreDir: 0.05,
    olhos: [0.5, 0.6],
  }),
  sentado: com({
    sentado: 1,
    pernaEsq: { quadril: [84, 8], joelho: 78 },
    pernaDir: { quadril: [84, 8], joelho: 78 },
    esq: braco(-1, [42, 8, 0], 28),
    dir: braco(1, [42, 8, 0], 28),
    tronco: [6, 0, 0],
    livreEsq: 0.3,
    livreDir: 0.3,
  }),
  apontando: com({ dir: braco(1, [84, 12, 0], 6), tronco: [2, -10, 0], cabeca: [0, -8, 0], livreDir: 0 }),
  caido: com({ deitado: 1, esq: braco(-1, [10, 22, 0], 20), dir: braco(1, [30, 14, 0], 30), pernaDir: { quadril: [20, 4], joelho: 30 }, livreEsq: 0, livreDir: 0, olhos: [0, 0] }),
  abraco: com({ ...osDois([0.22, 0.45, 0.5], [1, -0.2, 0]), tronco: [2, 0, 0], cabeca: [4, 0, 10], livreEsq: 0, livreDir: 0 }),
  ajoelhar: com({ ...AJOELHADO, tronco: [4, 0, 0], livreEsq: 0.5, livreDir: 0.5 }),
  orar: com({ ...MAOS_JUNTAS, cabeca: [22, 0, 0], livreEsq: 0, livreDir: 0, olhos: [0, -1] }),
  "ajoelhar-orando": com({ ...AJOELHADO, ...MAOS_JUNTAS, cabeca: [20, 0, 0], tronco: [4, 0, 0], livreEsq: 0, livreDir: 0, olhos: [0, -1] }),
  "levantar-bracos": com({ esq: braco(-1, [24, 138, 0], 8), dir: braco(1, [24, 138, 0], 8), cabeca: [-26, 0, 0], tronco: [-4, 0, 0], livreEsq: 0.2, livreDir: 0.2, olhos: [0, 1] }),
  chorar: com({
    // As mãos no rosto (a cabeça desce 24 graus: o rosto vem para baixo e para a frente)
    ...osDois([0.12, 0.74, 0.36], [1, -1, 0.1]),
    cabeca: [24, 0, 6],
    tronco: [10, 0, 0],
    ombros: 0.035,
    livreEsq: 0,
    livreDir: 0,
  }),
  acenar: com({ dir: bracoAte(1, [0.58, 1.02, 0.12], [1, -0.6, -0.3]), livreDir: 0 }),
  entregar: com({ dir: bracoAte(1, [0.16, 0.42, 0.62], [1, -1, 0]), tronco: [8, 0, 0], cabeca: [10, 0, 0], livreDir: 0, olhos: [0, -0.4] }),
  receber: com({ dir: bracoAte(1, [0.16, 0.36, 0.56], [1, -1, 0]), tronco: [5, 0, 0], cabeca: [8, 0, 0], livreDir: 0 }),
  sentar: BASE, // = sentado (ver alias abaixo)
  assustar: com({ ...osDois([0.28, 0.74, 0.42], [1, -1, 0]), tronco: [-9, 0, 0], cabeca: [-6, 0, 0], ombros: 0.03, livreEsq: 0, livreDir: 0 }),
  "cruzar-bracos": com({ dir: bracoAte(1, [-0.06, 0.35, 0.27], [1, -0.6, 0.2]), esq: bracoAte(-1, [0.06, 0.39, 0.32], [-1, -0.6, 0.2]), cabeca: [-3, 0, 4], livreEsq: 0, livreDir: 0 }),
  mostrar: com({ dir: bracoAte(1, [0.2, 0.44, 0.5], [1, -1, 0]), cabeca: [6, 0, 0], livreDir: 0 }),
  "olhar-cima": com({ cabeca: [-34, 0, 0], tronco: [-4, 0, 0], olhos: [0, 1] }),
  "olhar-baixo": com({ cabeca: [30, 0, 0], tronco: [6, 0, 0], olhos: [0, -1] }),
};
// Nomes que querem dizer a mesma postura
const ALIAS: Record<string, string> = { sentar: "sentado", cair: "caido", levantar: "normal", abracar: "abraco", comemorar: "comemorando", apontar: "apontando", pensar: "pensando", explicar: "explicando" };
/** As ações que só movem ou giram: a postura continua a de antes */
const SO_MOVEM = new Set(["andar", "correr", "virar", "olhar"]);

export const posturaDaAcao = (acao: string): Postura | null => (SO_MOVEM.has(acao) ? null : (POSTURAS[ALIAS[acao] ?? acao] ?? null));

// Olhar e os gestos de braço não mudam a postura de baixo (28/11/2026: o "olhar-cima"
// levantava quem estava ajoelhado; o "orar" de quem estava sentado o punha de pé).
/** Só a cabeça, o tronco e os olhos: o resto do corpo fica como estava */
const SO_CABECA = new Set(["olhar-cima", "olhar-baixo"]);
/** Só os braços (e a cabeça e o tronco): as pernas ficam como estavam (ajoelhado, sentado, deitado) */
const SO_BRACOS = new Set(["orar", "levantar-bracos", "chorar", "acenar", "cruzar-bracos", "mostrar", "apontando", "explicando", "pensando", "comemorando", "cabeca", "cintura", "celular", "celular-baixo"]);

/** A postura que a ação pede, por cima da postura de agora (as ações de cima mantêm as pernas) */
export function posturaPorCima(acao: string, nova: Postura, atual: Postura): Postura {
  const nome = ALIAS[acao] ?? acao;
  if (SO_CABECA.has(nome)) return { ...atual, cabeca: nova.cabeca, tronco: nova.tronco, olhos: nova.olhos };
  if (SO_BRACOS.has(nome)) return { ...nova, pernaEsq: atual.pernaEsq, pernaDir: atual.pernaDir, sentado: atual.sentado, deitado: atual.deitado };
  return nova;
}
/** A pose 2D mais parecida (para o palito, que só tem as poses de sempre) */
export function poseDoPalito(acao: string): Pose | null {
  const nome = ALIAS[acao] ?? acao;
  const direto = ["normal", "cintura", "celular", "celular-baixo", "cabeca", "explicando", "comemorando", "pensando", "sentado", "apontando", "caido", "abraco"];
  if (direto.includes(nome)) return nome as Pose;
  const perto: Record<string, Pose> = {
    ajoelhar: "normal",
    orar: "pensando",
    "ajoelhar-orando": "pensando",
    "levantar-bracos": "comemorando",
    chorar: "cabeca",
    acenar: "explicando",
    entregar: "apontando",
    receber: "explicando",
    assustar: "cabeca",
    "cruzar-bracos": "cintura",
    mostrar: "explicando",
    "olhar-cima": "normal",
    "olhar-baixo": "normal",
  };
  return perto[nome] ?? null;
}
/** A expressão que a ação pede, quando o roteiro não diz */
export const EXPRESSAO_DA_ACAO: Partial<Record<string, Expressao>> = {
  chorar: "preocupada",
  comemorando: "radiante",
  comemorar: "radiante",
  "levantar-bracos": "feliz",
  assustar: "medo",
  cabeca: "preocupada",
  caido: "medo",
  cair: "medo",
  orar: "aliviada",
  "ajoelhar-orando": "aliviada",
};

// ---------- Mistura ----------
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const _qa = new THREE.Quaternion();
const _qc = new THREE.Quaternion();
const mixBraco = (a: Braco, b: Braco, t: number): Braco => {
  _qa.set(...a.q);
  _qc.set(...b.q);
  _qa.slerp(_qc, Math.min(1.2, Math.max(-0.2, t)));
  return { q: [_qa.x, _qa.y, _qa.z, _qa.w], cotovelo: mix(a.cotovelo, b.cotovelo, t), mais: [mix(a.mais[0], b.mais[0], t), mix(a.mais[1], b.mais[1], t)] };
};
const mixPerna = (a: Perna, b: Perna, t: number): Perna => ({ quadril: [mix(a.quadril[0], b.quadril[0], t), mix(a.quadril[1], b.quadril[1], t)], joelho: mix(a.joelho, b.joelho, t) });

export function misturar(a: Postura, b: Postura, t: number): Postura {
  if (t === 0) return a;
  if (t === 1) return b;
  return {
    esq: mixBraco(a.esq, b.esq, t),
    dir: mixBraco(a.dir, b.dir, t),
    pernaEsq: mixPerna(a.pernaEsq, b.pernaEsq, t),
    pernaDir: mixPerna(a.pernaDir, b.pernaDir, t),
    tronco: mix3(a.tronco, b.tronco, t),
    cabeca: mix3(a.cabeca, b.cabeca, t),
    ombros: mix(a.ombros, b.ombros, t),
    sentado: mix(a.sentado, b.sentado, t),
    deitado: mix(a.deitado, b.deitado, t),
    livreEsq: mix(a.livreEsq, b.livreEsq, t),
    livreDir: mix(a.livreDir, b.livreDir, t),
    olhos: [mix(a.olhos[0], b.olhos[0], t), mix(a.olhos[1], b.olhos[1], t)],
  };
}

/** Suave no começo e no fim, com uma pontinha de passagem (o braço "assenta" no lugar) */
export function curva(t: number) {
  const x = Math.min(1, Math.max(0, t));
  const s = x * x * x * (x * (x * 6 - 15) + 10);
  // Passa uns 3% e volta (o "assentar" da animação), só no fim
  return s + Math.sin(x * Math.PI) * 0.12 * x * x * x;
}
export const suave = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

// ---------- A trilha de cada personagem ----------
export type ChaveDePostura = {
  quadro: number;
  postura: Postura;
  expressao: Expressao;
  /** Quadros para chegar na postura */
  transicao: number;
  /** O nome (para os balanços: acenar, chorar...) */
  nome: string;
  lagrimas: boolean;
};

export type Movimento = { inicio: number; fim: number; de: [number, number]; ate: [number, number]; correr: boolean; /** false: anda sem virar (o passo para trás) */ virar?: boolean };
export type Giro = { quadro: number; alvo: "frente" | "costas" | { id: string } | null; fim: number };
export type Olhar = { quadro: number; alvo: "cima" | "baixo" | { id: string } | null; fim: number };

export type Trilha = {
  chaves: ChaveDePostura[];
  movimentos: Movimento[];
  giros: Giro[];
  olhares: Olhar[];
  inicio: [number, number];
};

/** A postura e a expressão no quadro: a última chave, misturada a partir de onde a anterior estava */
export function posturaNoQuadro(
  chaves: ChaveDePostura[],
  quadro: number,
): { postura: Postura; expressao: Expressao; nome: string; desde: number; lagrimas: boolean; trocouExpressao: boolean; anterior: string | null; transicao: number; alvo: Postura } {
  if (!chaves.length) return { postura: BASE, expressao: "neutra", nome: "normal", desde: 0, lagrimas: false, trocouExpressao: false, anterior: null, transicao: 1, alvo: BASE };
  // "partida": onde o boneco estava quando a chave k começou (a anterior pode não ter chegado)
  let partida = chaves[0].postura;
  let k = 0;
  for (let i = 1; i < chaves.length && chaves[i].quadro <= quadro; i++) {
    const anterior = chaves[i - 1];
    const t = i - 1 === 0 ? 1 : (chaves[i].quadro - anterior.quadro) / Math.max(1, anterior.transicao);
    partida = misturar(partida, anterior.postura, curva(t));
    k = i;
  }
  const c = chaves[k];
  const t = k === 0 ? 1 : (quadro - c.quadro) / Math.max(1, c.transicao);
  return {
    postura: misturar(partida, c.postura, curva(t)),
    expressao: c.expressao,
    nome: c.nome,
    desde: quadro - c.quadro,
    lagrimas: c.lagrimas,
    trocouExpressao: k > 0 && chaves[k - 1].expressao !== c.expressao,
    anterior: k > 0 ? chaves[k - 1].nome : null,
    transicao: c.transicao,
    alvo: c.postura,
  };
}

/** Onde a pessoa está no chão e o quanto ela já andou (para o passo) */
export function posicaoNoQuadro(trilha: Trilha, quadro: number): { onde: [number, number]; andando: number; correndo: boolean; rumo: number | null; distancia: number } {
  let onde = trilha.inicio;
  let distancia = 0;
  for (const m of trilha.movimentos) {
    const total = Math.hypot(m.ate[0] - m.de[0], m.ate[1] - m.de[1]);
    if (quadro <= m.inicio) break;
    const dur = Math.max(1, m.fim - m.inicio);
    const t = Math.min(1, (quadro - m.inicio) / dur);
    // Acelera e freia (meio segundo de cada lado), velocidade constante no meio
    const r = Math.min(0.25, 12 / dur);
    const e = rampa(t, r);
    onde = [mix(m.de[0], m.ate[0], e), mix(m.de[1], m.ate[1], e)];
    distancia += total * e;
    if (t < 1) {
      // Quanto do passo agora (0 parado, 1 andando): entra e sai junto da velocidade
      const forca = Math.min(1, Math.min(t, 1 - t) / Math.max(0.0001, r) + 0.15);
      return { onde, andando: Math.min(1, forca), correndo: m.correr, rumo: Math.atan2(m.ate[0] - m.de[0], m.ate[1] - m.de[1]), distancia };
    }
  }
  return { onde, andando: 0, correndo: false, rumo: null, distancia };
}

/** Posição ao longo do movimento (0 a 1) com aceleração e freio de largura r */
function rampa(t: number, r: number) {
  // Integral de uma velocidade trapezoidal normalizada
  const v = 1 / (1 - r);
  if (t < r) return (v * t * t) / (2 * r);
  if (t > 1 - r) return 1 - (v * (1 - t) * (1 - t)) / (2 * r);
  return v * (t - r / 2);
}

/** Ângulo mais curto de a para b */
export function giroCurto(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ---------- O passo (andar e correr) ----------
/** Quanto a pessoa anda num ciclo de passos (duas passadas), em metros */
export const CICLO_ANDANDO = 0.86;
export const CICLO_CORRENDO = 1.5;

/** O balanço do andar, somado à postura (a força entra e sai com a velocidade) */
export function passo(p: Postura, distancia: number, forca: number, correndo: boolean): Postura {
  if (forca <= 0) return p;
  const fase = (distancia / (correndo ? CICLO_CORRENDO : CICLO_ANDANDO)) * Math.PI * 2;
  const A = (correndo ? 38 : 26) * forca;
  const s = Math.sin(fase);
  const c = Math.cos(fase);
  // O joelho dobra quando a perna vem para a frente (no ar)
  const joelho = (lado: 1 | -1) => {
    const vindo = lado * c;
    return (correndo ? 18 : 6) * forca + Math.max(0, vindo) ** 1.4 * (correndo ? 70 : 42) * forca;
  };
  const perna = (base: Perna, lado: 1 | -1): Perna => ({
    quadril: [base.quadril[0] * (1 - forca) + lado * A * s, base.quadril[1]],
    joelho: base.joelho * (1 - forca) + joelho(lado),
  });
  // Correndo, os braços descem para o lado do corpo (ninguém corre de braços para cima)
  const balanco = (base: Braco, livre: number, lado: 1 | -1): Braco => {
    const b = correndo ? mixBraco(base, lado === 1 ? BASE.esq : BASE.dir, forca * 0.9) : base;
    const l = correndo ? Math.max(livre, forca) : livre;
    return balancar(b, -lado * A * 0.75 * s * l, 0, (correndo ? 70 : 12) * forca * l);
  };
  return {
    ...p,
    pernaEsq: perna(p.pernaEsq, 1),
    pernaDir: perna(p.pernaDir, -1),
    esq: balanco(p.esq, p.livreEsq, 1),
    dir: balanco(p.dir, p.livreDir, -1),
    tronco: [p.tronco[0] + (correndo ? 14 : 4) * forca, p.tronco[1] + s * 5 * forca, p.tronco[2]],
    cabeca: [p.cabeca[0] - (correndo ? 8 : 2) * forca, p.cabeca[1] - s * 3 * forca, p.cabeca[2]],
    sentado: p.sentado * (1 - forca),
  };
}

// ---------- A vida (respirar, peso, olhar, gestos) ----------
/** Um ruído suave e determinístico (soma de senos), de -1 a 1 */
export function ruido(t: number, semente: number) {
  return (Math.sin(t * 1.0 + semente * 1.7) * 0.5 + Math.sin(t * 2.3 + semente * 3.1) * 0.3 + Math.sin(t * 4.1 + semente * 0.7) * 0.2) * 0.98;
}

export type Vida = {
  quadro: number;
  semente: number;
  /** Fala agora (a boca mexe): o quanto das batidas das palavras */
  batida: number;
  /** Ouvindo outra pessoa falar (0 a 1) */
  ouvindo: number;
  /** Para onde a cabeça quer virar (relativo ao corpo, graus) */
  olharLado: number;
  /** Vida mínima (a multidão): só respira e troca o peso */
  pouca?: boolean;
  /** O balanço próprio da ação (acenar, chorar, comemorar) */
  nome: string;
  desde: number;
};

export function viver(p: Postura, v: Vida): Postura {
  const t = v.quadro / 30;
  const s = v.semente;
  // Respira (os ombros sobem um pouco) e troca o peso de perna devagar (uns 6 s)
  const respira = Math.sin(t * 1.6 * Math.PI * 0.5 + s) * 0.5 + 0.5;
  const peso = ruido(t * 0.35, s);
  const parado = 1 - Math.max(p.sentado, p.deitado);
  const r: Postura = {
    ...p,
    ombros: p.ombros + respira * 0.012,
    pernaEsq: { ...p.pernaEsq, joelho: p.pernaEsq.joelho + Math.max(0, peso) * 9 * parado },
    pernaDir: { ...p.pernaDir, joelho: p.pernaDir.joelho + Math.max(0, -peso) * 9 * parado },
    tronco: [p.tronco[0] + respira * 0.8, p.tronco[1] + ruido(t * 0.3, s + 5) * 3, p.tronco[2] + peso * 2.2 * parado],
    cabeca: [p.cabeca[0] + ruido(t * 0.5, s + 9) * 2.5, p.cabeca[1] + ruido(t * 0.4, s + 2) * 4, p.cabeca[2] + ruido(t * 0.45, s + 4) * 3 - peso * 1.5],
  };
  // Os braços livres balançam de leve (a mão nunca fica congelada)
  const solto = (b: Braco, livre: number, k: number): Braco => balancar(b, ruido(t * 0.6, s + k) * 3.5 * livre + respira * 1.2, ruido(t * 0.5, s + k + 3) * 2.5 * livre, ruido(t * 0.7, s + k + 7) * 5 * livre);
  r.esq = solto(r.esq, Math.max(0.25, r.livreEsq), 11);
  r.dir = solto(r.dir, Math.max(0.25, r.livreDir), 23);
  if (v.pouca) return r;

  // A cabeça vira para quem fala (ou para onde a cena pede), sem passar do pescoço
  // (até 28 graus: mais que isso, de perfil, o rosto some do plano)
  r.cabeca = [r.cabeca[0], r.cabeca[1] + Math.max(-28, Math.min(28, v.olharLado * 0.6)), r.cabeca[2]];
  // Falando: a cabeça acompanha as palavras e a mão livre marca as batidas
  if (v.batida > 0) {
    const b = v.batida;
    r.cabeca = [r.cabeca[0] + b * 5 - 2, r.cabeca[1], r.cabeca[2] + b * 2];
    r.tronco = [r.tronco[0] + b * 2, r.tronco[1], r.tronco[2]];
    // A mão que gesticula: a direita, se estiver livre; senão a esquerda
    if (r.livreDir >= 0.5) r.dir = balancar(r.dir, b * 26 * r.livreDir, b * 6, b * 48 * r.livreDir);
    else if (r.livreEsq >= 0.5) r.esq = balancar(r.esq, b * 24 * r.livreEsq, b * 5, b * 44 * r.livreEsq);
  }
  // Ouvindo: um aceno de cabeça de vez em quando
  if (v.ouvindo > 0) r.cabeca = [r.cabeca[0] + Math.max(0, Math.sin(t * 2.2 + s)) ** 6 * 6 * v.ouvindo, r.cabeca[1], r.cabeca[2]];

  // O balanço de cada ação
  const d = v.desde / 30;
  if (v.nome === "acenar") {
    const onda = Math.sin(d * Math.PI * 2 * 2.2);
    r.dir = balancar(r.dir, onda * 6, onda * 12, onda * 16);
  } else if (v.nome === "chorar") {
    // Soluço: os ombros sobem em trancos
    const soluco = Math.max(0, Math.sin(d * Math.PI * 2 * 1.6)) ** 3;
    r.ombros += soluco * 0.03;
    r.tronco = [r.tronco[0] + soluco * 3, r.tronco[1], r.tronco[2]];
    r.cabeca = [r.cabeca[0] + soluco * 4, r.cabeca[1], r.cabeca[2]];
  } else if (v.nome === "comemorando" || v.nome === "comemorar" || v.nome === "levantar-bracos") {
    const pulo = Math.sin(d * Math.PI * 2 * 1.4);
    r.esq = balancar(r.esq, 0, pulo * 8);
    r.dir = balancar(r.dir, 0, -pulo * 8);
  } else if (v.nome === "assustar") {
    const treme = Math.sin(d * 40) * Math.max(0, 1 - d) * 2;
    r.tronco = [r.tronco[0] + treme, r.tronco[1], r.tronco[2]];
  }
  return r;
}

/**
 * As batidas da fala (0 a 1): cada palavra mais comprida dá um impulso que sobe
 * rápido e desce devagar; as palavras em destaque dão um impulso maior.
 */
export function batidaDaFala(palavras: Array<{ inicio: number; fim: number; texto?: string; forte?: boolean }>, quadro: number) {
  let b = 0;
  for (const p of palavras) {
    const letras = (p.texto ?? "").replace(/[^\p{L}]/gu, "").length;
    if (letras < 4 && !p.forte) continue;
    const d = quadro - (p.inicio - 3);
    if (d < 0 || d > 22) continue;
    const forca = p.forte ? 1 : letras >= 7 ? 0.75 : 0.5;
    const sobe = Math.min(1, d / 5);
    const desce = d < 5 ? 1 : Math.exp(-(d - 5) / 7);
    b = Math.max(b, forca * sobe * desce);
  }
  return b;
}

// ---------- Cinemática: onde ficam as juntas (para o pé tocar o chão) ----------
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

/** O giro do quadril (perna) e o do joelho */
export function giroDaPerna(perna: Perna, lado: 1 | -1, alvo: THREE.Quaternion) {
  _e.set(-perna.quadril[0] * GRAUS, 0, lado * perna.quadril[1] * GRAUS, "ZXY");
  return alvo.setFromEuler(_e);
}
/** O giro do ombro: o da postura e, por cima, o balanço (para a frente e para fora, no corpo) */
export function giroDoOmbro(b: Braco, lado: 1 | -1, alvo: THREE.Quaternion) {
  _e.set(-b.mais[0] * GRAUS, 0, lado * b.mais[1] * GRAUS, "ZXY");
  return alvo.setFromEuler(_e).multiply(_q2.set(...b.q));
}

/** A altura mais baixa da perna (a sola ou o joelho), com o quadril em y = 0 */
function pontoMaisBaixo(perna: Perna, lado: 1 | -1) {
  giroDaPerna(perna, lado, _q);
  // O joelho
  _v.set(0, -CORPO.coxa, 0).applyQuaternion(_q);
  const joelhoY = _v.y;
  const joelhoZ = _v.z;
  // A canela dobra para trás
  _q2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), perna.joelho * GRAUS).premultiply(_q);
  _v.set(0, -CORPO.canela, 0).applyQuaternion(_q2);
  const tornozelo = joelhoY + _v.y;
  // A sola (o pé fica reto no chão quando dá; ajoelhado, deita para trás)
  const sola = tornozelo - CORPO.pe * Math.max(0.35, Math.cos(Math.min(Math.PI / 2, Math.abs(perna.quadril[0] * GRAUS - perna.joelho * GRAUS))));
  void joelhoZ;
  return Math.min(sola, joelhoY - 0.1);
}

/**
 * Quanto o quadril sobe ou desce para a perna de apoio tocar o chão (nem
 * afunda nem flutua). Sentado, o quadril vai ao chão.
 */
export function alturaDoQuadril(p: Postura) {
  const pe = Math.min(pontoMaisBaixo(p.pernaEsq, -1), pontoMaisBaixo(p.pernaDir, 1));
  const dePe = -pe;
  const noChao = 0.1;
  return mix(dePe, noChao, p.sentado);
}

/** Onde fica o meio do rosto (metros, com o corpo de frente para +z), nesta postura: para a câmera mirar certo */
export function meioDaCabeca(p: Postura): [number, number, number] {
  const quadril = alturaDoQuadril(p);
  const inclina = p.tronco[0] * GRAUS;
  // Do quadril ao pescoço (0,6), mais o pescoço (0,05) e meia cabeça (0,28)
  const altura = CORPO.pescoco - CORPO.quadril + 0.05 + 0.28;
  const y = quadril + Math.cos(inclina) * altura;
  const z = Math.sin(inclina) * altura;
  if (p.deitado <= 0) return [0, y, z];
  // Deitado: gira nos pés (o corpo vai para o lado +x); a câmera mira entre o rosto e a cintura
  const a = (p.deitado * Math.PI) / 2;
  const meio = y - p.deitado * 0.45;
  return [Math.sin(a) * meio, Math.cos(a) * meio + p.deitado * 0.29, z];
}
