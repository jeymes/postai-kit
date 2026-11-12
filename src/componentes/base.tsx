import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { cores, fontes, marca } from "../nucleo/marca";

/** Fundo da marca com um círculo de destaque suave no canto */
export const Fundo: React.FC<{ escuro?: boolean; children?: React.ReactNode }> = ({
  escuro = false,
  children,
}) => (
  <AbsoluteFill style={{ backgroundColor: escuro ? cores.destaque : cores.fundo, overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        width: 1100,
        height: 1100,
        borderRadius: "50%",
        right: -520,
        top: -460,
        backgroundColor: escuro ? cores.textoNoDestaque : cores.destaque,
        opacity: escuro ? 0.08 : 0.1,
      }}
    />
    {children}
  </AbsoluteFill>
);

/** Caminho de public/ ou URL completa */
export const arquivo = (caminho: string) =>
  /^https?:\/\//.test(caminho) ? caminho : staticFile(caminho);

/** Foto com cantos arredondados e um zoom lento (ken burns) */
export const Foto: React.FC<{
  src: string;
  largura: number;
  altura: number;
  zoom?: boolean;
  style?: React.CSSProperties;
}> = ({ src, largura, altura, zoom = true, style }) => {
  const frame = useCurrentFrame();
  const escala = zoom ? interpolate(frame, [0, 300], [1, 1.08], { extrapolateRight: "clamp" }) : 1;
  return (
    <div
      style={{
        width: largura,
        height: altura,
        borderRadius: 40,
        overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,0.18)",
        backgroundColor: cores.superficie,
        ...style,
      }}
    >
      <Img
        src={arquivo(src)}
        style={{ width: "100%", height: "100%", objectFit: "cover", scale: String(escala) }}
      />
    </div>
  );
};

/** Logo da marca (ou o nome, se ainda não houver logo) */
export const Assinatura: React.FC<{ tamanho?: number; cor?: string }> = ({
  tamanho = 120,
  cor = cores.texto,
}) =>
  marca.logo ? (
    <Img src={marca.logo} style={{ height: tamanho, objectFit: "contain" }} />
  ) : (
    <div style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: tamanho * 0.5, color: cor }}>
      {marca.nome}
    </div>
  );

/** Selo arredondado na cor de destaque (preço, número, "novo") */
export const Selo: React.FC<{ texto: string; tamanho?: number; style?: React.CSSProperties }> = ({
  texto,
  tamanho = 64,
  style,
}) => (
  <div
    style={{
      display: "inline-block",
      alignSelf: "flex-start",
      backgroundColor: cores.destaque,
      color: cores.textoNoDestaque,
      fontFamily: fontes.titulo,
      fontWeight: 800,
      fontSize: tamanho,
      padding: `${tamanho * 0.2}px ${tamanho * 0.5}px`,
      borderRadius: tamanho,
      ...style,
    }}
  >
    {texto}
  </div>
);
