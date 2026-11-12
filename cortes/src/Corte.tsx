import React from "react";
import { AbsoluteFill, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Chamada, CHAMADA_SEG, type DadosDaChamada } from "./Chamada";
import { fontFamily } from "./fonte";
import { type Legenda, Legendas } from "./Legendas";

export type PropsDoCorte = {
  /** Caminhos dentro de public/. O cortar já entrega o vídeo no tamanho certo (no "centro", já recortado em pé). */
  video: string;
  /** Só no desfocado: o mesmo trecho pequenininho, para o fundo */
  fundo: string;
  duracaoSeg: number;
  largura: number;
  altura: number;
  gancho: string;
  /** O @ do canal original, pequeno, abaixo do gancho */
  credito: string;
  /** desfocado: o vídeo inteiro no meio, com ele mesmo desfocado no fundo. centro: o vídeo recortado em pé, na tela toda. */
  enquadramento: "desfocado" | "centro";
  legendas: Legenda[];
  /** A chamada do fim (CTA), se o dono ligou. A duracaoSeg já conta os segundos dela. */
  chamada?: DadosDaChamada;
};

const Gancho: React.FC<{ texto: string; credito: string }> = ({ texto, credito }) => {
  const frame = useCurrentFrame();
  const entrada = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "0 70px", opacity: entrada, translate: `0 ${(1 - entrada) * -30}px` }}>
      <div
        style={{
          backgroundColor: "#FFFFFF",
          color: "#0B0B0B",
          fontFamily,
          fontWeight: 900,
          fontSize: 64,
          lineHeight: 1.1,
          textAlign: "center",
          padding: "22px 34px",
          borderRadius: 22,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        {texto}
      </div>
      {credito ? (
        <div style={{ fontFamily, fontWeight: 700, fontSize: 34, color: "rgba(255,255,255,0.9)", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
          {credito}
        </div>
      ) : null}
    </div>
  );
};

export const Corte: React.FC<PropsDoCorte> = (props) => {
  const { fps } = useVideoConfig();
  if (!props.chamada) return <Trecho {...props} />;
  // O trecho, e depois ele congelado (sem som), com o cartão da chamada por cima
  const quadros = Math.max(1, Math.round((props.duracaoSeg - CHAMADA_SEG) * fps));
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={quadros}>
        <Trecho {...props} />
      </Sequence>
      <Sequence from={quadros}>
        <Freeze frame={quadros - 1}>
          <Trecho {...props} legendas={[]} mudo />
        </Freeze>
        <Chamada chamada={props.chamada} />
      </Sequence>
    </AbsoluteFill>
  );
};

const Trecho: React.FC<PropsDoCorte & { mudo?: boolean }> = ({ video, fundo, largura, altura, gancho, credito, enquadramento, legendas, mudo }) => {
  const fonte = staticFile(video);
  if (enquadramento === "centro") {
    return (
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        <OffthreadVideo src={fonte} muted={mudo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <AbsoluteFill style={{ background: "linear-gradient(rgba(0,0,0,0.45), transparent 22%, transparent 60%, rgba(0,0,0,0.35))" }} />
        <AbsoluteFill style={{ top: 170 }}>
          <Gancho texto={gancho} credito={credito} />
        </AbsoluteFill>
        <AbsoluteFill style={{ top: 1180 }}>
          <Legendas legendas={legendas} fonte={fontFamily} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // Desfocado: o vídeo ocupa a largura toda, no meio da tela
  const alturaDoVideo = Math.min(1920, Math.round((1080 * altura) / Math.max(1, largura)));
  const topo = Math.round((1920 - alturaDoVideo) / 2) - 40;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Fundo: o trecho em 136x240, ampliado e desfocado (barato de ler e de desenhar) */}
      <OffthreadVideo
        src={staticFile(fundo)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.55)", scale: "1.15" }}
      />
      <div style={{ position: "absolute", left: 0, top: topo, width: 1080, height: alturaDoVideo }}>
        <OffthreadVideo src={fonte} muted={mudo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <AbsoluteFill style={{ top: Math.max(140, topo - 330) }}>
        <Gancho texto={gancho} credito={credito} />
      </AbsoluteFill>
      <AbsoluteFill style={{ top: Math.min(1400, topo + alturaDoVideo + 60) }}>
        <Legendas legendas={legendas} fonte={fontFamily} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
