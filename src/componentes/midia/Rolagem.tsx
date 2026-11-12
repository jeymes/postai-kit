import React from "react";
import { Img, interpolate, useCurrentFrame } from "remotion";
import { suave } from "../../nucleo/animacao";
import { arquivo } from "../base";

/** Ponto da rolagem: no quadro `em`, o topo da tela mostra `y` (0 = topo da página, 1 = fim) */
export type PontoDeRolagem = { em: number; y: number };

/**
 * Print alto de uma página (ex.: o site do cliente, capturado com
 * `npm run capturar-site`) rolando dentro de uma janela. Entre dois pontos a
 * rolagem acelera e freia, como um dedo de verdade.
 */
export const Rolagem: React.FC<{
  print: string;
  /** Largura da janela, em px: o print é ampliado para caber nela */
  largura: number;
  altura: number;
  /** Altura do print dividida pela largura (ex.: 3 para uma página 3 vezes mais alta que larga) */
  proporcao: number;
  pontos?: PontoDeRolagem[];
}> = ({ print, largura, altura, proporcao, pontos = [] }) => {
  const frame = useCurrentFrame();
  const alturaDoPrint = largura * proporcao;
  const sobra = Math.max(0, alturaDoPrint - altura);
  const y =
    pontos.length < 2
      ? (pontos[0]?.y ?? 0)
      : interpolate(
          frame,
          pontos.map((p) => p.em),
          pontos.map((p) => p.y),
          { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave },
        );
  return (
    <div style={{ width: largura, height: altura, overflow: "hidden", position: "relative" }}>
      <Img src={arquivo(print)} style={{ width: largura, display: "block", translate: `0px ${-y * sobra}px` }} />
    </div>
  );
};
