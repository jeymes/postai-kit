// Ilustração da fala: as peças de base que todo tipo usa, no jeito do estilo
// do canal: o cartão, o selo redondo (ícone, objeto), a pílula do rótulo, o
// texto com um pedaço em destaque e os filtros do giz e do neon.

import React from "react";
import type { TemaDaIlustracao } from "./tema";

/** Os filtros do traço (giz tremido, neon brilhando): uma vez na camada */
export const FiltrosDaIlustracao: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      <filter id="ilustra-giz" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={5} result="ruido" />
        <feDisplacementMap in="SourceGraphic" in2="ruido" scale={5} xChannelSelector="R" yChannelSelector="G" result="tremido" />
        <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves={1} seed={11} result="poeira" />
        <feColorMatrix in="poeira" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -0.9 1.4" result="buracos" />
        <feComposite in="tremido" in2="buracos" operator="in" />
      </filter>
      <filter id="ilustra-neon" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation={5} result="b1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation={12} result="b2" />
        <feMerge>
          <feMergeNode in="b2" />
          <feMergeNode in="b1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
);

// O canto torto do desenho à mão (o truque do border-radius com dois raios por canto)
const CANTOS_A_MAO = ["28px 220px 24px 200px / 200px 26px 230px 24px", "220px 30px 210px 26px / 26px 210px 24px 220px"];

/**
 * O contorno desenhado à mão (palito, giz): dois traços tortos, um quase em
 * cima do outro, que se desenham da esquerda para a direita em `progresso`.
 */
const ContornoAMao: React.FC<{ tema: TemaDaIlustracao; progresso: number; canto: "redondo" | "cartao" }> = ({ tema, progresso, canto }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      clipPath: `inset(-12px ${(1 - Math.min(1, progresso)) * 100}% -12px -12px)`,
      filter: tema.filtro,
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        border: `${tema.larguraDoContorno}px solid ${tema.contorno}`,
        borderRadius: canto === "redondo" ? "52% 48% 50% 50% / 48% 52% 48% 52%" : CANTOS_A_MAO[0],
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: -3,
        border: `${Math.max(2, tema.larguraDoContorno - 2.5)}px solid ${tema.contorno}`,
        opacity: 0.55,
        rotate: "-0.6deg",
        borderRadius: canto === "redondo" ? "48% 52% 47% 53% / 53% 47% 52% 48%" : CANTOS_A_MAO[1],
      }}
    />
  </div>
);

/** O estilo do fundo do cartão (sem o contorno à mão, que é uma camada por cima) */
export function estiloDoCartao(tema: TemaDaIlustracao, redondo = false): React.CSSProperties {
  return {
    position: "relative",
    background: tema.cartao,
    border: tema.desenhado ? "none" : `${tema.larguraDoContorno}px solid ${tema.contorno}`,
    borderRadius: redondo ? 9999 : tema.desenhado ? CANTOS_A_MAO[0] : tema.canto,
    boxShadow: tema.sombra,
  };
}

/** O cartão do estilo, com o conteúdo dentro. `progresso`: a entrada (o contorno à mão se desenha nela) */
export const Cartao: React.FC<{
  tema: TemaDaIlustracao;
  progresso: number;
  redondo?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ tema, progresso, redondo = false, style, children }) => (
  <div style={{ ...estiloDoCartao(tema, redondo), ...style }}>
    {children}
    {tema.desenhado && <ContornoAMao tema={tema} progresso={progresso * 1.25} canto={redondo ? "redondo" : "cartao"} />}
  </div>
);

/** A pílula do rótulo (embaixo do ícone, da seta, do objeto) */
export const Pilula: React.FC<{ tema: TemaDaIlustracao; tamanho?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ tema, tamanho = 42, style, children }) => (
  <div
    style={{
      ...estiloDoCartao(tema),
      borderRadius: tema.desenhado ? CANTOS_A_MAO[1] : 999,
      borderWidth: tema.desenhado ? 0 : Math.min(tema.larguraDoContorno, 4),
      boxShadow: tema.familia === "chapado" ? "none" : tema.sombra,
      padding: `${Math.round(tamanho * 0.16)}px ${Math.round(tamanho * 0.55)}px`,
      fontFamily: tema.fonteTexto,
      fontWeight: tema.peso,
      fontSize: tamanho,
      lineHeight: 1.1,
      color: tema.texto,
      textShadow: tema.brilho,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
    {tema.desenhado && <ContornoAMao tema={{ ...tema, larguraDoContorno: 3.5 }} progresso={1} canto="cartao" />}
  </div>
);

/** O texto com o pedaço `destaque` na cor de destaque (sem acento/caixa: acha "Erro" em "ERRO") */
export const TextoComDestaque: React.FC<{ texto: string; destaque?: string; cor: string }> = ({ texto, destaque, cor }) => {
  if (!destaque) return <>{texto}</>;
  const i = texto.toLocaleLowerCase("pt-BR").indexOf(destaque.toLocaleLowerCase("pt-BR"));
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <span style={{ color: cor }}>{texto.slice(i, i + destaque.length)}</span>
      {texto.slice(i + destaque.length)}
    </>
  );
};

/** "1,01^360" vira 1,01 com o 360 em cima (expoente) */
export const ComExpoente: React.FC<{ texto: string }> = ({ texto }) => {
  const partes = texto.split(/\^(\S+)/);
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <sup key={i} style={{ fontSize: "0.58em", verticalAlign: "0.72em", lineHeight: 0 }}>
            {p}
          </sup>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
};

/** Os números da contagem: algarismos de mesma largura (o número não treme contando) */
export const TABULAR: React.CSSProperties = { fontVariantNumeric: "tabular-nums lining-nums", fontFeatureSettings: '"tnum" 1, "lnum" 1' };
