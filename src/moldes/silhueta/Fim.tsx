// Silhueta: o cartão do fim no mesmo visual do vídeo (2ª rodada, 28/11/2026).
// No lugar do cartão branco do kit: a última paisagem escurece, o logo pequeno
// num anel dourado, o nome da marca em versal, a chamada grande em serifa clara,
// um fio dourado e o botão discreto (contorno dourado). Tudo acima de 1540 px
// (embaixo ficam os botões do app). A regra do fim do kit continua: o
// renderizar tira este cartão quando o dono escolheu só a vinheta ou a luz.

import React from "react";
import { Easing, Img, interpolate, useCurrentFrame } from "remotion";
import { marca } from "../../nucleo/marca";
import type { CoresDaCena } from "./cores";
import { SERIFA, Versal } from "./Textos";

const entra = (t: number, de: number, d = 16) => interpolate(t, [de, de + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

export const FimDaSilhueta: React.FC<{ chamada: string; botao: string; cores: Pick<CoresDaCena, "ouroDaLegenda"> }> = ({ chamada, botao, cores }) => {
  const t = useCurrentFrame();
  const ouro = cores.ouroDaLegenda;
  const tamanho = chamada.length > 60 ? 64 : chamada.length > 38 ? 72 : 82;
  const sobe = (de: number): React.CSSProperties => ({ opacity: entra(t, de), transform: `translateY(${(1 - entra(t, de)) * 24}px)` });
  const inicial = (marca.nome || "?").trim().charAt(0).toUpperCase();
  // O botão respira de leve (chama o olho sem gritar)
  const pulso = 1 + 0.025 * Math.sin(Math.max(0, t - 40) / 7);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* A paisagem escurece por baixo (fica a lembrança do último quadro) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: entra(t, 0, 20),
          background: "radial-gradient(ellipse 80% 55% at 50% 52%, rgba(8,6,4,0.72) 0%, rgba(8,6,4,0.86) 60%, rgba(8,6,4,0.94) 100%)",
        }}
      />
      <div style={{ position: "absolute", top: 520, left: 90, right: 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
        <div style={{ ...sobe(4), width: 132, height: 132, borderRadius: "50%", border: `3px solid ${ouro}`, padding: 8, boxShadow: `0 0 40px ${ouro}40` }}>
          {marca.logo ? (
            <Img src={marca.logo} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIFA, fontWeight: 700, fontSize: 64, color: ouro, background: "rgba(255,255,255,0.04)" }}>
              {inicial}
            </div>
          )}
        </div>
        <div style={sobe(10)}>
          <Versal texto={marca.nome} cor="#E9DFC9" fio={ouro} tamanho={28} />
        </div>
        <div style={{ ...sobe(16), fontFamily: SERIFA, fontWeight: 600, fontSize: tamanho, lineHeight: 1.08, color: "#FBF4E6", textAlign: "center", textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}>{chamada}</div>
        <div style={{ width: 220 * entra(t, 24, 20), height: 2, background: ouro }} />
        <div
          style={{
            ...sobe(30),
            transform: `${sobe(30).transform} scale(${pulso})`,
            border: `2px solid ${ouro}`,
            borderRadius: 60,
            padding: "16px 44px",
            fontFamily: SERIFA,
            fontWeight: 700,
            fontSize: 42,
            letterSpacing: "0.04em",
            color: ouro,
            background: "rgba(0,0,0,0.25)",
          }}
        >
          {botao}
        </div>
      </div>
    </div>
  );
};
