import React from "react";
import { useCurrentFrame } from "remotion";
import { progresso } from "../../nucleo/animacao";
import { cores, fontes } from "../../nucleo/marca";

type Props = {
  texto: string;
  /** Trecho pintado com a cor de destaque da marca */
  destaque?: string;
  /** titulo ≥ 84px, apoio ≥ 44px (mínimos para 1080px de largura) */
  variante?: "titulo" | "apoio";
  /** Quadro em que a entrada começa */
  inicio?: number;
  tamanho?: number;
  cor?: string;
  /** Cor do trecho destacado (no fundo de destaque, use outra) */
  corDestaque?: string;
  alinhamento?: "left" | "center";
  style?: React.CSSProperties;
};

const ATRASO_PALAVRA = 3;

// Texto que entra palavra a palavra (adaptado do TextoAnimado do Laços).
// Num still (capa, carrossel) basta inicio <= quadro 0 para aparecer inteiro.
export const Texto: React.FC<Props> = ({
  texto,
  destaque,
  variante = "titulo",
  inicio = 0,
  tamanho,
  cor = cores.texto,
  corDestaque = cores.destaque,
  alinhamento = "center",
  style,
}) => {
  const frame = useCurrentFrame();
  const titulo = variante === "titulo";
  const palavras = texto.split(" ");
  const [ini, fim] = intervaloDestaque(palavras, destaque);

  return (
    <div
      style={{
        fontFamily: titulo ? fontes.titulo : fontes.texto,
        fontSize: tamanho ?? (titulo ? 96 : 46),
        fontWeight: titulo ? 800 : 500,
        lineHeight: titulo ? 1.05 : 1.3,
        letterSpacing: titulo ? "-0.02em" : 0,
        color: cor,
        textAlign: alinhamento,
        textWrap: "balance",
        ...style,
      }}
    >
      {palavras.map((palavra, i) => {
        const p = progresso(frame, inicio + i * ATRASO_PALAVRA, 16);
        const destacada = i >= ini && i < fim;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              translate: `0px ${(1 - p) * (titulo ? 36 : 24)}px`,
              color: destacada ? corDestaque : undefined,
              marginRight: "0.25em",
            }}
          >
            {palavra}
          </span>
        );
      })}
    </div>
  );
};

function intervaloDestaque(palavras: string[], destaque?: string): [number, number] {
  if (!destaque) return [-1, -1];
  const alvo = destaque.split(" ");
  for (let i = 0; i + alvo.length <= palavras.length; i++) {
    if (alvo.every((a, j) => limpar(palavras[i + j]) === limpar(a))) return [i, i + alvo.length];
  }
  return [-1, -1];
}

const limpar = (palavra: string) => palavra.toLowerCase().replace(/[.,!?:;"“”]/g, "");
