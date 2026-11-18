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

/** A hora no canto de cima (ex.: "2:07"), como num celular de madrugada */
// Fica no alto, acima da caixa do título (como a barra do celular): nunca embaixo dela
export const HoraNoCanto: React.FC<{ hora: string; noite?: boolean }> = ({ hora, noite = true }) => (
  <div style={{ position: "absolute", top: 26, left: 70, fontFamily: fontes.titulo, fontSize: 44, fontWeight: 700, color: noite ? "rgba(220,228,255,0.75)" : "rgba(43,35,64,0.6)" }}>
    {hora}
  </div>
);
