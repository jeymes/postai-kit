import { Audio } from "@remotion/media";
import React, { createContext, useContext } from "react";
import { interpolate, Sequence, staticFile } from "remotion";
import { arquivo } from "../base";

// Efeitos sonoros (public/sfx), feitos por código no Laços e trazidos para o
// kit. Copiado e adaptado do Som.tsx do Laços.

/** Liga/desliga os efeitos de tudo que está dentro (prop `efeitos` do molde) */
export const EfeitosContexto = createContext(true);

export const SONS = {
  toque: { volume: 0.55, quadros: 3 },
  transicao: { volume: 0.35, quadros: 14 },
  sucesso: { volume: 0.45, quadros: 24 },
  notificacao: { volume: 0.4, quadros: 14 },
  alerta: { volume: 0.45, quadros: 7 },
  chamada: { volume: 0.5, quadros: 36 },
  impacto: { volume: 0.7, quadros: 33 },
  congela: { volume: 0.5, quadros: 10 },
  brasa: { volume: 0.35, quadros: 60 },
  moeda: { volume: 0.45, quadros: 21 },
  brinde: { volume: 0.5, quadros: 30 },
  grilo: { volume: 0.4, quadros: 48 },
  tictac: { volume: 0.45, quadros: 33 },
  sininho: { volume: 0.4, quadros: 42 },
  fogos: { volume: 0.45, quadros: 66 },
} as const;

export type TipoSom = keyof typeof SONS;

/** Toca um efeito no quadro `em` da sequência atual */
export const Som: React.FC<{ tipo: TipoSom; em: number; volume?: number }> = ({ tipo, em, volume }) => {
  const ligado = useContext(EfeitosContexto);
  if (!ligado) return null;
  return (
    <Sequence from={Math.max(0, Math.round(em))} durationInFrames={SONS[tipo].quadros} layout="none" name={`Som: ${tipo}`}>
      <Audio src={staticFile(`sfx/${tipo}.wav`)} volume={() => volume ?? SONS[tipo].volume} />
    </Sequence>
  );
};

/** Música de fundo que baixa no último segundo. `volume` de 0 a 1 */
export const Musica: React.FC<{ src: string; total: number; volume?: number; inicioSeg?: number }> = ({
  src,
  total,
  volume = 0.6,
  inicioSeg = 0,
}) => (
  <Audio
    src={arquivo(src)}
    trimBefore={Math.round(inicioSeg * 30)}
    volume={(f) => interpolate(f, [0, 8, total - 30, total], [0, volume, volume, 0], { extrapolateRight: "clamp" })}
  />
);
