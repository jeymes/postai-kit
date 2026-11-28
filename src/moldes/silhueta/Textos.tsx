// Silhueta: as letras. O título serifado com a palavra dourada em itálico e
// sublinhada (e o sobretítulo pequeno em versal), a legenda karaokê sem caixa
// (letra clara, a palavra falada dourada, sombra suave), os mini-diagramas na
// palavra dita (A → B, lista 01/02/03, isto | aquilo) e a chamada do começo.

import { loadFont as ebGaramond } from "@remotion/google-fonts/EBGaramond";
import React from "react";
import { Easing, interpolate } from "remotion";
import { SeloDaMarca } from "../../componentes/cenas/ChamadaAnimada";
import { quadroDaPalavra, type PalavraNoTempo } from "../../componentes/ilustracao/tempo";
import { paginar } from "../../componentes/texto/paginar";
import { normalizarPalavra } from "../documentario/infografico/numeros";
import type { CoresDaCena } from "./cores";
import type { DiagramaDaSilhueta } from "./schema";

const SUBCONJUNTOS = { subsets: ["latin", "latin-ext"] as Array<"latin" | "latin-ext"> };
// EB Garamond: a Cormorant Garamond desenhava o acento circunflexo fora do lugar
// ("silêncio", "você") no Chrome do render (28/11/2026)
export const SERIFA = ebGaramond("normal", { weights: ["500", "600", "700"], ...SUBCONJUNTOS }).fontFamily;
ebGaramond("italic", { weights: ["600", "700"], ...SUBCONJUNTOS });

const entrar = (t: number, de: number, duracao = 14) => interpolate(t, [de, de + duracao], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

/** Sombra para ler em qualquer céu: escura atrás da letra clara, clara atrás da escura */
const sombraDe = (tinta: string) =>
  tinta.toUpperCase() === "#F8F0DF" ? "0 2px 18px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.35)" : "0 1px 14px rgba(255,248,232,0.55)";

const limpa = (p: string) => normalizarPalavra(p);

/** Sobretítulo e rótulo: pequeno, em versal espaçada, entre dois fios */
export const Versal: React.FC<{ texto: string; cor: string; fio?: string; opacidade?: number; tamanho?: number }> = ({ texto, cor, fio = cor, opacidade = 1, tamanho = 30 }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22, opacity: opacidade }}>
    <div style={{ width: 46, height: 2, background: fio, opacity: 0.8 }} />
    <div style={{ fontFamily: SERIFA, fontWeight: 700, fontSize: tamanho, letterSpacing: "0.32em", textTransform: "uppercase", color: cor, paddingLeft: "0.32em" }}>{texto}</div>
    <div style={{ width: 46, height: 2, background: fio, opacity: 0.8 }} />
  </div>
);

/** O véu macio atrás das letras do alto: o céu nunca apaga o texto (laranja do entardecer, raio de luz) */
const veuAtras = (veu: string, forca = 0.42): React.CSSProperties => {
  const n = parseInt(veu.replace("#", ""), 16) || 0;
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  return { background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(${rgb},${forca}) 0%, rgba(${rgb},${forca * 0.55}) 45%, rgba(${rgb},0) 100%)` };
};

/** O tamanho da letra do título pelo comprimento (até 3 linhas na largura da tela) */
export const tamanhoDoTitulo = (titulo: string) => (titulo.length > 44 ? 80 : titulo.length > 30 ? 92 : 104);
/** A altura que o título ocupa (para o diagrama não cair em cima dele) */
export function alturaDoTitulo(titulo: string, sobretitulo?: string) {
  const tamanho = tamanhoDoTitulo(titulo);
  const porLinha = Math.floor(900 / (tamanho * 0.47));
  let linhas = 1;
  let usado = 0;
  for (const p of titulo.split(/\s+/)) {
    if (usado && usado + 1 + p.length > porLinha) {
      linhas++;
      usado = p.length;
    } else usado += (usado ? 1 : 0) + p.length;
  }
  return linhas * tamanho * 1.04 + (sobretitulo ? 64 : 0);
}

/**
 * O título. `grande` vai de 0 (pequeno no alto) a 1 (grande); `desde` é o
 * quadro em que ele começou a entrar (as palavras chegam uma a uma).
 */
export const Titulo: React.FC<{
  titulo: string;
  sobretitulo?: string;
  destaque?: string;
  cores: Pick<CoresDaCena, "tinta" | "tintaSuave" | "ouro" | "veu">;
  t: number;
  grande: number;
  opacidade?: number;
  topo?: number;
  escalaExtra?: number;
  abaixo?: React.ReactNode;
}> = ({ titulo, sobretitulo, destaque, cores, t, grande, opacidade = 1, topo = 230, escalaExtra = 1, abaixo }) => {
  const marcadas = new Set((destaque ?? "").split(/\s+/).map(limpa).filter(Boolean));
  const palavras = titulo.split(/\s+/).filter(Boolean);
  const tamanho = tamanhoDoTitulo(titulo) * escalaExtra;
  const escala = 0.42 + 0.58 * grande;
  const y = interpolate(grande, [0, 1], [86, topo]);
  const sombra = sombraDe(cores.tinta);
  // O sublinhado dourado corre depois que a última palavra entrou
  const ultimaEntra = 4 + palavras.length * 3;
  const sublinha = entrar(t, ultimaEntra + 6, 16);
  return (
    <div style={{ position: "absolute", top: y, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", opacity: opacidade }}>
      <div style={{ transform: `scale(${escala})`, transformOrigin: "50% 0%", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "40px 80px", margin: "-40px -80px", ...veuAtras(cores.veu, 0.38) }}>
        {sobretitulo && <Versal texto={sobretitulo} cor={cores.tintaSuave} fio={cores.ouro} opacidade={entrar(t, 0, 12) * interpolate(grande, [0.4, 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />}
        <div style={{ fontFamily: SERIFA, fontWeight: 600, fontSize: tamanho, lineHeight: 1.04, textAlign: "center", color: cores.tinta, textShadow: sombra, letterSpacing: "-0.005em" }}>
          {palavras.map((p, i) => {
            const dourada = marcadas.has(limpa(p));
            const e = entrar(t, 4 + i * 3, 12);
            return (
              <React.Fragment key={i}>
                <span
                  style={{
                    display: "inline-block",
                    position: "relative",
                    opacity: e,
                    transform: `translateY(${(1 - e) * 18}px)`,
                    ...(dourada ? { color: cores.ouro, fontStyle: "italic", fontWeight: 700 } : {}),
                  }}
                >
                  {p}
                  {dourada && (
                    <span
                      style={{
                        position: "absolute",
                        left: "4%",
                        right: /[?!.,]$/.test(p) ? "18%" : "4%",
                        bottom: "0.02em",
                        height: Math.max(4, tamanho * 0.045),
                        borderRadius: 4,
                        background: cores.ouro,
                        transform: `scaleX(${sublinha})`,
                        transformOrigin: "0% 50%",
                      }}
                    />
                  )}
                </span>{" "}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {abaixo}
    </div>
  );
};

/** A chamada do começo: o selo da marca e o texto numa pílula escura de fio dourado (some antes da virada) */
export const ChamadaInicial: React.FC<{ texto: string; ouro: string; t: number; sai?: number }> = ({ texto, ouro, t, sai = 105 }) => {
  const dentro = entrar(t, 10, 14) * (1 - entrar(t, sai, 12));
  if (dentro <= 0.01) return null;
  return (
    <div style={{ marginTop: 30, opacity: dentro, transform: `translateY(${(1 - dentro) * 16}px)` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 30px 10px 12px",
          borderRadius: 60,
          background: "rgba(16,12,8,0.62)",
          border: `2px solid ${ouro}`,
          boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
        }}
      >
        <SeloDaMarca tamanho={58} contorno={3} />
        <span style={{ fontFamily: SERIFA, fontWeight: 700, fontSize: texto.length > 26 ? 36 : 42, color: "#F8F0DF", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>{texto}</span>
      </div>
    </div>
  );
};

// ---- Legenda karaokê ----

export type PalavraDaLegenda = { texto: string; inicioMs: number; fimMs: number; nova?: boolean; fimDeFrase?: boolean; destaque?: boolean };
type Pagina = ReturnType<typeof paginar>[number];

const LETRAS_POR_PAGINA = 24;
/** Silêncio até o qual a página fica na tela esperando a próxima */
const EMENDAR_MS = 1400;

export function paginasDaLegenda(palavras: PalavraDaLegenda[]): Array<Pagina & { destaques: boolean[] }> {
  const destaques = new Map(palavras.map((p) => [`${p.inicioMs}:${p.texto}`, Boolean(p.destaque)]));
  return paginar(palavras, LETRAS_POR_PAGINA).map((pg) => ({ ...pg, destaques: pg.tokens.map((tk) => destaques.get(`${tk.fromMs}:${tk.text}`) ?? false) }));
}

export const Legenda: React.FC<{ paginas: ReturnType<typeof paginasDaLegenda>; agoraMs: number; cores: Pick<CoresDaCena, "ouroDaLegenda">; topo?: number }> = ({ paginas, agoraMs, cores, topo = 1350 }) => {
  let indice = -1;
  paginas.forEach((p, i) => {
    if (p.startMs <= agoraMs) indice = i;
  });
  const pagina = paginas[indice];
  if (!pagina) return null;
  const fim = pagina.tokens[pagina.tokens.length - 1].toMs;
  const proxima = paginas[indice + 1];
  const emenda = proxima !== undefined && proxima.startMs - fim <= EMENDAR_MS;
  if (agoraMs > fim + 600 && !emenda) return null;
  const some = emenda ? 1 : interpolate(agoraMs, [fim + 300, fim + 600], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const entra = interpolate(agoraMs - pagina.startMs, [-60, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: topo,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: SERIFA,
        fontWeight: 700,
        fontSize: 74,
        lineHeight: 1.1,
        opacity: some * entra,
        transform: `translateY(${(1 - entra) * 10}px)`,
        textShadow: "0 3px 16px rgba(0,0,0,0.75), 0 1px 3px rgba(0,0,0,0.8)",
      }}
    >
      {pagina.tokens.map((tk, i) => {
        const falando = agoraMs >= tk.fromMs && (agoraMs < (pagina.tokens[i + 1]?.fromMs ?? tk.toMs + 250) || i === pagina.tokens.length - 1);
        const jaDita = agoraMs >= tk.fromMs;
        const dourada = falando || pagina.destaques[i];
        return (
          <React.Fragment key={i}>
            <span
              style={{
                color: dourada ? cores.ouroDaLegenda : "#FBF4E6",
                opacity: jaDita ? 1 : 0.62,
                display: "inline-block",
                transform: falando ? "scale(1.04)" : undefined,
              }}
            >
              {tk.text.replace(/[,;:]+$/, "")}
            </span>{" "}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---- Mini-diagramas ----

/** Quando cada parte do diagrama entra e quando ele sai (quadros da cena) */
export function tempoDoDiagrama(d: DiagramaDaSilhueta, palavras: PalavraNoTempo[], fimDaFala: number) {
  const ANTES = 3;
  const inicio = palavras[0]?.inicio ?? 0;
  const em = d.em ? quadroDaPalavra(palavras, d.em) : { quadro: inicio, indice: 0, achou: true };
  const entra = Math.max(0, em.quadro - ANTES);
  const ate = d.ate ? quadroDaPalavra(palavras, d.ate, em.indice + 1) : undefined;
  const sai = ate && ate.achou && ate.quadro > em.quadro ? ate.quadro : fimDaFala + 8;
  const textos = d.seta ? [d.seta.de, d.seta.para] : d.lista ? d.lista : d.versus ? [d.versus.isto, d.versus.aquilo] : [];
  let cursor = em.indice;
  const partes = textos.map((texto, k) => {
    const primeira = texto.split(/\s+/).find((p) => limpa(p).length >= 3) ?? texto.split(/\s+/)[0];
    const achada = quadroDaPalavra(palavras, primeira, cursor);
    const reserva = entra + k * 16;
    if (k === 0) return entra;
    if (achada.achou && achada.quadro - ANTES >= entra) {
      cursor = achada.indice;
      return Math.max(reserva - 8, achada.quadro - ANTES);
    }
    return reserva;
  });
  // Sempre em ordem, com respiro
  for (let k = 1; k < partes.length; k++) partes[k] = Math.max(partes[k], partes[k - 1] + 8);
  return { entra, sai: Math.max(sai, (partes[partes.length - 1] ?? entra) + 30), partes, achouEm: em.achou };
}

export const Diagrama: React.FC<{ d: DiagramaDaSilhueta; t: number; tempo: ReturnType<typeof tempoDoDiagrama>; cores: Pick<CoresDaCena, "tinta" | "tintaSuave" | "ouro" | "veu">; topo: number }> = ({
  d,
  t,
  tempo,
  cores,
  topo,
}) => {
  const fora = interpolate(t, [tempo.sai, tempo.sai + 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const geral = entrar(t, tempo.entra, 12) * fora;
  if (geral <= 0.01) return null;
  const parte = (k: number) => entrar(t, tempo.partes[k] ?? tempo.entra, 14);
  const sombra = sombraDe(cores.tinta);
  const texto: React.CSSProperties = { fontFamily: SERIFA, fontWeight: 600, color: cores.tinta, textShadow: sombra, lineHeight: 1.05 };
  const dourado: React.CSSProperties = { ...texto, color: cores.ouro, fontStyle: "italic", fontWeight: 700 };
  const surge = (k: number): React.CSSProperties => ({ opacity: parte(k), transform: `translateY(${(1 - parte(k)) * 16}px)` });
  let corpo: React.ReactNode = null;
  if (d.seta) {
    const longo = d.seta.de.length + d.seta.para.length > 17;
    const seta = parte(1);
    const tamanho = longo ? 72 : 80;
    const desenhoDaSeta = (
      <svg width={longo ? 40 : 130} height={longo ? 90 : 40} viewBox={longo ? "0 0 40 90" : "0 0 130 40"} style={{ overflow: "visible", flexShrink: 0 }}>
        {longo ? (
          <>
            <line x1={20} y1={4} x2={20} y2={4 + 76 * seta} stroke={cores.ouro} strokeWidth={4} strokeLinecap="round" />
            {seta > 0.9 && <path d="M8 70 L20 84 L32 70" fill="none" stroke={cores.ouro} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
          </>
        ) : (
          <>
            <line x1={6} y1={20} x2={6 + 112 * seta} y2={20} stroke={cores.ouro} strokeWidth={4} strokeLinecap="round" />
            {seta > 0.9 && <path d="M104 8 L120 20 L104 32" fill="none" stroke={cores.ouro} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
          </>
        )}
      </svg>
    );
    corpo = (
      <div style={{ display: "flex", flexDirection: longo ? "column" : "row", alignItems: "center", gap: longo ? 14 : 26 }}>
        <span style={{ ...texto, fontSize: tamanho, opacity: 1 - seta * 0.35 }}>{d.seta.de}</span>
        {desenhoDaSeta}
        <span style={{ ...dourado, fontSize: tamanho * 1.08, ...surge(1) }}>{d.seta.para}</span>
      </div>
    );
  } else if (d.lista) {
    corpo = (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 760 }}>
        {d.lista.map((item, k) => (
          <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 26, padding: "10px 0 14px", borderBottom: `2px solid ${cores.ouro}55`, ...surge(k) }}>
            <span style={{ fontFamily: SERIFA, fontWeight: 700, fontSize: 34, letterSpacing: "0.12em", color: cores.ouro, width: 56 }}>{String(k + 1).padStart(2, "0")}</span>
            <span style={{ ...(k === d.lista!.length - 1 ? dourado : texto), fontSize: 64 }}>{item}</span>
          </div>
        ))}
      </div>
    );
  } else if (d.versus) {
    corpo = (
      <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
        <span style={{ ...texto, fontSize: 72, textAlign: "right", width: 400, ...surge(0) }}>{d.versus.isto}</span>
        <div style={{ width: 2, height: 120 * parte(1) + 20, background: cores.ouro, opacity: 0.8 }} />
        <span style={{ ...dourado, fontSize: 76, width: 400, ...surge(1) }}>{d.versus.aquilo}</span>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", top: topo - 50, left: 0, right: 0, padding: "50px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 26, opacity: geral, ...veuAtras(cores.veu, 0.42) }}>
      {d.rotulo && <Versal texto={d.rotulo} cor={cores.tintaSuave} fio={cores.ouro} tamanho={28} />}
      {corpo}
    </div>
  );
};
