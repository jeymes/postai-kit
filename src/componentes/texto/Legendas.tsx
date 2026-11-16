import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { cores, fontes } from "../../nucleo/marca";
import { paginar, type Legenda } from "./paginar";

// Legenda animada da narração, no estilo das redes: poucas palavras por vez e
// a palavra que está sendo dita numa etiqueta na cor de destaque. O tempo de cada
// palavra vem do `npm run narrar` (o Whisper escuta a voz).

export type { Legenda } from "./paginar";

export const Legendas: React.FC<{
  legendas: Legenda[];
  /** Quadro da cena em que a voz começa */
  atraso?: number;
  tamanho?: number;
  /** Numa caixa clara: para ler em cima de vídeo ou foto */
  caixa?: boolean;
  /** A largura livre para a legenda, em px (a tela menos as margens): define quantas letras cabem numa linha */
  largura?: number;
  style?: React.CSSProperties;
}> = ({ legendas, atraso = 0, tamanho = 76, caixa = false, largura = 940, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const agora = ((frame - atraso) / fps) * 1000;
  // Letras que cabem numa linha nesta fonte (grossa: ~0,62 da altura por letra), menos a caixa e a etiqueta
  const maxLetras = Math.max(8, Math.floor((largura - (caixa ? tamanho * 0.7 : 0)) / (tamanho * 0.62)));
  const pages = useMemo(() => paginar(legendas, maxLetras), [legendas, maxLetras]);
  // A página fica até a próxima começar (sem piscar entre uma e outra)
  const pagina = pages.filter((p) => p.startMs <= agora).pop();
  if (!pagina) return null;
  // Depois da última palavra da página, a legenda some (antes ficava congelada até o fim)
  const fimDaPagina = pagina.tokens[pagina.tokens.length - 1].toMs;
  if (agora > fimDaPagina + 700) return null;
  const desdeOInicio = agora - pagina.startMs;
  const entrada = interpolate(desdeOInicio, [0, 120], [0.85, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", ...style }}>
      <div
        style={{
          scale: String(entrada),
          display: "flex",
          flexWrap: "nowrap",
          whiteSpace: "nowrap",
          justifyContent: "center",
          gap: `0 ${tamanho * 0.28}px`,
          fontFamily: fontes.titulo,
          fontWeight: 800,
          fontSize: tamanho,
          lineHeight: 1.15,
          textAlign: "center",
          ...(caixa
            ? { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: tamanho * 0.4, padding: `${tamanho * 0.2}px ${tamanho * 0.35}px` }
            : {}),
        }}
      >
        {pagina.tokens.map((token, i) => {
          const falando = token.fromMs <= agora && agora < token.toMs;
          return (
            <span
              key={i}
              style={{
                color: falando ? cores.textoNoDestaque : cores.texto,
                backgroundColor: falando ? cores.destaque : "transparent",
                borderRadius: tamanho * 0.22,
                padding: `0 ${tamanho * 0.14}px`,
                scale: falando ? "1.06" : "1",
              }}
            >
              {token.text.trim()}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
