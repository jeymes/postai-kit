import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { useVideoConfig } from "remotion";

// Palco do 3D: câmera e luzes prontas, fundo transparente (o Fundo da marca
// aparece por trás). Na distância padrão, a tela mostra uns 3,6 de largura por
// 6,4 de altura (em unidades do three.js), com o centro no 0.

export const Palco3D: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ fov: 30, position: [0, 0, 12] }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 5, 6]} intensity={2.2} />
      <directionalLight position={[-4, -2, 3]} intensity={0.6} />
      <pointLight position={[0, 0, 4]} intensity={8} distance={12} />
      {children}
    </ThreeCanvas>
  );
};
