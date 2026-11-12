import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { cores, fontes, marca } from "../../nucleo/marca";
import { TRACO } from "../personagens/Boneco";
import { Texto } from "../texto/Texto";

// As chamadas (CTA) dos vídeos animados, no mesmo traço dos personagens:
// - BalaoDeChamada: o CTA do começo, um balão de fala com o logo da marca,
//   logo abaixo do título;
// - CartaoDeChamada: o CTA do fim, um cartão que sobe por cima da cena (os
//   personagens continuam aparecendo em cima), com o selo do logo, a chamada e
//   um botão que pulsa com o @ ou o site.
// Sem logo na marca, o selo mostra a inicial do nome na cor de destaque.

const SOMBRA = "0 14px 0 rgba(43,35,64,0.18)";

/** O logo da marca dentro de um círculo branco com contorno */
export const SeloDaMarca: React.FC<{ tamanho: number; contorno?: number }> = ({ tamanho, contorno = 6 }) => (
  <div
    style={{
      width: tamanho,
      height: tamanho,
      borderRadius: tamanho,
      background: marca.logo ? "#FFFFFF" : cores.destaque,
      border: `${contorno}px solid ${TRACO}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      flexShrink: 0,
    }}
  >
    {marca.logo ? (
      <Img src={marca.logo} style={{ width: "72%", height: "72%", objectFit: "contain" }} />
    ) : (
      <span style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: tamanho * 0.5, color: cores.textoNoDestaque }}>
        {marca.nome.slice(0, 1)}
      </span>
    )}
  </div>
);

/** CTA do começo: balão de fala com o logo; entra com um pulo e sai antes da primeira virada */
export const BalaoDeChamada: React.FC<{ texto: string; topo: number; sai?: number }> = ({ texto, topo, sai = 110 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dentro = spring({ frame: frame - 10, fps, config: { damping: 10, stiffness: 140 } });
  const fora = spring({ frame: frame - sai, fps, config: { damping: 20 } });
  const p = dentro * (1 - fora);
  if (p <= 0.01) return null;
  // Balança de leve enquanto está na tela
  const balanco = Math.sin(frame / 7) * 1.6;
  return (
    <div style={{ position: "absolute", top: topo, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", scale: String(p), rotate: `${balanco - 2}deg`, transformOrigin: "50% 100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            background: "#FFFFFF",
            border: `6px solid ${TRACO}`,
            borderRadius: 40,
            padding: "14px 34px 14px 16px",
            boxShadow: SOMBRA,
          }}
        >
          <SeloDaMarca tamanho={70} contorno={4} />
          <span style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: 42, color: TRACO, whiteSpace: "nowrap" }}>{texto}</span>
        </div>
        {/* A pontinha do balão */}
        <svg width="54" height="40" viewBox="0 0 54 40" style={{ position: "absolute", left: 70, bottom: -33 }}>
          <path d="M3 0 L28 36 L50 0" fill="#FFFFFF" stroke={TRACO} strokeWidth="6" strokeLinejoin="round" />
          <rect x="0" y="-8" width="54" height="10" fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  );
};

const CONFETES = ["#FFD84D", "#FF7096", "#7CC6FF", "#9FE39A", "#CDB4FF", "#FF9F1C", "#FFD84D", "#FF7096", "#7CC6FF", "#9FE39A"];

/** CTA do fim: cartão que sobe por cima da cena, com selo, chamada e botão */
export const CartaoDeChamada: React.FC<{ chamada?: string }> = ({ chamada }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sobe = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const selo = spring({ frame: frame - 8, fps, config: { damping: 9, stiffness: 150 } });
  const botao = spring({ frame: frame - 26, fps, config: { damping: 11 } });
  const pulsa = 1 + 0.05 * Math.max(0, Math.sin((frame - 30) / 5));
  const contato = marca.instagram || marca.site;
  const explosao = interpolate(frame, [8, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Escurece um pouco a cena para o cartão aparecer */}
      <AbsoluteFill style={{ background: "rgba(43,35,64,0.28)", opacity: sobe }} />
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 1150,
          translate: `0px ${(1 - sobe) * 900}px`,
          background: "#FFFFFF",
          border: `8px solid ${TRACO}`,
          borderRadius: 56,
          boxShadow: SOMBRA,
          padding: "120px 60px 56px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
        }}
      >
        {/* Selo do logo, saindo pela borda de cima, com confete em volta */}
        <div style={{ position: "absolute", top: -110, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative" }}>
            {CONFETES.map((cor, i) => {
              const angulo = (i / CONFETES.length) * Math.PI * 2;
              const raio = 120 + 90 * explosao;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 105 + Math.cos(angulo) * raio - 9,
                    top: 105 + Math.sin(angulo) * raio - 9,
                    width: 18,
                    height: i % 2 ? 18 : 28,
                    borderRadius: 6,
                    background: cor,
                    rotate: `${angulo * 57 + frame * 4}deg`,
                    opacity: explosao * (1 - interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
                  }}
                />
              );
            })}
            <div style={{ scale: String(selo), rotate: `${(1 - selo) * -40}deg` }}>
              <SeloDaMarca tamanho={210} contorno={8} />
            </div>
          </div>
        </div>
        <div style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: 40, color: cores.destaque, letterSpacing: 2, textTransform: "uppercase" }}>{marca.nome}</div>
        <Texto texto={chamada ?? marca.chamada} inicio={14} tamanho={78} cor={TRACO} alinhamento="center" />
        {contato && (
          <div
            style={{
              scale: String(botao * pulsa),
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: cores.destaque,
              color: cores.textoNoDestaque,
              border: `6px solid ${TRACO}`,
              borderRadius: 60,
              padding: "18px 44px",
              fontFamily: fontes.titulo,
              fontWeight: 800,
              fontSize: 48,
              boxShadow: "0 8px 0 rgba(43,35,64,0.25)",
            }}
          >
            <span>{contato}</span>
            <span style={{ fontSize: 52 }}>👆</span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
