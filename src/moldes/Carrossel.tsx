import { loadFont as playfair } from "@remotion/google-fonts/PlayfairDisplay";
import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { z } from "zod";
import { arquivo, Assinatura, Foto, Fundo, Selo } from "../componentes/base";
import { useConferirTexto } from "../componentes/conferir";
import { Texto } from "../componentes/texto/Texto";
import { cores, fontes, marca } from "../nucleo/marca";

// Carrossel 4:5 (1080×1350), uma imagem por slide. O renderizar.mts gera um
// JPEG por slide (o Instagram só aceita JPEG). Capa → itens → final.
//
// Modelos (24/11/2026, escolhidos pelo dono num protótipo):
//   foto-frase  foto de fundo escurecida embaixo, título grande com destaque
//   dicas       fundo da marca, itens com ✓ (checklist) ou dica numerada
//   versiculo   pintura escurecida e a citação em dourado, com a referência
//   post        print de um post da marca (opinião, frase forte)
//   produto     o de antes: foto do produto, preço
// Tudo na marca do canal (marca/marca.json): cores, fontes, logo e @.

const { fontFamily: SERIFA } = playfair("italic", { subsets: ["latin"] });

export const MODELOS_DO_CARROSSEL = ["foto-frase", "dicas", "versiculo", "post", "produto"] as const;
export type ModeloDoCarrossel = (typeof MODELOS_DO_CARROSSEL)[number];

const base = {
  titulo: z.string().max(140),
  destaque: z.string().max(40).optional().describe("Trecho do título na cor de destaque (copie igual ao título)"),
  texto: z.string().max(220).optional(),
  foto: z.string().optional().describe("Imagem de fundo (foto-frase, versiculo) ou dentro do slide (post, produto), de public/ ou https"),
  rotulo: z.string().max(30).optional().describe('Etiqueta pequena em cima (ex.: "CASAMENTO", "90 DIAS ANTES")'),
};

const slideSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("capa"),
    ...base,
    subtitulo: z.string().max(60).optional().describe('Ex.: "Arraste para o lado"'),
    referencia: z.string().max(40).optional().describe('Versículo: "Marcos 4:39"'),
  }),
  z.object({
    tipo: z.literal("item"),
    ...base,
    numero: z.string().max(4).optional().describe("Número grande da dica (foto-frase, dicas)"),
    itens: z.array(z.string().max(60)).max(6).optional().describe("Dicas: a lista com ✓ (até 6)"),
    marcados: z.number().int().min(0).max(6).optional().describe("Dicas: quantos itens da lista saem marcados (os primeiros); sem ele, todos"),
    referencia: z.string().max(40).optional(),
    preco: z.string().max(20).optional(),
  }),
  z.object({
    tipo: z.literal("final"),
    ...base,
    botao: z.string().max(30).optional().describe('O que fazer agora, ex.: "Salve para depois", "Link na bio"'),
  }),
]);

export const carrosselSchema = z.object({
  modelo: z.enum(MODELOS_DO_CARROSSEL).default("produto"),
  slides: z.array(slideSchema).min(2).max(10),
  /** Qual slide desenhar (o script passa um por vez) */
  indice: z.number().int().min(0).default(0),
});
export type Carrossel = z.infer<typeof carrosselSchema>;
type Slide = Carrossel["slides"][number];

export const carrosselExemplo: Carrossel = {
  modelo: "produto",
  indice: 0,
  slides: [
    { tipo: "capa", titulo: "Os 3 mais pedidos da semana", destaque: "mais pedidos", subtitulo: "Arraste para o lado" },
    { tipo: "item", titulo: "Pão de queijo da casa", texto: "Sai do forno às 7h", foto: "exemplos/produto.svg", preco: "R$ 2,50" },
    { tipo: "final", titulo: "Qual é o seu favorito?", texto: "Comenta aqui embaixo" },
  ],
};

const W = 1080;
const H = 1350;
const MARGEM = 80;

/** A letra encolhe com o texto: até `curto` letras fica no tamanho cheio, a partir de `longo` fica no mínimo */
const letra = (texto: string | undefined, cheio: number, minimo: number, curto: number, longo: number) => {
  const n = (texto ?? "").length;
  if (n <= curto) return cheio;
  if (n >= longo) return minimo;
  return Math.round(cheio - ((n - curto) / (longo - curto)) * (cheio - minimo));
};

/** O @ da marca (ou o nome) e o número do slide, no pé */
const Pe: React.FC<{ indice: number; total: number; cor: string }> = ({ indice, total, cor }) => (
  <div
    style={{
      position: "absolute",
      left: MARGEM,
      right: MARGEM,
      bottom: 52,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontFamily: fontes.texto,
      fontWeight: 700,
      fontSize: 28,
      color: cor,
    }}
  >
    <span>{marca.instagram || marca.nome}</span>
    {indice > 0 && (
      <span>
        {indice + 1}/{total}
      </span>
    )}
  </div>
);

/** Título com o trecho de destaque colorido, medido pela conferência */
const Titulo: React.FC<{ slide: Slide; tamanho: number; cor: string; corDestaque: string }> = ({ slide, tamanho, cor, corDestaque }) => {
  const medida = useConferirTexto<HTMLDivElement>("titulo");
  const { titulo, destaque } = slide;
  const partes = destaque && titulo.includes(destaque) ? titulo.split(destaque) : null;
  return (
    <div ref={medida} style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: tamanho, lineHeight: 1.04, letterSpacing: "-0.01em", color: cor, textWrap: "balance" }}>
      {partes ? (
        <>
          {partes[0]}
          <span style={{ color: corDestaque }}>{destaque}</span>
          {partes.slice(1).join(destaque)}
        </>
      ) : (
        titulo
      )}
    </div>
  );
};

const TextoDeApoio: React.FC<{ texto?: string; cor: string; tamanho?: number; style?: React.CSSProperties }> = ({ texto, cor, tamanho = 38, style }) => {
  const medida = useConferirTexto<HTMLDivElement>("texto");
  if (!texto) return null;
  return (
    <div ref={medida} style={{ fontFamily: fontes.texto, fontWeight: 500, fontSize: tamanho, lineHeight: 1.35, color: cor, ...style }}>
      {texto}
    </div>
  );
};

const Rotulo: React.FC<{ texto?: string; cor: string; fundo?: string }> = ({ texto, cor, fundo }) =>
  texto ? (
    <div
      style={{
        alignSelf: "flex-start",
        fontFamily: fontes.titulo,
        fontWeight: 800,
        fontSize: 32,
        letterSpacing: 3,
        textTransform: "uppercase",
        color: cor,
        ...(fundo ? { background: fundo, borderRadius: 999, padding: "10px 28px" } : {}),
      }}
    >
      {texto}
    </div>
  ) : null;

/** O botão do slide final (o que fazer agora) */
const Botao: React.FC<{ texto?: string; fundo: string; cor: string }> = ({ texto, fundo, cor }) =>
  texto ? (
    <div style={{ alignSelf: "flex-start", background: fundo, color: cor, borderRadius: 999, padding: "20px 44px", fontFamily: fontes.titulo, fontWeight: 800, fontSize: 44 }}>{texto}</div>
  ) : null;

type Desenho = React.FC<{ slide: Slide; indice: number; total: number }>;

// ---------------------------------------------------------------- foto-frase
const FotoFrase: Desenho = ({ slide, indice, total }) => {
  const final = slide.tipo === "final";
  const item = slide.tipo === "item" ? slide : null;
  return (
    <AbsoluteFill style={{ background: "#1C1517" }}>
      {slide.foto && <Img src={arquivo(slide.foto)} style={{ width: W, height: H, objectFit: "cover" }} />}
      <AbsoluteFill
        style={{
          background: final ? "rgba(18,12,14,0.72)" : "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(18,10,14,0.55) 55%, rgba(18,10,14,0.9) 100%)",
        }}
      />
      <AbsoluteFill style={{ justifyContent: final ? "center" : "flex-end", padding: `${MARGEM}px ${MARGEM}px 140px`, gap: 22 }}>
        <Rotulo texto={slide.rotulo} cor={cores.destaque} />
        {item?.numero && <div style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: 170, lineHeight: 0.9, color: cores.destaque }}>{item.numero}</div>}
        <Titulo slide={slide} tamanho={letra(slide.titulo, slide.tipo === "capa" ? 100 : 76, 56, 28, 110)} cor="#FFFFFF" corDestaque={cores.destaque} />
        <TextoDeApoio texto={slide.texto} cor="rgba(255,255,255,0.92)" />
        {slide.tipo === "capa" && slide.subtitulo && <TextoDeApoio texto={`${slide.subtitulo} →`} cor="rgba(255,255,255,0.85)" tamanho={34} />}
        {final && (
          <>
            <Botao texto={slide.botao} fundo={cores.destaque} cor={cores.textoNoDestaque} />
            <div style={{ marginTop: 20 }}>
              <Assinatura tamanho={90} cor="#FFFFFF" />
            </div>
          </>
        )}
      </AbsoluteFill>
      <Pe indice={indice} total={total} cor="rgba(255,255,255,0.85)" />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- dicas
const Dicas: Desenho = ({ slide, indice, total }) => {
  const item = slide.tipo === "item" ? slide : null;
  const lista = item?.itens ?? [];
  const marcados = item?.marcados ?? lista.length;
  const capa = slide.tipo === "capa";
  const final = slide.tipo === "final";
  const medidaLista = useConferirTexto<HTMLDivElement>("lista");
  return (
    <AbsoluteFill style={{ background: final ? cores.destaque : cores.fundo }}>
      <AbsoluteFill style={{ padding: `${MARGEM + 20}px ${MARGEM}px 150px`, gap: 30, justifyContent: lista.length ? "flex-start" : "center" }}>
        <Rotulo texto={slide.rotulo} cor={capa || final ? cores.textoNoDestaque : cores.destaque} fundo={capa ? cores.destaque : undefined} />
        {item?.numero && !lista.length && (
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 999,
              background: cores.destaque,
              color: cores.textoNoDestaque,
              fontFamily: fontes.titulo,
              fontWeight: 800,
              fontSize: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.numero}
          </div>
        )}
        <Titulo
          slide={slide}
          tamanho={letra(slide.titulo, capa ? 108 : lista.length ? 64 : 84, lista.length ? 48 : 56, 24, 110)}
          cor={final ? cores.textoNoDestaque : cores.texto}
          corDestaque={final ? cores.texto : cores.destaque}
        />
        <TextoDeApoio texto={slide.texto} cor={final ? cores.textoNoDestaque : cores.textoSuave} />
        {lista.length > 0 && (
          <div ref={medidaLista} style={{ display: "flex", flexDirection: "column", gap: lista.length > 4 ? 18 : 26 }}>
            {lista.map((t, i) => {
              const feito = i < marcados;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 28,
                    background: cores.superficie,
                    borderRadius: 30,
                    padding: lista.length > 4 ? "24px 34px" : "32px 38px",
                    boxShadow: "0 6px 0 rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 66,
                      height: 66,
                      borderRadius: 999,
                      border: feito ? "none" : `5px solid ${cores.destaque}`,
                      boxSizing: "border-box",
                      background: feito ? cores.destaque : "transparent",
                      color: cores.textoNoDestaque,
                      fontSize: 40,
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {feito ? "✓" : ""}
                  </div>
                  <div style={{ fontFamily: fontes.titulo, fontWeight: 700, fontSize: letra(t, 46, 36, 22, 60), lineHeight: 1.15, color: cores.texto }}>{t}</div>
                </div>
              );
            })}
          </div>
        )}
        {capa && slide.subtitulo && <TextoDeApoio texto={slide.subtitulo} cor={cores.textoSuave} tamanho={36} />}
        {final && (
          <>
            <Botao texto={slide.botao} fundo={cores.texto} cor={cores.fundo} />
            <div style={{ marginTop: 10 }}>
              <Assinatura tamanho={90} cor={cores.textoNoDestaque} />
            </div>
          </>
        )}
      </AbsoluteFill>
      <Pe indice={indice} total={total} cor={final ? cores.textoNoDestaque : cores.textoSuave} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- versiculo
const OURO = "#D9A441";
const CREME = "#F5EBDD";
const Versiculo: Desenho = ({ slide, indice, total }) => {
  const referencia = slide.tipo === "final" ? undefined : slide.referencia;
  const final = slide.tipo === "final";
  const medida = useConferirTexto<HTMLDivElement>("citacao");
  return (
    <AbsoluteFill style={{ background: "#14110F" }}>
      {slide.foto && <Img src={arquivo(slide.foto)} style={{ width: W, height: H, objectFit: "cover", opacity: 0.6, filter: "sepia(0.25)" }} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(20,17,15,0.4) 0%, rgba(20,17,15,0.92) 82%)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "100px 110px 150px", textAlign: "center", gap: 10 }}>
        {slide.rotulo && (
          <div style={{ fontFamily: fontes.texto, fontWeight: 700, fontSize: 30, letterSpacing: 5, color: OURO, textTransform: "uppercase", marginBottom: 30 }}>{slide.rotulo}</div>
        )}
        {!final && <div style={{ fontFamily: SERIFA, fontSize: 170, lineHeight: 0.55, color: OURO }}>“</div>}
        <div ref={medida} style={{ fontFamily: SERIFA, fontStyle: "italic", fontSize: letra(slide.titulo, final ? 72 : 78, 50, 40, 140), lineHeight: 1.25, color: CREME, textWrap: "balance" }}>
          {slide.titulo}
        </div>
        {referencia && (
          <>
            <div style={{ width: 120, height: 4, background: OURO, margin: "44px 0 24px" }} />
            <div style={{ fontFamily: fontes.texto, fontSize: 34, letterSpacing: 4, color: "#B8A88F", textTransform: "uppercase" }}>{referencia}</div>
          </>
        )}
        <TextoDeApoio texto={slide.texto} cor="#CFC2AE" tamanho={36} style={{ marginTop: 30 }} />
        {final && (
          <>
            {slide.botao && (
              <div style={{ marginTop: 40, border: `3px solid ${OURO}`, color: OURO, borderRadius: 999, padding: "18px 44px", fontFamily: fontes.texto, fontWeight: 700, fontSize: 38 }}>
                {slide.botao}
              </div>
            )}
            <div style={{ marginTop: 40 }}>
              <Assinatura tamanho={80} cor={CREME} />
            </div>
          </>
        )}
      </AbsoluteFill>
      <Pe indice={indice} total={total} cor="#B8A88F" />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- post
const Post: Desenho = ({ slide, indice, total }) => {
  const capa = slide.tipo === "capa";
  const final = slide.tipo === "final";
  const medida = useConferirTexto<HTMLDivElement>("post");
  const comFoto = Boolean(slide.foto) && !final;
  return (
    <AbsoluteFill style={{ background: capa || final ? cores.destaque : cores.fundo, justifyContent: "center", padding: `${MARGEM}px 70px 140px` }}>
      <div style={{ background: "#FFFFFF", borderRadius: 40, padding: 56, boxShadow: "0 24px 60px rgba(0,0,0,0.16)", fontFamily: fontes.texto, color: "#16131A" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 999,
              overflow: "hidden",
              background: cores.destaque,
              color: cores.textoNoDestaque,
              fontFamily: fontes.titulo,
              fontWeight: 800,
              fontSize: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {marca.logo ? <Img src={marca.logo} style={{ width: "100%", height: "100%", objectFit: "contain", background: "#fff" }} /> : marca.nome.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 38, fontWeight: 800 }}>{marca.nome}</div>
            {marca.instagram && <div style={{ fontSize: 30, color: "#6B6470" }}>{marca.instagram}</div>}
          </div>
        </div>
        <div ref={medida} style={{ fontSize: letra(slide.titulo, comFoto ? 46 : capa ? 64 : 54, 38, 50, 140), fontWeight: capa ? 700 : 600, lineHeight: 1.3, marginTop: 34 }}>
          {slide.titulo}
        </div>
        {slide.texto && <div style={{ fontSize: 36, lineHeight: 1.35, color: "#4A4550", marginTop: 20 }}>{slide.texto}</div>}
        {comFoto && slide.foto && <Img src={arquivo(slide.foto)} style={{ width: "100%", height: 420, objectFit: "cover", borderRadius: 24, marginTop: 30 }} />}
        {final && slide.botao && (
          <div style={{ marginTop: 34, display: "inline-block", background: cores.destaque, color: cores.textoNoDestaque, borderRadius: 999, padding: "16px 40px", fontWeight: 800, fontSize: 38 }}>
            {slide.botao}
          </div>
        )}
      </div>
      <Pe indice={indice} total={total} cor={capa || final ? cores.textoNoDestaque : cores.textoSuave} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- produto (o de antes)
const Rodape: React.FC<{ numero: number; total: number; claro?: boolean }> = ({ numero, total, claro }) => (
  <div
    style={{
      position: "absolute",
      left: 80,
      right: 80,
      bottom: 60,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontFamily: fontes.texto,
      fontWeight: 600,
      fontSize: 30,
      color: claro ? cores.textoNoDestaque : cores.textoSuave,
    }}
  >
    <Assinatura tamanho={70} cor={claro ? cores.textoNoDestaque : cores.texto} />
    <span>
      {numero}/{total}
    </span>
  </div>
);

const Produto: Desenho = ({ slide, indice, total }) => {
  const rodape = <Rodape numero={indice + 1} total={total} claro={slide.tipo !== "item"} />;
  if (slide.tipo === "capa") {
    return (
      <Fundo escuro>
        <AbsoluteFill style={{ justifyContent: "center", padding: 90, gap: 40 }}>
          {slide.foto && <Foto src={slide.foto} largura={900} altura={520} zoom={false} />}
          <Texto texto={slide.titulo} destaque={slide.destaque} tamanho={104} alinhamento="left" cor={cores.textoNoDestaque} corDestaque={cores.texto} />
          {slide.subtitulo && <Texto texto={`${slide.subtitulo} →`} variante="apoio" alinhamento="left" cor={cores.textoNoDestaque} />}
        </AbsoluteFill>
        {rodape}
      </Fundo>
    );
  }
  if (slide.tipo === "final") {
    return (
      <Fundo escuro>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 90, gap: 40 }}>
          <Texto texto={slide.titulo} tamanho={104} cor={cores.textoNoDestaque} />
          <Texto texto={slide.texto ?? marca.chamada} variante="apoio" cor={cores.textoNoDestaque} />
        </AbsoluteFill>
        {rodape}
      </Fundo>
    );
  }
  return (
    <Fundo>
      <AbsoluteFill style={{ padding: 80, paddingTop: 90, paddingBottom: 200, gap: 36, justifyContent: slide.foto ? "flex-start" : "center" }}>
        {slide.foto && (
          <div style={{ position: "relative" }}>
            <Foto src={slide.foto} largura={920} altura={slide.texto ? 800 : 880} zoom={false} />
            {slide.preco && <Selo texto={slide.preco} tamanho={58} style={{ position: "absolute", right: 30, bottom: 30 }} />}
          </div>
        )}
        <Texto texto={slide.titulo} tamanho={slide.foto ? 72 : 100} alinhamento="left" />
        {slide.texto && <Texto texto={slide.texto} variante="apoio" alinhamento="left" cor={cores.textoSuave} />}
        {!slide.foto && slide.preco && <Selo texto={slide.preco} tamanho={64} />}
      </AbsoluteFill>
      {rodape}
    </Fundo>
  );
};

const DESENHOS: Record<ModeloDoCarrossel, Desenho> = {
  "foto-frase": FotoFrase,
  dicas: Dicas,
  versiculo: Versiculo,
  post: Post,
  produto: Produto,
};

export const Carrossel: React.FC<Carrossel> = ({ modelo = "produto", slides, indice }) => {
  const i = Math.min(indice, slides.length - 1);
  const Escolhido = DESENHOS[modelo] ?? Produto;
  return <Escolhido slide={slides[i]} indice={i} total={slides.length} />;
};
