// Ilustração da fala: os ícones. Os 39 do infográfico (finanças, ciência,
// casa, tempo) e mais estes, para os outros nichos (Bíblia, casamento) e para
// reagir (certo, errado, pergunta, alerta). Mesma grade de 24 e o mesmo traço
// do infográfico: tudo parece da mesma mão.

import React from "react";
import { Icone } from "../../moldes/documentario/infografico/icones";
import type { NomeDoIcone } from "../../moldes/documentario/infografico/schema";
import { ICONES_EXTRAS, type IconeDaFala } from "./schema";

type Extra = (typeof ICONES_EXTRAS)[number];

const EXTRAS: Record<Extra, React.ReactNode> = {
  coroa: (
    <>
      <path d="M3.5 8 7.5 12l4.5-6 4.5 6 4-4-1.8 10H5.3z" />
      <path d="M5.5 20.5h13" />
    </>
  ),
  pomba: (
    <>
      <path d="M3 13.5c2.6.2 4.6-.6 6-2.6l2.2-3.4c.9-1.4 2.6-2 4.1-1.4l1.2.5 3 .4-2.4 1.6c.3 3.6-1.3 6.6-4.4 8.2-2.4 1.2-5.4 1.2-7.9.1z" />
      <path d="M9.5 11 13 4.5c.3 2.2-.1 4-1.3 5.6M16 7.6h.01" />
    </>
  ),
  pao: (
    <>
      <path d="M4 15.5c-1.4-3.3 1.6-7 8-7s9.4 3.7 8 7c-.5 1.2-1.7 2-3 2H7c-1.3 0-2.5-.8-3-2z" />
      <path d="M8.5 10.5l-1.5 3M12.3 10l-1.3 3.5M16 10.5l-1 3" />
    </>
  ),
  peixe: (
    <>
      <path d="M3 12c2.8-3.6 6-5.4 9.4-5.4 3.4 0 6 2.2 7.6 5.4-1.6 3.2-4.2 5.4-7.6 5.4C9 17.4 5.8 15.6 3 12z" />
      <path d="M3 12 1.5 8.5M3 12l-1.5 3.5M16 10.6h.01M10.5 8.5c.8 2.3.8 4.7 0 7" />
    </>
  ),
  estrela: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />,
  fogo: (
    <>
      <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.4-5.4 3.6-8.4.5 1.9 1.4 3 2.6 3.6.2-2.6 1.3-4.8 3.3-6.6.1 3.1 1.6 5 2.8 6.7 1 1.4 1.7 2.9 1.7 4.7C19.5 18.4 15.9 21 12 21z" />
      <path d="M12 21c-1.7 0-2.9-1.1-2.9-2.7 0-1.9 1.7-2.7 2.3-4.4 1.5 1.1 3.5 2.4 3.5 4.4 0 1.6-1.2 2.7-2.9 2.7z" />
    </>
  ),
  chave: (
    <>
      <circle cx={7.5} cy={12} r={4} />
      <path d="M11.5 12h9M17.5 12v3.2M20.5 12v2.4" />
    </>
  ),
  pergaminho: (
    <>
      <path d="M6.5 4.5h11a2 2 0 0 1 2 2v.5h-3M6.5 4.5a2 2 0 0 0-2 2v.5h3V19.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V18h-3" />
      <path d="M16.5 7v11M10.5 10h3.5M10.5 13.5h3.5" />
    </>
  ),
  sol: (
    <>
      <circle cx={12} cy={12} r={4.2} />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </>
  ),
  lua: <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z" />,
  montanha: (
    <>
      <path d="M2.5 19.5 9 8.5l4 6.2 2.4-3.4 6.1 8.2z" />
      <path d="m7.1 11.7 1.9 1.4 1.6-1.6" />
    </>
  ),
  anel: (
    <>
      <circle cx={12} cy={15} r={5.5} />
      <path d="m9.5 7.5 2.5-3.5 2.5 3.5-2.5 2z" />
    </>
  ),
  taca: (
    <>
      <path d="M7 3.5h10l-.6 5a4.4 4.4 0 0 1-8.8 0z" />
      <path d="M12 13v7M8.5 20.5h7M7.5 7.5h9" />
    </>
  ),
  presente: (
    <>
      <rect x={3.5} y={8.5} width={17} height={4} rx={1} />
      <path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5C10.6 5.4 7.4 4.5 7 6.6c-.3 1.6 2.4 1.9 5 1.9zM12 8.5c1.4-3.1 4.6-4 5-1.9.3 1.6-2.4 1.9-5 1.9z" />
    </>
  ),
  envelope: (
    <>
      <rect x={3} y={5.5} width={18} height={13} rx={2} />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </>
  ),
  certo: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="m7.8 12.3 2.8 2.8 5.6-6" />
    </>
  ),
  errado: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="m8.8 8.8 6.4 6.4M15.2 8.8l-6.4 6.4" />
    </>
  ),
  pergunta: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="M9.4 9.4a2.7 2.7 0 1 1 3.8 2.5c-.8.4-1.2 1-1.2 1.8v.5M12 17h.01" />
    </>
  ),
  alerta: (
    <>
      <path d="M10.3 4.2 2.6 17.6A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-2.9L13.7 4.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4.5M12 17h.01" />
    </>
  ),
};

const ehExtra = (nome: string): nome is Extra => nome in EXTRAS;

/** Um ícone da ilustração (do infográfico ou dos extras), no tamanho e na cor pedidos */
export const DesenhoDoIcone: React.FC<{ nome: IconeDaFala; tamanho: number; cor: string; traco?: number; style?: React.CSSProperties }> = ({ nome, tamanho, cor, traco = 1.7, style }) =>
  ehExtra(nome) ? (
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
      {EXTRAS[nome]}
    </svg>
  ) : (
    <Icone nome={nome as NomeDoIcone} tamanho={tamanho} cor={cor} traco={traco} style={style} />
  );
