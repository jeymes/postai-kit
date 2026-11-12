import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Sequence, Series, staticFile, useCurrentFrame } from "remotion";
import { z } from "zod";
import { entrada } from "../nucleo/animacao";
import { cores } from "../nucleo/marca";
import { EfeitosContexto, Musica, Som } from "../componentes/audio/Som";
import { Foto, Fundo } from "../componentes/base";
import { ChamadaFinal } from "../componentes/cenas/ChamadaFinal";
import { ANIMACOES, Animacao, type NomeDaAnimacao } from "../componentes/lottie/Animacao";
import { ALTURA_STATUS, Celular, TELA_ALTURA, TELA_LARGURA } from "../componentes/midia/Celular";
import { Rolagem } from "../componentes/midia/Rolagem";
import { Apresentador } from "../componentes/personagens/Apresentador";
import { Mascote } from "../componentes/personagens/Mascote";
import { Legendas } from "../componentes/texto/Legendas";
import { Texto } from "../componentes/texto/Texto";
import { duracaoDoMolde, quadrosDaFala, TEMPOS } from "./tempos";

// Vídeo 9:16 com narração: uma voz em português lê a "fala" de cada cena, com
// legenda animada palavra por palavra e, se quiser, o mascote falando junto.
// Cada cena mostra um título, uma foto, o site no celular ou uma animação, e
// dura o tempo da fala. A voz é gerada no computador com `npm run narrar`
// (instalar antes com `npm run voz:instalar`); sem isso, a prévia sai muda.

const nomesDasAnimacoes = Object.keys(ANIMACOES) as [NomeDaAnimacao, ...NomeDaAnimacao[]];

const narracaoSchema = z
  .object({
    audio: z.string(),
    duracaoSeg: z.number(),
    legendas: z.array(z.object({ texto: z.string(), inicioMs: z.number(), fimMs: z.number() })),
    boca: z.array(z.object({ inicio: z.number(), forma: z.string() })).optional(),
    chave: z.string().optional(),
    avatar: z.string().optional(),
    avatarChave: z.string().optional(),
  })
  .describe("Preenchido pelo npm run narrar (não editar à mão)");

export const narradoSchema = z.object({
  cenas: z
    .array(
      z.object({
        fala: z.string().describe("O que a voz diz nesta cena: 1 ou 2 frases curtas"),
        titulo: z.string().optional().describe("Texto grande na tela (curto)"),
        destaque: z.string().optional(),
        foto: z.string().optional(),
        print: z.string().optional().describe("Print do site (sites/<nome>.png): aparece no celular, rolando"),
        proporcao: z.number().optional().describe("Do print (o capturar-site informa)"),
        rolagem: z.number().min(0).max(1).optional().describe("Onde o site para: 0 = topo, 1 = fim"),
        animacao: z.enum(nomesDasAnimacoes).optional(),
        narracao: narracaoSchema.optional(),
      }),
    )
    .min(1)
    .max(12),
  voz: z.enum(["pf_dora", "pm_alex", "pm_santa"]).default("pf_dora").describe("pf_dora (feminina), pm_alex ou pm_santa (masculinas)"),
  velocidade: z.number().min(0.7).max(1.4).default(1),
  pronuncia: z.record(z.string(), z.string()).optional().describe('Como a voz deve ler uma palavra: {"Kombi": "Cômbi"}'),
  legendas: z.boolean().default(true),
  mascote: z.boolean().default(false),
  avatar: z
    .enum(["tela", "janela"])
    .optional()
    .describe('A pessoa falando (npm run avatar): "tela" = tela cheia nas cenas sem imagem; "janela" = sempre no canto'),
  avatarVideo: z.string().optional().describe("Vídeo base da pessoa em public/ (padrão: avatar/base.mp4)"),
  chamada: z.string().optional(),
  musica: z.string().optional().describe("Fica baixinha, por baixo da voz"),
  efeitos: z.boolean().default(true),
});

export type Narrado = z.infer<typeof narradoSchema>;
type Cena = Narrado["cenas"][number];

export const narradoExemplo: Narrado = {
  cenas: [
    { fala: "Sabe aquele pão de queijo que sai quentinho às sete da manhã?", titulo: "Pão de queijo quentinho", destaque: "quentinho" },
    { fala: "Agora você pede pelo site e retira sem fila.", foto: "exemplos/produto.svg", titulo: "Sem fila" },
    { fala: "Escolhe, paga no Pix e pronto.", print: "exemplos/site.svg", proporcao: 3, rolagem: 0.6 },
    { fala: "Corre, que a fornada das sete acaba rápido!", animacao: "confete", titulo: "Acaba rápido!" },
  ],
  voz: "pf_dora",
  velocidade: 1,
  legendas: true,
  mascote: true,
  efeitos: true,
};

const ESCALA_DO_CELULAR = 1.2;

const Visual: React.FC<{ cena: Cena; anterior?: Cena }> = ({ cena, anterior }) => {
  const frame = useCurrentFrame();
  if (cena.print) {
    const de = anterior?.print === cena.print ? (anterior.rolagem ?? 0) : 0;
    return (
      <Celular escala={ESCALA_DO_CELULAR} inicio={anterior?.print === cena.print ? -60 : 0}>
        <Rolagem
          print={cena.print}
          largura={TELA_LARGURA}
          altura={TELA_ALTURA - ALTURA_STATUS}
          proporcao={cena.proporcao ?? 3}
          pontos={[
            { em: 0, y: de },
            { em: 40, y: cena.rolagem ?? 0 },
          ]}
        />
      </Celular>
    );
  }
  if (cena.foto)
    return (
      <div style={entrada(frame, 4, 18, 50)}>
        <Foto src={cena.foto} largura={880} altura={820} />
      </div>
    );
  if (cena.animacao) return <Animacao nome={cena.animacao} em={6} largura={620} />;
  return null;
};

// Janela da pessoa no canto (avatar), no lugar do mascote
const JANELA = { left: 50, top: 1270, width: 260, height: 350 };

const CenaNarrada: React.FC<{ cena: Cena; anterior?: Cena; props: Narrado }> = ({ cena, anterior, props }) => {
  const visual = Boolean(cena.print || cena.foto || cena.animacao);
  const narracao = cena.narracao;
  const avatar = props.avatar && narracao?.avatar ? narracao.avatar : null;
  // Avatar em tela cheia: a pessoa é a cena quando não há imagem
  const telaCheia = Boolean(avatar && props.avatar === "tela" && !visual);
  const janela = Boolean(avatar && !telaCheia);
  const noCanto = janela || (props.mascote && !avatar);
  // Sem título nem imagem, a legenda é a estrela: grande, no meio da tela
  const soLegenda = !visual && !cena.titulo && !telaCheia;
  return (
    <Fundo>
      {telaCheia && avatar && narracao && (
        <>
          <Apresentador src={avatar} duracaoSeg={narracao.duracaoSeg} atraso={TEMPOS.antesDaFala} style={{ position: "absolute", inset: 0 }} />
          <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 28%)" }} />
        </>
      )}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: visual || telaCheia ? "flex-start" : "center",
          paddingTop: visual || telaCheia ? 110 : 0,
          gap: 50,
        }}
      >
        {cena.titulo && (
          <div style={{ padding: "0 90px", marginTop: visual || telaCheia ? 0 : -260 }}>
            <Texto texto={cena.titulo} destaque={cena.destaque} tamanho={visual || telaCheia ? 88 : 116} cor={telaCheia ? "#fff" : undefined} />
          </div>
        )}
        <Visual cena={cena} anterior={anterior} />
      </AbsoluteFill>
      {narracao && (
        <>
          <Sequence from={TEMPOS.antesDaFala} layout="none" name="Narração">
            <Audio src={staticFile(narracao.audio)} />
          </Sequence>
          {props.legendas && (
            <Legendas
              legendas={narracao.legendas}
              atraso={TEMPOS.antesDaFala}
              tamanho={soLegenda ? 104 : 74}
              caixa={telaCheia}
              style={{
                top: soLegenda ? 760 : 1330,
                padding: noCanto ? "0 80px 0 340px" : "0 90px",
              }}
            />
          )}
        </>
      )}
      {janela && avatar && narracao && (
        <Apresentador
          src={avatar}
          duracaoSeg={narracao.duracaoSeg}
          atraso={TEMPOS.antesDaFala}
          style={{
            position: "absolute",
            ...JANELA,
            borderRadius: 36,
            border: `6px solid ${cores.superficie}`,
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          }}
        />
      )}
      {props.mascote && !avatar && (
        <Mascote
          boca={narracao?.boca}
          legendas={narracao?.legendas}
          atraso={TEMPOS.antesDaFala}
          tamanho={250}
          style={{ position: "absolute", left: 50, top: 1300 }}
        />
      )}
    </Fundo>
  );
};

export const Narrado: React.FC<Narrado> = (props) => (
  <AbsoluteFill>
    <EfeitosContexto.Provider value={props.efeitos}>
      <Series>
        {props.cenas.map((cena, i) => (
          <Series.Sequence key={i} durationInFrames={quadrosDaFala(cena)}>
            {i > 0 && <Som tipo="transicao" em={0} volume={0.2} />}
            <CenaNarrada cena={cena} anterior={props.cenas[i - 1]} props={props} />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={TEMPOS.chamada}>
          <Som tipo="sucesso" em={4} />
          <ChamadaFinal chamada={props.chamada} />
        </Series.Sequence>
      </Series>
    </EfeitosContexto.Provider>
    {props.musica && <Musica src={props.musica} total={duracaoDoMolde("Narrado", props)} volume={0.12} />}
  </AbsoluteFill>
);
