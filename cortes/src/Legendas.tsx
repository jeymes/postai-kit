import { createTikTokStyleCaptions } from "@remotion/captions";
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// Legenda no estilo dos cortes: poucas palavras por vez, em caixa alta, e a
// palavra que está sendo dita em amarelo e um pouco maior. Adaptada da
// legenda do Kit Estúdio.

export type Legenda = { texto: string; inicioMs: number; fimMs: number };

export const Legendas: React.FC<{ legendas: Legenda[]; fonte: string; tamanho?: number }> = ({
  legendas,
  fonte,
  tamanho = 78,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const agora = (frame / fps) * 1000;
  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions: legendas.map((l) => ({
          text: ` ${l.texto}`,
          startMs: l.inicioMs,
          endMs: l.fimMs,
          timestampMs: null,
          confidence: null,
        })),
        combineTokensWithinMilliseconds: 900,
      }),
    [legendas],
  );
  const pagina = pages.filter((p) => p.startMs <= agora).pop();
  // Some se ninguém fala há mais de 1,5 s
  if (!pagina || agora > pagina.startMs + pagina.durationMs + 1500) return null;
  const entrada = interpolate(agora - pagina.startMs, [0, 100], [0.88, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        scale: String(entrada),
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${tamanho * 0.34}px`,
        padding: "0 60px",
        fontFamily: fonte,
        fontWeight: 900,
        fontSize: tamanho,
        lineHeight: 1.12,
        textAlign: "center",
        textTransform: "uppercase",
        WebkitTextStroke: `${tamanho * 0.1}px #000`,
        paintOrder: "stroke fill",
        textShadow: "0 6px 18px rgba(0,0,0,0.55)",
      }}
    >
      {pagina.tokens.map((token, i) => {
        const falando = token.fromMs <= agora && agora < token.toMs;
        return (
          <span key={i} style={{ color: falando ? "#FFE14D" : "#FFFFFF", scale: falando ? "1.05" : "1" }}>
            {token.text.trim()}
          </span>
        );
      })}
    </div>
  );
};
