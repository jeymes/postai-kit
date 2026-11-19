import * as THREE from "three";

// Os planos de câmera do Mundo3D e a conta que leva um ponto do mundo para a
// tela: o fundo 3D e os bonecos (desenhados em 2D por cima) usam a mesma
// câmera, então o boneco fica no lugar certo e do tamanho certo.

export const PLANOS = ["aberto", "medio", "close", "de-baixo", "por-cima"] as const;
export type Plano = (typeof PLANOS)[number];
export type Ponto = [number, number, number];
export interface PoseDaCamera {
  posicao: Ponto;
  alvo: Ponto;
  fov: number;
}

/**
 * Onde a câmera fica em cada plano, olhando para o foco (os pés de quem está
 * em cena). `escala` afasta a câmera: um grupo (a tropa) pede o plano mais aberto.
 */
export function poseDoPlano(plano: Plano, foco: Ponto, escala = 1): PoseDaCamera {
  const [x, y, z] = foco;
  const longe = (dx: number, dy: number, dz: number, alvoY: number, fov: number): PoseDaCamera => ({
    posicao: [x + dx * escala, Math.max(0.35, y + dy * escala), z + dz * escala],
    alvo: [x, y + alvoY, z],
    fov,
  });
  switch (plano) {
    case "aberto":
      return { posicao: [x + 7, y + 6.2, z + 16], alvo: [x, y + 0.8, z - 2], fov: 44 };
    case "medio":
      return longe(2.6, 1.9, 6.2, 1.2, 36);
    case "close":
      return longe(0.5, 1.5, 3.3, 1.38, 30);
    case "de-baixo":
      return longe(-2.8, -0.25, 6, 1.4, 50);
    case "por-cima":
      return longe(1.2, 9, 6.5, 0, 40);
  }
}

const misturar = (a: number, b: number, t: number) => a + (b - a) * t;
const suave = (t: number) => t * t * (3 - 2 * t);

/** A câmera se aproxima devagar do alvo durante o plano (t de 0 a 1). */
export function poseNoTempo(pose: PoseDaCamera, t: number): PoseDaCamera {
  const f = 0.09 * suave(Math.min(1, Math.max(0, t)));
  return { ...pose, posicao: pose.posicao.map((v, i) => misturar(v, pose.alvo[i], f)) as Ponto };
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
