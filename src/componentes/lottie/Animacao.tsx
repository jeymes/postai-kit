import { Lottie, type LottieAnimationData } from "@remotion/lottie";
import React from "react";
import { Freeze, Sequence, useCurrentFrame } from "remotion";
import confete from "./gerados/confete.json";
import curtida from "./gerados/curtida.json";
import estrelas from "./gerados/estrelas.json";
import seta from "./gerados/seta.json";
import sucesso from "./gerados/sucesso.json";

// Animações Lottie do kit, nas cores da marca (geradas por `npm run lottie`).
export const ANIMACOES = {
  sucesso: sucesso as LottieAnimationData,
  confete: confete as LottieAnimationData,
  estrelas: estrelas as LottieAnimationData,
  curtida: curtida as LottieAnimationData,
  seta: seta as LottieAnimationData,
};

export type NomeDaAnimacao = keyof typeof ANIMACOES;

/** Quando acaba, a animação para no último quadro (sem isso, ela some) */
const Tocar: React.FC<{ nome: NomeDaAnimacao; repetir: boolean }> = ({ nome, repetir }) => {
  const frame = useCurrentFrame();
  const fim = (ANIMACOES[nome] as { op: number }).op - 1;
  const lottie = <Lottie animationData={ANIMACOES[nome]} loop={repetir} style={{ width: "100%", height: "100%" }} />;
  return !repetir && frame >= fim ? <Freeze frame={fim}>{lottie}</Freeze> : lottie;
};

/** Toca a animação a partir do quadro `em`, no tamanho pedido (largura em px) */
export const Animacao: React.FC<{
  nome: NomeDaAnimacao;
  em?: number;
  largura: number;
  repetir?: boolean;
  style?: React.CSSProperties;
}> = ({ nome, em = 0, largura, repetir = false, style }) => {
  const dados = ANIMACOES[nome] as { w: number; h: number };
  return (
    <Sequence from={Math.round(em)} layout="none" name={`Lottie: ${nome}`}>
      <div style={{ width: largura, height: (largura * dados.h) / dados.w, ...style }}>
        <Tocar nome={nome} repetir={repetir} />
      </div>
    </Sequence>
  );
};
