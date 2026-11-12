import React from "react";
import { AbsoluteFill, Series, useCurrentFrame } from "remotion";
import { z } from "zod";
import { entrada } from "../nucleo/animacao";
import { marca } from "../nucleo/marca";
import { EfeitosContexto, Musica, Som } from "../componentes/audio/Som";
import { Fundo, Selo } from "../componentes/base";
import { ChamadaFinal } from "../componentes/cenas/ChamadaFinal";
import { Cartao3D } from "../componentes/3d/Cartao3D";
import { Formas3D } from "../componentes/3d/Formas3D";
import { Palco3D } from "../componentes/3d/Palco3D";
import { Titulo3D } from "../componentes/3d/Titulo3D";
import { Texto } from "../componentes/texto/Texto";
import { duracaoDoMolde, TEMPOS } from "./tempos";

// Vídeo 9:16 em 3D: abre com um título de letras com volume (na fonte da
// marca) e formas flutuando → cada produto num cartão 3D que entra girando,
// com nome e preço → chamada final. A fonte 3D sai do `npm run fonte-3d`
// (o renderizar faz sozinho). Pesa mais que os outros moldes para renderizar.

export const vitrine3dSchema = z.object({
  titulo3d: z
    .string()
    .optional()
    .describe('Letras 3D: curto, até umas 10 letras por linha; "\\n" quebra a linha. Sem isso, o nome da marca'),
  gancho: z.string().describe("Frase embaixo do título"),
  destaqueGancho: z.string().optional(),
  produtos: z
    .array(
      z.object({
        nome: z.string(),
        preco: z.string().optional().describe("Só se estiver no site ou o dono disse"),
        foto: z.string(),
      }),
    )
    .min(1)
    .max(5),
  chamada: z.string().optional(),
  musica: z.string().optional(),
  efeitos: z.boolean().default(true),
});

export type Vitrine3D = z.infer<typeof vitrine3dSchema>;

export const vitrine3dExemplo: Vitrine3D = {
  titulo3d: "Fornada\nnova",
  gancho: "Saiu agora do forno",
  destaqueGancho: "agora",
  produtos: [
    { nome: "Pão de queijo da casa", preco: "R$ 2,50", foto: "exemplos/produto.svg" },
    { nome: "Bolo de fubá", preco: "R$ 38", foto: "exemplos/depois.svg" },
  ],
  efeitos: true,
};

const Abertura: React.FC<{ props: Vitrine3D }> = ({ props }) => (
  <Fundo>
    <Palco3D>
      <Formas3D />
      <Titulo3D texto={props.titulo3d ?? marca.nome} y={0.7} />
    </Palco3D>
    <AbsoluteFill style={{ top: 1260, padding: "0 90px" }}>
      <Texto texto={props.gancho} destaque={props.destaqueGancho} tamanho={76} inicio={14} />
    </AbsoluteFill>
  </Fundo>
);

const Produto: React.FC<{ produto: Vitrine3D["produtos"][number] }> = ({ produto }) => {
  const frame = useCurrentFrame();
  return (
    <Fundo>
      <Palco3D>
        <Formas3D />
        <Cartao3D foto={produto.foto} y={0.75} />
      </Palco3D>
      <AbsoluteFill style={{ top: 1330, alignItems: "center", gap: 28, padding: "0 90px" }}>
        <Texto texto={produto.nome} tamanho={78} inicio={12} />
        {produto.preco && (
          <div style={entrada(frame, 22)}>
            <Selo texto={produto.preco} tamanho={64} style={{ alignSelf: "center" }} />
          </div>
        )}
      </AbsoluteFill>
    </Fundo>
  );
};

export const Vitrine3D: React.FC<Vitrine3D> = (props) => (
  <AbsoluteFill>
    <EfeitosContexto.Provider value={props.efeitos}>
      <Series>
        <Series.Sequence durationInFrames={TEMPOS.abertura3d}>
          <Som tipo="impacto" em={4} volume={0.45} />
          <Abertura props={props} />
        </Series.Sequence>
        {props.produtos.map((produto, i) => (
          <Series.Sequence key={i} durationInFrames={TEMPOS.produto3d}>
            <Som tipo="transicao" em={0} />
            {produto.preco && <Som tipo="moeda" em={24} />}
            <Produto produto={produto} />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={TEMPOS.chamada}>
          <Som tipo="sucesso" em={4} />
          <ChamadaFinal chamada={props.chamada} />
        </Series.Sequence>
      </Series>
    </EfeitosContexto.Provider>
    {props.musica && <Musica src={props.musica} total={duracaoDoMolde("Vitrine3D", props)} />}
  </AbsoluteFill>
);
