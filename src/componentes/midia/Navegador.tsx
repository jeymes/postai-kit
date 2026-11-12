import React from "react";
import { useCurrentFrame } from "remotion";
import { progresso } from "../../nucleo/animacao";
import { cores, fontes, marca } from "../../nucleo/marca";

export const ALTURA_BARRA = 64;

/** Janela de navegador com o endereço do site da marca; dentro vai um <Rolagem> */
export const Navegador: React.FC<{
  children: React.ReactNode;
  largura: number;
  altura: number;
  endereco?: string;
  inicio?: number;
}> = ({ children, largura, altura, endereco = marca.site, inicio = 0 }) => {
  const frame = useCurrentFrame();
  const p = progresso(frame, inicio, 22);
  return (
    <div
      style={{
        width: largura,
        height: altura,
        borderRadius: 28,
        overflow: "hidden",
        background: cores.superficie,
        boxShadow: "0 40px 90px -30px rgba(0,0,0,0.45), 0 0 0 2px rgba(0,0,0,0.06)",
        opacity: p,
        translate: `0px ${(1 - p) * 80}px`,
      }}
    >
      <div
        style={{
          height: ALTURA_BARRA,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 24px",
          background: "#f1efec",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((cor) => (
          <span key={cor} style={{ width: 16, height: 16, borderRadius: 8, background: cor }} />
        ))}
        <div
          style={{
            flex: 1,
            marginLeft: 16,
            height: 38,
            borderRadius: 19,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            fontFamily: fontes.texto,
            fontSize: 22,
            color: "#555",
          }}
        >
          🔒 {endereco}
        </div>
      </div>
      <div style={{ height: altura - ALTURA_BARRA, overflow: "hidden" }}>{children}</div>
    </div>
  );
};
