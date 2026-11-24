import React from "react";
import { Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontes, marca } from "../../nucleo/marca";

// Cartão de notificação do app (o "aviso" que acende no celular): entra de
// cima, com o logo e o nome da marca e uma frase curta. Serve para qualquer
// estilo. No Conversa, o campo "notificacao" da cena.
/** `noFluxo`: entra na coluna do título (embaixo dele), sem posição própria: assim nunca cobre o título nem o cenário */
export const Notificacao: React.FC<{ em: number; texto: string; app?: string; noite?: boolean; noFluxo?: boolean }> = ({ em, texto, app, noite = false, noFluxo = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: frame - em, fps, config: { damping: 14, stiffness: 120 } });
  if (frame < em) return null;
  return (
    <div
      style={{
        ...(noFluxo ? { position: "relative" as const, width: 840 } : { position: "absolute" as const, top: 470, left: 120, right: 120 }),
        translate: `0 ${(1 - entra) * -80}px`,
        opacity: entra,
        background: "#FFF7DD",
        borderRadius: 34,
        padding: "24px 30px",
        display: "flex",
        alignItems: "center",
        gap: 22,
        boxShadow: noite ? "0 0 60px rgba(245,201,74,0.45)" : "0 16px 40px rgba(43,35,64,0.18)",
        fontFamily: fontes.titulo,
        color: "#3A2A05",
      }}
    >
      {marca.logo ? (
        <Img src={marca.logo} style={{ width: 76, height: 76, borderRadius: 18, objectFit: "cover" }} />
      ) : (
        <div style={{ width: 76, height: 76, borderRadius: 18, background: "#F5C94A" }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 34, fontWeight: 800 }}>{app ?? marca.nome}</div>
        <div style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.2 }}>{texto}</div>
      </div>
    </div>
  );
};

/**
 * A hora da cena (ex.: "2:07"), num selo com um reloginho, logo abaixo do título
 * (na coluna dele, com a notificação). 24/11/2026: antes era um texto cinza de 44 px
 * no canto de cima, embaixo das abas do TikTok/Reels, e a crítica não via a hora.
 * O relógio é desenhado (sem emoji: a máquina da nuvem pode não ter a fonte).
 */
export const HoraEmDestaque: React.FC<{ hora: string; noite?: boolean; em: number }> = ({ hora, noite = true, em }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: frame - em, fps, config: { damping: 13, stiffness: 140 } });
  const [h, m] = hora.split(":").map(Number);
  const anguloH = (((h % 12) + (m || 0) / 60) / 12) * 360;
  const anguloM = ((m || 0) / 60) * 360;
  const tinta = noite ? "#F3F0FF" : "#2B2340";
  return (
    <div
      style={{
        alignSelf: "center",
        marginTop: 14,
        scale: String(entra),
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 30px 10px 18px",
        borderRadius: 999,
        background: noite ? "rgba(20,16,40,0.82)" : "rgba(255,255,255,0.92)",
        border: `5px solid ${noite ? "#F5C94A" : "#2B2340"}`,
        fontFamily: fontes.titulo,
        fontWeight: 800,
        fontSize: 58,
        color: tinta,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <svg width={52} height={52} viewBox="0 0 52 52" aria-hidden>
        <circle cx={26} cy={26} r={22} fill="none" stroke={noite ? "#F5C94A" : tinta} strokeWidth={5} />
        <line x1={26} y1={26} x2={26} y2={14} stroke={tinta} strokeWidth={5} strokeLinecap="round" transform={`rotate(${anguloH} 26 26)`} />
        <line x1={26} y1={26} x2={26} y2={9} stroke={tinta} strokeWidth={3.5} strokeLinecap="round" transform={`rotate(${anguloM} 26 26)`} />
      </svg>
      {hora}
    </div>
  );
};
