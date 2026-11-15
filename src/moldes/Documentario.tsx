import { Audio, Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Loop, Sequence, Series, staticFile, useCurrentFrame } from "remotion";
import { z } from "zod";
import { arquivo } from "../componentes/base";
import { Legendas } from "../componentes/texto/Legendas";
import { suave } from "../nucleo/animacao";
import { cores, fontes } from "../nucleo/marca";
import { duracaoDoMolde, QUADROS_DO_ENCERRAMENTO, quadrosDaFala, TEMPOS } from "./tempos";

// Vídeo longo e deitado (1920×1080) para canal narrado no YouTube: uma voz lê a
// "fala" de cada cena por cima de uma foto em tela cheia que se move devagar
// (zoom e deslize). Uma cena pode abrir um capítulo (cartão com o título) e
// mostrar um texto curto na tela (data, lugar, número). Cada cena dura o tempo
// da fala; a voz vem do `npm run narrar`, as fotos do `npm run buscar-fotos`.

const narracaoSchema = z
  .object({
    audio: z.string(),
    duracaoSeg: z.number(),
    legendas: z.array(z.object({ texto: z.string(), inicioMs: z.number(), fimMs: z.number() })),
    chave: z.string().optional(),
  })
  .passthrough()
  .describe("Preenchido pelo npm run narrar (não editar à mão)");

export const MOVIMENTOS = ["aproximar", "esquerda", "afastar", "direita", "subir", "diagonal", "descer"] as const;

export const documentarioSchema = z.object({
  cenas: z
    .array(
      z.object({
        fala: z.string().describe("O que a voz diz nesta cena: 2 a 4 frases (uns 10 a 20 s)"),
        foto: z.string().optional().describe("Foto deitada em public/ (fotos/<peça>/<nome>.jpg)"),
        video: z
          .string()
          .optional()
          .describe("Vídeo de fundo deitado em public/ (videos/<peça>/<nome>.mp4), mudo e repetido, no lugar da foto: para paisagem, céu, deserto, mar"),
        capitulo: z.string().optional().describe("Abre um capítulo: o título aparece num cartão no começo da cena"),
        texto: z.string().optional().describe("Texto curto na tela (data, lugar, número): até 40 caracteres"),
        movimento: z
          .enum(MOVIMENTOS)
          .optional()
          .describe("Como a foto se move: aproximar, afastar, esquerda, direita, subir, descer ou diagonal (padrão: alterna sozinho)"),
        inteira: z.boolean().optional().describe("Mostra a imagem inteira, sem cortar (retrato em pé, mapa), sobre ela mesma desfocada"),
        narracao: narracaoSchema.optional(),
      }),
    )
    .min(1)
    .max(150),
  voz: z.enum(["pf_dora", "pm_alex", "pm_santa"]).default("pm_alex").describe("pf_dora (feminina), pm_alex ou pm_santa (masculinas)"),
  velocidade: z.number().min(0.7).max(1.4).default(1),
  pronuncia: z.record(z.string(), z.string()).optional().describe('Como a voz deve ler uma palavra: {"Tiradentes": "Tiradêntes"}'),
  legendas: z.boolean().default(true),
  musica: z
    .string()
    .optional()
    .describe("Música calma em public/, repetida baixinho por baixo da voz: musica/calma-esperanca.mp3, calma-reflexao.mp3 ou calma-drama.mp3"),
  volumeMusica: z.number().min(0).max(0.5).default(0.15),
  /** Frase do cartão final (ex.: "Inscreva-se para a parte 2"). Sem ela, o vídeo termina na última cena. */
  encerramento: z.string().optional(),
});

export type Documentario = z.infer<typeof documentarioSchema>;
type Cena = Documentario["cenas"][number];

export const documentarioExemplo: Documentario = {
  cenas: [
    {
      fala: "Em 1808, uma frota cruzou o Atlântico com a família real portuguesa inteira a bordo.",
      capitulo: "A fuga da corte",
      texto: "Lisboa, novembro de 1807",
    },
    { fala: "Eram mais de dez mil pessoas, fugindo das tropas de Napoleão.", movimento: "esquerda" },
    { fala: "E o Rio de Janeiro nunca mais seria o mesmo.", capitulo: "Uma cidade virada do avesso" },
  ],
  voz: "pm_alex",
  velocidade: 1,
  legendas: true,
  volumeMusica: 0.15,
  encerramento: "Inscreva-se para a parte 2",
};

/** Mistura de uma cena com a anterior, em quadros (no começo de capítulo: entrada do preto, mais longa) */
const MISTURA = 18;
const ENTRADA_DO_CAPITULO = 24;

// Movimento de câmera de cinema: começa e termina devagar
const cinema = Easing.bezier(0.45, 0, 0.55, 1);

const movimentoDa = (cena: Cena, indice: number) => cena.movimento ?? MOVIMENTOS[indice % MOVIMENTOS.length];

/** Foto em tela cheia com zoom e deslize lentos (ken burns), do começo ao fim da cena. `parada`: fica no fim do movimento (a cena anterior, na mistura) */
const FotoEmMovimento: React.FC<{ src: string; duracao: number; movimento: (typeof MOVIMENTOS)[number]; inteira?: boolean; parada?: boolean }> = ({
  src,
  duracao,
  movimento,
  inteira,
  parada,
}) => {
  const frame = useCurrentFrame();
  const t = parada ? 1 : interpolate(frame, [0, duracao], [0, 1], { extrapolateRight: "clamp", easing: cinema });
  const escala =
    movimento === "afastar" ? 1.18 - 0.12 * t : movimento === "aproximar" ? 1.06 + 0.12 * t : movimento === "diagonal" ? 1.08 + 0.1 * t : 1.14;
  const x = movimento === "esquerda" ? 3 - 6 * t : movimento === "direita" ? -3 + 6 * t : movimento === "diagonal" ? -2 + 4 * t : 0;
  const y = movimento === "subir" ? 3 - 6 * t : movimento === "descer" ? -3 + 6 * t : movimento === "diagonal" ? 2 - 4 * t : 0;
  if (inteira) {
    // Retrato ou mapa: a imagem inteira no meio, com zoom bem leve, e ela mesma desfocada no fundo
    const leve = 1 + (escala - 1) * 0.4;
    return (
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
        <Img src={arquivo(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.45)", scale: "1.15" }} />
        <AbsoluteFill style={{ padding: "40px 0", alignItems: "center", justifyContent: "center" }}>
          <Img
            src={arquivo(src)}
            style={{ height: "100%", maxWidth: "90%", objectFit: "contain", transform: `scale(${leve})`, boxShadow: "0 30px 90px rgba(0,0,0,0.6)" }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <Img
        src={arquivo(src)}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${escala}) translate(${x}%, ${y}%)` }}
      />
    </AbsoluteFill>
  );
};

/** Sem foto: fundo escuro na cor da marca, com um brilho suave */
const FundoSemFoto: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 40%, ${cores.destaque}55 0%, #0d0b10 65%)` }} />
);

const Capitulo: React.FC<{ titulo: string }> = ({ titulo }) => {
  const frame = useCurrentFrame();
  const opacidade = interpolate(frame, [0, 12, 70, 90], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const linha = interpolate(frame, [6, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(8,7,10,${0.55 * opacidade})`, alignItems: "center", justifyContent: "center", opacity: opacidade }}>
      <div style={{ width: 180 * linha, height: 6, borderRadius: 3, backgroundColor: cores.destaque, marginBottom: 34 }} />
      <div
        style={{
          fontFamily: fontes.titulo,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1.1,
          color: "#fff",
          textAlign: "center",
          maxWidth: 1500,
          textShadow: "0 6px 30px rgba(0,0,0,0.5)",
        }}
      >
        {titulo}
      </div>
    </AbsoluteFill>
  );
};

/** Texto curto no canto de baixo à esquerda (data, lugar), como numa reportagem */
const TextoNaTela: React.FC<{ texto: string; inicio: number }> = ({ texto, inicio }) => {
  const frame = useCurrentFrame();
  const entrada = interpolate(frame - inicio, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        top: 90,
        opacity: entrada,
        translate: `${-30 * (1 - entrada)}px 0`,
        display: "flex",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div style={{ width: 8, height: 54, borderRadius: 4, backgroundColor: cores.destaque }} />
      <div
        style={{
          fontFamily: fontes.titulo,
          fontWeight: 700,
          fontSize: 46,
          color: "#fff",
          backgroundColor: "rgba(8,7,10,0.6)",
          padding: "8px 22px",
          borderRadius: 12,
        }}
      >
        {texto}
      </div>
    </div>
  );
};

const CenaDoDocumentario: React.FC<{ cena: Cena; indice: number; props: Documentario }> = ({ cena, indice, props }) => {
  const frame = useCurrentFrame();
  const duracao = quadrosDaFala(cena);
  // Dentro do capítulo, a foto nova se mistura com a anterior; no começo de capítulo, entra do preto
  const anterior = indice > 0 && !cena.capitulo ? props.cenas[indice - 1] : undefined;
  const entrada = anterior?.foto ? MISTURA : ENTRADA_DO_CAPITULO;
  const fade = interpolate(frame, [0, entrada], [0, 1], { extrapolateRight: "clamp", easing: cinema });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {anterior?.foto && frame < entrada && (
        <FotoEmMovimento
          src={anterior.foto}
          duracao={quadrosDaFala(anterior)}
          movimento={movimentoDa(anterior, indice - 1)}
          inteira={anterior.inteira}
          parada
        />
      )}
      <AbsoluteFill style={{ opacity: fade }}>
        {cena.video ? (
          <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
            <Video src={arquivo(cena.video)} muted loop objectFit="cover" style={{ width: "100%", height: "100%" }} />
          </AbsoluteFill>
        ) : cena.foto ? (
          <FotoEmMovimento src={cena.foto} duracao={duracao} movimento={movimentoDa(cena, indice)} inteira={cena.inteira} />
        ) : (
          <FundoSemFoto />
        )}
        {/* Escurece as bordas e o pé, para a legenda e o texto lerem bem */}
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)" }} />
      </AbsoluteFill>
      {cena.texto && <TextoNaTela texto={cena.texto} inicio={cena.capitulo ? 80 : 10} />}
      {cena.narracao && (
        <>
          <Sequence from={TEMPOS.antesDaFala} layout="none" name="Narração">
            <Audio src={staticFile(cena.narracao.audio)} />
          </Sequence>
          {props.legendas && (
            <Legendas legendas={cena.narracao.legendas} atraso={TEMPOS.antesDaFala} tamanho={44} caixa largura={1400} style={{ top: 920, padding: "0 260px" }} />
          )}
        </>
      )}
      {cena.capitulo && (
        <Sequence durationInFrames={90} layout="none" name="Capítulo">
          <Capitulo titulo={cena.capitulo} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

const Encerramento: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const entrada = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: suave });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0b10", alignItems: "center", justifyContent: "center", gap: 40 }}>
      <div style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: 84, color: "#fff", opacity: entrada, textAlign: "center", maxWidth: 1500 }}>
        {texto}
      </div>
      <div
        style={{
          fontFamily: fontes.titulo,
          fontWeight: 800,
          fontSize: 44,
          color: cores.textoNoDestaque,
          backgroundColor: cores.destaque,
          padding: "16px 44px",
          borderRadius: 999,
          opacity: entrada,
          scale: String(0.9 + 0.1 * entrada),
        }}
      >
        Inscreva-se
      </div>
    </AbsoluteFill>
  );
};

export const Documentario: React.FC<Documentario> = (props) => {
  const total = duracaoDoMolde("Documentario", props);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {props.cenas.map((cena, i) => (
          <Series.Sequence key={i} durationInFrames={quadrosDaFala(cena)}>
            <CenaDoDocumentario cena={cena} indice={i} props={props} />
          </Series.Sequence>
        ))}
        {props.encerramento && (
          <Series.Sequence durationInFrames={QUADROS_DO_ENCERRAMENTO}>
            <Encerramento texto={props.encerramento} />
          </Series.Sequence>
        )}
      </Series>
      {props.musica && (
        <Sequence durationInFrames={total} layout="none">
          <MusicaEmLoop src={props.musica} volume={props.volumeMusica} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

/** Música repetida durante o vídeo todo, baixinha, com fade a cada volta */
const MusicaEmLoop: React.FC<{ src: string; volume: number }> = ({ src, volume }) => {
  // Trecho de 2 min que se repete (a maioria das trilhas tem isso ou mais)
  const trecho = 120 * 30;
  return (
    <Loop durationInFrames={trecho} name="Música">
      <Audio
        src={arquivo(src)}
        volume={(f) => volume * interpolate(f, [0, 30, trecho - 30, trecho], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
    </Loop>
  );
};

// ---- Capa do YouTube (1280×720) ----

export const capaDocumentarioSchema = z.object({
  titulo: z.string(),
  destaque: z.string().optional(),
  foto: z.string().optional(),
});
export type CapaDocumentario = z.infer<typeof capaDocumentarioSchema>;

export const capaDocumentarioExemplo: CapaDocumentario = {
  titulo: "A noite em que o Brasil virou capital de Portugal",
  destaque: "capital",
};

/** Título grande à esquerda, foto em tela cheia por trás: legível até pequeno no celular */
export const CapaDoDocumentario: React.FC<CapaDocumentario> = ({ titulo, destaque, foto }) => {
  const palavras = titulo.split(" ");
  const alvo = destaque?.toLowerCase();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0b10" }}>
      {foto ? (
        <Img src={arquivo(foto)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <FundoSemFoto />
      )}
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,7,10,0.92) 0%, rgba(8,7,10,0.75) 45%, rgba(8,7,10,0) 80%)" }} />
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 70px" }}>
        <div style={{ width: 120, height: 10, borderRadius: 5, backgroundColor: cores.destaque, marginBottom: 26 }} />
        <div
          style={{
            fontFamily: fontes.titulo,
            fontWeight: 800,
            fontSize: titulo.length > 45 ? 70 : 84,
            lineHeight: 1.05,
            color: "#fff",
            maxWidth: 760,
            textShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          {palavras.map((palavra, i) => {
            const marcada = alvo && alvo.split(" ").includes(palavra.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
            return (
              <span key={i} style={{ color: marcada ? cores.destaque : undefined }}>
                {palavra}{" "}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
