import React from "react";

// Figurinos (27/11/2026): o mesmo personagem com roupas diferentes de um episódio
// para outro, para o algoritmo não ver o mesmo vídeo de novo. A identidade fica:
// rosto, cabelo, pele e a COR da roupa são os de sempre; muda o detalhe (estampa,
// casaco ou colete por cima, cachecol, colar). O figurino 0 é o de sempre.
//
// No roteiro: "figurino": 2 (todos) ou { "<id>": 2 }; sem isso, o número do
// "episodio" (ou o título) escolhe sozinho. Desenho próprio: "desenho.figurinos"
// (corpos alternativos que a designer desenha); sem eles, fica o corpo de sempre.

const TRACO = "#2B2340";

export type Figurino = {
  estampa?: "listras" | "bolinhas" | "xadrez";
  casaco?: { cor: string; estilo: "jaqueta" | "colete" };
  acessorio?: { tipo: "cachecol" | "colar" | "gravata"; cor: string };
};

/** Quantos figurinos cada personagem tem (0 = o de sempre) */
export const QUANTOS_FIGURINOS = 5;

const rgb = (hex: string) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const luz = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
export const escurecerCor = (hex: string, quanto: number) => {
  const [r, g, b] = rgb(hex).map((c) => Math.max(0, Math.round(c * (1 - quanto))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
export const clarearCor = (hex: string, quanto: number) => {
  const [r, g, b] = rgb(hex).map((c) => Math.round(c + (255 - c) * quanto));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

/** As cores dos detalhes, tiradas da própria roupa (combinam sem trocar a cor principal) */
function paleta(roupa: string) {
  const clara = luz(roupa) > 0.55;
  return {
    // Jaqueta neutra que contrasta com a blusa (jeans escuro sobre roupa clara; caramelo sobre escura)
    jaqueta: clara ? "#3E5675" : "#B98B5E",
    colete: escurecerCor(roupa, 0.32),
    cachecol: clara ? "#C8553D" : "#F2C14E",
    cachecol2: clara ? "#4F7CAC" : "#E8E1D4",
  };
}

/** O figurino n de alguém (a roupa, a calça e o sapato continuam; o detalhe muda) */
export function figurinoDe(visual: { roupa: string; roupaEstilo?: string }, n: number): Figurino {
  const k = ((Math.round(n) % QUANTOS_FIGURINOS) + QUANTOS_FIGURINOS) % QUANTOS_FIGURINOS;
  const c = paleta(visual.roupa);
  // O blazer já é um casaco: os figurinos dele são de detalhe
  if (visual.roupaEstilo === "blazer")
    return [{}, { acessorio: { tipo: "cachecol", cor: c.cachecol } }, { estampa: "xadrez" }, { acessorio: { tipo: "colar", cor: "#F5E6C8" } }, { estampa: "listras" }][k] as Figurino;
  return [
    {},
    { estampa: "listras" },
    { casaco: { cor: c.jaqueta, estilo: "jaqueta" } },
    { estampa: "bolinhas", acessorio: { tipo: "cachecol", cor: c.cachecol2 } },
    { casaco: { cor: c.colete, estilo: "colete" } },
  ][k] as Figurino;
}

/** Um número estável a partir de um texto (o título escolhe o figurino quando o roteiro não diz) */
export function numeroDoTexto(texto: string) {
  let h = 7;
  for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return h;
}

/** A cor da manga: a do casaco (jaqueta), senão a da roupa */
export const corDaManga = (roupa: string, figurino?: Figurino) => (figurino?.casaco?.estilo === "jaqueta" ? figurino.casaco.cor : roupa);
/** A jaqueta tem manga comprida */
export const mangaComprida = (mangaLonga: boolean | undefined, figurino?: Figurino) => Boolean(mangaLonga || figurino?.casaco?.estilo === "jaqueta");

/**
 * A estampa por cima de uma forma (a blusa), recortada nela. `forma`: o contorno (d de path);
 * `caixa`: [x, y, largura, altura] que cobre a forma.
 */
export const Estampa: React.FC<{ id: string; forma: React.ReactNode; tipo: NonNullable<Figurino["estampa"]>; roupa: string; caixa: [number, number, number, number] }> = ({
  id,
  forma,
  tipo,
  roupa,
  caixa: [x, y, l, a],
}) => {
  const clara = luz(roupa) > 0.55;
  const cor = clara ? escurecerCor(roupa, 0.22) : clarearCor(roupa, 0.32);
  const linhas: React.ReactNode[] = [];
  if (tipo === "listras") for (let yy = y + 18; yy < y + a; yy += 34) linhas.push(<rect key={yy} x={x} y={yy} width={l} height={13} fill={cor} />);
  if (tipo === "bolinhas")
    for (let yy = y + 20, linha = 0; yy < y + a; yy += 36, linha++)
      for (let xx = x + 14 + (linha % 2) * 18; xx < x + l; xx += 36) linhas.push(<circle key={`${xx}-${yy}`} cx={xx} cy={yy} r={6} fill={cor} />);
  if (tipo === "xadrez") {
    for (let yy = y + 20; yy < y + a; yy += 40) linhas.push(<rect key={`h${yy}`} x={x} y={yy} width={l} height={10} fill={cor} opacity={0.75} />);
    for (let xx = x + 16; xx < x + l; xx += 40) linhas.push(<rect key={`v${xx}`} x={xx} y={y} width={10} height={a} fill={cor} opacity={0.75} />);
  }
  return (
    <>
      <defs>
        <clipPath id={id}>{forma}</clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{linhas}</g>
    </>
  );
};

/** O casaco aberto por cima da blusa, no espaço do Boneco (tronco de x 108 a 292, y 360 a 650) */
export const CasacoDoBoneco: React.FC<{ casaco: NonNullable<Figurino["casaco"]>; contorno?: boolean }> = ({ casaco, contorno = true }) => {
  const tr = contorno ? { stroke: TRACO, strokeWidth: 6, strokeLinejoin: "round" as const } : {};
  const colete = casaco.estilo === "colete";
  return (
    <g>
      <path d={`M118 405 Q122 366 166 360 L178 362 L${colete ? 176 : 172} 646 Q140 646 108 640 Z`} fill={casaco.cor} {...tr} />
      <path d={`M282 405 Q278 366 234 360 L222 362 L${colete ? 224 : 228} 646 Q260 646 292 640 Z`} fill={casaco.cor} {...tr} />
      {!colete && (
        <>
          {/* A gola virada */}
          <path d="M166 360 L150 420 L178 410 Z" fill={escurecerCor(casaco.cor, 0.15)} {...tr} strokeWidth={contorno ? 4 : 0} />
          <path d="M234 360 L250 420 L222 410 Z" fill={escurecerCor(casaco.cor, 0.15)} {...tr} strokeWidth={contorno ? 4 : 0} />
          <rect x={126} y={540} width={34} height={8} rx={3} fill={escurecerCor(casaco.cor, 0.2)} />
          <rect x={240} y={540} width={34} height={8} rx={3} fill={escurecerCor(casaco.cor, 0.2)} />
        </>
      )}
      {colete && [470, 530, 590].map((y) => <circle key={y} cx={170} cy={y} r={5} fill={escurecerCor(casaco.cor, 0.3)} />)}
    </g>
  );
};

/** Cachecol, colar ou gravata no pescoço (cx = meio do pescoço, y = base do pescoço) */
export const Acessorio: React.FC<{ acessorio: NonNullable<Figurino["acessorio"]>; cx?: number; y?: number; contorno?: boolean; escala?: number }> = ({
  acessorio,
  cx = 200,
  y = 366,
  contorno = true,
  escala = 1,
}) => {
  const tr = contorno ? { stroke: TRACO, strokeWidth: 5, strokeLinejoin: "round" as const } : {};
  return (
    <g transform={`translate(${cx} ${y}) scale(${escala}) translate(${-cx} ${-y})`}>
      {acessorio.tipo === "cachecol" && (
        <>
          <path d={`M${cx - 44} ${y - 14} Q${cx} ${y + 22} ${cx + 44} ${y - 14} L${cx + 46} ${y + 8} Q${cx} ${y + 44} ${cx - 46} ${y + 8} Z`} fill={acessorio.cor} {...tr} />
          <path d={`M${cx + 14} ${y + 18} L${cx + 34} ${y + 104} L${cx + 6} ${y + 108} L${cx - 2} ${y + 22} Z`} fill={acessorio.cor} {...tr} />
          <path d={`M${cx + 10} ${y + 96} L${cx + 32} ${y + 92}`} stroke={escurecerCor(acessorio.cor, 0.25)} strokeWidth={5} />
        </>
      )}
      {acessorio.tipo === "colar" &&
        [-34, -22, -10, 0, 10, 22, 34].map((d) => <circle key={d} cx={cx + d} cy={y + 18 - Math.abs(d) * 0.3} r={6} fill={acessorio.cor} {...tr} strokeWidth={contorno ? 2.5 : 0} />)}
      {acessorio.tipo === "gravata" && (
        <path d={`M${cx - 9} ${y} L${cx + 9} ${y} L${cx + 13} ${y + 90} L${cx} ${y + 108} L${cx - 13} ${y + 90} Z`} fill={acessorio.cor} {...tr} />
      )}
    </g>
  );
};
