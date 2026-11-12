import React from "react";
import { AbsoluteFill, Series, useCurrentFrame } from "remotion";
import { z } from "zod";
import { entrada } from "../nucleo/animacao";
import { cores, fontes } from "../nucleo/marca";
import { EfeitosContexto, Musica, Som } from "../componentes/audio/Som";
import { Foto, Fundo } from "../componentes/base";
import { ChamadaFinal } from "../componentes/cenas/ChamadaFinal";
import { Animacao } from "../componentes/lottie/Animacao";
import { Texto } from "../componentes/texto/Texto";
import { duracaoDoMolde, TEMPOS } from "./tempos";

// Vídeo 9:16 com o que os clientes disseram: aspas grandes, as cinco
// estrelas acendendo, o texto entrando e quem falou → chamada. Só com
// depoimento de verdade, com autorização de quem disse.

export const depoimentoSchema = z.object({
  depoimentos: z
    .array(
      z.object({
        texto: z.string().describe("O que a pessoa disse, curto (até umas 25 palavras)"),
        nome: z.string(),
        detalhe: z.string().optional().describe('Ex.: "cliente desde 2023"'),
        foto: z.string().optional(),
        estrelas: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(3),
  chamada: z.string().optional(),
  musica: z.string().optional(),
  efeitos: z.boolean().default(true),
});

export type Depoimento = z.infer<typeof depoimentoSchema>;

export const depoimentoExemplo: Depoimento = {
  depoimentos: [
    {
      texto: "Encomendei para o aniversário da minha mãe e todo mundo perguntou de onde era.",
      nome: "Carla M.",
      detalhe: "cliente desde 2023",
      estrelas: true,
    },
  ],
  efeitos: true,
};

const Cena: React.FC<{ d: Depoimento["depoimentos"][number] }> = ({ d }) => {
  const frame = useCurrentFrame();
  return (
    <Fundo>
      <AbsoluteFill style={{ justifyContent: "center", padding: 90, gap: 50 }}>
        <div
          style={{
            ...entrada(frame, 0, 14, 30),
            fontFamily: fontes.titulo,
            fontWeight: 800,
            fontSize: 260,
            lineHeight: 0.6,
            height: 140,
            color: cores.destaque,
          }}
        >
          “
        </div>
        {d.estrelas && <Animacao nome="estrelas" em={6} largura={560} />}
        {d.estrelas && <Som tipo="sininho" em={8} volume={0.3} />}
        <Texto texto={d.texto} tamanho={68} alinhamento="left" inicio={16} style={{ fontWeight: 700 }} />
        <div style={{ ...entrada(frame, 50), display: "flex", alignItems: "center", gap: 28 }}>
          {d.foto && <Foto src={d.foto} largura={120} altura={120} zoom={false} style={{ borderRadius: 60 }} />}
          <div>
            <div style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: 52, color: cores.texto }}>{d.nome}</div>
            {d.detalhe && (
              <div style={{ fontFamily: fontes.texto, fontWeight: 500, fontSize: 38, color: cores.textoSuave }}>{d.detalhe}</div>
            )}
          </div>
        </div>
      </AbsoluteFill>
    </Fundo>
  );
};

export const Depoimento: React.FC<Depoimento> = (props) => (
  <AbsoluteFill>
    <EfeitosContexto.Provider value={props.efeitos}>
      <Series>
        {props.depoimentos.map((d, i) => (
          <Series.Sequence key={i} durationInFrames={TEMPOS.depoimento}>
            {i > 0 && <Som tipo="transicao" em={0} />}
            <Cena d={d} />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={TEMPOS.chamada}>
          <Som tipo="sucesso" em={4} />
          <ChamadaFinal chamada={props.chamada} />
        </Series.Sequence>
      </Series>
    </EfeitosContexto.Provider>
    {props.musica && <Musica src={props.musica} total={duracaoDoMolde("Depoimento", props)} />}
  </AbsoluteFill>
);
