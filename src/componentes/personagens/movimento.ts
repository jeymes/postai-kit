import React from "react";
import { Easing, interpolate, spring } from "remotion";
import type { Angulos, Expressao, Momento, Palavra, Pose } from "./Boneco";

// O movimento dos personagens 2D (Boneco, Liso, Palito), num lugar só (27/11/2026).
//
// O dono reclamou que o desenho "não parece desenho animado de verdade": a mão
// travava, o celular sumia e voltava, o boneco ficava parado enquanto falava.
// As causas e o que este arquivo faz:
//   - a troca de pose partia sempre da pose ANTERIOR do roteiro, não de onde o braço
//     estava: uma troca no meio de outra pulava o braço. Agora cada troca parte do
//     ponto em que o braço está naquele quadro (cadeia de trocas), em ~9 quadros;
//   - o celular aparecia e sumia no quadro exato da troca, com o braço ainda no ar:
//     agora ele vai junto com a mão e só some (encolhendo) quando o braço termina de
//     descer, e aparece crescendo enquanto a mão sobe;
//   - a descida de quem senta era instantânea (o corpo pulava 110 px): agora desce;
//   - sem troca de pose, os braços ficavam congelados: com `vida` (o Conversa liga),
//     eles balançam de leve, gesticulam nas palavras e quem ouve olha para quem fala.
// Sem `vida` (o Mundo 3D, a ficha), o boneco anda como antes, só sem os saltos.

/** As poses do 2D: as de sempre e as novas do Conversa (ações na palavra) */
export const POSES_NOVAS = ["ombros", "bracos-cruzados", "acenando", "maos-juntas", "queixo", "sentado-livre"] as const;
export type Pose2D = Pose | (typeof POSES_NOVAS)[number];

/** Um momento do 2D: a pose e a expressão e, se a ação pedir, onde está, para que lado olha e o jeito de chegar */
export type Momento2D = Omit<Momento, "pose"> & {
  pose: Pose2D;
  /** Deslocamento na tela (px) a partir do lugar dele: andar */
  x?: number;
  /** Virado para o outro lado (de costas para quem está na cena) */
  virado?: boolean;
  /** De costas para a câmera */
  costas?: boolean;
  /** Chega na pose de uma vez (cair sentado) */
  rapido?: boolean;
  /** Muda de lugar sem andar (na troca de cenário, atrás da cortina) */
  salto?: boolean;
  /** Um pulinho (de alegria) ou uma tremida (de medo) neste momento */
  efeito?: "pulo" | "tremer";
};

type TabelaDePoses = Record<Pose, { esq: Angulos; dir: Angulos }>;
/** Para cada pose: os braços, quanto os ombros sobem e quais mãos estão livres (o objeto de apoio vai numa delas) */
type PoseCompleta = { esq: Angulos; dir: Angulos; sobe?: number };

/** As poses novas no espaço do Boneco (0 = braço para baixo; positivo = para fora; o cotovelo é relativo) */
const NOVAS: Record<(typeof POSES_NOVAS)[number], PoseCompleta> = {
  // Dar de ombros: os antebraços abertos, palmas para cima, os ombros sobem
  ombros: { esq: [6, 72], dir: [6, 72], sobe: 16 },
  // Braços cruzados no peito
  "bracos-cruzados": { esq: [14, -112], dir: [20, -104] },
  // Acenando (oi, tchau): o braço direito no alto, a mão balança (a vida faz o aceno)
  acenando: { esq: [10, -6], dir: [158, -14] },
  // As mãos juntas no peito (pedindo, rezando, ansiosa)
  "maos-juntas": { esq: [4, -140], dir: [4, -140] },
  // A mão no queixo (pensando, desconfiada); o outro braço cruzado embaixo
  queixo: { esq: [12, -100], dir: [-58, -128] },
  // Sentado sem o celular: as mãos no colo
  "sentado-livre": { esq: [6, -60], dir: [6, -60] },
};

/** A pose é de alguém sentado (com ou sem o celular)? */
export const ehSentado = (pose?: string) => pose === "sentado" || pose === "sentado-livre";

/** A tabela do estilo (a do Boneco ou a do palito) com as poses novas */
export function tabelaCompleta(tabela: TabelaDePoses, novas: Partial<Record<Pose2D, PoseCompleta>> = {}): Record<Pose2D, PoseCompleta> {
  return { ...tabela, ...NOVAS, ...novas } as Record<Pose2D, PoseCompleta>;
}

/** A pose segura o celular com a tela para a pessoa? (a mão direita) */
export const seguraCelular = (pose: Pose2D) => pose === "celular" || pose === "sentado";
export const modoDoCelular2D = (pose: Pose2D): "tela" | "costas" | undefined =>
  seguraCelular(pose) ? "tela" : pose === "celular-baixo" ? "costas" : undefined;

export { MAOS_OCUPADAS } from "../../moldes/conversa/regras2d";

const suave = Easing.bezier(0.33, 0, 0.2, 1);
/** O progresso de uma troca de pose: ~9 quadros, com uma sobra pequena no fim (o braço chega e assenta) */
function progresso(desde: number, fps: number, rapido = false) {
  if (desde <= 0) return 0;
  if (rapido) return interpolate(desde, [0, 5], [0, 1], { extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  // A mola deixa o movimento vivo (uma sobra de ~4%); a curva garante que chega em ~10 quadros
  const mola = spring({ frame: desde, fps, config: { damping: 15, stiffness: 210, mass: 0.7 } });
  const curva = interpolate(desde, [0, 10], [0, 1], { extrapolateRight: "clamp", easing: suave });
  return Math.min(1.05, mola * 0.5 + curva * 0.5);
}

type Vetor = { esq0: number; esq1: number; dir0: number; dir1: number; sobe: number; descida: number };
const vetorDa = (tabela: Record<Pose2D, PoseCompleta>, pose: Pose2D): Vetor => {
  const p = tabela[pose] ?? tabela.normal;
  return { esq0: p.esq[0], esq1: p.esq[1], dir0: p.dir[0], dir1: p.dir[1], sobe: p.sobe ?? 0, descida: ehSentado(pose) ? 1 : 0 };
};
const misturar = (a: Vetor, b: Vetor, p: number): Vetor => ({
  esq0: a.esq0 + (b.esq0 - a.esq0) * p,
  esq1: a.esq1 + (b.esq1 - a.esq1) * p,
  dir0: a.dir0 + (b.dir0 - a.dir0) * p,
  dir1: a.dir1 + (b.dir1 - a.dir1) * p,
  sobe: a.sobe + (b.sobe - a.sobe) * p,
  // A descida não passa do assento (sem sobra da mola)
  descida: a.descida + (b.descida - a.descida) * Math.min(1, p),
});

/** Os momentos em ordem de tempo (o roteiro pode trazer o "meio" e as ações fora de ordem) */
export const emOrdem = <M extends { em: number }>(momentos: M[]) =>
  momentos
    .map((m, i) => ({ m, i }))
    .sort((a, b) => a.m.em - b.m.em || a.i - b.i)
    .map(({ m }) => m);

export type EstadoAnimado = {
  esq: Angulos;
  dir: Angulos;
  expressao: Expressao;
  pose: Pose2D;
  /** Pulinho da reação (negativo = para cima, no espaço do desenho) */
  pulo: number;
  /** 0 = de pé, 1 = sentado (o corpo desce DESCIDA_SENTADO) */
  descida: number;
  /** Quanto os ombros sobem (dar de ombros) */
  sobe: number;
  /** O celular na mão direita agora: o modo e o tamanho (0 a 1: aparece e some crescendo/encolhendo) */
  celular: { modo: "tela" | "costas" | undefined; escala: number };
  /** Deslocamento de lado (tremida), no espaço do desenho */
  treme: number;
};

/**
 * Onde o personagem está agora: os ângulos dos braços (sem saltos), a expressão,
 * o pulinho, a descida de quem senta e o celular (com o tamanho na hora de pegar e guardar).
 */
export function estadoAnimado(momentosDoRoteiro: Array<Momento | Momento2D>, frame: number, fps: number, tabela: Record<Pose2D, PoseCompleta>): EstadoAnimado {
  const momentos = emOrdem(momentosDoRoteiro as Momento2D[]);
  let i = 0;
  momentos.forEach((m, k) => {
    if (m.em <= frame) i = k;
  });
  // A cadeia: cada troca parte de onde o corpo estava no quadro em que ela começa
  let partida = vetorDa(tabela, momentos[0].pose);
  for (let k = 1; k <= i; k++) {
    const anterior = momentos[k - 1];
    const alvoAnterior = vetorDa(tabela, anterior.pose);
    const p = k - 1 === 0 ? 1 : progresso(momentos[k].em - anterior.em, fps, anterior.rapido);
    partida = misturar(partida, alvoAnterior, Math.min(1, p));
  }
  const atual = momentos[i];
  const antes = momentos[Math.max(0, i - 1)];
  const p = i === 0 ? 1 : progresso(frame - atual.em, fps, atual.rapido);
  const v = misturar(partida, vetorDa(tabela, atual.pose), p);
  // Caiu sentado: assenta com um quique
  const desde = frame - atual.em;
  const quique = atual.rapido && ehSentado(atual.pose) && desde >= 5 && desde < 17 ? Math.sin(((desde - 5) / 12) * Math.PI) * -0.12 : 0;
  // Pulinho quando a expressão muda (o personagem "reage") ou quando a ação pede
  const reage = i > 0 && antes.expressao !== atual.expressao && !atual.rapido;
  const pulo =
    (reage && desde < 12 ? -Math.sin((desde / 12) * Math.PI) * 18 : 0) + (atual.efeito === "pulo" && desde < 16 ? -Math.sin((desde / 16) * Math.PI) * 70 : 0);
  const treme = atual.efeito === "tremer" && desde < 36 ? Math.sin(desde * 2.6) * 7 * (1 - desde / 36) : 0;
  // O celular: entra crescendo enquanto a mão sobe; ao guardar, fica na mão até ela descer e encolhe
  const modoAgora = modoDoCelular2D(atual.pose);
  const modoAntes = i > 0 ? modoDoCelular2D(antes.pose) : undefined;
  let celular: EstadoAnimado["celular"] = { modo: modoAgora, escala: modoAgora ? 1 : 0 };
  if (i > 0 && modoAgora && !modoAntes) celular = { modo: modoAgora, escala: interpolate(p, [0.1, 0.55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) };
  else if (i > 0 && !modoAgora && modoAntes) celular = { modo: modoAntes, escala: interpolate(p, [0.45, 0.95], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) };
  else if (i > 0 && modoAgora && modoAntes && modoAgora !== modoAntes) celular = { modo: p < 0.5 ? modoAntes : modoAgora, escala: 1 };
  return {
    esq: [v.esq0, v.esq1],
    dir: [v.dir0, v.dir1],
    expressao: atual.expressao,
    pose: atual.pose,
    pulo,
    descida: Math.max(0, v.descida + quique),
    sobe: v.sobe,
    celular,
    treme,
  };
}

/** Uma batida de gesto: sobe rápido e volta devagar (pico ~1 no quadro 4, some em ~16) */
const batida = (t: number) => (t <= 0 ? 0 : (t / 4) * Math.exp(1 - t / 4));

/** O quanto cada pose deixa os braços soltos para a vida (0 = parado, 1 = solto) */
const SOLTURA: Partial<Record<Pose2D, [number, number]>> = {
  normal: [1, 1],
  cintura: [1, 0.25],
  explicando: [0.8, 1],
  apontando: [0.8, 0.4],
  ombros: [0.8, 0.8],
  comemorando: [0.9, 0.9],
  celular: [0.9, 0.35],
  "celular-baixo": [0.9, 0.6],
  sentado: [0.6, 0.35],
  "sentado-livre": [0.4, 0.4],
  cabeca: [0.25, 0.25],
  pensando: [0.8, 0.2],
  queixo: [0.3, 0.2],
  abraco: [0.5, 0.25],
  acenando: [0.8, 1],
  "bracos-cruzados": [0.2, 0.2],
  "maos-juntas": [0.25, 0.25],
};

/**
 * A vida dos braços: um balanço leve e contínuo (cada braço no seu ritmo) e, enquanto o
 * personagem fala, gestos nas palavras (o braço que gesticula muda de uma palavra para outra).
 * Soma aos ângulos da pose; o roteiro não precisa pedir.
 */
export function vidaDosBracos(estado: EstadoAnimado, frame: number, semente: number, palavras: Palavra[]): { esq: Angulos; dir: Angulos; cabeca: number } {
  const [soltoE, soltoD] = SOLTURA[estado.pose] ?? [0.6, 0.6];
  const balanco = (fase: number, vel: number, amp: number) => Math.sin(frame / vel + semente * 1.7 + fase) * amp;
  let esq0 = balanco(0, 23, 2.4) * soltoE;
  let esq1 = balanco(1.3, 17, 3.4) * soltoE;
  let dir0 = balanco(2.1, 25, 2.4) * soltoD;
  let dir1 = balanco(0.4, 19, 3.4) * soltoD;
  let cabeca = 0;
  // Gestos nas palavras: só nas palavras que já começaram há pouco (até 20 quadros)
  palavras.forEach((w, n) => {
    const t = frame - w.inicio;
    if (t < 0 || t > 20 || w.fim - w.inicio < 4) return;
    const forca = batida(t);
    cabeca += forca * (n % 2 ? 1.6 : -1.2);
    // Uma palavra sim, outra não, e o braço que gesticula alterna a cada 3 palavras
    if (n % 2 === 1) return;
    const braco = Math.floor(n / 3) % 2 === 0 ? "dir" : "esq";
    const intensidade = estado.pose === "explicando" || estado.pose === "apontando" || estado.pose === "ombros" ? 1 : 0.7;
    if (braco === "dir") {
      dir0 += forca * 7 * soltoD * intensidade;
      dir1 += forca * 16 * soltoD * intensidade * (estado.pose === "explicando" ? -1 : 1);
    } else {
      esq0 += forca * 6 * soltoE * intensidade;
      esq1 += forca * 14 * soltoE * intensidade;
    }
  });
  // O aceno: a mão no alto balança
  if (estado.pose === "acenando") dir1 += Math.sin(frame / 3.2) * 22;
  // Comemorando: os braços sacodem
  if (estado.pose === "comemorando") {
    esq0 += Math.sin(frame / 4) * 6;
    dir0 += Math.sin(frame / 4 + 1.5) * 6;
  }
  return { esq: [estado.esq[0] + esq0, estado.esq[1] + esq1], dir: [estado.dir[0] + dir0, estado.dir[1] + dir1], cabeca };
}

/** De 0 a 1: olhando para o outro (nos intervalos em que ele fala), com 5 quadros para virar o olho */
export function olhandoAgora(intervalos: Palavra[] | undefined, frame: number) {
  if (!intervalos?.length) return 0;
  let v = 0;
  for (const w of intervalos) {
    const entra = interpolate(frame, [w.inicio - 3, w.inicio + 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const sai = interpolate(frame, [w.fim + 6, w.fim + 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    v = Math.max(v, Math.min(entra, sai));
  }
  return v;
}

/** Quanto anda por quadro (px na tela) */
const PASSO = 6;

/** Onde ele está agora (andar): o deslocamento na tela e a fase do passo (para as pernas) */
export function andarAgora(momentosDoRoteiro: Array<Momento | Momento2D>, frame: number) {
  const momentos = emOrdem(momentosDoRoteiro as Momento2D[]).filter((m) => typeof m.x === "number");
  let x = 0;
  let andando = 0;
  let percorrido = 0;
  for (let k = 0; k < momentos.length; k++) {
    const m = momentos[k];
    if (m.em > frame) break;
    const de = x;
    const ate = m.x ?? 0;
    const duracao = m.salto ? 1 : Math.max(16, Math.abs(ate - de) / PASSO);
    const fim = Math.min(m.em + duracao, momentos[k + 1]?.em ?? Infinity);
    const t = interpolate(frame, [m.em, m.em + duracao], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
    x = de + (ate - de) * t;
    percorrido += Math.abs(ate - de) * t;
    andando = frame < fim && Math.abs(ate - de) > 1 && !m.salto ? Math.min(1, Math.sin(t * Math.PI) * 3) : 0;
  }
  return { x, andando, fase: percorrido / 46 };
}

/** O lado para o qual está virado: 1 = de frente para o outro, -1 = virado; passa por 0 na hora de virar */
export function viradoAgora(momentosDoRoteiro: Array<Momento | Momento2D>, frame: number) {
  const momentos = emOrdem(momentosDoRoteiro as Momento2D[]);
  let lado = 1;
  let costas = false;
  let giro = 1;
  for (const m of momentos) {
    if (m.em > frame) break;
    const novoLado: number = typeof m.virado === "boolean" ? (m.virado ? -1 : 1) : lado;
    const novasCostas: boolean = typeof m.costas === "boolean" ? m.costas : costas;
    if (novoLado === lado && novasCostas === costas) continue;
    const t = interpolate(frame, [m.em, m.em + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
    // Vira passando de lado: a largura vai a quase 0 e volta, e o desenho troca no meio
    giro = t >= 1 ? 1 : Math.abs(Math.cos(t * Math.PI));
    if (t >= 0.5) {
      lado = novoLado;
      costas = novasCostas;
    }
  }
  return { lado: lado * Math.max(0.08, giro), costas };
}

// ---- Contextos que o Conversa liga (fora dele, o boneco anda como antes) ----

/** Em que mão vai o objeto de apoio (o Conversa escolhe uma mão livre e mantém a mesma); sem isso: a mão livre do celular */
export type MaoDoObjeto = { mao: "esq" | "dir"; escala: number };
export const MaoDoObjetoContexto = React.createContext<MaoDoObjeto | null>(null);

/** Quem segura o objeto de apoio agora, no braço esquerdo e no direito */
export function maosDoObjeto(contexto: MaoDoObjeto | null, temCelular: boolean, pose: Pose2D): { esq: number; dir: number } {
  if (!contexto) return { esq: temCelular ? 1 : 0, dir: temCelular ? 0 : 1 };
  // Mão ocupada (na cabeça, no queixo, cruzada): o Conversa já encolhe o objeto devagar (contexto.escala)
  void pose;
  const escala = contexto.escala;
  return contexto.mao === "esq" ? { esq: escala, dir: 0 } : { esq: 0, dir: escala };
}
