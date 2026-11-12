import { Video } from "@remotion/media";
import React from "react";
import { Freeze, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// A pessoa falando (avatar do `npm run avatar`): o vídeo da cena, sem som (a
// voz vem da narração). Antes da fala começar, fica parada no primeiro quadro;
// depois que acaba, no último, para não sumir no respiro da cena.

export const Apresentador: React.FC<{
  src: string;
  duracaoSeg: number;
  /** Quadro da cena em que a voz começa */
  atraso?: number;
  style?: React.CSSProperties;
}> = ({ src, duracaoSeg, atraso = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const quadros = Math.max(2, Math.round(duracaoSeg * fps));
  const video = <Video src={staticFile(src)} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />;
  let conteudo: React.ReactNode;
  if (frame < atraso) conteudo = <Freeze frame={0}>{video}</Freeze>;
  else if (frame >= atraso + quadros - 1) conteudo = <Freeze frame={quadros - 2}>{video}</Freeze>;
  else
    conteudo = (
      <Sequence from={atraso} layout="none">
        {video}
      </Sequence>
    );
  return <div style={{ overflow: "hidden", ...style }}>{conteudo}</div>;
};
