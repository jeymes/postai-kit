import * as THREE from "three";

// A câmera do Mundo3D (refeita em 27/11/2026, "câmera de cinema"). Cada cena
// vira uma ou duas tomadas; cada tomada tem um plano (o tamanho da pessoa na
// tela), um foco (quem está no meio), um lado e um movimento suave (aproximar,
// afastar, deslizar de lado, girar um pouco, subir). Regras:
// - a câmera fica sempre do lado da frente do palco (z positivo): o cenário de
//   fundo não "vira" de uma tomada para a outra (a regra dos 180 graus);
// - o rosto de quem está no foco fica sempre no mesmo lugar da tela em cada
//   plano (nada de cabeça cortada), mesmo ajoelhado, sentado ou caído;
// - duas cenas seguidas com o mesmo plano e o mesmo foco viram uma tomada só,
//   com a câmera seguindo devagar (antes, o corte "pulava" o cenário);
// - fala comprida (mais de 5 s) ganha um segundo plano numa pausa da frase,
//   quando o roteiro não pede outro.
// O fundo 3D e o palito (desenhado em 2D por cima) usam a mesma câmera.

export const PLANOS = ["aberto", "medio-aberto", "medio", "close", "de-baixo", "por-cima", "ombro", "detalhe"] as const;
export type Plano = (typeof PLANOS)[number];
export const MOVIMENTOS = ["auto", "parada", "aproximar", "afastar", "lado", "girar", "subir"] as const;
export type MovimentoDaCamera = (typeof MOVIMENTOS)[number];
export type Ponto = [number, number, number];
export interface PoseDaCamera {
  posicao: Ponto;
  alvo: Ponto;
  fov: number;
}

/**
 * O enquadre de cada plano: quantos metros de altura cabem na tela (h), a lente
 * (fov), de que ângulo (az, para o lado; el, de cima) e onde fica o meio do
 * rosto (fração da altura da tela, de cima para baixo).
 */
const ENQUADRES: Record<Exclude<Plano, "ombro">, { h: number; fov: number; az: number; el: number; rosto: number }> = {
  // O rosto fica acima da legenda (que começa em 61% da tela; no close, em 74%)
  aberto: { h: 7.6, fov: 40, az: 24, el: 13, rosto: 0.4 },
  // O lado vai para quem está junto: quem fala com ele fica de três quartos para a câmera
  "medio-aberto": { h: 3.7, fov: 36, az: 22, el: 6, rosto: 0.33 },
  medio: { h: 2.55, fov: 32, az: 22, el: 3, rosto: 0.35 },
  close: { h: 1.7, fov: 28, az: 18, el: 1, rosto: 0.41 },
  "de-baixo": { h: 3.0, fov: 44, az: 20, el: -14, rosto: 0.33 },
  "por-cima": { h: 4.8, fov: 40, az: 14, el: 50, rosto: 0.42 },
  // Detalhe: as mãos e o que elas seguram, bem de perto (o "rosto" aqui é o meio das mãos)
  // (de baixo: de cima, a cabeça grande tapava as mãos)
  detalhe: { h: 1.3, fov: 26, az: 24, el: -6, rosto: 0.46 },
};

/** O plano que vem depois, quando a fala comprida ganha um segundo plano */
const SEGUNDO: Record<Plano, Plano> = {
  aberto: "medio",
  "medio-aberto": "close",
  medio: "close",
  close: "medio-aberto",
  "de-baixo": "medio",
  "por-cima": "medio-aberto",
  ombro: "close",
  detalhe: "close",
};
/** O movimento de cada plano, quando o roteiro não diz */
const MOVIMENTO_DO_PLANO: Record<Plano, Array<Exclude<MovimentoDaCamera, "auto">>> = {
  aberto: ["aproximar", "subir"],
  "medio-aberto": ["lado", "aproximar"],
  medio: ["girar", "lado"],
  close: ["aproximar", "parada"],
  "de-baixo": ["aproximar", "girar"],
  "por-cima": ["girar", "afastar"],
  ombro: ["lado", "aproximar"],
  detalhe: ["aproximar", "lado"],
};

export type Tomada = {
  inicio: number;
  fim: number;
  plano: Plano;
  /** Um id, "multidao" ou "ponte" */
  foco: string;
  movimento: Exclude<MovimentoDaCamera, "auto">;
  /** Para que lado o movimento vai (1 ou -1) */
  sentido: 1 | -1;
  /** Índice da cena */
  cena: number;
};

type CenaParaFilmar = {
  inicio: number;
  fim: number;
  plano: Plano;
  foco: string;
  quem?: string;
  movimento?: MovimentoDaCamera;
  cortar?: boolean;
  /** Corta mesmo com o mesmo plano e o mesmo foco (mudou o lugar ou quem está) */
  corteAntes?: boolean;
  /** A cena tem ilustração da fala (número, ícone, gráfico) no alto: a câmera fica aberta */
  comIlustracao?: boolean;
  palavras: Array<{ texto: string; inicio: number; fim: number }>;
};

// Com ilustração da fala na tela (27/11/2026), os planos de perto viram abertos: no close
// a cabeça enche o alto da tela e o número ou o ícone caía no cabelo. Alterna entre dois
// planos abertos para o corte continuar se vendo
const PERTO = new Set<Plano>(["close", "detalhe", "ombro", "medio", "por-cima"]);
const abrirParaIlustrar = (plano: Plano, k: number): Plano => (PERTO.has(plano) ? (k % 2 ? "aberto" : "medio-aberto") : plano);

/** As tomadas do vídeo: uma ou duas por cena, as iguais seguidas emendadas */
export function planejarTomadas(cenas: CenaParaFilmar[], ids: string[]): Tomada[] {
  const lista: Tomada[] = [];
  cenas.forEach((c, n) => {
    const auto = !c.movimento || c.movimento === "auto";
    const escolher = (plano: Plano, k: number): Exclude<MovimentoDaCamera, "auto"> =>
      auto ? MOVIMENTO_DO_PLANO[plano][(n + k) % MOVIMENTO_DO_PLANO[plano].length] : (c.movimento as Exclude<MovimentoDaCamera, "auto">);
    // Os cortes: um plano novo a cada pausa da frase (vírgula, ponto), com pelo menos 1,5 s em
    // cada plano, até 3 planos por cena; sem pausa, a fala de 4 s ou mais corta no meio
    // (27/11/2026, a referência do dono: um plano novo a cada frase, de 1 a 2 s)
    const cortes: number[] = [];
    if (c.cortar !== false && c.fim - c.inicio >= 96 && c.palavras.length >= 5) {
      const MIN = 45;
      const ABERTURA = 120;
      const pausas = c.palavras
        .map((p, k) => ({ quadro: p.inicio - 2, pausa: k > 0 && /[.,;:!?…]$/.test(c.palavras[k - 1].texto) }))
        .filter((x) => x.pausa && x.quadro - c.inicio >= MIN && c.fim - x.quadro >= MIN);
      // Nada de corte enquanto o título e o balão do começo estão na tela (uns 4 s)
      for (const x of pausas) if (x.quadro >= ABERTURA && cortes.length < 2 && x.quadro - (cortes[cortes.length - 1] ?? c.inicio) >= MIN) cortes.push(x.quadro);
      if (!cortes.length && c.fim - c.inicio >= 100) {
        const meio = (c.inicio + c.fim) / 2;
        const p = [...c.palavras].sort((x, y) => Math.abs(x.inicio - meio) - Math.abs(y.inicio - meio))[0];
        if (p && p.inicio >= ABERTURA && p.inicio - c.inicio >= MIN && c.fim - p.inicio >= MIN) cortes.push(p.inicio - 2);
      }
    }
    const fins = [...cortes, c.fim];
    const planoDa = (p: Plano, k: number) => (c.comIlustracao ? abrirParaIlustrar(p, k) : p);
    const primeira: Tomada = { inicio: c.inicio, fim: fins[0], plano: planoDa(c.plano, 0), foco: c.foco, movimento: escolher(planoDa(c.plano, 0), 0), sentido: n % 2 ? -1 : 1, cena: n };
    // Emenda com a anterior se for o mesmo plano e o mesmo foco (a câmera continua)
    const anterior = lista[lista.length - 1];
    if (anterior && !c.corteAntes && anterior.plano === primeira.plano && anterior.foco === primeira.foco && anterior.fim === primeira.inicio) anterior.fim = primeira.fim;
    else lista.push(primeira);
    let plano: Plano = c.plano;
    cortes.forEach((corte, k) => {
      // O plano seguinte (A, B, e o terceiro volta para perto: close ou de cima)
      plano = k === 0 ? SEGUNDO[c.plano] : c.plano === "close" || SEGUNDO[c.plano] === "close" ? "por-cima" : "close";
      // Quem fala vai para o plano seguinte (se for outra pessoa); o "ombro" precisa de alguém na frente
      const foco = c.quem && ids.includes(c.quem) ? c.quem : c.foco;
      if (plano === "ombro" && ids.length < 2) plano = "close";
      if (!ids.includes(foco) && (plano === "close" || plano === "ombro" || plano === "detalhe")) plano = "medio-aberto";
      plano = planoDa(plano, k + 1);
      lista.push({ inicio: corte, fim: fins[k + 1], plano, foco, movimento: escolher(plano, k + 1), sentido: (n + k) % 2 ? 1 : -1, cena: n });
    });
  });
  return lista;
}

const RAD = Math.PI / 180;
const suave = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/**
 * A câmera da tomada no instante t (0 a 1). `rosto`: o meio do rosto de quem
 * está no foco (ou o meio do grupo); `lado`: 1 se quem está junto fica à
 * direita do foco (a câmera vai para o lado dele, como no cinema), -1 à
 * esquerda; `ajuste`: graus a mais no lado (para ninguém tapar o rosto);
 * `escala` abre o plano (grupo, ponte); `parceiro`: o rosto de quem fica de
 * costas no "ombro".
 */
export function poseDaTomada(
  tomada: Pick<Tomada, "plano" | "movimento" | "sentido">,
  t: number,
  rosto: Ponto,
  opcoes: { lado: number; ajuste?: number; escala?: number; sozinho?: boolean; parceiro?: Ponto | null },
): PoseDaCamera {
  const s = suave(t);
  const ida = (s - 0.5) * 2;
  if (tomada.plano === "ombro" && opcoes.parceiro) {
    // Por cima do ombro de quem está de costas, olhando o rosto do foco
    const P = opcoes.parceiro;
    let dx = rosto[0] - P[0];
    let dz = rosto[2] - P[2];
    const n = Math.hypot(dx, dz) || 1;
    dx /= n;
    dz /= n;
    // O lado de fora: o que fica para a frente do palco
    let px = -dz;
    let pz = dx;
    if (pz < 0) {
      px = -px;
      pz = -pz;
    }
    // Longe o bastante da cabeça de quem está de costas (a cabeça é grande: perto, ela tapava a lente)
    const lateral = 0.85 + (tomada.movimento === "lado" ? ida * 0.08 : 0);
    const recuo = 1.35 - (tomada.movimento === "aproximar" ? s * 0.1 : 0);
    const posicao: Ponto = [P[0] - dx * recuo + px * lateral, P[1] + 0.18, P[2] - dz * recuo + pz * lateral];
    const fov = 32;
    const dist = Math.hypot(rosto[0] - posicao[0], rosto[1] - posicao[1], rosto[2] - posicao[2]);
    const h = 2 * Math.tan((fov * RAD) / 2) * dist;
    return { posicao, alvo: [rosto[0], rosto[1] - (0.5 - 0.34) * h, rosto[2]], fov };
  }
  const e = ENQUADRES[tomada.plano === "ombro" ? "close" : tomada.plano];
  let h = e.h * (opcoes.escala ?? 1);
  if (opcoes.sozinho && tomada.plano === "aberto") h = 5.8;
  let az = e.az * (opcoes.lado >= 0 ? 1 : -1) + (opcoes.ajuste ?? 0);
  let el = e.el;
  let d = h / (2 * Math.tan((e.fov * RAD) / 2));
  switch (tomada.movimento) {
    case "aproximar":
      d *= 1 - 0.08 * s;
      break;
    case "afastar":
      d *= 0.92 + 0.11 * s;
      break;
    case "lado":
      az += tomada.sentido * 7 * ida;
      break;
    case "girar":
      az += tomada.sentido * 13 * ida;
      break;
    case "subir":
      el += 6 * ida;
      d *= 1 - 0.05 * s;
      break;
    default:
      d *= 1 - 0.025 * s;
  }
  const a = az * RAD;
  const b = el * RAD;
  const dir = [Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)];
  const cima = [-Math.sin(b) * Math.sin(a), Math.cos(b), -Math.sin(b) * Math.cos(a)];
  const desce = (0.5 - e.rosto) * h;
  const alvo: Ponto = [rosto[0] - cima[0] * desce, rosto[1] - cima[1] * desce, rosto[2] - cima[2] * desce];
  const posicao: Ponto = [alvo[0] + dir[0] * d, Math.max(0.6, alvo[1] + dir[1] * d), alvo[2] + dir[2] * d];
  return { posicao, alvo, fov: e.fov };
}

export function aplicar(camera: THREE.PerspectiveCamera, pose: PoseDaCamera) {
  camera.fov = pose.fov;
  camera.position.set(...pose.posicao);
  camera.lookAt(...pose.alvo);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

const v = new THREE.Vector3();

/** O ponto do mundo na tela, em pixels (e se está na frente da câmera). */
export function projetar(camera: THREE.PerspectiveCamera, ponto: Ponto, largura: number, altura: number) {
  v.set(...ponto).project(camera);
  return { x: ((v.x + 1) / 2) * largura, y: ((1 - v.y) / 2) * altura, naFrente: v.z > -1 && v.z < 1 };
}

/** A distância da câmera (para desenhar de trás para a frente). */
export const distancia = (camera: THREE.PerspectiveCamera, ponto: Ponto) => camera.position.distanceTo(v.set(...ponto));
