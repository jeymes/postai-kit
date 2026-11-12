import React from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { Assinatura, Foto, Fundo, Selo } from "../componentes/base";
import { Texto } from "../componentes/texto/Texto";
import { cores, fontes, marca } from "../nucleo/marca";

// Carrossel 4:5 (1080×1350), uma imagem por slide. O renderizar.mts gera um
// JPEG por slide (o Instagram só aceita JPEG). Capa → itens → final.

const slideSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("capa"),
    titulo: z.string(),
    destaque: z.string().optional(),
    subtitulo: z.string().optional(),
    foto: z.string().optional(),
  }),
  z.object({
    tipo: z.literal("item"),
    titulo: z.string(),
    texto: z.string().optional(),
    foto: z.string().optional(),
    preco: z.string().optional(),
  }),
  z.object({
    tipo: z.literal("final"),
    titulo: z.string(),
    texto: z.string().optional(),
  }),
]);

export const carrosselSchema = z.object({
  slides: z.array(slideSchema).min(2).max(10),
  /** Qual slide desenhar (o script passa um por vez) */
  indice: z.number().int().min(0).default(0),
});

export type Carrossel = z.infer<typeof carrosselSchema>;

export const carrosselExemplo: Carrossel = {
  indice: 0,
  slides: [
    { tipo: "capa", titulo: "Os 3 mais pedidos da semana", destaque: "mais pedidos", subtitulo: "Arraste para o lado" },
    { tipo: "item", titulo: "Pão de queijo da casa", texto: "Sai do forno às 7h", foto: "exemplos/produto.svg", preco: "R$ 2,50" },
    { tipo: "final", titulo: "Qual é o seu favorito?", texto: "Comenta aqui embaixo" },
  ],
};

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

export const Carrossel: React.FC<Carrossel> = ({ slides, indice }) => {
  const slide = slides[Math.min(indice, slides.length - 1)];
  const rodape = <Rodape numero={indice + 1} total={slides.length} claro={slide.tipo !== "item"} />;

  if (slide.tipo === "capa") {
    return (
      <Fundo escuro>
        <AbsoluteFill style={{ justifyContent: "center", padding: 90, gap: 40 }}>
          {slide.foto && <Foto src={slide.foto} largura={900} altura={520} zoom={false} />}
          <Texto
            texto={slide.titulo}
            destaque={slide.destaque}
            tamanho={104}
            alinhamento="left"
            cor={cores.textoNoDestaque}
            corDestaque={cores.texto}
          />
          {slide.subtitulo && (
            <Texto texto={`${slide.subtitulo} →`} variante="apoio" alinhamento="left" cor={cores.textoNoDestaque} />
          )}
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
          <Texto
            texto={slide.texto ?? marca.chamada}
            variante="apoio"
            cor={cores.textoNoDestaque}
          />
        </AbsoluteFill>
        {rodape}
      </Fundo>
    );
  }

  return (
    <Fundo>
      <AbsoluteFill
        style={{ padding: 80, paddingTop: 90, paddingBottom: 200, gap: 36, justifyContent: slide.foto ? "flex-start" : "center" }}
      >
        {slide.foto && (
          <div style={{ position: "relative" }}>
            <Foto src={slide.foto} largura={920} altura={slide.texto ? 800 : 880} zoom={false} />
            {slide.preco && (
              <Selo texto={slide.preco} tamanho={58} style={{ position: "absolute", right: 30, bottom: 30 }} />
            )}
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
