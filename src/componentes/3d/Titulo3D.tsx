import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Color, MeshStandardMaterial } from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { cores } from "../../nucleo/marca";
import { useFonte3d } from "./carregar";

// Título em 3D, com a fonte de título da marca: as letras têm volume, entram
// girando e depois balançam de leve. Use "\n" para quebrar a linha. Curto:
// cabe umas 10 letras por linha.

const ALTURA_DA_LINHA = 1.25;

export const Titulo3D: React.FC<{
  texto: string;
  cor?: string;
  /** Largura máxima, em unidades do palco (a tela tem uns 3,6) */
  largura?: number;
  y?: number;
  inicio?: number;
}> = ({ texto, cor = cores.destaque, largura = 2.8, y = 0, inicio = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonte = useFonte3d();
  const linhas = useMemo(() => {
    if (!fonte) return [];
    return texto.split("\n").map((linha) => {
      const g = new TextGeometry(linha, {
        font: fonte,
        size: 1,
        depth: 0.35,
        curveSegments: 10,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.03,
        bevelSegments: 4,
      });
      g.center();
      g.computeBoundingBox();
      return g;
    });
  }, [fonte, texto]);
  // Frente na cor pedida e a lateral das letras mais escura, para dar volume
  const materiais = useMemo(
    () => [
      new MeshStandardMaterial({ color: cor, roughness: 0.3, metalness: 0.15 }),
      new MeshStandardMaterial({ color: new Color(cor).multiplyScalar(0.55), roughness: 0.45, metalness: 0.1 }),
    ],
    [cor],
  );
  if (linhas.length === 0) return null;

  const maior = Math.max(...linhas.map((g) => g.boundingBox!.max.x - g.boundingBox!.min.x));
  const escalaBase = Math.min(largura / maior, 1.15);
  const entrada = spring({ frame: frame - inicio, fps, config: { damping: 13, mass: 0.9 } });
  const giro = interpolate(entrada, [0, 1], [-Math.PI / 2, 0]) + Math.sin((frame - inicio) / 24) * 0.14;
  return (
    <group position={[0, y, 0]} rotation={[Math.sin(frame / 33) * 0.07, giro, 0]} scale={escalaBase * Math.max(entrada, 0.001)}>
      {linhas.map((g, i) => (
        <mesh key={i} geometry={g} material={materiais} position={[0, ((linhas.length - 1) / 2 - i) * ALTURA_DA_LINHA, 0]} />
      ))}
    </group>
  );
};
