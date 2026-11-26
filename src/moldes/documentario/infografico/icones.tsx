// Infográfico: os ícones do kit, desenhados aqui (grade de 24, traço de 1,7,
// pontas redondas, sem preenchimento): o mesmo peso em todos, na cor que o
// gráfico pedir. Nada de biblioteca de fora.

import React from "react";
import type { NomeDoIcone } from "./schema";

const DESENHOS: Record<NomeDoIcone, React.ReactNode> = {
  moeda: (
    <>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M12 6.8v10.4M14.6 9.2c-.5-.8-1.5-1.3-2.6-1.3-1.5 0-2.6.8-2.6 1.9 0 2.7 5.2 1.4 5.2 4.2 0 1.1-1.1 2-2.6 2-1.2 0-2.2-.5-2.7-1.4" />
    </>
  ),
  nota: (
    <>
      <rect x={2.5} y={6} width={19} height={12} rx={2} />
      <circle cx={12} cy={12} r={2.6} />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  "saco-de-dinheiro": (
    <>
      <path d="M9.2 3.5h5.6l-1.6 3h-2.4z" />
      <path d="M10.4 6.5C6.6 8.4 4 12.3 4 15.9a4.6 4.6 0 0 0 4.6 4.6h6.8a4.6 4.6 0 0 0 4.6-4.6c0-3.6-2.6-7.5-6.4-9.4" />
      <path d="M12 10.3v7.4M13.9 11.6c-.4-.5-1.1-.8-1.9-.8-1 0-1.9.6-1.9 1.4 0 2 3.8 1 3.8 3 0 .8-.9 1.5-1.9 1.5-.9 0-1.6-.4-2-1" />
    </>
  ),
  cofre: (
    <>
      <rect x={3} y={4} width={18} height={15} rx={2} />
      <circle cx={12} cy={11.5} r={3.6} />
      <path d="M12 7.9v1.2M12 13.9v1.2M8.4 11.5h1.2M14.4 11.5h1.2M6.5 19v1.5M17.5 19v1.5" />
    </>
  ),
  casa: <path d="M3.5 11 12 4l8.5 7M5.5 9.4V20h13V9.4M10 20v-5.5h4V20" />,
  carro: (
    <>
      <path d="M4.9 17H3.5v-3.6l1.7-4.4a2 2 0 0 1 1.9-1.3h9.8a2 2 0 0 1 1.9 1.3l1.7 4.4V17h-1.4M9.3 17h5.4M3.8 13h16.4" />
      <circle cx={7.1} cy={17} r={2.1} />
      <circle cx={16.9} cy={17} r={2.1} />
    </>
  ),
  pessoa: (
    <>
      <circle cx={12} cy={7.5} r={3.6} />
      <path d="M5 20.5c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </>
  ),
  familia: (
    <>
      <circle cx={7.8} cy={6.8} r={2.6} />
      <circle cx={16.2} cy={6.8} r={2.6} />
      <circle cx={12} cy={13.3} r={1.9} />
      <path d="M3.3 19.5c0-3 2-5.3 4.5-5.3 1 0 1.9.3 2.6.9M20.7 19.5c0-3-2-5.3-4.5-5.3-1 0-1.9.3-2.6.9M9 20.6c0-1.9 1.3-3.3 3-3.3s3 1.4 3 3.3" />
    </>
  ),
  carrinho: (
    <>
      <path d="M2.8 4.5h2.4l2.2 10.2h10.4l2-7.2H6" />
      <circle cx={9} cy={19} r={1.5} />
      <circle cx={16.8} cy={19} r={1.5} />
    </>
  ),
  cartao: (
    <>
      <rect x={2.5} y={5.5} width={19} height={13} rx={2} />
      <path d="M2.5 10h19M6 14.8h4" />
    </>
  ),
  grafico: <path d="M4 4v16h16M7.5 15l3.5-4 3 2.5 5-6M15.6 7.5H19v3.4" />,
  sobe: <path d="M3.5 17l6-6 4 4 7-7.5M15 7.5h5.5V13" />,
  desce: <path d="M3.5 7l6 6 4-4 7 7.5M15 16.5h5.5V11" />,
  porcentagem: (
    <>
      <path d="M18 6 6 18" />
      <circle cx={7.5} cy={7.5} r={2.5} />
      <circle cx={16.5} cy={16.5} r={2.5} />
    </>
  ),
  relogio: (
    <>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M12 7.3V12l3.1 2" />
    </>
  ),
  ampulheta: <path d="M6.5 3.5h11M6.5 20.5h11M7.6 3.5c0 4.6 4.4 5.6 4.4 8.5s-4.4 3.9-4.4 8.5M16.4 3.5c0 4.6-4.4 5.6-4.4 8.5s4.4 3.9 4.4 8.5" />,
  calendario: (
    <>
      <rect x={3.5} y={5} width={17} height={15.5} rx={2} />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.4h.01M12 17.4h.01" />
    </>
  ),
  planeta: (
    <>
      <circle cx={12} cy={12} r={5.8} />
      <ellipse cx={12} cy={12} rx={10.3} ry={3.3} transform="rotate(-22 12 12)" />
    </>
  ),
  globo: (
    <>
      <circle cx={12} cy={12} r={8.5} />
      <ellipse cx={12} cy={12} rx={3.8} ry={8.5} />
      <path d="M3.5 12h17M5 7.6h14M5 16.4h14" />
    </>
  ),
  atomo: (
    <>
      <circle cx={12} cy={12} r={1.4} />
      <ellipse cx={12} cy={12} rx={9.6} ry={3.6} />
      <ellipse cx={12} cy={12} rx={9.6} ry={3.6} transform="rotate(60 12 12)" />
      <ellipse cx={12} cy={12} rx={9.6} ry={3.6} transform="rotate(120 12 12)" />
    </>
  ),
  coracao: <path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />,
  saude: <path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" />,
  raio: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8z" />,
  combustivel: (
    <path d="M5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 14 5v15.5M3.5 20.5h12M7 7h5v4H7zM14 9h1.5a1.5 1.5 0 0 1 1.5 1.5v5.8a1.5 1.5 0 0 0 3 0V8.5L17.6 6" />
  ),
  comida: <path d="M6 3v5.5a2.5 2.5 0 0 0 5 0V3M8.5 3v18M17.5 21V3c-2 1.2-3 3.5-3 6.5V13h3" />,
  celular: (
    <>
      <rect x={7} y={2.5} width={10} height={19} rx={2} />
      <path d="M11 18.5h2" />
    </>
  ),
  banco: <path d="M3 9.5 12 4l9 5.5M4 9.5h16M6 10v7.5M10 10v7.5M14 10v7.5M18 10v7.5M4.5 17.5h15M3.5 20.5h17" />,
  imposto: (
    <>
      <path d="M6 3h8.5L19 7.5V21H6zM14 3v5h5M9.2 17.6l5.6-5.6" />
      <circle cx={9.8} cy={12.4} r={1.1} />
      <circle cx={14.2} cy={17} r={1.1} />
    </>
  ),
  alvo: (
    <>
      <circle cx={12} cy={12} r={8.5} />
      <circle cx={12} cy={12} r={5} />
      <circle cx={12} cy={12} r={1.5} />
    </>
  ),
  maleta: (
    <>
      <rect x={3} y={7.5} width={18} height={12.5} rx={2} />
      <path d="M9 7.5v-2A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2M3 13h18" />
    </>
  ),
  livro: <path d="M12 6.5c-1.8-1.3-4.3-2-7.5-2v13c3.2 0 5.7.7 7.5 2 1.8-1.3 4.3-2 7.5-2v-13c-3.2 0-5.7.7-7.5 2zM12 6.5v13" />,
  fabrica: <path d="M3 20.5V10l5 3v-3l5 3v-3l5 3V4.5h3v16zM2.5 20.5h19M7 17h2M12 17h2" />,
  gota: <path d="M12 3.5s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11z" />,
  arvore: <path d="M12 21v-4.5M12 3.5 6 12h3l-3.5 4.5h13L15 12h3z" />,
  lampada: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.1h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />,
  trofeu: <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0zM7.5 6h-3a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M9.5 17h5v3.5h-5zM8 20.5h8" />,
  bola: (
    <>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M12 8.5l3 2.2-1.1 3.5h-3.8L9 10.7zM12 8.5v-5M15 10.7l4.6-1.6M13.9 14.2l2.8 4M10.1 14.2l-2.8 4M9 10.7 4.4 9.1" />
    </>
  ),
  cadeado: (
    <>
      <rect x={5} y={10.5} width={14} height={10} rx={2} />
      <path d="M8 10.5v-3a4 4 0 0 1 8 0v3M12 14.5v2" />
    </>
  ),
  escudo: <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z" />,
};

/** Um ícone do kit, no tamanho e na cor pedidos (o traço engrossa junto com o tamanho) */
export const Icone: React.FC<{ nome: NomeDoIcone; tamanho: number; cor: string; traco?: number; style?: React.CSSProperties }> = ({
  nome,
  tamanho,
  cor,
  traco = 1.7,
  style,
}) => (
  <svg
    width={tamanho}
    height={tamanho}
    viewBox="0 0 24 24"
    fill="none"
    stroke={cor}
    strokeWidth={traco}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block", overflow: "visible", ...style }}
  >
    {DESENHOS[nome] ?? DESENHOS.grafico}
  </svg>
);
