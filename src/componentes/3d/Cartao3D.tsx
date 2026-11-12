import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cores } from "../../nucleo/marca";
import { useTextura } from "./carregar";

// Foto num cartão 3D com moldura: entra dando meia-volta e fica flutuando,
// girando de leve. Bom para produto, print de site ou foto do lugar.

export const Cartao3D: React.FC<{
  foto: string;
  /** Tamanho máximo, em unidades do palco (a tela tem uns 3,6 × 6,4) */
  largura?: number;
  alturaMaxima?: number;
  y?: number;
  inicio?: number;
}> = ({ foto, largura = 2.7, alturaMaxima = 3.3, y = 0.5, inicio = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const textura = useTextura(foto);
  const imagem = textura?.image as { width: number; height: number } | undefined;
  const proporcao = imagem ? imagem.height / imagem.width : 1;
  const l = Math.min(largura, alturaMaxima / proporcao);
  const a = l * proporcao;
  const moldura = useMemo(() => new RoundedBoxGeometry(l + 0.14, a + 0.14, 0.12, 4, 0.07), [l, a]);
  if (!textura) return null;

  const entrada = spring({ frame: frame - inicio, fps, config: { damping: 14 } });
  const giro = interpolate(entrada, [0, 1], [Math.PI * 0.85, 0]) + Math.sin((frame - inicio) / 28) * 0.2;
  const flutua = Math.sin((frame - inicio) / 20) * 0.06;
  return (
    <group position={[0, y + flutua, 0]} rotation={[0.06, giro, Math.sin(frame / 40) * 0.03]} scale={Math.max(entrada, 0.001)}>
      <mesh geometry={moldura}>
        <meshStandardMaterial color={cores.superficie} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.062]}>
        <planeGeometry args={[l, a]} />
        {/* A foto não recebe luz: sai com a cor de verdade */}
        <meshBasicMaterial map={textura} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.062]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[l, a]} />
        <meshStandardMaterial color={cores.destaque} roughness={0.5} />
      </mesh>
    </group>
  );
};
