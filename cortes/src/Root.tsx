import React from "react";
import { Composition } from "remotion";
import { Corte, type PropsDoCorte } from "./Corte";

export const FPS = 30;

const exemplo: PropsDoCorte = {
  video: "exemplo.mp4",
  fundo: "exemplo-fundo.mp4",
  duracaoSeg: 10,
  largura: 1920,
  altura: 1080,
  gancho: "Ele não esperava essa resposta",
  credito: "",
  enquadramento: "desfocado",
  legendas: [],
};

export const Raiz: React.FC = () => (
  <Composition
    id="Corte"
    component={Corte}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 10}
    defaultProps={exemplo}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, Math.round(props.duracaoSeg * FPS)) })}
  />
);
