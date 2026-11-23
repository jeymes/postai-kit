import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { cores, fontes } from "../../nucleo/marca";

// "Frase na luz": cena final escura, um feixe de luz desce do alto e a frase
// aparece grande na cor de destaque do canal, com brilho, palavra a palavra; a
// linha menor embaixo (autor, referência, fonte); o personagem pode aparecer
// no feixe; e o botão da chamada final do canal. Serve para qualquer estilo e
// qualquer canal (no Conversa, o campo "final"). Dura CONVERSA.final quadros.

export const FraseNaLuz: React.FC<{ frase: string; linha?: string; botao?: string; figura?: React.ReactNode; cor?: string }> = ({
  frase: versiculo,
  linha: referencia,
  botao,
  figura,
  cor = cores.destaque,
}) => {
  const DOURADO = cor;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // O feixe acende rápido e a frase entra logo (23/11/2026: o feixe ficava ~0,6 s
  // vazio e escuro antes da frase, e a frase demorava a aparecer inteira)
  const feixe = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const INICIO = 4;
  const PASSO = 2;
  const palavras = versiculo.split(/\s+/).filter(Boolean);
  const tamanho = versiculo.length > 110 ? 58 : versiculo.length > 70 ? 66 : 76;
  return (
    <AbsoluteFill style={{ background: "#0F1320" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="feixe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF3C4" stopOpacity={0.55 * feixe} />
            <stop offset="1" stopColor="#FFF3C4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points="470,0 610,0 900,1920 180,1920" fill="url(#feixe)" />
        {Array.from({ length: 14 }, (_, i) => (
          <circle
            key={i}
            cx={330 + ((i * 97) % 420)}
            cy={(i * 173 + frame * (1.2 + (i % 3) * 0.4)) % 1920}
            r={3 + (i % 3)}
            fill="#FFF3C4"
            opacity={0.25 * feixe}
          />
        ))}
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 110px", flexDirection: "column", gap: 40 }}>
        <div
          style={{
            fontFamily: fontes.titulo,
            fontWeight: 800,
            fontSize: tamanho,
            lineHeight: 1.25,
            color: DOURADO,
            textAlign: "center",
            // Contorno escuro: a cor do canal (rosé, laranja) quase sumia em cima do feixe claro
            WebkitTextStroke: `${Math.round(tamanho / 14)}px #0F1320`,
            paintOrder: "stroke fill",
            textShadow: `0 0 14px rgba(15,19,32,0.9), 0 0 30px ${cor}66`,
          }}
        >
          {palavras.map((palavra, i) => {
            const p = spring({ frame: frame - INICIO - i * PASSO, fps, config: { damping: 16 } });
            return (
              <span key={i} style={{ opacity: p, display: "inline-block", translate: `0 ${(1 - p) * 16}px`, marginRight: "0.28em" }}>
                {palavra}
              </span>
            );
          })}
        </div>
        {referencia && (
          <div
            style={{
              fontFamily: fontes.titulo,
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: 2,
              color: "rgba(255,255,255,0.78)",
              opacity: interpolate(frame, [INICIO + palavras.length * PASSO, INICIO + 12 + palavras.length * PASSO], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            {referencia}
          </div>
        )}
        {figura && (
          <div style={{ opacity: interpolate(frame, [2, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), marginTop: 10 }}>{figura}</div>
        )}
        {botao && (
          <div
            style={{
              marginTop: 30,
              background: DOURADO,
              color: cores.textoNoDestaque,
              fontFamily: fontes.titulo,
              fontWeight: 800,
              fontSize: 44,
              padding: "22px 56px",
              borderRadius: 60,
              scale: String(spring({ frame: frame - INICIO - 12 - palavras.length * PASSO, fps, config: { damping: 12 } })),
            }}
          >
            {botao}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
