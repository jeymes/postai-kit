import React from "react";
import { AbsoluteFill, Img, interpolate, Series, useCurrentFrame } from "remotion";
import { z } from "zod";
import { cores, fontes } from "../nucleo/marca";
import { EfeitosContexto, Musica } from "../componentes/audio/Som";
import { arquivo } from "../componentes/base";
import { ChamadaFinal } from "../componentes/cenas/ChamadaFinal";
import { Flash } from "../componentes/efeitos/Flash";
import { Texto } from "../componentes/texto/Texto";
import { duracaoDoMolde, quadrosPorBatida, TEMPOS } from "./tempos";

// Vídeo 9:16 no estilo trend: cortes secos na batida da música, zoom que
// pulsa a cada batida, clarão em cada troca e câmera tremendo de leve. A
// música padrão (trilhas/batida-129bpm.mp3) foi feita por código no Laços:
// pode usar sem crédito. Com outra música, informe o bpm dela.

export const trendSchema = z.object({
  cenas: z
    .array(
      z.object({
        texto: z.string().optional().describe("Frase curta, de impacto"),
        destaque: z.string().optional(),
        foto: z.string().optional().describe("Foto em tela cheia por trás do texto"),
        fundo: z.enum(["marca", "destaque", "escuro"]).default("marca"),
      }),
    )
    .min(3)
    .max(14),
  batidasPorCena: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(2),
  bpm: z.number().default(129.2),
  musica: z.string().default("trilhas/batida-129bpm.mp3"),
  chamada: z.string().optional(),
  efeitos: z.boolean().default(true),
});

export type Trend = z.infer<typeof trendSchema>;

export const trendExemplo: Trend = {
  cenas: [
    { texto: "Sexta-feira.", fundo: "escuro" },
    { texto: "Café passado.", fundo: "marca" },
    { texto: "Pão de queijo saindo.", destaque: "Pão de queijo", foto: "exemplos/produto.svg", fundo: "marca" },
    { texto: "E você ainda não pediu?", fundo: "destaque" },
    { texto: "Corre.", fundo: "escuro" },
  ],
  batidasPorCena: 2,
  bpm: 129.2,
  musica: "trilhas/batida-129bpm.mp3",
  efeitos: true,
};

const FUNDOS = {
  marca: { fundo: cores.fundo, texto: cores.texto, destaque: cores.destaque },
  destaque: { fundo: cores.destaque, texto: cores.textoNoDestaque, destaque: cores.texto },
  escuro: { fundo: "#111", texto: "#fff", destaque: cores.destaque },
};

const Cena: React.FC<{ cena: Trend["cenas"][number]; batida: number; indice: number }> = ({ cena, batida, indice }) => {
  const frame = useCurrentFrame();
  const estilo = FUNDOS[cena.fundo];
  // Zoom seco no corte e um pulso em cada batida
  const naBatida = frame % batida;
  const pulso = interpolate(naBatida, [0, 3, batida], [1.06, 1.0, 1.0], { extrapolateRight: "clamp" });
  const entrada = interpolate(frame, [0, 4], [1.18, 1], { extrapolateRight: "clamp" });
  // Câmera na mão: tremida pequena e determinística
  const tx = Math.sin((frame + indice * 13) * 0.9) * 4;
  const ty = Math.cos((frame + indice * 7) * 1.1) * 4;
  return (
    <AbsoluteFill style={{ backgroundColor: estilo.fundo, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: String(pulso * entrada), translate: `${tx}px ${ty}px` }}>
        {cena.foto && (
          <AbsoluteFill>
            <Img src={arquivo(cena.foto)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)" }} />
          </AbsoluteFill>
        )}
        {cena.texto && (
          <AbsoluteFill style={{ justifyContent: cena.foto ? "flex-end" : "center", padding: 90, paddingBottom: cena.foto ? 200 : 90 }}>
            <Texto
              texto={cena.texto}
              destaque={cena.destaque}
              tamanho={128}
              cor={cena.foto ? "#fff" : estilo.texto}
              corDestaque={estilo.destaque}
              inicio={-30}
              style={{ fontFamily: fontes.titulo }}
            />
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      <Flash em={0} duracao={5} />
    </AbsoluteFill>
  );
};

export const Trend: React.FC<Trend> = (props) => {
  const batida = quadrosPorBatida(props.bpm);
  const cena = Math.round(batida * props.batidasPorCena);
  return (
    <AbsoluteFill>
      <EfeitosContexto.Provider value={props.efeitos}>
        <Series>
          {props.cenas.map((c, i) => (
            <Series.Sequence key={i} durationInFrames={cena}>
              <Cena cena={c} batida={batida} indice={i} />
            </Series.Sequence>
          ))}
          <Series.Sequence durationInFrames={TEMPOS.chamada}>
            <ChamadaFinal chamada={props.chamada} />
          </Series.Sequence>
        </Series>
      </EfeitosContexto.Provider>
      <Musica src={props.musica} total={duracaoDoMolde("Trend", props)} volume={0.9} />
    </AbsoluteFill>
  );
};
