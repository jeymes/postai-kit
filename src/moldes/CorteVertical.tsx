import React from "react";
import { AbsoluteFill, interpolate, Series, Sequence, useCurrentFrame } from "remotion";
import { z } from "zod";
import { Legendas } from "../componentes/texto/Legendas";
import { Documentario, documentarioSchema, documentarioExemplo } from "./Documentario";
import { duracaoDoMolde, QUADROS_DO_FIM_DO_CORTE, quadrosDaFala, TEMPOS } from "./tempos";
import { useConferirTexto } from "../componentes/conferir";

// Short do vídeo longo do Canal dark (23/11/2026): um trecho de cenas seguidas
// do Documentario (já narradas: a voz é reaproveitada) em pé, 1080x1920. No
// alto, o gancho escrito; no meio, o próprio vídeo deitado, no estilo do canal;
// embaixo, a legenda grande, acima da faixa dos botões do app (y < 1530); no
// fim, "Vídeo completo no canal". Ideia de pacotes abertos de criadores
// (youtube-agent-skill e creator-skills, MIT): achar os shorts escondidos no
// vídeo longo. Monte com npm run corte-vertical.

export const corteVerticalSchema = documentarioSchema.extend({
  titulo: z.string().max(70).describe("O gancho escrito no alto do short (curto, até ~50 letras)"),
  fim: z.string().max(60).default("Vídeo completo no canal").describe("O texto do fim (na língua do canal)"),
});
export type CorteVertical = z.infer<typeof corteVerticalSchema>;

export const corteVerticalExemplo: CorteVertical = {
  ...documentarioExemplo,
  cenas: documentarioExemplo.cenas.slice(0, 3).map((cena) => ({ ...cena, capitulo: undefined })),
  encerramento: undefined,
  titulo: "A cidade que virou capital do dia para a noite",
  fim: "Vídeo completo no canal",
};

const TOPO_DO_VIDEO = 560;
const ESCALA = 1080 / 1920;

export const CorteVertical: React.FC<CorteVertical> = (props) => {
  const frame = useCurrentFrame();
  const total = duracaoDoMolde("CorteVertical", props);
  const inicioDoFim = total - QUADROS_DO_FIM_DO_CORTE;
  // O vídeo deitado sem legenda (ela vem grande embaixo), sem capítulo nem encerramento
  const deitado = {
    ...props,
    legendas: false,
    encerramento: undefined,
    cenas: props.cenas.map((cena) => ({ ...cena, capitulo: undefined })),
  };
  const entrada = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const medida = useConferirTexto<HTMLDivElement>("titulo");
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1d1b22 0%, #08080b 70%)" }}>
      {/* O gancho no alto (abaixo da faixa de cima do app) */}
      <div
        ref={medida}
        style={{
          position: "absolute",
          top: 190,
          left: 60,
          right: 60,
          height: 330,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "#fff",
          fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
          fontWeight: 900,
          fontSize: props.titulo.length > 40 ? 64 : 76,
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          textShadow: "0 4px 18px rgba(0,0,0,0.6)",
          opacity: entrada,
          translate: `0 ${(1 - entrada) * 20}px`,
        }}
      >
        {props.titulo}
      </div>
      {/* O vídeo do canal, deitado, no meio */}
      <div
        style={{
          position: "absolute",
          top: TOPO_DO_VIDEO,
          left: 0,
          width: 1920,
          height: 1080,
          transform: `scale(${ESCALA})`,
          transformOrigin: "0 0",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        <Documentario {...deitado} />
      </div>
      {/* A legenda grande, cena a cena, no mesmo tempo da voz */}
      <Series>
        {props.cenas.map((cena, i) => (
          <Series.Sequence key={i} durationInFrames={quadrosDaFala(cena)} layout="none">
            {cena.narracao && (
              <Legendas
                legendas={cena.narracao.legendas}
                atraso={TEMPOS.antesDaFala}
                tamanho={74}
                noite
                largura={960}
                style={{ top: TOPO_DO_VIDEO + 1080 * ESCALA + 60, padding: "0 60px" }}
              />
            )}
          </Series.Sequence>
        ))}
      </Series>
      {/* O fim: chama para o vídeo completo */}
      <Sequence from={inicioDoFim} durationInFrames={QUADROS_DO_FIM_DO_CORTE} layout="none">
        <FimDoCorte texto={props.fim} chamada={props.chamadaFinal} />
      </Sequence>
    </AbsoluteFill>
  );
};

const FimDoCorte: React.FC<{ texto: string; chamada?: string }> = ({ texto, chamada }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(8,8,11,${0.85 * p})`, alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: p, scale: String(0.94 + 0.06 * p), textAlign: "center", padding: "0 90px", marginTop: -200 }}>
        <div style={{ color: "#fff", fontFamily: "Inter, Arial, sans-serif", fontWeight: 900, fontSize: 78, lineHeight: 1.1 }}>{texto}</div>
        {chamada && (
          <div style={{ marginTop: 34, color: "#F5C94A", fontFamily: "Inter, Arial, sans-serif", fontWeight: 700, fontSize: 46, lineHeight: 1.2 }}>{chamada}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};
