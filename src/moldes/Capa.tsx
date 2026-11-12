import React from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { Assinatura, Foto, Fundo } from "../componentes/base";
import { Texto } from "../componentes/texto/Texto";

// Capa do vídeo (1080×1920, JPEG). O que importa fica na faixa do meio, que
// a grade do perfil (3:4) não corta.

export const capaSchema = z.object({
  titulo: z.string(),
  destaque: z.string().optional(),
  foto: z.string().optional(),
});

export type Capa = z.infer<typeof capaSchema>;

// Sem foto de propósito: o Remotion completa as props que faltam com estas, e
// uma capa sem foto ganharia a foto de exemplo do produto.
export const capaExemplo: Capa = {
  titulo: "Sexta sem pão de queijo quentinho?",
  destaque: "pão de queijo",
};

export const Capa: React.FC<Capa> = ({ titulo, destaque, foto }) => (
  <Fundo>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 90, gap: 60 }}>
      {foto && <Foto src={foto} largura={820} altura={620} zoom={false} />}
      <Texto texto={titulo} destaque={destaque} tamanho={110} />
      <Assinatura tamanho={110} />
    </AbsoluteFill>
  </Fundo>
);
