import { Audio } from "@remotion/media";
import React, { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Musica } from "../componentes/audio/Som";
import { palavrasDaNarracao, palavrasEstimadas, quadroDaPalavra, type PalavraNoTempo } from "../componentes/ilustracao/tempo";
import { cores as coresDaMarca } from "../nucleo/marca";
import { textosDoIdioma } from "../nucleo/textosFixos";
import { normalizarPalavra } from "./documentario/infografico/numeros";
import { coresDaCena, misturar, type CoresDaCena } from "./silhueta/cores";
import { Paisagem, VARIACOES } from "./silhueta/Paisagem";
import { cameraDaCena, type CenaDaSilhueta, type PoseDaFigura, type SilhuetaProps } from "./silhueta/schema";
import { FimDaSilhueta, FraseNaLuzDaSilhueta } from "./silhueta/Fim";
import { alturaDoTitulo, ChamadaInicial, Diagrama, Legenda, paginasDaLegenda, tempoDoDiagrama, Titulo, type PalavraDaLegenda } from "./silhueta/Textos";
import { duracaoDoMolde, estimarPalavras, FPS, quadrosDaCenaSilhueta, quadrosDaFalaConversa, SILHUETA } from "./tempos";

// Molde Silhueta (28/11/2026): vídeo curto vertical contado por um narrador
// sobre paisagens em silhueta de 2 a 3 cores (Calvário, estrada, mar, monte,
// deserto, cidade antiga, jardim), com câmera lenta, clima por cena, título
// serifado com uma palavra dourada, mini-diagramas na palavra dita e legenda
// karaokê sem caixa. A última fala devolve a pergunta do título (o loop) e o
// título volta grande na última cena. Formato inspirado em shorts em alta;
// nada da arte, do texto ou dos personagens deles.

export { silhuetaSchema } from "./silhueta/schema";
export type { SilhuetaProps } from "./silhueta/schema";

const TRANSICAO = SILHUETA.transicao;

type Tomada = {
  cena: CenaDaSilhueta;
  indice: number;
  inicio: number;
  duracao: number;
  /** As palavras ditas, em quadros desde o começo da cena */
  palavras: PalavraNoTempo[];
  fimDaFala: number;
  cores: CoresDaCena;
  /** Os gestos da figura, no quadro da cena em que a palavra é dita */
  gestos: Array<{ quadro: number; pose: PoseDaFigura }>;
};

function linhaDoTempo(props: SilhuetaProps): Tomada[] {
  let inicio = 0;
  return props.cenas.map((cena, indice) => {
    const duracao = quadrosDaCenaSilhueta(cena);
    const palavras = cena.narracao ? palavrasDaNarracao(cena.narracao.legendas, SILHUETA.antes) : palavrasEstimadas(cena.fala, SILHUETA.antes);
    const t: Tomada = {
      cena,
      indice,
      inicio,
      duracao,
      palavras,
      fimDaFala: SILHUETA.antes + quadrosDaFalaConversa(cena),
      cores: coresDaCena(props.paleta, cena.clima, coresDaMarca.destaque),
      gestos: (cena.gestos ?? []).flatMap((g) => {
        const achada = quadroDaPalavra(palavras, g.em);
        return achada.achou ? [{ quadro: achada.quadro, pose: g.pose }] : [];
      }),
    };
    inicio += duracao;
    return t;
  });
}

/** As palavras da legenda no tempo do vídeo (ms), cada cena começando página nova */
function palavrasDaLegenda(linha: Tomada[]): PalavraDaLegenda[] {
  return linha.flatMap((t) => {
    const marcadas = new Set(t.cena.destaque.map(normalizarPalavra));
    const doNarrar = t.cena.narracao?.legendas;
    const base = doNarrar
      ? doNarrar.map((l) => ({ texto: l.texto, inicioMs: l.inicioMs, fimMs: l.fimMs, fimDeFrase: l.fimDeFrase }))
      : estimarPalavras(t.cena.fala).map((p) => ({ texto: p.texto, inicioMs: (p.inicio / FPS) * 1000, fimMs: (p.fim / FPS) * 1000, fimDeFrase: undefined }));
    const desloca = ((t.inicio + SILHUETA.antes) / FPS) * 1000;
    return base.map((p, n) => ({
      texto: p.texto,
      inicioMs: p.inicioMs + desloca,
      fimMs: p.fimMs + desloca,
      ...(n === 0 ? { nova: true } : {}),
      ...(p.fimDeFrase ? { fimDeFrase: true } : {}),
      ...(marcadas.has(normalizarPalavra(p.texto)) ? { destaque: true } : {}),
    }));
  });
}

/**
 * Qual composição do cenário a cena usa: cada vez que o mesmo cenário volta no
 * vídeo, sai a composição seguinte (ângulo, horizonte e elementos diferentes);
 * nunca a mesma imagem duas vezes.
 */
function composicaoDaCena(cenas: ReadonlyArray<Pick<CenaDaSilhueta, "cenario" | "variacao">>, indice: number) {
  const cena = cenas[indice];
  const n = VARIACOES[cena.cenario];
  if (cena.variacao) return { variacao: (cena.variacao - 1) % n, espelhar: false };
  // A vez deste cenário no vídeo: a 1ª sai a composição 1, a 2ª a 2, ...; depois de todas, espelhadas
  const vez = cenas.slice(0, indice).filter((c) => c.cenario === cena.cenario).length;
  return { variacao: vez % n, espelhar: Math.floor(vez / n) % 2 === 1 };
}

/**
 * O título pequeno no alto fica só na cena 2 e some no começo da 3ª; volta
 * grande na última (o loop). 2ª rodada, 28/11/2026.
 */
function presencaDoTitulo(linha: Tomada[], frame: number, tituloNoFim: boolean) {
  const terceira = linha[2]?.inicio ?? Infinity;
  const ultima = linha[linha.length - 1];
  const volta = tituloNoFim && linha.length >= 3 ? interpolate(frame, [ultima.inicio - 4, ultima.inicio + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return Math.max(volta, interpolate(frame, [terceira, terceira + 15], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
}

/** O quanto o título está grande (1) ou pequeno no alto (0) neste quadro */
function grandezaDoTitulo(linha: Tomada[], frame: number, tituloNoFim: boolean) {
  const segunda = linha[1]?.inicio ?? Infinity;
  let g = interpolate(frame, [segunda, segunda + 20], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ultima = linha[linha.length - 1];
  if (tituloNoFim && linha.length >= 3) g = Math.max(g, interpolate(frame, [ultima.inicio, ultima.inicio + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return g;
}

/** Escurece as bordas e o pé da tela: a paisagem fica no meio e a legenda lê sempre */
const Moldura: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse 85% 70% at 50% 42%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%), linear-gradient(to bottom, rgba(0,0,0,0) 62%, rgba(0,0,0,0.32) 100%)",
    }}
  />
);

/**
 * O granulado de filme por cima da paisagem: os 6 quadros prontos do kit
 * (public/texturas/grao-N.webp, deitados) girados para a tela em pé, trocando a
 * cada 2 quadros. Ficam todos montados: nenhum carrega no meio do vídeo.
 */
const Grao: React.FC<{ frame: number; forca?: number }> = ({ frame, forca = 0.22 }) => (
  <AbsoluteFill style={{ opacity: forca, mixBlendMode: "overlay", pointerEvents: "none", overflow: "hidden" }}>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <Img
        key={i}
        src={staticFile(`texturas/grao-${i}.webp`)}
        style={{
          position: "absolute",
          width: 1920,
          height: 1080,
          left: (1080 - 1920) / 2,
          top: (1920 - 1080) / 2,
          transform: "rotate(90deg)",
          opacity: Math.floor(frame / 2) % 6 === i ? 1 : 0,
        }}
      />
    ))}
  </AbsoluteFill>
);

export const Silhueta: React.FC<SilhuetaProps> = (props) => {
  const frame = useCurrentFrame();
  const linha = useMemo(() => linhaDoTempo(props), [props]);
  const paginas = useMemo(() => paginasDaLegenda(palavrasDaLegenda(linha)), [linha]);
  const fimDasCenas = linha[linha.length - 1].inicio + linha[linha.length - 1].duracao;
  const atual = linha.find((t) => frame < t.inicio + t.duracao) ?? linha[linha.length - 1];
  const anterior = atual.indice > 0 && frame - atual.inicio < TRANSICAO ? linha[atual.indice - 1] : undefined;
  const mistura = anterior ? interpolate(frame - atual.inicio, [0, TRANSICAO], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const c = atual.cores;
  // As letras do alto acompanham o céu na troca de cena (nunca pulam de cor)
  const tintas = anterior
    ? {
        tinta: misturar(anterior.cores.tinta, c.tinta, mistura),
        tintaSuave: misturar(anterior.cores.tintaSuave, c.tintaSuave, mistura),
        ouro: misturar(anterior.cores.ouro, c.ouro, mistura),
        veu: misturar(anterior.cores.veu, c.veu, mistura),
      }
    : c;
  const grande = grandezaDoTitulo(linha, frame, props.tituloNoFim);
  const noFim = frame >= fimDasCenas;
  const tituloSome = interpolate(frame, [fimDasCenas - 6, fimDasCenas + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const topoDoDiagrama = 300 + grande * (alturaDoTitulo(props.titulo, props.sobretitulo) + 120);
  const tLocal = frame - atual.inicio;
  const diagrama = atual.cena.diagrama;
  const paisagem = (t: Tomada) => (
    <Paisagem
      cenario={t.cena.cenario}
      cores={t.cores}
      figura={t.cena.figura ?? "nenhuma"}
      camera={cameraDaCena(props.cenas, t.indice)}
      t={frame - t.inicio}
      duracao={t.duracao + TRANSICAO}
      id={`s${t.indice}`}
      semente={t.indice + 1}
      gestos={t.gestos}
      {...composicaoDaCena(props.cenas, t.indice)}
    />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0906" }}>
      {anterior && paisagem(anterior)}
      <AbsoluteFill style={{ opacity: mistura }}>{paisagem(atual)}</AbsoluteFill>
      <Moldura />
      {/* Sem o granulado no vídeo (28/11/2026): o overlay custava ~30% do render, e na nuvem o render é por software. Só na capa */}
      {!noFim && diagrama && (
        <Diagrama
          d={diagrama}
          t={tLocal}
          tempo={tempoDoDiagrama(diagrama, atual.palavras, atual.fimDaFala)}
          cores={tintas}
          topo={topoDoDiagrama}
        />
      )}
      <Titulo
        titulo={props.titulo}
        sobretitulo={props.sobretitulo}
        destaque={props.destaqueDoTitulo}
        cores={tintas}
        t={frame}
        grande={grande}
        opacidade={(0.82 + 0.18 * grande) * tituloSome * presencaDoTitulo(linha, frame, props.tituloNoFim)}
        abaixo={props.ctaInicial ? <ChamadaInicial texto={props.ctaInicial} ouro={c.ouroDaLegenda} t={frame} sai={Math.min(110, (linha[1]?.inicio ?? 120) - 14)} /> : undefined}
      />
      {!noFim && <Legenda paginas={paginas} agoraMs={(frame / FPS) * 1000} cores={c} />}
      {linha.map((t) =>
        t.cena.narracao ? (
          <Sequence key={t.indice} from={t.inicio + SILHUETA.antes} durationInFrames={t.duracao} layout="none" name={`Cena ${t.indice + 1}`}>
            <Audio src={staticFile(t.cena.narracao.audio)} />
          </Sequence>
        ) : null,
      )}
      {props.musica && <Musica src={props.musica} total={duracaoDoMolde("Silhueta", props)} volume={props.volumeMusica} />}
      {props.final && (
        <Sequence from={fimDasCenas} durationInFrames={SILHUETA.final} name="Frase na luz">
          <FraseNaLuzDaSilhueta frase={props.final.frase} linha={props.final.linha} botao={props.final.botao ?? props.botaoFinal ?? textosDoIdioma(props.idioma).linkNaBio} cores={c} />
        </Sequence>
      )}
      {props.ctaFinal && (
        <Sequence from={fimDasCenas + (props.final ? SILHUETA.final : 0)} layout="none" name="CTA final">
          <FimDaSilhueta chamada={props.ctaFinal} botao={props.botaoFinal ?? textosDoIdioma(props.idioma).linkNaBio} cores={c} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

/** A capa (1080×1920): a paisagem da cena escolhida, parada, com o título grande no alto */
export const CapaSilhueta: React.FC<SilhuetaProps> = (props) => {
  const frame = useCurrentFrame();
  const linha = useMemo(() => linhaDoTempo(props), [props]);
  const escolhida = linha[Math.min(Math.max(1, props.capa?.cena ?? 1), linha.length) - 1];
  const c = escolhida.cores;
  const t = Math.round(escolhida.duracao * 0.55);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0906" }}>
      <Paisagem
        cenario={escolhida.cena.cenario}
        cores={c}
        figura={escolhida.cena.figura ?? "nenhuma"}
        camera={cameraDaCena(props.cenas, escolhida.indice)}
        t={t}
        duracao={escolhida.duracao + TRANSICAO}
        id="capa"
        semente={escolhida.indice + 1}
        gestos={escolhida.gestos}
        {...composicaoDaCena(props.cenas, escolhida.indice)}
      />
      <Moldura />
      <Grao frame={0} />
      <Titulo
        titulo={props.capa?.titulo ?? props.titulo}
        sobretitulo={props.capa?.sobretitulo ?? props.sobretitulo}
        destaque={props.capa?.destaque ?? props.destaqueDoTitulo}
        cores={c}
        t={Math.max(frame, 200)}
        grande={1}
        topo={300}
        escalaExtra={1.1}
      />
    </AbsoluteFill>
  );
};

export const silhuetaExemplo: SilhuetaProps = {
  titulo: "O que você faria com um único pedido?",
  sobretitulo: "para pensar",
  destaqueDoTitulo: "único pedido?",
  paleta: "sepia",
  tituloNoFim: true,
  cenas: [
    { fala: "O que você faria com um único pedido?", cenario: "estrada", clima: "amanhecer", figura: "caminhando", destaque: [] },
    { fala: "Um homem pediu só um copo de água num poço, e saiu dali com outra vida.", cenario: "deserto", figura: "de-pe", destaque: ["água"] },
    {
      fala: "Ele chegou com sede e saiu sem medo.",
      cenario: "deserto",
      clima: "entardecer",
      destaque: [],
      diagrama: { seta: { de: "sede", para: "sem medo" }, em: "sede" },
    },
    { fala: "Então, o que você faria com um único pedido?", cenario: "monte", clima: "luz", figura: "bracos-abertos", destaque: [] },
  ],
  voz: "masculina-12",
  velocidade: 1,
  volumeMusica: 0.1,
  ctaFinal: "Siga para mais perguntas que mudam o dia",
  botaoFinal: "Siga o canal 👆",
};
