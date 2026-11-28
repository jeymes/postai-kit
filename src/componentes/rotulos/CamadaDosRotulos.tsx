// Texto na cena (28/11/2026): o desenho dos rótulos que vão por cima da cena
// (a placa, que é do cenário 3D, fica em src/moldes/mundo3d/placa.tsx):
//   - lugarEData: a etiqueta no canto de cima, com o alfinete, que se abre da
//     esquerda para a direita (como nos causos em 3D: "BRASIL, 1943");
//   - nome: o nome (e o papel) de quem entra, num balão em cima da cabeça dele;
//     sem lugar em cima (cabeça fora do quadro, perto do topo) vira a faixa de TV,
//     embaixo, acima da legenda;
//   - bilhete: um papel em close (caderno, carta ou documento) que sobe para a
//     frente da cena, com o texto se escrevendo à mão ou batido à máquina, a
//     assinatura e o carimbo que bate. A cena escurece atrás; a legenda continua.
// O tempo (palavra exata) vem do tempo.ts; aqui cada quadro só desenha.

import { loadFont as carregarCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as carregarSpecialElite } from "@remotion/google-fonts/SpecialElite";
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Som } from "../audio/Som";
import { fontes } from "../../nucleo/marca";
import type { PalavraNoTempo } from "../ilustracao/tempo";
import type { Rotulo, RotuloNaTela } from "./schema";
import { planejarRotulos, TEMPO_DO_ROTULO, type RotuloPlanejado } from "./tempo";

const { fontFamily: CAVEAT } = carregarCaveat("normal", { subsets: ["latin"], weights: ["600", "700"] });
const { fontFamily: MAQUINA } = carregarSpecialElite("normal", { subsets: ["latin"] });

const LARGURA = 1080;
const ESCURO = "#15121C";
const AMARELO = "#FFD23F";

/** A mola sem quique da entrada e a saída suave, de 0 a 1 */
function presenca(p: RotuloPlanejado, t: number) {
  if (t < p.entra || t >= p.sai + TEMPO_DO_ROTULO.saida) return { e: 0, s: 1, v: 0 };
  const e = interpolate(t, [p.entra, p.entra + TEMPO_DO_ROTULO.entrada], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const s = interpolate(t, [p.sai, p.sai + TEMPO_DO_ROTULO.saida], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  return { e, s, v: e * (1 - s) };
}

// ---- Lugar e data ----

const Alfinete: React.FC<{ tamanho: number }> = ({ tamanho }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" style={{ flex: "none" }}>
    <path d="M12 2c-4 0-7 3-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-4-3-7-7-7z" fill={AMARELO} />
    <circle cx="12" cy="9" r="2.8" fill={ESCURO} />
  </svg>
);

/** A etiqueta de lugar e data, no canto de cima (abaixo da área dos botões do app) */
const EtiquetaDeLugar: React.FC<{ p: RotuloPlanejado; t: number; topo: number }> = ({ p, t, topo }) => {
  const r = p.rotulo as Extract<RotuloNaTela, { tipo: "lugarEData" }>;
  const { e, s } = presenca(p, t);
  // Abre da esquerda para a direita; as letras chegam um tico depois, uma por uma
  const local = t - p.entra;
  const letras = Math.round(interpolate(local, [2, 2 + Math.min(11, r.texto.length * 0.5)], [0, r.texto.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div
      style={{
        position: "absolute",
        top: topo,
        left: 60,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 30px 14px 20px",
        borderRadius: 16,
        background: "rgba(21,18,28,0.86)",
        boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
        clipPath: `inset(0 ${(1 - e) * 100}% 0 0 round 16px)`,
        opacity: 1 - s,
        translate: `0 ${-s * 12}px`,
      }}
    >
      <Alfinete tamanho={46} />
      <span style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: 46, letterSpacing: 3, textTransform: "uppercase", color: "#FFFFFF", whiteSpace: "nowrap" }}>
        {r.texto.slice(0, letras)}
        <span style={{ opacity: 0 }}>{r.texto.slice(letras)}</span>
      </span>
    </div>
  );
};

// ---- Nome de quem entra ----

/** A largura do balão do nome (estimada pelas letras, para ele não sair da tela) */
const larguraDoNome = (nome: string, papel?: string) => Math.max(nome.length * 52 * 0.66, (papel?.length ?? 0) * 30 * 0.52) + 64;
const ALTURA_DO_NOME = (papel?: string) => (papel ? 140 : 94);

const NomeNaCabeca: React.FC<{ p: RotuloPlanejado; t: number; cabeca: { x: number; y: number } }> = ({ p, t, cabeca }) => {
  const r = p.rotulo as Extract<RotuloNaTela, { tipo: "nome" }>;
  const { e, s } = presenca(p, t);
  const largura = larguraDoNome(r.nome, r.papel);
  const x = Math.min(LARGURA - 50 - largura / 2, Math.max(50 + largura / 2, cabeca.x));
  // A ponta do balão aponta para a cabeça, mesmo quando o balão encosta na borda
  const ponta = Math.min(largura / 2 - 30, Math.max(-largura / 2 + 30, cabeca.x - x));
  const pop = interpolate(e, [0, 1], [0.55, 1]);
  return (
    <div
      style={{
        position: "absolute",
        left: x - largura / 2,
        top: cabeca.y - 34 - ALTURA_DO_NOME(r.papel),
        width: largura,
        transformOrigin: `${largura / 2 + ponta}px ${ALTURA_DO_NOME(r.papel) + 20}px`,
        scale: String(pop * (1 - 0.1 * s)),
        opacity: Math.min(1, e * 1.6) * (1 - s),
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: `6px solid ${ESCURO}`,
          borderRadius: 20,
          padding: "8px 26px 10px",
          textAlign: "center",
          boxShadow: "0 8px 0 rgba(21,18,28,0.25)",
        }}
      >
        <div style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: 52, lineHeight: 1.1, textTransform: "uppercase", color: ESCURO, whiteSpace: "nowrap" }}>{r.nome}</div>
        {r.papel && <div style={{ fontFamily: fontes.texto, fontWeight: 700, fontSize: 30, lineHeight: 1.2, color: "#5A5368", whiteSpace: "nowrap" }}>{r.papel}</div>}
      </div>
      <svg width={44} height={26} style={{ position: "absolute", left: largura / 2 + ponta - 22, top: ALTURA_DO_NOME(r.papel) - 8 }}>
        <path d="M0 0 L22 24 L44 0 Z" fill="#FFFFFF" stroke={ESCURO} strokeWidth={6} strokeLinejoin="round" />
        <rect x={3} y={-6} width={38} height={8} fill="#FFFFFF" />
      </svg>
    </div>
  );
};

/** A faixa de TV, embaixo à esquerda, acima da legenda: o nome em cima, o papel na tarja escura */
const NomeEmbaixo: React.FC<{ p: RotuloPlanejado; t: number; base: number }> = ({ p, t, base }) => {
  const r = p.rotulo as Extract<RotuloNaTela, { tipo: "nome" }>;
  const { e, s } = presenca(p, t);
  const abre = interpolate(t - p.entra, [4, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", left: 60, top: base - (r.papel ? 156 : 94), display: "flex", opacity: 1 - s, translate: `${-(1 - e) * 40}px 0` }}>
      <div style={{ width: 12, background: AMARELO, borderRadius: 4, scale: `1 ${e}`, transformOrigin: "50% 100%" }} />
      <div style={{ clipPath: `inset(0 ${(1 - abre) * 100}% 0 0)` }}>
        <div style={{ background: "#FFFFFF", padding: "6px 24px 4px", fontFamily: fontes.titulo, fontWeight: 800, fontSize: 62, lineHeight: 1.1, textTransform: "uppercase", color: ESCURO, whiteSpace: "nowrap" }}>
          {r.nome}
        </div>
        {r.papel && (
          <div style={{ background: ESCURO, padding: "6px 24px 8px", fontFamily: fontes.texto, fontWeight: 700, fontSize: 38, color: "#FFFFFF", whiteSpace: "nowrap", width: "fit-content" }}>{r.papel}</div>
        )}
      </div>
    </div>
  );
};

// ---- Bilhete em close ----

const PAPEL = {
  caderno: { fundo: "#FCFCF7", tinta: "#1F2B66", linha: "#A9C9E8", margem: "#E58A8A" },
  carta: { fundo: "#F3E4C4", tinta: "#2B2340", linha: "", margem: "" },
  documento: { fundo: "#FAF8F1", tinta: "#1E1E1E", linha: "", margem: "" },
} as const;

/** O tamanho da letra pelo tamanho do texto (curto: grande) */
function letraDoBilhete(texto: string, mao: boolean) {
  const n = texto.length;
  if (mao) return n <= 22 ? 124 : n <= 45 ? 100 : n <= 75 ? 84 : 70;
  return n <= 22 ? 72 : n <= 45 ? 62 : n <= 75 ? 52 : 44;
}

const Bilhete: React.FC<{ p: RotuloPlanejado; t: number; baixo: number }> = ({ p, t, baixo }) => {
  const r = p.rotulo as Extract<RotuloNaTela, { tipo: "bilhete" }>;
  const papel = r.papel ?? "caderno";
  const mao = (r.letra ?? (papel === "documento" ? "maquina" : "mao")) === "mao";
  const cores = PAPEL[papel];
  const { e, s, v } = presenca(p, t);
  const local = t - p.entra;
  const tamanho = letraDoBilhete(r.texto, mao);
  const linha = Math.round(tamanho * (mao ? 1.12 : 1.4));
  // O texto: à mão, palavra por palavra; à máquina, letra por letra (rápido: ~1 s no máximo)
  const palavras = r.texto.split(/\s+/);
  const duracao = Math.min(mao ? 26 : 30, Math.max(10, (mao ? palavras.length : r.texto.length) * (mao ? 3 : 0.9)));
  const progresso = interpolate(local, [8, 8 + duracao], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fimDoTexto = 8 + duracao;
  const carimboEm = fimDoTexto + 6;
  const carimbo = r.carimbo ? interpolate(local, [carimboEm, carimboEm + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) : 0;
  const assinatura = r.assinatura ? interpolate(local, [fimDoTexto - 2, fimDoTexto + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const largura = 860;
  const fundoDoPapel =
    papel === "caderno"
      ? `repeating-linear-gradient(to bottom, transparent 0px, transparent ${linha - 3}px, ${cores.linha} ${linha - 3}px, ${cores.linha} ${linha}px)`
      : papel === "carta"
        ? "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%, rgba(120,80,30,0.18) 100%)"
        : "none";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* A cena escurece atrás do papel (sem sumir: dá para ver que é a mesma cena) */}
      <AbsoluteFill style={{ background: "rgba(10,8,16,0.55)", opacity: v }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 190, height: baixo - 190, display: "grid", placeItems: "center" }}>
        <div
          style={{
            width: largura,
            position: "relative",
            background: cores.fundo,
            backgroundImage: fundoDoPapel,
            backgroundPosition: papel === "caderno" ? `0 ${96 - 6}px` : undefined,
            // Com carimbo, sobra lugar embaixo do texto para ele (nunca em cima da letra)
            padding: `${papel === "documento" ? 110 : 96}px 64px ${r.carimbo ? 170 : 64}px ${papel === "caderno" ? 120 : papel === "documento" ? 80 : 76}px`,
            borderRadius: papel === "carta" ? 6 : 4,
            boxShadow: "0 30px 60px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.25)",
            rotate: `${interpolate(e, [0, 1], [-9, -2.2]) + s * 3}deg`,
            translate: `0 ${(1 - e) * 340 - s * 80}px`,
            opacity: Math.min(1, e * 2) * (1 - s),
          }}
        >
          {/* A margem vermelha do caderno */}
          {papel === "caderno" && <div style={{ position: "absolute", left: 92, top: 0, bottom: 0, width: 3, background: cores.margem }} />}
          {/* A dobra da carta, no meio */}
          {papel === "carta" && <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, background: "linear-gradient(to right, rgba(120,80,30,0.05), rgba(120,80,30,0.22), rgba(120,80,30,0.05))" }} />}
          {/* O cabeçalho do documento: duas linhas, como um ofício */}
          {papel === "documento" && (
            <div style={{ position: "absolute", left: 70, right: 70, top: 46 }}>
              <div style={{ height: 6, background: "#2B2B2B", borderRadius: 2 }} />
              <div style={{ height: 2, background: "#2B2B2B", marginTop: 6, opacity: 0.7 }} />
            </div>
          )}
          <div style={{ fontFamily: mao ? CAVEAT : MAQUINA, fontWeight: mao ? 700 : 400, fontSize: tamanho, lineHeight: `${linha}px`, color: cores.tinta, position: "relative" }}>
            {mao
              ? palavras.map((palavra, i) => {
                  const k = (i + 1) / palavras.length;
                  const aqui = interpolate(progresso, [k - 1 / palavras.length, k], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  return (
                    <React.Fragment key={i}>
                      <span style={{ clipPath: `inset(-20% ${(1 - aqui) * 100}% -20% 0)`, display: "inline-block" }}>{palavra}</span>{" "}
                    </React.Fragment>
                  );
                })
              : (() => {
                  const n = Math.round(progresso * r.texto.length);
                  return (
                    <>
                      {r.texto.slice(0, n)}
                      <span style={{ opacity: 0 }}>{r.texto.slice(n)}</span>
                    </>
                  );
                })()}
          </div>
          {r.assinatura && (
            <div style={{ fontFamily: CAVEAT, fontWeight: 700, fontSize: Math.round(tamanho * (mao ? 0.8 : 1.2)), lineHeight: `${linha}px`, color: cores.tinta, textAlign: "right", marginTop: 8, opacity: assinatura, translate: `${(1 - assinatura) * 20}px 0` }}>
              — {r.assinatura}
            </div>
          )}
          {r.carimbo && carimbo > 0 && (
            <div
              style={{
                position: "absolute",
                ...(r.assinatura ? { left: papel === "caderno" ? 120 : 70 } : { right: 50 }),
                bottom: 40,
                padding: "6px 22px",
                border: "8px solid #C8242B",
                borderRadius: 12,
                color: "#C8242B",
                fontFamily: fontes.titulo,
                fontWeight: 900,
                fontSize: 64,
                letterSpacing: 4,
                textTransform: "uppercase",
                rotate: "-13deg",
                scale: String(interpolate(carimbo, [0, 1], [1.9, 1])),
                opacity: Math.min(0.88, carimbo * 1.4),
                mixBlendMode: "multiply",
              }}
            >
              {r.carimbo}
            </div>
          )}
        </div>
      </div>
      <Som tipo="whoosh" em={p.entra} volume={0.3} />
      {!mao && <Som tipo="datilografia" em={p.entra + 8} />}
      {r.carimbo && <Som tipo="carimbo" em={p.entra + carimboEm} />}
    </AbsoluteFill>
  );
};

// ---- A camada ----

export interface PropsDosRotulos {
  /** O campo `rotulos` da cena (a placa é ignorada aqui: ela é do cenário 3D) */
  rotulos?: Rotulo[];
  /** O tempo de cada palavra da fala, na base de quadros do useCurrentFrame() de onde a camada está */
  palavras: PalavraNoTempo[];
  inicio: number;
  fim: number;
  /** Ninguém entra antes deste quadro (o título do começo) */
  naoAntesDe?: number;
  /** Onde fica o alto da cabeça de cada personagem neste quadro (px na tela), pelo id; null = fora do quadro */
  cabecas?: Record<string, { x: number; y: number } | null>;
  /** Onde a legenda começa (px): a faixa do nome e o bilhete ficam acima dela */
  legenda: number;
  /** Onde fica a etiqueta de lugar e data (px, padrão 150) */
  topoDaEtiqueta?: number;
}

/** O alto da cabeça só serve para o balão do nome se sobra lugar em cima dela e ela está no quadro */
const cabeTalvez = (c: { x: number; y: number } | null | undefined, papel?: string): c is { x: number; y: number } =>
  Boolean(c && c.x > 60 && c.x < LARGURA - 60 && c.y - 34 - ALTURA_DO_NOME(papel) > 190 && c.y < 1100);

export const CamadaDosRotulos: React.FC<PropsDosRotulos> = ({ rotulos, palavras, inicio, fim, naoAntesDe, cabecas, legenda, topoDaEtiqueta = 150 }) => {
  const t = useCurrentFrame();
  const planos = useMemo(() => planejarRotulos(rotulos, palavras, { inicio, fim, naoAntesDe }), [rotulos, palavras, inicio, fim, naoAntesDe]);
  if (!planos.length) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {planos.map((p) => {
        // Os sons do bilhete ficam montados mesmo antes dele entrar (o Som sabe o quadro)
        if (p.rotulo.tipo === "bilhete") return t < p.sai + TEMPO_DO_ROTULO.saida ? <Bilhete key={p.indice} p={p} t={t} baixo={legenda - 30} /> : null;
        if (t < p.entra || t >= p.sai + TEMPO_DO_ROTULO.saida) return null;
        if (p.rotulo.tipo === "lugarEData") return <EtiquetaDeLugar key={p.indice} p={p} t={t} topo={topoDaEtiqueta} />;
        const r = p.rotulo;
        const cabeca = cabecas?.[r.quem];
        if (r.lugar !== "embaixo" && cabeTalvez(cabeca, r.papel)) return <NomeNaCabeca key={p.indice} p={p} t={t} cabeca={cabeca} />;
        return <NomeEmbaixo key={p.indice} p={p} t={t} base={legenda - 24} />;
      })}
    </AbsoluteFill>
  );
};
