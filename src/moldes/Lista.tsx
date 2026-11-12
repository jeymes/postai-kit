import React from "react";
import { AbsoluteFill, Series, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { entrada, pulo } from "../nucleo/animacao";
import { Foto, Fundo } from "../componentes/base";
import { ChamadaFinal } from "../componentes/cenas/ChamadaFinal";
import { Texto } from "../componentes/texto/Texto";
import { cores, fontes } from "../nucleo/marca";
import { EfeitosContexto, Musica, Som } from "../componentes/audio/Som";
import { duracaoDoMolde, TEMPOS } from "./tempos";

// Vídeo 9:16 de dicas ou lista ("3 erros ao...", "5 sabores que..."): gancho →
// um item por cena, com número grande e foto opcional → chamada final.

export const listaSchema = z.object({
  gancho: z.string(),
  destaqueGancho: z.string().optional(),
  itens: z
    .array(
      z.object({
        titulo: z.string().describe("Curto: até umas 6 palavras"),
        texto: z.string().optional().describe("Uma frase de apoio"),
        foto: z.string().optional(),
      }),
    )
    .min(2)
    .max(7),
  chamada: z.string().optional(),
  musica: z.string().optional(),
  efeitos: z.boolean().default(true),
});

export type Lista = z.infer<typeof listaSchema>;

export const listaExemplo: Lista = {
  gancho: "3 erros que deixam o bolo solado",
  destaqueGancho: "bolo solado",
  itens: [
    { titulo: "Abrir o forno cedo", texto: "Espere pelo menos 25 minutos." },
    { titulo: "Ovo direto da geladeira", texto: "Tire 30 minutos antes." },
    { titulo: "Bater demais a farinha", texto: "Misture só até sumir.", foto: "exemplos/produto.svg" },
  ],
  efeitos: true,
};

const Item: React.FC<{ numero: number; item: Lista["itens"][number] }> = ({ numero, item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Fundo>
      <AbsoluteFill style={{ padding: 100, paddingTop: item.foto ? 160 : 0, justifyContent: item.foto ? "flex-start" : "center", gap: 48 }}>
        <div
          style={{
            scale: String(pulo(frame, 0, fps)),
            transformOrigin: "left center",
            fontFamily: fontes.titulo,
            fontWeight: 800,
            fontSize: 220,
            lineHeight: 1,
            color: cores.destaque,
          }}
        >
          {numero}
        </div>
        <Texto texto={item.titulo} inicio={8} tamanho={100} alinhamento="left" />
        {item.texto && (
          <Texto texto={item.texto} variante="apoio" inicio={20} tamanho={52} alinhamento="left" cor={cores.textoSuave} />
        )}
        {item.foto && (
          <div style={entrada(frame, 26, 20, 60)}>
            <Foto src={item.foto} largura={880} altura={700} />
          </div>
        )}
      </AbsoluteFill>
    </Fundo>
  );
};

export const Lista: React.FC<Lista> = (props) => (
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
        {props.itens.map((item, i) => (
          <Series.Sequence key={i} durationInFrames={TEMPOS.item}>
            <Som tipo="transicao" em={0} />
            <Item numero={i + 1} item={item} />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={TEMPOS.chamada}>
          <Som tipo="sucesso" em={4} />
          <ChamadaFinal chamada={props.chamada} />
        </Series.Sequence>
      </Series>
    </EfeitosContexto.Provider>
    {props.musica && <Musica src={props.musica} total={duracaoDoMolde("Lista", props)} />}
  </AbsoluteFill>
);
