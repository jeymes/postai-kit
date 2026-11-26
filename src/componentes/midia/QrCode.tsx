import QRCode from "qrcode";
import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { cores, fontes, marca } from "../../nucleo/marca";

// O contorno do kit (o mesmo TRACO do Boneco; aqui sem importar, para não fazer ciclo com ele)
const TRACO = "#2B2340";

// QR Code que dá para escanear (26/11/2026, pedido da crítica: "o cartão final
// não aceita um QR Code; o produto vende convite com QR Code"). Desenhado em
// SVG com a biblioteca qrcode (MIT, já no kit): módulos escuros num caminho
// só, sem frestas, com a margem branca de 4 módulos que os leitores pedem.
// O QrAnimado (Tutorial) continua igual; este é o QR parado e nítido.

/** O endereço do QR: o do roteiro ou, sem ele, o site da marca (marca.json). Vazio: sem QR */
export function textoDoQr(texto?: string): string {
  const pedido = (texto ?? "").trim();
  if (pedido) return pedido;
  const site = String((marca as { site?: string }).site ?? "").trim();
  if (!site) return "";
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}

/** O QR em si: quadrado branco com a margem; `tamanho` em px na tela */
export const QrCode: React.FC<{ texto: string; tamanho: number; cor?: string; fundo?: string }> = ({ texto, tamanho, cor = "#111111", fundo = "#FFFFFF" }) => {
  const { caminho, lado } = useMemo(() => {
    const qr = QRCode.create(texto, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const margem = 4;
    let d = "";
    for (let y = 0; y < n; y++) {
      // Junta os módulos escuros seguidos da linha num retângulo só
      let x = 0;
      while (x < n) {
        if (!qr.modules.get(y, x)) {
          x++;
          continue;
        }
        const comeco = x;
        while (x < n && qr.modules.get(y, x)) x++;
        d += `M${comeco + margem} ${y + margem}h${x - comeco}v1h${comeco - x}z`;
      }
    }
    return { caminho: d, lado: n + margem * 2 };
  }, [texto]);
  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${lado} ${lado}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      <rect width={lado} height={lado} fill={fundo} />
      <path d={caminho} fill={cor} />
    </svg>
  );
};

export type ComoMostrarOQr = "cartao" | "celular" | "convite";

/**
 * O QR num suporte, entrando com mola: num cartão branco (o do fim), na tela de
 * um celular grande ou num convite de papel. `em`: o quadro em que entra (no
 * relógio de quem chama). A legenda curta vai embaixo (ex.: "Aponte a câmera").
 */
export const PainelDoQr: React.FC<{
  texto: string;
  como?: ComoMostrarOQr;
  legenda?: string;
  /** Nome no convite (ex.: "Bia & Leo") */
  titulo?: string;
  tamanho?: number;
  em?: number;
  style?: React.CSSProperties;
}> = ({ texto, como = "cartao", legenda, titulo, tamanho = 300, em = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: frame - em, fps, config: { damping: 13, stiffness: 140 } });
  if (frame < em) return null;
  // O QR fica reto e parado quando já entrou: girar ou pulsar atrapalha a leitura
  const giro = interpolate(entra, [0, 1], [como === "convite" ? -10 : 6, 0]);
  const base: React.CSSProperties = {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    scale: String(0.6 + 0.4 * entra),
    opacity: Math.min(1, entra * 1.6),
    rotate: `${giro}deg`,
    fontFamily: fontes.titulo,
    color: TRACO,
    ...style,
  };
  const textoDeBaixo = legenda && (
    <div style={{ fontSize: Math.round(tamanho * 0.12), fontWeight: 800, lineHeight: 1.1, textAlign: "center", maxWidth: tamanho + 40 }}>{legenda}</div>
  );
  if (como === "celular") {
    return (
      <div style={{ ...base, background: TRACO, borderRadius: tamanho * 0.16, padding: `${tamanho * 0.16}px ${tamanho * 0.07}px ${tamanho * 0.2}px`, boxShadow: "0 24px 0 rgba(43,35,64,0.18)" }}>
        <div style={{ position: "absolute", top: tamanho * 0.06, width: tamanho * 0.22, height: tamanho * 0.04, borderRadius: 20, background: "#4A4458" }} />
        <div style={{ background: "#FFFFFF", borderRadius: tamanho * 0.06, padding: `${tamanho * 0.06}px ${tamanho * 0.04}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: tamanho * 0.04 }}>
          <QrCode texto={texto} tamanho={tamanho} />
          {textoDeBaixo}
        </div>
      </div>
    );
  }
  if (como === "convite") {
    return (
      <div
        style={{
          ...base,
          background: "#FFFDF7",
          border: `6px solid ${TRACO}`,
          borderRadius: 18,
          padding: `${tamanho * 0.1}px ${tamanho * 0.1}px ${tamanho * 0.08}px`,
          gap: tamanho * 0.05,
          boxShadow: "0 20px 0 rgba(43,35,64,0.16)",
          // A borda dourada de dentro do convite
          outline: `4px solid ${cores.destaque}`,
          outlineOffset: -18,
        }}
      >
        {titulo && <div style={{ fontSize: Math.round(tamanho * 0.14), fontWeight: 800, lineHeight: 1.05, textAlign: "center", maxWidth: tamanho }}>{titulo}</div>}
        <QrCode texto={texto} tamanho={tamanho} />
        {textoDeBaixo}
      </div>
    );
  }
  return (
    <div
      style={{
        ...base,
        background: "#FFFFFF",
        border: `7px solid ${TRACO}`,
        borderRadius: 40,
        padding: tamanho * 0.07,
        gap: tamanho * 0.04,
        boxShadow: "0 22px 0 rgba(43,35,64,0.15)",
      }}
    >
      <QrCode texto={texto} tamanho={tamanho} />
      {textoDeBaixo}
    </div>
  );
};
