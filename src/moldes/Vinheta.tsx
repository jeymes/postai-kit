import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";

// A vinheta do fim (o motion do app ou do site do dono, enviada no Postaí em
// Configurar > Chamadas e vinheta). O npm run renderizar passa ela por aqui no
// tamanho do vídeo (em pé ou deitado): aparece inteira, centrada, com faixas
// pretas se o formato for outro, e depois é emendada no fim do vídeo.

export type PropsDaVinheta = { arquivo: string; largura: number; altura: number; quadros: number };

export const Vinheta: React.FC<PropsDaVinheta> = ({ arquivo }) => (
  <AbsoluteFill style={{ backgroundColor: "#000000" }}>
    <OffthreadVideo src={staticFile(arquivo)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
  </AbsoluteFill>
);

export const vinhetaExemplo: PropsDaVinheta = { arquivo: "marca/vinheta.mp4", largura: 1080, altura: 1920, quadros: 90 };
