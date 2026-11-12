import { createTikTokStyleCaptions } from "@remotion/captions";
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { cores, fontes } from "../../nucleo/marca";

// Legenda animada da narração, no estilo das redes: poucas palavras por vez e
// a palavra que está sendo dita numa etiqueta na cor de destaque. O tempo de cada
// palavra vem do `npm run narrar` (o Whisper escuta a voz).

export type Legenda = { texto: string; inicioMs: number; fimMs: number };

export const Legendas: React.FC<{
  legendas: Legenda[];
  /** Quadro da cena em que a voz começa */
  atraso?: number;
  tamanho?: number;
  /** Numa caixa clara: para ler em cima de vídeo ou foto */
  caixa?: boolean;
  style?: React.CSSProperties;
}> = ({ legendas, atraso = 0, tamanho = 76, caixa = false, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const agora = ((frame - atraso) / fps) * 1000;
  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions: legendas.map((l) => ({ text: ` ${l.texto}`, startMs: l.inicioMs, endMs: l.fimMs, timestampMs: null, confidence: null })),
        combineTokensWithinMilliseconds: 1100,
      }),
    [legendas],
  );
  // A página fica até a próxima começar (sem piscar entre uma e outra)
  const pagina = pages.filter((p) => p.startMs <= agora).pop();
  if (!pagina) return null;
  const desdeOInicio = agora - pagina.startMs;
  const entrada = interpolate(desdeOInicio, [0, 120], [0.85, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", ...style }}>
      <div
        style={{
          scale: String(entrada),
          display: "flex",
          flexWrap: "wrap",
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
