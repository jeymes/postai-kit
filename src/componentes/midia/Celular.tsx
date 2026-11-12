import React from "react";
import { useCurrentFrame } from "remotion";
import { progresso } from "../../nucleo/animacao";
import { cores, fontes } from "../../nucleo/marca";

// Celular com tela (copiado e adaptado do PhoneMockup do Laços). A tela tem o
// tamanho lógico de um iPhone (390×844) e é ampliada por `escala`; dentro dela
// vai qualquer coisa, normalmente um <Rolagem> com o print do site.
export const TELA_LARGURA = 390;
export const TELA_ALTURA = 844;
export const ALTURA_STATUS = 50;
const BORDA = 13;

/** Tamanho final do aparelho na escala pedida */
export const tamanhoDoCelular = (escala: number) => ({
  largura: (TELA_LARGURA + BORDA * 2) * escala,
  altura: (TELA_ALTURA + BORDA * 2) * escala,
});

export const Celular: React.FC<{
  children: React.ReactNode;
  escala?: number;
  /** Quadro em que a entrada começa (sobe e aparece) */
  inicio?: number;
  escuro?: boolean;
  hora?: string;
}> = ({ children, escala = 1.6, inicio = 0, escuro = false, hora = "9:41" }) => {
  const frame = useCurrentFrame();
  const p = progresso(frame, inicio, 24);
  const { largura, altura } = tamanhoDoCelular(escala);
  const corStatus = escuro ? "#fff" : "#000";
  return (
    <div
      style={{
        position: "relative",
        width: largura,
        height: altura,
        opacity: p,
        translate: `0px ${(1 - p) * 120}px`,
        scale: String(0.94 + 0.06 * p),
      }}
    >
      <div
        style={{
          width: TELA_LARGURA + BORDA * 2,
          height: TELA_ALTURA + BORDA * 2,
          scale: String(escala),
          transformOrigin: "0 0",
          position: "relative",
        }}
      >
        {[
          ["left", 150, 30],
          ["left", 200, 56],
          ["left", 266, 56],
          ["right", 220, 88],
        ].map(([lado, top, h]) => (
          <div
            key={`${lado}-${top}`}
            style={{ position: "absolute", top: Number(top), [lado as string]: -3, width: 4, height: Number(h), borderRadius: 2, background: "#292524" }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 60,
            background: "linear-gradient(145deg, #3a3532 0%, #1c1917 40%, #0c0a09 100%)",
            boxShadow: "0 30px 60px -24px rgba(0,0,0,0.5), inset 0 0 0 1.5px #57534e",
            padding: BORDA,
          }}
        >
          <div
            style={{
              position: "relative",
              width: TELA_LARGURA,
              height: TELA_ALTURA,
              borderRadius: 48,
              overflow: "hidden",
              background: escuro ? "#111" : cores.superficie,
              fontFamily: fontes.texto,
            }}
          >
            <div style={{ position: "absolute", inset: `${ALTURA_STATUS}px 0 0 0`, overflow: "hidden" }}>{children}</div>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: ALTURA_STATUS,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 30px 0 44px",
                color: corStatus,
                background: escuro ? "#111" : cores.superficie,
                fontSize: 16.5,
                fontWeight: 600,
              }}
            >
              <span>{hora}</span>
              <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
                <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke={corStatus} opacity="0.35" />
                <rect x="2" y="2" width="16" height="9" rx="2.5" fill={corStatus} />
              </svg>
            </div>
            <div style={{ position: "absolute", top: 11, left: "50%", width: 124, height: 36, marginLeft: -62, borderRadius: 20, background: "#000" }} />
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: "50%",
                width: 134,
                height: 5,
                marginLeft: -67,
                borderRadius: 3,
                background: escuro ? "#fff" : "#000",
                opacity: 0.8,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
