import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Series,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { entrada, pulo } from "../nucleo/animacao";
import { Foto, Fundo, Selo } from "../componentes/base";
import { ChamadaFinal } from "../componentes/cenas/ChamadaFinal";
import { Texto } from "../componentes/texto/Texto";
import { cores, fontes } from "../nucleo/marca";
import { EfeitosContexto, Musica, Som } from "../componentes/audio/Som";
import { duracaoDoMolde, TEMPOS } from "./tempos";

// Vídeo 9:16 de um produto: gancho → foto, nome e preço → até 3 benefícios →
// chamada final com o logo. De 12 a 16 segundos.

export const ofertaSchema = z.object({
  gancho: z.string().describe("Frase do primeiro segundo (a dor ou a vontade)"),
  destaqueGancho: z.string().optional().describe("Trecho do gancho na cor de destaque"),
  produto: z.object({
    nome: z.string(),
    preco: z.string().optional().describe('Ex.: "R$ 12,90". Só se estiver no site.'),
    foto: z.string().describe("Caminho em public/ (ex.: produtos/pao.jpg) ou URL"),
  }),
  beneficios: z.array(z.string()).max(3).default([]),
  chamada: z.string().optional().describe("Sem isso, usa a chamada da marca"),
  musica: z.string().optional().describe("Caminho em public/ de uma música com licença livre"),
  efeitos: z.boolean().default(true).describe("Efeitos sonoros nas trocas de cena"),
});

export type Oferta = z.infer<typeof ofertaSchema>;

export const ofertaExemplo: Oferta = {
  gancho: "Sexta sem pão de queijo quentinho?",
  destaqueGancho: "pão de queijo",
  produto: { nome: "Pão de queijo da casa", preco: "R$ 2,50", foto: "exemplos/produto.svg" },
  beneficios: ["Sai do forno às 7h", "Feito com queijo canastra", "Encomenda de 50 em diante"],
  efeitos: true,
};

const Gancho: React.FC<{ texto: string; destaque?: string }> = ({ texto, destaque }) => (
  <Fundo>
    <AbsoluteFill style={{ justifyContent: "center", padding: 90 }}>
      <Texto texto={texto} destaque={destaque} tamanho={120} />
    </AbsoluteFill>
  </Fundo>
);

const Produto: React.FC<{ produto: Oferta["produto"] }> = ({ produto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const escalaFoto = interpolate(entrada(frame, 0, 20).opacity, [0, 1], [0.9, 1]);
  return (
    <Fundo>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 200, gap: 70 }}>
        <div style={{ ...entrada(frame, 0, 20, 60), scale: String(escalaFoto) }}>
          <Foto src={produto.foto} largura={860} altura={860} />
        </div>
        <Texto texto={produto.nome} inicio={14} tamanho={92} style={{ padding: "0 80px" }} />
        {produto.preco && (
          <div style={{ scale: String(pulo(frame, 34, fps)) }}>
            <Som tipo="moeda" em={34} />
            <Selo texto={produto.preco} tamanho={80} />
          </div>
        )}
      </AbsoluteFill>
    </Fundo>
  );
};

const Beneficios: React.FC<{ itens: string[]; nome: string }> = ({ itens, nome }) => {
  const frame = useCurrentFrame();
  return (
    <Fundo>
      <AbsoluteFill style={{ justifyContent: "center", padding: 90, gap: 64 }}>
        <Texto texto={nome} tamanho={84} alinhamento="left" cor={cores.destaque} />
        {itens.map((item, i) => (
          <div
            key={item}
            style={{ ...entrada(frame, 6 + i * 16, 18, 50), display: "flex", alignItems: "center", gap: 36 }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                flexShrink: 0,
                borderRadius: 50,
                backgroundColor: cores.destaque,
                color: cores.textoNoDestaque,
                display: "grid",
                placeItems: "center",
                fontFamily: fontes.titulo,
                fontWeight: 800,
                fontSize: 56,
              }}
            >
              ✓
            </div>
            <div style={{ fontFamily: fontes.texto, fontWeight: 600, fontSize: 70, lineHeight: 1.15, color: cores.texto }}>
              {item}
            </div>
          </div>
        ))}
      </AbsoluteFill>
    </Fundo>
  );
};

export const Oferta: React.FC<Oferta> = (props) => {
  const total = duracaoDoMolde("Oferta", props);
  return (
    <AbsoluteFill>
      <EfeitosContexto.Provider value={props.efeitos}>
        <Series>
          <Series.Sequence durationInFrames={TEMPOS.gancho}>
            <Som tipo="impacto" em={0} volume={0.4} />
            <Gancho texto={props.gancho} destaque={props.destaqueGancho} />
          </Series.Sequence>
          <Series.Sequence durationInFrames={TEMPOS.produto}>
            <Som tipo="transicao" em={0} />
            <Produto produto={props.produto} />
          </Series.Sequence>
          {props.beneficios.length > 0 && (
            <Series.Sequence durationInFrames={TEMPOS.beneficios}>
              <Som tipo="transicao" em={0} />
              <Beneficios itens={props.beneficios} nome={props.produto.nome} />
            </Series.Sequence>
          )}
          <Series.Sequence durationInFrames={TEMPOS.chamada}>
            <Som tipo="sucesso" em={4} />
            <ChamadaFinal chamada={props.chamada} />
          </Series.Sequence>
        </Series>
      </EfeitosContexto.Provider>
      {props.musica && <Musica src={props.musica} total={total} />}
    </AbsoluteFill>
  );
};
