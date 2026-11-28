// A estrada de serra do Mundo3D (28/11/2026), conta pura (sem React): o molde
// desenha com isto e as plantas, a grama e o carro usam as mesmas medidas.
//
// Vista de cima (a câmera fica no z positivo, olhando para o z negativo; no tela
// em pé ela vê pouco dos lados, então a curva fica ATRÁS do elenco, à esquerda,
// sumindo para o fundo, e o vale atrás da mureta):
//
//          |   |   vale (lá embaixo)
//          |   |=========== mureta ==================
//           \   \---------- estrada (z = -4) ----------- (vem da direita)
//            \_____________________________________
//                    o elenco (z 1 a 4), no acostamento
//
// A curva vira para o fundo (centro em x -3, z -13); a mureta fica do lado de
// dentro, o do vale; as placas de curva, do lado de fora.

export const ESTRADA = {
  /** Onde corre o trecho reto atrás do elenco */
  z: -4,
  largura: 6.4,
  /** O centro e o raio da curva (ela vira para o fundo, do lado esquerdo) */
  curva: { x: -3, z: -13, raio: 9 },
  /** A mureta fica a tanto da beira do asfalto */
  folgaDaMureta: 0.45,
  /** O vale: a beira do chão fica a tanto da beira do asfalto, e o fundo a tanto para baixo */
  folgaDoVale: 1.35,
  fundoDoVale: -20,
} as const;

export type PontoDaEstrada = { x: number; z: number; dx: number; dz: number };

const meia = ESTRADA.largura / 2;
const C = ESTRADA.curva;
const INICIO = 90;

/** O meio da estrada, de ponto em ponto (passo em metros): vem da direita, faz a curva e some no fundo */
export function meioDaEstrada(passo = 1, de = INICIO, ate = -90): PontoDaEstrada[] {
  const pontos: PontoDaEstrada[] = [];
  for (let x = de; x > C.x; x -= passo) pontos.push({ x, z: ESTRADA.z, dx: -1, dz: 0 });
  const arco = (Math.PI / 2) * C.raio;
  const n = Math.max(4, Math.ceil(arco / passo));
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (i / n) * (Math.PI / 2);
    pontos.push({ x: C.x + C.raio * Math.cos(a), z: C.z + C.raio * Math.sin(a), dx: -Math.sin(a), dz: Math.cos(a) });
  }
  for (let z = C.z - passo; z >= ate; z -= passo) pontos.push({ x: C.x - C.raio, z, dx: 0, dz: -1 });
  return pontos;
}

/** A normal que aponta para o lado do vale (o de dentro da curva), para quem anda no sentido (dx, dz) */
export const paraOVale = (p: { dx: number; dz: number }) => ({ nx: -p.dz, nz: p.dx });

/** A distância (com sinal) de um ponto ao meio da estrada: positivo do lado do vale */
export function ladoDaEstrada(x: number, z: number) {
  if (x >= C.x) return ESTRADA.z - z;
  if (z <= C.z) return x - (C.x - C.raio);
  return C.raio - Math.hypot(x - C.x, z - C.z);
}

/** O ponto está no asfalto (com uma folga)? */
export const naEstrada = (x: number, z: number, folga = 0.6) => Math.abs(ladoDaEstrada(x, z)) < meia + folga;

/** A distância do meio da estrada até a beira do vale */
export const BEIRA_DO_VALE = meia + ESTRADA.folgaDaMureta + ESTRADA.folgaDoVale;

/** O ponto está em cima do chão (e não no vale)? */
export const noPlanalto = (x: number, z: number) => ladoDaEstrada(x, z) < BEIRA_DO_VALE;

/** A beira do vale, de ponto em ponto: da direita, contornando o lado de dentro da curva, até o fundo */
export function beiraDoVale(alcance = 200): Array<[number, number]> {
  const r = C.raio - BEIRA_DO_VALE;
  const zReto = ESTRADA.z - BEIRA_DO_VALE;
  const pontos: Array<[number, number]> = [[alcance, zReto]];
  for (let x = alcance - 8; x > C.x; x -= 8) pontos.push([x, zReto]);
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (i / n) * (Math.PI / 2);
    pontos.push([C.x + r * Math.cos(a), C.z + r * Math.sin(a)]);
  }
  for (let z = C.z - 8; z > -alcance; z -= 8) pontos.push([C.x - r, z]);
  pontos.push([C.x - r, -alcance]);
  return pontos;
}

/** Onde está o carro que passa (o mesmo quadro, o mesmo lugar): a distância andada vira ponto e rumo */
export function pontoNaEstrada(distancia: number, faixa = 1.6): PontoDaEstrada & { angulo: number } {
  const reto = INICIO - C.x;
  const arco = (Math.PI / 2) * C.raio;
  let x: number;
  let z: number;
  let dx: number;
  let dz: number;
  if (distancia <= reto) {
    x = INICIO - distancia;
    z = ESTRADA.z;
    dx = -1;
    dz = 0;
  } else if (distancia <= reto + arco) {
    const a = Math.PI / 2 + (distancia - reto) / C.raio;
    x = C.x + C.raio * Math.cos(a);
    z = C.z + C.raio * Math.sin(a);
    dx = -Math.sin(a);
    dz = Math.cos(a);
  } else {
    x = C.x - C.raio;
    z = C.z - (distancia - reto - arco);
    dx = 0;
    dz = -1;
  }
  // A faixa: positivo vai para o lado do vale (a mão direita de quem desce)
  const { nx, nz } = paraOVale({ dx, dz });
  return { x: x + nx * faixa, z: z + nz * faixa, dx, dz, angulo: Math.atan2(dx, dz) };
}
