import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { cores } from "../../nucleo/marca";

// Formas flutuando ao fundo, nas cores da marca: dão profundidade sem roubar a
// cena. Ficam nas bordas, longe do meio onde vai o assunto.

type Forma = { tipo: "icosaedro" | "toro" | "esfera" | "octaedro"; x: number; y: number; z: number; tamanho: number };

const FORMAS: Forma[] = [
  { tipo: "icosaedro", x: -1.45, y: 2.45, z: -2, tamanho: 0.42 },
  { tipo: "toro", x: 1.5, y: 2.1, z: -1.5, tamanho: 0.36 },
  { tipo: "esfera", x: 1.45, y: -2.55, z: -1, tamanho: 0.3 },
  { tipo: "octaedro", x: -1.45, y: -2.8, z: -2.5, tamanho: 0.45 },
  { tipo: "toro", x: -0.3, y: 3.2, z: -4, tamanho: 0.28 },
  { tipo: "esfera", x: 0.55, y: -3.15, z: -3, tamanho: 0.22 },
];

const Geometria: React.FC<{ tipo: Forma["tipo"] }> = ({ tipo }) => {
  if (tipo === "icosaedro") return <icosahedronGeometry args={[1, 0]} />;
  if (tipo === "toro") return <torusGeometry args={[0.8, 0.32, 24, 64]} />;
  if (tipo === "octaedro") return <octahedronGeometry args={[1, 0]} />;
  return <sphereGeometry args={[0.9, 48, 48]} />;
};

export const Formas3D: React.FC<{ inicio?: number }> = ({ inicio = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const paleta = [cores.destaque, cores.texto, cores.destaque, cores.superficie];
  return (
    <group>
      {FORMAS.map((f, i) => {
        const entrada = spring({ frame: frame - inicio - i * 3, fps, config: { damping: 12 } });
        const t = frame / fps;
        return (
          <mesh
            key={i}
            position={[f.x, f.y + Math.sin(t * 1.3 + i) * 0.12, f.z]}
            rotation={[t * (0.4 + i * 0.07), t * (0.6 - i * 0.05), 0]}
            scale={f.tamanho * Math.max(entrada, 0.001)}
          >
            <Geometria tipo={f.tipo} />
            <meshStandardMaterial color={paleta[i % paleta.length]} roughness={0.3} metalness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
};
