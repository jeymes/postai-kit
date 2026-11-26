// Infográfico animado (modelo "infografico" do Canal dark): cada cena mostra um
// gráfico que se monta no tempo da fala (número que conta, linha que se desenha,
// barras que crescem, rosca, grade de ícones, comparação, linha do tempo,
// escala e conta passo a passo), num fundo limpo com grade discreta. O dado que
// importa sai na cor de destaque; o resto em tons neutros. A câmera chega perto
// devagar, o gráfico seguinte entra deslizando e o anterior sai para o lado. A
// legenda fica numa faixa própria no pé, sem cobrir o gráfico. Cena sem
// gráfico: a foto num cartão limpo, ou um cartão com ícone e palavra.
// O formato do campo `grafico` está em schema.ts; os desenhos, em graficos.tsx.

import { Audio } from "@remotion/media";
import { loadFont as carregarInter } from "@remotion/google-fonts/Inter";
import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { arquivo } from "../../../componentes/base";
import { Legendas } from "../../../componentes/texto/Legendas";
import type { Aparencia } from "../../../estilos/narrado";
import { textosDoIdioma } from "../../../nucleo/textosFixos";
import { estimarPalavras, quadrosDaFala, TEMPOS } from "../../tempos";
import { DesenhoDoGrafico, type Contexto } from "./graficos";
import { Icone } from "./icones";
import { formatar, normalizarPalavra, palavrasDo, textoDaFonte } from "./numeros";
import type { Grafico, NomeDoIcone } from "./schema";
import { cresce, mola, NO_FIM, temaDo, textoSobre, type Tema } from "./tema";

const { fontFamily: INTER } = carregarInter("normal", { subsets: ["latin"], weights: ["400", "500", "600", "700", "800"] });
/** A letra dos números: a Inter tem algarismos de mesma largura (a contagem não treme) */
export const LETRA_DOS_NUMEROS = INTER;

/** Quadros da troca entre um gráfico e o seguinte */
const TROCA = 22;
const DURACAO_DO_CARTAO = 90;
const ATRASO_DO_PRIMEIRO_CAPITULO = 90;
/** Onde começa a faixa da legenda (o gráfico fica todo acima dela) */
const FAIXA = 880;

/** O que a cena do infográfico usa do roteiro */
export interface CenaDoInfografico {
  fala: string;
  foto?: string;
  capitulo?: string;
  texto?: string;
  palavra?: string;
  icone?: NomeDoIcone;
  grafico?: Grafico;
  legendaNoAlto?: boolean;
  narracao?: { audio: string; duracaoSeg: number; legendas: Array<{ texto: string; inicioMs: number; fimMs: number }> };
}

/**
 * Em que quadro da cena a animação do gráfico começa: na palavra `em` da fala
 * (pelo tempo que o narrar mediu; antes da voz, pela estimativa) ou, sem ela,
 * logo no começo.
 */
export function inicioDoGrafico(cena: CenaDoInfografico, fps = 30): number {
  const em = cena.grafico?.em;
  const comeco = 10;
  if (!em) return comeco;
  const alvo = em.split(/\s+/).map(normalizarPalavra).filter(Boolean);
  if (!alvo.length) return comeco;
  const palavras = cena.narracao
    ? cena.narracao.legendas.map((l) => ({ texto: l.texto, quadro: (l.inicioMs / 1000) * fps }))
    : estimarPalavras(cena.fala).map((p) => ({ texto: p.texto, quadro: p.inicio }));
  const norm = palavras.map((p) => normalizarPalavra(p.texto));
  for (let i = 0; i + alvo.length <= norm.length; i++) {
    if (alvo.every((a, j) => norm[i + j] === a || (j === alvo.length - 1 && norm[i + j].startsWith(a)))) return Math.round(TEMPOS.antesDaFala + palavras[i].quadro);
  }
  return comeco;
}

// ---- O fundo: a cor do tema, um brilho num canto e a grade discreta ----

const Fundo: React.FC<{ tema: Tema }> = ({ tema }) => (
  <AbsoluteFill style={{ backgroundColor: tema.fundo }}>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 22% 18%, ${tema.fundo2} 0%, ${tema.fundo} 70%)` }} />
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${tema.grade} 1.5px, transparent 1.5px), linear-gradient(90deg, ${tema.grade} 1.5px, transparent 1.5px)`,
        backgroundSize: "80px 80px",
        backgroundPosition: "40px 20px",
        maskImage: "radial-gradient(ellipse 85% 80% at 50% 45%, #000 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 85% 80% at 50% 45%, #000 40%, transparent 100%)",
      }}
    />
  </AbsoluteFill>
);

// ---- O conteúdo de uma cena: o título, o gráfico (ou a foto, ou o cartão) e a fonte ----

const Conteudo: React.FC<{
  cena: CenaDoInfografico;
  /** Quadros desde o começo da cena (o título) e desde que o gráfico começa */
  tCena: number;
  tGrafico: number;
  disponivel: number;
  tema: Tema;
  ap: Aparencia;
  idioma?: string;
}> = ({ cena, tCena, tGrafico, disponivel, tema, ap, idioma }) => {
  const g = cena.grafico;
  const titulo = mola(tCena, 0, 22);
  const c: Contexto = { t: tGrafico, te: tCena, tema, idioma, numeros: INTER, texto: ap.fonteTexto, titulo: ap.fonteTitulo, disponivel };
  const tituloTexto = g?.titulo;
  return (
    <AbsoluteFill>
      {/* O "chapéu" (texto da cena: lugar, ano) e o título do gráfico, no alto à esquerda */}
      {(cena.texto || tituloTexto) && (
        <div style={{ position: "absolute", left: 160, right: 160, top: 96, opacity: titulo, translate: `${(1 - titulo) * -24}px 0` }}>
          {cena.texto && (
            <div style={{ fontFamily: ap.fonteTexto, fontWeight: 700, fontSize: 26, letterSpacing: "0.14em", textTransform: "uppercase", color: tema.destaque, marginBottom: 14 }}>{cena.texto}</div>
          )}
          {tituloTexto && (
            <div
              style={{
                fontFamily: ap.fonteTitulo,
                fontWeight: Math.max(600, Math.min(800, ap.pesoTitulo)),
                fontSize: tituloTexto.length > 52 ? 46 : 56,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                color: tema.texto,
                maxWidth: 1600,
              }}
            >
              {tituloTexto}
            </div>
          )}
        </div>
      )}
      {g ? <DesenhoDoGrafico g={g} c={c} /> : <CartaoSemGrafico cena={cena} t={tCena} tema={tema} ap={ap} />}
      {g?.fonte && (
        <div
          style={{
            position: "absolute",
            left: 160,
            top: 826,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: ap.fonteTexto,
            fontWeight: 500,
            fontSize: 24,
            color: tema.texto2,
            opacity: mola(tGrafico, 20, 24) * 0.95,
          }}
        >
          <div style={{ width: 22, height: 2, backgroundColor: tema.texto2, opacity: 0.6 }} />
          {textoDaFonte(g.fonte, idioma)}
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Cena sem gráfico: a foto num cartão limpo, ou o ícone com a palavra-chave */
const CartaoSemGrafico: React.FC<{ cena: CenaDoInfografico; t: number; tema: Tema; ap: Aparencia }> = ({ cena, t, tema, ap }) => {
  const entra = mola(t, 0, 26);
  if (cena.foto) {
    const zoom = 1.04 + 0.06 * interpolate(t, [0, quadrosDaFala(cena)], [0, 1], { extrapolateRight: "clamp" });
    const temTitulo = Boolean(cena.texto);
    return (
      <div
        style={{
          position: "absolute",
          left: 960 - 640,
          top: temTitulo ? 190 : 140,
          width: 1280,
          height: temTitulo ? 620 : 680,
          borderRadius: 26,
          overflow: "hidden",
          boxShadow: tema.sombra,
          border: `2px solid ${tema.eixo}`,
          opacity: entra,
          scale: String(0.96 + 0.04 * entra),
        }}
      >
        <Img src={arquivo(cena.foto)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: String(zoom) }} />
      </div>
    );
  }
  const palavra = cena.palavra;
  return (
    <div style={{ position: "absolute", left: 160, right: 160, top: 250, height: 550, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
      <div style={{ width: 230, height: 230, borderRadius: 999, border: `4px solid ${tema.destaque}`, display: "grid", placeItems: "center", opacity: entra, scale: String(0.8 + 0.2 * entra) }}>
        <Icone nome={cena.icone ?? "grafico"} tamanho={130} cor={tema.destaque} />
      </div>
      {palavra && (
        <div style={{ fontFamily: ap.fonteTitulo, fontWeight: 800, fontSize: 110, lineHeight: 1, letterSpacing: "-0.02em", color: tema.texto, opacity: mola(t, 10, 24), textAlign: "center" }}>{palavra}</div>
      )}
    </div>
  );
};

// ---- O cartão de capítulo: o número grande na cor de destaque e o título ----

const CartaoDeCapitulo: React.FC<{ titulo: string; numero: number; tema: Tema; ap: Aparencia; idioma?: string }> = ({ titulo, numero, tema, ap, idioma }) => {
  const frame = useCurrentFrame();
  // Entra varrendo da esquerda e sai varrendo para a direita (revela o gráfico)
  const entra = cresce(frame, 0, 16);
  const sai = cresce(frame, DURACAO_DO_CARTAO - 20, 20);
  const linha = cresce(frame, 8, 30);
  const texto = mola(frame, 8, 24);
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - entra) * 100}% 0 ${sai * 100}%)` }}>
      <Fundo tema={tema} />
      <div style={{ position: "absolute", left: 200, right: 200, top: 0, bottom: 200, display: "flex", alignItems: "center", gap: 60 }}>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 230, lineHeight: 0.9, letterSpacing: "-0.05em", color: tema.destaque, fontVariantNumeric: "tabular-nums", opacity: texto }}>
          {formatar(numero, 0, idioma).padStart(2, "0")}
        </div>
        <div style={{ width: 6, alignSelf: "stretch", margin: "300px 0", borderRadius: 3, backgroundColor: tema.eixo, scale: `1 ${linha}` }} />
        <div style={{ opacity: texto, translate: `${(1 - texto) * 40}px 0` }}>
          <div style={{ fontFamily: ap.fonteTexto, fontWeight: 700, fontSize: 30, letterSpacing: "0.16em", textTransform: "uppercase", color: tema.texto2, marginBottom: 18 }}>
            {palavrasDo(idioma).capitulo}
          </div>
          <div style={{ fontFamily: ap.fonteTitulo, fontWeight: Math.max(600, Math.min(800, ap.pesoTitulo)), fontSize: titulo.length > 28 ? 78 : 96, lineHeight: 1.05, letterSpacing: "-0.02em", color: tema.texto, maxWidth: 1100 }}>
            {titulo}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** A faixa do pé, com a legenda da fala (fica fora do gráfico) */
const FaixaDaLegenda: React.FC<{ cena: CenaDoInfografico; tema: Tema; ap: Aparencia; legendas: boolean }> = ({ cena, tema, ap, legendas }) => (
  <>
    {/* Sem legenda (o short do CorteVertical põe a dele embaixo), sem faixa */}
    {legendas && <div style={{ position: "absolute", left: 0, right: 0, top: FAIXA, bottom: 0, backgroundColor: tema.faixa }} />}
    {legendas && <div style={{ position: "absolute", left: 0, right: 0, top: FAIXA, height: 2, backgroundColor: tema.escuro ? "rgba(214,236,242,0.08)" : "rgba(0,0,0,0.12)" }} />}
    {cena.narracao && (
      <>
        <Sequence from={TEMPOS.antesDaFala} layout="none" name="Narração">
          <Audio src={staticFile(cena.narracao.audio)} />
        </Sequence>
        {legendas && (
          <AbsoluteFill>
            <Legendas
              legendas={cena.narracao.legendas}
              atraso={TEMPOS.antesDaFala}
              tamanho={ap.legenda.tamanho}
              caixa={false}
              noite
              largura={1400}
              fonte={ap.fonteTexto}
              peso={600}
              destaque={tema.destaque}
              corDoTexto="#e8eef0"
              style={{ top: FAIXA + 52, padding: "0 260px" }}
            />
          </AbsoluteFill>
        )}
      </>
    )}
  </>
);

/** Uma cena do infográfico (dentro da Series do Documentario) */
export const CenaDeInfografico: React.FC<{
  cenas: CenaDoInfografico[];
  indice: number;
  ap: Aparencia;
  estilo?: { cor?: string; fundo?: "escuro" | "claro" };
  idioma?: string;
  legendas: boolean;
}> = ({ cenas, indice, ap, estilo, idioma, legendas }) => {
  const frame = useCurrentFrame();
  const tema = temaDo(estilo);
  const cena = cenas[indice];
  const duracao = quadrosDaFala(cena);
  const inicioDoCartao = cena.capitulo ? (indice === 0 ? Math.min(ATRASO_DO_PRIMEIRO_CAPITULO, Math.max(0, duracao - DURACAO_DO_CARTAO)) : 0) : 0;
  // Num capítulo (fora o 1º), o gráfico espera o cartão sair para começar a se montar
  const inicio = cena.capitulo && indice > 0 ? Math.max(inicioDoGrafico(cena), DURACAO_DO_CARTAO - 14) : inicioDoGrafico(cena);
  const numeroDoCapitulo = cenas.slice(0, indice + 1).filter((c) => c.capitulo).length;
  // A cena anterior sai deslizando para a esquerda, já montada; a nova entra da direita
  const anterior = indice > 0 && !cena.capitulo ? cenas[indice - 1] : undefined;
  // Uma depois da outra (as duas juntas embaralhavam os títulos): a anterior sai rápido e a nova entra
  const sai = anterior ? cresce(frame, 0, 12) : 1;
  const troca = anterior ? mola(frame, 6, TROCA) : 1;
  const camera = (t: number, dur: number) => 1 + 0.03 * interpolate(t, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: tema.fundo, overflow: "hidden" }}>
      <Fundo tema={tema} />
      {anterior && sai < 1 && (
        <AbsoluteFill style={{ opacity: 1 - sai, translate: `${-120 * sai}px 0`, scale: String(camera(1, 1)), transformOrigin: "50% 45%" }}>
          <Conteudo cena={anterior} tCena={NO_FIM} tGrafico={NO_FIM} disponivel={quadrosDaFala(anterior)} tema={tema} ap={ap} idioma={idioma} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ opacity: troca, translate: `${120 * (1 - troca)}px 0`, scale: String(camera(frame, duracao)), transformOrigin: "50% 45%" }}>
        <Conteudo cena={cena} tCena={frame} tGrafico={frame - inicio} disponivel={duracao - inicio} tema={tema} ap={ap} idioma={idioma} />
      </AbsoluteFill>
      {cena.capitulo && (
        <Sequence from={inicioDoCartao} durationInFrames={DURACAO_DO_CARTAO} layout="none" name="Capítulo">
          <CartaoDeCapitulo titulo={cena.capitulo} numero={numeroDoCapitulo} tema={tema} ap={ap} idioma={idioma} />
        </Sequence>
      )}
      {/* A legenda por cima do cartão do capítulo: sempre legível */}
      <FaixaDaLegenda cena={cena} tema={tema} ap={ap} legendas={legendas} />
    </AbsoluteFill>
  );
};

// "Inscreva-se" quebrava no hífen: o hífen que não quebra linha
const semQuebrarNoHifen = (texto: string) => texto.replace(/-/g, "\u2011");

/** O cartão final do infográfico: a frase, a chamada do canal e o botão */
export const EncerramentoDoInfografico: React.FC<{ texto: string; chamada?: string; ap: Aparencia; estilo?: { cor?: string; fundo?: "escuro" | "claro" }; idioma?: string }> = ({
  texto,
  chamada,
  ap,
  estilo,
  idioma,
}) => {
  const frame = useCurrentFrame();
  const tema = temaDo(estilo);
  const entra = mola(frame, 0, 24);
  const botao = mola(frame, 16, 24);
  return (
    <AbsoluteFill style={{ backgroundColor: tema.fundo }}>
      <Fundo tema={tema} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "0 200px" }}>
        <div style={{ width: 160 * cresce(frame, 4, 30), height: 6, borderRadius: 3, backgroundColor: tema.destaque }} />
        <div style={{ fontFamily: ap.fonteTitulo, fontWeight: 800, fontSize: 84, lineHeight: 1.08, letterSpacing: "-0.02em", color: tema.texto, textAlign: "center", opacity: entra, translate: `0 ${(1 - entra) * 24}px` }}>
          {semQuebrarNoHifen(texto)}
        </div>
        {chamada && (
          <div style={{ fontFamily: ap.fonteTexto, fontWeight: 500, fontSize: 48, lineHeight: 1.25, color: tema.texto2, textAlign: "center", maxWidth: 1300, opacity: mola(frame, 10, 24) }}>
            {semQuebrarNoHifen(chamada)}
          </div>
        )}
        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: ap.fonteTitulo,
            fontWeight: 800,
            fontSize: 44,
            color: textoSobre(tema.destaque),
            backgroundColor: tema.destaque,
            padding: "16px 48px",
            borderRadius: 999,
            opacity: botao,
            scale: String(0.9 + 0.1 * botao),
          }}
        >
          {semQuebrarNoHifen(textosDoIdioma(idioma).inscrevase)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
