import React from "react";
import { AbsoluteFill, interpolate, Series, useCurrentFrame } from "remotion";
import { z } from "zod";
import { suave } from "../nucleo/animacao";
import { cores, fontes } from "../nucleo/marca";
import { EfeitosContexto, Musica, Som } from "../componentes/audio/Som";
import { arquivo, Fundo, Selo } from "../componentes/base";
import { ChamadaFinal } from "../componentes/cenas/ChamadaFinal";
import { Flash } from "../componentes/efeitos/Flash";
import { Texto } from "../componentes/texto/Texto";
import { Img } from "remotion";
import { duracaoDoMolde, TEMPOS } from "./tempos";

// Vídeo 9:16 de transformação: gancho → a foto "antes", uma cortina passa e
// revela a "depois" com um clarão → chamada. Serve para reforma, cabelo,
// limpeza, organização, antes e depois de produto.

export const antesDepoisSchema = z.object({
  gancho: z.string(),
  destaqueGancho: z.string().optional(),
  antes: z.object({ foto: z.string(), texto: z.string().optional() }),
  depois: z.object({ foto: z.string(), texto: z.string().optional() }),
  chamada: z.string().optional(),
  musica: z.string().optional(),
  efeitos: z.boolean().default(true),
});

export type AntesDepois = z.infer<typeof antesDepoisSchema>;

export const antesDepoisExemplo: AntesDepois = {
  gancho: "O que 2 horas de faxina fazem",
  destaqueGancho: "2 horas",
  antes: { foto: "exemplos/antes.svg", texto: "Antes" },
  depois: { foto: "exemplos/depois.svg", texto: "Depois" },
  efeitos: true,
};

const CORTINA = 70;

const Revelacao: React.FC<{ antes: AntesDepois["antes"]; depois: AntesDepois["depois"] }> = ({ antes, depois }) => {
  const frame = useCurrentFrame();
  const corte = interpolate(frame, [CORTINA - 22, CORTINA], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: suave,
  });
  const zoomAntes = interpolate(frame, [0, CORTINA], [1, 1.06], { extrapolateRight: "clamp" });
  const zoomDepois = interpolate(frame, [CORTINA, CORTINA + 90], [1.1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  const selo = (texto: string, mostrar: boolean) => (
    <Selo texto={texto} tamanho={64} style={{ position: "absolute", top: 120, left: 70, opacity: mostrar ? 1 : 0 }} />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: cores.texto }}>
      <AbsoluteFill>
        <Img src={arquivo(antes.foto)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: String(zoomAntes) }} />
      </AbsoluteFill>
      {selo(antes.texto ?? "Antes", frame < CORTINA)}
      <AbsoluteFill style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }}>
        <Img src={arquivo(depois.foto)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: String(zoomDepois) }} />
      </AbsoluteFill>
      {corte > 0 && corte < 100 && (
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${corte}%`, width: 14, marginLeft: -7, background: cores.destaque, boxShadow: "0 0 40px rgba(0,0,0,0.4)" }} />
      )}
      {selo(depois.texto ?? "Depois", frame >= CORTINA)}
      <Som tipo="transicao" em={CORTINA - 22} />
      <Som tipo="sucesso" em={CORTINA} />
      <Flash em={CORTINA} />
      <div
        style={{
          position: "absolute",
          bottom: 110,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: fontes.titulo,
          fontWeight: 800,
          fontSize: 54,
          color: "#fff",
          textShadow: "0 4px 24px rgba(0,0,0,0.5)",
          opacity: interpolate(frame, [CORTINA - 26, CORTINA - 22], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Espera para ver →
      </div>
    </AbsoluteFill>
  );
};

export const AntesDepois: React.FC<AntesDepois> = (props) => (
  <AbsoluteFill>
    <EfeitosContexto.Provider value={props.efeitos}>
      <Series>
        <Series.Sequence durationInFrames={TEMPOS.gancho}>
          <Som tipo="impacto" em={0} volume={0.4} />
          <Fundo>
            <AbsoluteFill style={{ justifyContent: "center", padding: 90 }}>
              <Texto texto={props.gancho} destaque={props.destaqueGancho} tamanho={120} />
            </AbsoluteFill>
          </Fundo>
        </Series.Sequence>
        <Series.Sequence durationInFrames={TEMPOS.antesDepois}>
          <Revelacao antes={props.antes} depois={props.depois} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={TEMPOS.chamada}>
          <ChamadaFinal chamada={props.chamada} />
        </Series.Sequence>
      </Series>
    </EfeitosContexto.Provider>
    {props.musica && <Musica src={props.musica} total={duracaoDoMolde("AntesDepois", props)} />}
  </AbsoluteFill>
);
