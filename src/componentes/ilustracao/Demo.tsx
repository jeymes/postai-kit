// Ilustração da fala: a composição de teste (Root > Testes > IlustracaoDemo).
// Uma cena de verdade do estilo pedido (cenário, as duas personagens, a
// legenda) com uma fala atrás da outra e, em cada uma, um tipo de ilustração.
// parte "tipos": os 9 tipos; parte "graficos": os 9 gráficos no cartão em pé.
//   npx remotion still IlustracaoDemo out/x.jpg --frame=120 --props='{"modelo":"palito","fundo":"claro"}'

import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { z } from "zod";
import { Atelie } from "../cenarios/Atelie";
import { ELENCO } from "../personagens/elenco";
import type { Visual } from "../personagens/Boneco";
import { Legendas } from "../texto/Legendas";
import { estiloDe, MODELOS } from "../../estilos/registro";
import { fontes } from "../../nucleo/marca";
import { CamadaDaFala } from "./CamadaDaFala";
import type { Ilustracao } from "./schema";
import { palavrasEstimadas, ritmoDoRoteiro, type PalavraNoTempo } from "./tempo";

export const ilustracaoDemoSchema = z.object({
  modelo: z.enum([...MODELOS, "3d"]).default("chapado"),
  fundo: z.enum(["claro", "noite"]).default("claro"),
  parte: z.enum(["tipos", "graficos"]).default("tipos"),
});
export type PropsDaDemo = z.infer<typeof ilustracaoDemoSchema>;

type FalaDaDemo = { quem?: "noiva" | "organizadora"; fala: string; ilustra: Ilustracao[] };

const TIPOS: FalaDaDemo[] = [
  { quem: "noiva", fala: "Eu ganho três mil e quinhentos reais por mês.", ilustra: [{ tipo: "numero", valor: 3500, prefixo: "R$", rotulo: "por mês", em: "três" }] },
  {
    fala: "Se ela guardar dez por cento, sobram trezentos e cinquenta todo mês.",
    ilustra: [{ tipo: "conta", em: "guardar", passos: ["R$ 3.500 × 10%", { texto: "= R$ 350 por mês", em: "trezentos" }] }],
  },
  {
    quem: "organizadora",
    fala: "Casa, carro e celular: as contas que mais pesam.",
    ilustra: [
      {
        tipo: "icone",
        em: "casa",
        icones: [
          { icone: "casa", rotulo: "Casa", em: "casa" },
          { icone: "carro", rotulo: "Carro", em: "carro" },
          { icone: "celular", rotulo: "Celular", em: "celular" },
        ],
      },
      { tipo: "texto", texto: "Pesam!", forma: "marcador", em: "pesam", lugar: "baixo" },
    ],
  },
  {
    fala: "Esse é o erro que quase todo mundo comete no cartão.",
    ilustra: [
      { tipo: "texto", texto: "Erro!", forma: "carimbo", em: "erro" },
      { tipo: "seta", ponto: { x: 71, y: 61 }, de: "direita", rotulo: "cartão", em: "cartão" },
    ],
  },
  {
    quem: "noiva",
    fala: "E eu fiquei pensando: será que dá para viajar este ano?",
    ilustra: [
      { tipo: "pensamento", quem: "noiva", icone: "planeta", em: "pensando" },
      { tipo: "circulo", ponto: { x: 29.5, y: 53 }, raio: 15, em: "viajar" },
    ],
  },
  {
    fala: "O bolo do casamento custou mais que o vestido!",
    ilustra: [
      { tipo: "objeto", objeto: "bolo", rotulo: "Bolo", em: "bolo", lugar: "esquerda" },
      { tipo: "objeto", objeto: "vestido-de-noiva", rotulo: "Vestido", em: "vestido", lugar: "direita" },
    ],
  },
  {
    quem: "organizadora",
    fala: "Guardar um pouco todo mês é o que faz a diferença.",
    ilustra: [
      { tipo: "icone", icone: "cofre", rotulo: "Todo mês", em: "guardar" },
      { tipo: "texto", texto: "Faz a diferença", destaque: "diferença", em: "diferença" },
    ],
  },
  {
    fala: "Em dez anos, os juros compostos quase dobram o que você guardou.",
    ilustra: [
      {
        tipo: "grafico",
        em: "juros",
        grafico: {
          tipo: "linha",
          titulo: "R$ 1.000 a 7% ao ano",
          unidade: "R$",
          fonte: "Exemplo de cálculo",
          pontos: Array.from({ length: 11 }, (_, i) => ({ x: i === 0 ? "hoje" : `${i}º ano`, y: Math.round(1000 * 1.07 ** i) })),
        },
      },
    ],
  },
];

const GRAFICOS: FalaDaDemo[] = [
  { fala: "Hoje a dívida média é de quatro mil reais.", ilustra: [{ tipo: "grafico", em: "dívida", grafico: { tipo: "numero", valor: 4120, prefixo: "R$", rotulo: "dívida média por família", icone: "cartao", fonte: "Exemplo" } }] },
  {
    fala: "O que mais pesa no mês é o aluguel.",
    ilustra: [
      {
        tipo: "grafico",
        em: "pesa",
        grafico: {
          tipo: "barras",
          titulo: "Gasto por mês",
          unidade: "R$",
          itens: [
            { rotulo: "Aluguel", valor: 1400, destaque: true },
            { rotulo: "Mercado", valor: 900 },
            { rotulo: "Lazer", valor: 450 },
            { rotulo: "Luz", valor: 220 },
          ],
        },
      },
    ],
  },
  {
    fala: "Em cada ranking, o cartão aparece na frente.",
    ilustra: [
      {
        tipo: "grafico",
        em: "ranking",
        grafico: {
          tipo: "barras",
          titulo: "Onde as famílias devem",
          unidade: "%",
          horizontal: true,
          fonte: "Exemplo",
          itens: [
            { rotulo: "Cartão", valor: 86.2, destaque: true },
            { rotulo: "Carnê", valor: 16.1 },
            { rotulo: "Financiamento", valor: 9.3 },
            { rotulo: "Pessoal", valor: 8.7 },
            { rotulo: "Consignado", valor: 5.2 },
          ],
        },
      },
    ],
  },
  {
    fala: "Quase metade do salário vai para a casa.",
    ilustra: [
      {
        tipo: "grafico",
        em: "metade",
        grafico: {
          tipo: "pizza",
          titulo: "Para onde vai o salário",
          partes: [
            { rotulo: "Casa", valor: 45, destaque: true },
            { rotulo: "Comida", valor: 25 },
            { rotulo: "Transporte", valor: 15 },
            { rotulo: "Outros", valor: 15 },
          ],
        },
      },
    ],
  },
  { fala: "Sete em cada dez brasileiros estão endividados.", ilustra: [{ tipo: "grafico", em: "sete", grafico: { tipo: "unidades", total: 10, marcados: 7, icone: "pessoa", rotulo: "estão endividados" } }] },
  {
    fala: "Guardar ou gastar? Veja a diferença em um ano.",
    ilustra: [{ tipo: "grafico", em: "guardar", grafico: { tipo: "comparacao", titulo: "Em 1 ano", unidade: "R$", a: { rotulo: "Gastando", valor: 0, icone: "carrinho" }, b: { rotulo: "Guardando", valor: 4200, icone: "cofre" } } }],
  },
  {
    fala: "Do primeiro salário até a casa própria foram quinze anos.",
    ilustra: [
      {
        tipo: "grafico",
        em: "primeiro",
        grafico: {
          tipo: "linhaDoTempo",
          marcos: [
            { quando: "2010", rotulo: "Primeiro salário", icone: "nota" },
            { quando: "2015", rotulo: "Reserva de emergência", icone: "cofre" },
            { quando: "2020", rotulo: "Entrada do apê", icone: "banco" },
            { quando: "2025", rotulo: "Casa própria", icone: "casa" },
          ],
        },
      },
    ],
  },
  {
    fala: "Um café por dia vira uma viagem no fim do ano.",
    ilustra: [
      {
        tipo: "grafico",
        em: "café",
        grafico: {
          tipo: "escala",
          titulo: "O mesmo dinheiro",
          unidade: "R$",
          itens: [
            { rotulo: "1 café", valor: 6, icone: "comida" },
            { rotulo: "1 mês", valor: 180, icone: "calendario" },
            { rotulo: "1 ano", valor: 2190, icone: "planeta", destaque: true },
          ],
        },
      },
    ],
  },
  { fala: "Um por cento ao mês, em trinta anos, multiplica tudo.", ilustra: [{ tipo: "grafico", em: "por", grafico: { tipo: "conta", titulo: "Juros compostos", passos: ["1,01^360", "= 35,9", "R$ 1.000 → R$ 35.950"] } }] },
];

const RESPIRO = 26;
const ANTES = 8;

/** A linha do tempo da demo: onde começa cada fala e o tempo de cada palavra */
function linhaDaDemo(falas: FalaDaDemo[]) {
  let quadro = 12;
  return falas.map((f) => {
    const inicio = quadro;
    const palavras = palavrasEstimadas(f.fala, inicio + ANTES);
    const fim = palavras[palavras.length - 1].fim + RESPIRO;
    quadro = fim;
    return { ...f, inicio, fim, palavras };
  });
}

const falasDa = (parte: PropsDaDemo["parte"]) => (parte === "graficos" ? GRAFICOS : TIPOS);
export const duracaoDaDemo = (props: Partial<PropsDaDemo>) => {
  const linha = linhaDaDemo(falasDa(props.parte ?? "tipos"));
  return linha[linha.length - 1].fim + 20;
};

/** O ritmo da demo (quanto tempo, no máximo, a tela fica parada) */
export const ritmoDaDemo = (parte: PropsDaDemo["parte"] = "tipos") =>
  ritmoDoRoteiro(linhaDaDemo(falasDa(parte)).map((f) => ({ inicio: f.inicio, duracao: f.fim - f.inicio, palavras: f.palavras, ilustra: f.ilustra })));

// O alto da cabeça de cada uma (Bia à esquerda, Lu à direita), na tela
const CABECAS = { noiva: { x: 320, y: 875 }, organizadora: { x: 762, y: 875 } };

export const IlustracaoDemo: React.FC<Partial<PropsDaDemo>> = ({ modelo = "chapado", fundo = "claro", parte = "tipos" }) => {
  const frame = useCurrentFrame();
  const { def: estilo, fundo: f, escuro } = estiloDe({ modelo: modelo === "3d" ? "chapado" : modelo, fundo });
  const noite = f === "noite";
  const linha = linhaDaDemo(falasDa(parte));
  const agora = linha.filter((l) => l.inicio <= frame).pop() ?? linha[0];
  const legendas: PalavraNoTempo[] = linha.flatMap((l) => l.palavras);
  const bia = ELENCO.noiva.visual as Visual;
  const lu = ELENCO.organizadora.visual as Visual;
  const falando = (quem: "noiva" | "organizadora") => linha.filter((l) => l.quem === quem).flatMap((l) => l.palavras.map((p) => ({ inicio: p.inicio, fim: p.fim })));
  return (
    <AbsoluteFill style={{ background: noite ? "#0A0F26" : "#FBE7DA" }}>
      <estilo.Fundo fundo={f} Cenario={Atelie} />
      <estilo.Personagem
        noite={noite}
        visual={bia}
        momentos={[{ em: 0, pose: agora.quem === "noiva" ? "explicando" : "normal", expressao: "feliz" }]}
        palavras={falando("noiva")}
        altura={900}
        style={{ position: "absolute", left: 50, top: 790 }}
      />
      <estilo.Personagem
        noite={noite}
        visual={lu}
        momentos={[{ em: 0, pose: "celular", expressao: "neutra" }]}
        palavras={falando("organizadora")}
        altura={900}
        espelhar
        semente={3}
        style={{ position: "absolute", left: 490, top: 790 }}
      />
      {/* O "título" do vídeo (como o POV da Conversa): mostra o estilo testado */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 90,
          right: 90,
          background: escuro ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          border: `6px solid ${escuro ? "#2C3870" : "#2B2340"}`,
          borderRadius: 34,
          padding: "22px 36px",
          textAlign: "center",
          fontFamily: fontes.titulo,
          fontWeight: 800,
          fontSize: 54,
          color: escuro ? "#F4F6FF" : "#2B2340",
        }}
      >
        {modelo === "3d" ? "3D" : estilo.nome} · {noite ? "noite" : "claro"}
      </div>
      {linha.map((l, i) => (
        <Sequence key={i} durationInFrames={l.fim + 1} layout="none" name={`Fala ${i + 1}`}>
          <CamadaDaFala ilustra={l.ilustra} palavras={l.palavras} inicio={l.inicio} fim={l.fim} estilo={{ modelo, fundo }} personagens={CABECAS} />
        </Sequence>
      ))}
      <Legendas
        legendas={legendas.map((p, n) => ({ texto: p.texto, inicioMs: (p.inicio / 30) * 1000, fimMs: (p.fim / 30) * 1000, nova: linha.some((l) => l.palavras[0] === legendas[n]) }))}
        noite={escuro}
        caixa={!escuro}
        tamanho={estilo.legenda}
        largura={940}
        emendarMs={1500}
        style={{ top: 1420, padding: "0 70px" }}
      />
    </AbsoluteFill>
  );
};
