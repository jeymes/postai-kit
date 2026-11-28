// O enquadramento do 2D (28/11/2026), sem dependência nenhuma (os testes rodam no Node:
// node --test src/moldes/conversa/enquadramento.test.ts): o plano de cada fala, o ponto da
// câmera de cada plano e o close sem ninguém cortado ao meio. A câmera no tempo (a troca
// suave e o respiro) fica no direcao.ts, que reexporta tudo daqui.

import type { Plano } from "./regras2d";

export type Camera = { x: number; y: number; z: number };
export const CAMERA_ABERTA: Camera = { x: 540, y: 960, z: 1 };

/** O ponto da câmera dentro do cenário, sem mostrar fora dele (o cenário é do tamanho da tela) */
export function dentro(c: Camera): Camera {
  const mx = 540 / c.z;
  const my = 960 / c.z;
  return { z: c.z, x: Math.min(1080 - mx, Math.max(mx, c.x)), y: Math.min(1920 - my, Math.max(my, c.y)) };
}

/** O enquadramento de um plano: `rosto` é o rosto de quem está em foco (na tela, sem câmera) */
export function enquadrar(plano: Plano, rosto: { x: number; y: number } | null, forca?: number): Camera {
  if (plano === "aberto" || !rosto) return CAMERA_ABERTA;
  if (plano === "medio") {
    const z = 1.14;
    return dentro({ z, x: 540 + (rosto.x - 540) * 0.5, y: rosto.y + 220 / z });
  }
  // Close: o rosto em y ~ 820 na tela (acima da legenda, abaixo do título)
  // Close de verdade (1,45): com menos, o outro ficava cortado ao meio e parecia erro de enquadramento
  const z = forca ? 1 + forca : 1.45;
  return dentro({ z, x: 540 + (rosto.x - 540) * 0.92, y: rosto.y + 160 / z });
}

// ---- O outro no close: inteiro dentro ou inteiro fora ----

/** Meia largura de quem está na cena, com os braços abertos e uma folga para o respiro da câmera (px na tela, sem câmera) */
export const MEIO_CORPO = 220;
/** O close mais aberto (com os dois inteiros dentro) e o mais fechado (com o outro inteiro fora) */
const CLOSE_MAIS_ABERTO = 1.2;
const CLOSE_MAIS_FECHADO = 2.2;
/** Folga do rosto de quem está em foco até a borda do quadro, quando o outro fica de fora */
const FOLGA_DO_ROSTO = 150;

/**
 * O close sem cortar ninguém ao meio (28/11/2026: no Conversa de dois, o close no rosto de um
 * deixava meio corpo do outro na borda). `rosto` é o rosto de quem está em foco e `outros`, o
 * meio do corpo de cada um dos outros (na tela, sem câmera). Se alguém fica cortado, há dois
 * jeitos: fechar mais (até 2,2) com o quadro acabando antes do outro, ou abrir um pouco (até
 * 1,2) com os dois inteiros dentro. O close de verdade (1,4 ou mais) tenta fechar primeiro; o
 * zoom leve do roteiro tenta abrir primeiro. Se nenhum serve, o medio.
 */
export function semCortarNinguem(c: Camera, rosto: { x: number; y: number }, outros: number[]): Camera {
  if (c.z <= 1.01) return c;
  const cortado = (cam: Camera, x: number) => {
    const meia = 540 / cam.z;
    const v0 = cam.x - meia;
    const v1 = cam.x + meia;
    return x + MEIO_CORPO > v0 && x - MEIO_CORPO < v1 && (x - MEIO_CORPO < v0 || x + MEIO_CORPO > v1);
  };
  const ruins = outros.filter((x) => cortado(c, x));
  if (!ruins.length) return c;
  const yDoClose = (z: number) => (z === c.z ? c.y : rosto.y + 160 / z);
  const semNinguemCortado = (cam: Camera | null) => (cam && !outros.some((x) => cortado(cam, x)) ? cam : null);
  // Os dois inteiros dentro: quem está em foco e os outros, com o corpo todo
  const dentroDoQuadro = () => {
    const de = Math.min(rosto.x - MEIO_CORPO, ...ruins.map((x) => x - MEIO_CORPO));
    const ate = Math.max(rosto.x + MEIO_CORPO, ...ruins.map((x) => x + MEIO_CORPO));
    const z = Math.min(c.z, 1080 / (ate - de));
    return z >= CLOSE_MAIS_ABERTO ? semNinguemCortado(dentro({ z, x: (de + ate) / 2, y: yDoClose(z) })) : null;
  };
  // O outro inteiro fora: o quadro acaba antes do corpo dele (do lado dele), com o rosto dentro
  const foraDoQuadro = () => {
    const direita = ruins.filter((x) => x > rosto.x);
    const esquerda = ruins.filter((x) => x <= rosto.x);
    const v1 = direita.length ? Math.min(...direita) - MEIO_CORPO : 1080;
    const v0 = esquerda.length ? Math.max(...esquerda) + MEIO_CORPO : 0;
    if (rosto.x - FOLGA_DO_ROSTO < v0 || rosto.x + FOLGA_DO_ROSTO > v1) return null;
    const z = Math.max(c.z, 1080 / (v1 - v0));
    if (z > CLOSE_MAIS_FECHADO) return null;
    const meia = 540 / z;
    return semNinguemCortado(dentro({ z, x: Math.min(v1 - meia, Math.max(v0 + meia, rosto.x)), y: yDoClose(z) }));
  };
  const closeDeVerdade = c.z >= 1.4;
  return (closeDeVerdade ? foraDoQuadro() ?? dentroDoQuadro() : dentroDoQuadro() ?? foraDoQuadro()) ?? enquadrar("medio", rosto);
}

const EMOCAO_FORTE = new Set<string>(["surpresa", "medo", "brava", "radiante", "preocupada"]);
const BRACOS_NO_ALTO = new Set<string>(["comemorando", "cabeca", "acenando"]);

export type PlanoDaFala = { plano: Plano; foco: number };

/**
 * O plano de cada fala. O roteiro manda (`camera` e `foco` da fala, `zoom` do topo); sem isso,
 * a câmera escolhe: a 1ª fala aberta (a prévia do feed), close na emoção forte de quem fala,
 * medio e aberto alternando, e aberto quando há cartão, QR, notificação, abraço ou alguém andando.
 * Alguém andando (`andando`) ganha o aberto até contra o roteiro (camera e zoom).
 */
export function planosDasFalas(args: {
  falas: Array<{
    quem?: string;
    camera?: Plano;
    foco?: string;
    expressoes: Record<string, string | undefined>;
    poses: string[];
    cheia: boolean;
    /** Alguém anda nesta fala (ou ainda está andando quando ela começa): sempre o quadro aberto */
    andando?: boolean;
  }>;
  ids: string[];
  viva: boolean;
  zoom?: { em: string; de: number; ate: number };
}): PlanoDaFala[] {
  const { falas, ids, viva, zoom } = args;
  const planos: PlanoDaFala[] = [];
  falas.forEach((f, k) => {
    const fala = ids.indexOf(f.quem ?? "");
    const foco = f.foco ? ids.indexOf(f.foco) : fala;
    // Quem entra ou sai andando precisa do quadro inteiro, mesmo com close pedido (28/11/2026:
    // a câmera fechava no rosto e a pessoa atravessava a tela cortada)
    if (f.andando) {
      planos.push({ plano: "aberto", foco: -1 });
      return;
    }
    if (zoom && k >= zoom.de && k <= zoom.ate) {
      planos.push({ plano: "close", foco: Math.max(0, ids.indexOf(zoom.em)) });
      return;
    }
    if (f.camera) {
      planos.push({ plano: f.camera, foco: foco >= 0 ? foco : 0 });
      return;
    }
    if (!viva || k === 0 || f.cheia || foco < 0 && ids.length > 1) {
      // O narrador: aberto, ou um medio no meio de vez em quando
      planos.push({ plano: !viva || k === 0 || f.cheia || planos[k - 1]?.plano !== "aberto" ? "aberto" : "medio", foco: -1 });
      return;
    }
    const alvo = foco >= 0 ? foco : 0;
    const antes = planos[k - 1]?.plano ?? "aberto";
    const emocao = EMOCAO_FORTE.has(f.expressoes[ids[alvo]] ?? "");
    const bracosNoAlto = f.poses.some((p) => BRACOS_NO_ALTO.has(p));
    let plano: Plano;
    if (emocao && !bracosNoAlto && antes !== "close") plano = "close";
    else if (antes === "aberto") plano = "medio";
    else if (antes === "close") plano = k % 2 ? "medio" : "aberto";
    else plano = k % 3 === 0 && !bracosNoAlto ? "close" : "aberto";
    planos.push({ plano, foco: alvo });
  });
  return planos;
}
