import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "./fonte";
export { CHAMADA_SEG } from "./tempos";

// A chamada (CTA) do fim de cada corte, que o dono monta na tela Cortes do
// Postaí: o vídeo congela no último quadro, escurece, e sobe um cartão com o
// logo da marca (se tiver), a frase e um botão que pulsa ("Link na bio 👆").
// Nunca é a marca do Postaí: é a do próprio dono, e só se ele ligar.

export type DadosDaChamada = {
  texto: string;
  botao: string;
  nome: string;
  /** Cor do botão e do selo sem logo */
  cor: string;
  corDoTexto: string;
  /** Caminho dentro de public/, se o dono mandou o logo */
  logo?: string;
};

const TINTA = "#16131F";
const CONFETES = ["#FFD84D", "#FF7096", "#7CC6FF", "#9FE39A", "#CDB4FF", "#FF9F1C", "#FFD84D", "#FF7096", "#7CC6FF", "#9FE39A"];

const Selo: React.FC<{ chamada: DadosDaChamada; tamanho: number }> = ({ chamada, tamanho }) => (
  <div
    style={{
      width: tamanho,
      height: tamanho,
      borderRadius: tamanho,
      background: chamada.logo ? "#FFFFFF" : chamada.cor,
      border: `8px solid ${TINTA}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
    }}
  >
    {chamada.logo ? (
      <Img src={staticFile(chamada.logo)} style={{ width: "74%", height: "74%", objectFit: "contain" }} />
    ) : (
      <span style={{ fontFamily, fontWeight: 900, fontSize: tamanho * 0.48, color: chamada.corDoTexto }}>
        {(chamada.nome || chamada.texto).slice(0, 1).toUpperCase()}
      </span>
    )}
  </div>
);

export const Chamada: React.FC<{ chamada: DadosDaChamada }> = ({ chamada }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const escurece = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const sobe = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const selo = spring({ frame: frame - 8, fps, config: { damping: 9, stiffness: 150 } });
  const entraBotao = spring({ frame: frame - 24, fps, config: { damping: 11 } });
  const pulsa = 1 + 0.05 * Math.max(0, Math.sin((frame - 30) / 5));
  const explosao = interpolate(frame, [8, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const somemConfetes = interpolate(frame, [40, 60], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tamanhoDoTexto = chamada.texto.length > 50 ? 62 : 74;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(10,8,18,0.55)", opacity: escurece }} />
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 760,
          translate: `0px ${(1 - sobe) * 1100}px`,
          background: "#FFFFFF",
          border: `8px solid ${TINTA}`,
          borderRadius: 56,
          boxShadow: "0 18px 0 rgba(0,0,0,0.25)",
          padding: "130px 56px 60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 36,
        }}
      >
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
                    opacity: explosao * somemConfetes,
                  }}
                />
              );
            })}
            <div style={{ scale: String(selo), rotate: `${(1 - selo) * -40}deg` }}>
              <Selo chamada={chamada} tamanho={210} />
            </div>
          </div>
        </div>
        {chamada.nome ? (
          <div style={{ fontFamily, fontWeight: 800, fontSize: 36, color: TINTA, opacity: 0.6, letterSpacing: 1 }}>{chamada.nome}</div>
        ) : null}
        <div style={{ fontFamily, fontWeight: 900, fontSize: tamanhoDoTexto, lineHeight: 1.12, color: TINTA, textAlign: "center" }}>
          {chamada.texto}
        </div>
        {chamada.botao ? (
          <div
            style={{
              scale: String(entraBotao * pulsa),
              background: chamada.cor,
              color: chamada.corDoTexto,
              border: `6px solid ${TINTA}`,
              borderRadius: 60,
              padding: "18px 46px",
              fontFamily,
              fontWeight: 900,
              fontSize: 50,
              boxShadow: "0 8px 0 rgba(0,0,0,0.25)",
            }}
          >
            {chamada.botao}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
