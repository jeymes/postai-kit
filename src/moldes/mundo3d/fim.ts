import type { PoseDaCamera, Ponto } from "./camera.ts";

// O fim dos vídeos 3D (28/11/2026). No lugar do cartão branco do kit (todo vídeo
// igual, "muito repetitivo", disse o dono), o fim acontece dentro da cena, de
// quatro jeitos, e muda de um vídeo para o outro:
// - grua: a câmera sobe devagar sobre o lugar, quem está em cena acena para ela
//   e a chamada aparece no céu, em letras grandes e limpas, com o logo pequeno;
// - placa: um letreiro 3D do lugar (madeira, pedra, placa de estrada ou de rua)
//   brota do chão atrás do elenco, com a chamada e o @ da marca;
// - cinema: o último plano congela, desfoca e escurece, e a chamada entra em
//   letreiro de cinema (faixas pretas, linha fina, nome da marca em versal);
// - pose: o elenco se junta no meio, de frente, e faz a pose final
//   (comemorando, acenando) com a chamada embaixo.
// Conta pura (sem React): o molde, o renderizar e o conferir usam a mesma.

export const FINS_DO_3D = ["grua", "placa", "cinema", "pose"] as const;
export type FimDo3D = (typeof FINS_DO_3D)[number];

/** Um número do texto (o mesmo para o mesmo título) */
const numeroDoTexto = (texto: string) => {
  let h = 7;
  for (const letra of texto) h = (h * 31 + (letra.codePointAt(0) ?? 0)) >>> 0;
  return h;
};

/**
 * O fim deste vídeo: o que o roteiro pediu (`fimDoVideo3d`); sem isso, o do
 * episódio (o número do vídeo no registro do canal: um vídeo nunca termina igual
 * ao anterior) e, sem registro, o do título.
 */
export function escolherFimDo3D(e: { pedido?: string | null; titulo: string; episodio?: number | null; comQr?: boolean }): FimDo3D {
  if (e.pedido && (FINS_DO_3D as readonly string[]).includes(e.pedido)) return e.pedido as FimDo3D;
  const n = typeof e.episodio === "number" && e.episodio >= 0 ? e.episodio : numeroDoTexto(e.titulo);
  const fim = FINS_DO_3D[n % FINS_DO_3D.length];
  // Com QR, a placa não (o QR precisa de lugar limpo na tela, e a placa ocupa o alto): vai o cinema
  return fim === "placa" && e.comQr ? "cinema" : fim;
}

/** O número do próximo episódio pelo registro do canal (episodios.md): as linhas da tabela "Registro" */
export function proximoEpisodio(registro: string): number | null {
  const linhas = registro.split("\n").filter((l) => l.trim().startsWith("|"));
  if (linhas.length < 2) return null;
  return linhas.length - 2;
}

/** A pose da pose final (pecas e palito): cada um com um gesto, alternando */
export const GESTOS_DA_POSE = ["comemorando", "acenar", "levantar-bracos", "acenar"] as const;
/** Na grua, todos acenam (um sim, um não: um pouco de vida no grupo) */
export const GESTOS_DA_GRUA = ["acenar", "acenar", "comemorando", "acenar"] as const;
/** Na placa, um aponta para ela e os outros acenam */
export const GESTOS_DA_PLACA = ["mostrar", "acenar", "acenar", "comemorando"] as const;

/** Onde cada um fica no fim (pose e placa): em fila no meio do grupo, na ordem da esquerda para a direita */
export function filaDoFim(onde: Array<{ id: string; x: number; z: number; naPonte?: boolean }>): Record<string, [number, number]> {
  if (!onde.length) return {};
  const cx = onde.reduce((s, p) => s + p.x, 0) / onde.length;
  const cz = onde.reduce((s, p) => s + p.z, 0) / onde.length;
  // Na ponte não cabem lado a lado tão abertos
  const passo = onde.some((p) => p.naPonte) ? Math.min(1.05, 2 / Math.max(1, onde.length - 1)) : 1.3;
  const ordem = [...onde].sort((a, b) => a.x - b.x);
  const fila: Record<string, [number, number]> = {};
  ordem.forEach((p, i) => {
    fila[p.id] = [cx + (i - (ordem.length - 1) / 2) * passo, cz];
  });
  return fila;
}

const suave = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const mistura = (a: Ponto, b: Ponto, t: number): Ponto => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * O letreiro do fim: atrás do elenco (a tábua fica acima das cabeças) e mais largo
 * quando o grupo é largo (o grupo e a placa cabem juntos na tela, de lado a lado)
 */
export function placaDoFim(largo: number) {
  const k = Math.max(1, (largo + 1.2) / 2.9);
  const largura = 2.5 * k;
  const altura = 1.42 * k;
  return { atras: 1.35, largura, altura, meio: 2.4 + altura / 2 };
}
const TAN = (fov: number) => Math.tan((fov * Math.PI) / 360);

/**
 * A câmera do fim no instante t (0 a 1). `centro`: o meio do grupo no chão [x, z];
 * `largo`: quantos metros o grupo ocupa de lado.
 */
export function cameraDoFim(fim: Exclude<FimDo3D, "cinema">, t: number, centro: [number, number], largo: number): PoseDaCamera {
  const [cx, cz] = centro;
  const s = suave(t);
  if (fim === "grua") {
    // Sobe e recua devagar, mirando acima do grupo: o céu fica no alto da tela (a chamada vai lá)
    const longe = Math.max(1, largo / 3.6);
    const de: Ponto = [cx + 1.1, 1.55, cz + 6.2 * longe];
    const ate: Ponto = [cx - 0.7, 4.7, cz + 10.5 * longe];
    const alvoDe: Ponto = [cx, 2.05, cz];
    const alvoAte: Ponto = [cx, 3.05, cz];
    return { posicao: mistura(de, ate, s), alvo: mistura(alvoDe, alvoAte, s), fov: 50 };
  }
  if (fim === "placa") {
    // De baixo para cima, de frente para o letreiro, chegando um pouco mais perto. A distância
    // é a que cabe o grupo de lado a lado e, de alto a baixo, do chão ao alto da placa
    const placa = placaDoFim(largo);
    const fov = 40;
    const alto = placa.meio + placa.altura / 2 + 0.35;
    const d = Math.max(6.6, (largo + 2.1) / (2 * TAN(fov) * 0.5625), alto / (2 * TAN(fov) * 0.92)) * (1 - 0.06 * s);
    const h = 2 * d * TAN(fov);
    // Os pés perto de 80% da tela (embaixo, onde ficam os botões do app, só o chão)
    return { posicao: [cx + 0.35 - 0.3 * s, 1.15, cz + d], alvo: [cx, 0.3 * h, cz - 0.4], fov };
  }
  // pose: de frente, na altura do peito, chegando devagar; abre para caber o grupo de lado a lado
  const fov = 36;
  const d = Math.max(5.6, (largo + 2.0) / (2 * TAN(fov) * 0.5625)) * (1 - 0.07 * s);
  const h = 2 * d * TAN(fov);
  // Os pés em uns 68% da tela: a chamada vai embaixo deles, os rostos ficam livres no meio
  return { posicao: [cx + 0.5 - 0.5 * s, 1.5, cz + d], alvo: [cx, 0.18 * h, cz], fov };
}

/** O caminho da câmera do fim (do começo ao fim, até o meio do grupo): nada de árvore ou casa ali */
export function trechosDoFim(fim: FimDo3D | null, centro: [number, number], largo: number): Array<[number, number, number, number]> {
  if (!fim || fim === "cinema") return [];
  return [0, 0.5, 1].map((k) => {
    const p = cameraDoFim(fim, k, centro, largo).posicao;
    return [p[0], p[2], centro[0], centro[1] - (fim === "placa" ? placaDoFim(largo).atras : 0)];
  });
}

/** Ponto (x, z) longe dos trechos (a mesma conta do caminhoLivre da filmagem) */
export function longeDosTrechos(trechos: Array<[number, number, number, number]>, x: number, z: number, folga = 1.5) {
  return trechos.every(([ax, az, bx, bz]) => {
    const dx = bx - ax;
    const dz = bz - az;
    const n = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / n));
    return Math.hypot(ax + dx * u - x, az + dz * u - z) > (u < 0.25 ? 2.6 : folga);
  });
}
