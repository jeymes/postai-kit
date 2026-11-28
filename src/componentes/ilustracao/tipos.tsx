// Ilustração da fala: o desenho de cada tipo que fica numa faixa (ícone,
// número, gráfico, conta, texto, objeto, pensamento sem dono na tela). Cada um
// desenha dentro da caixa que a CamadaDaFala dá (largura x altura fixas, as do
// plano: nada pula quando outro entra). `t`: quadros desde que o item entrou.

import React from "react";
import { spring } from "remotion";
import { APOIOS, DesenhoDoApoio, type TipoDeApoio } from "../objetos/ObjetosDeApoio";
import { formatar, casasDe } from "../../moldes/documentario/infografico/numeros";
import { cresce, mola } from "../../moldes/documentario/infografico/tema";
import { GraficoCompacto } from "./graficos";
import { DesenhoDoIcone } from "./icones";
import { Cartao, ComExpoente, Pilula, TABULAR, TextoComDestaque } from "./pecas";
import { OBJETOS_DA_FALA, textoDoPasso, type Ilustracao } from "./schema";
import type { ItemPlanejado } from "./tempo";
import type { TemaDaIlustracao } from "./tema";

// A lista de objetos do schema (sem React) é a mesma do ObjetosDeApoio: confere na compilação
type Iguais<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const mesmaLista: Iguais<(typeof OBJETOS_DA_FALA)[number], (typeof APOIOS)[number]> = true;
void mesmaLista;

type De<T extends Ilustracao["tipo"]> = Extract<Ilustracao, { tipo: T }>;

export interface Caixa {
  t: number;
  largura: number;
  altura: number;
  tema: TemaDaIlustracao;
  idioma?: string;
  /** O quadro de agora menos o começo do plano, para os pedaços (`plano.pedacos` são quadros absolutos) */
  agora: number;
  plano: ItemPlanejado;
  /** Um nome único (ids de SVG) */
  chave: string;
}

/** O "pop": cresce de pequeno com um tico de passar do ponto (nada de quique) */
export const pop = (t: number, atraso = 0) => spring({ frame: t - atraso, fps: 30, config: { damping: 15, stiffness: 170, mass: 0.7 } });

const centro: React.CSSProperties = { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" };

// ---- Ícone (um, ou de 2 a 4 em fila, um por um) ----

const Selo: React.FC<{ nome: Parameters<typeof DesenhoDoIcone>[0]["nome"]; diametro: number; tema: TemaDaIlustracao; p: number }> = ({ nome, diametro, tema, p }) => (
  <Cartao tema={tema} progresso={p} redondo style={{ width: diametro, height: diametro, display: "grid", placeItems: "center", scale: String(0.35 + 0.65 * p), opacity: Math.min(1, p * 2) }}>
    <DesenhoDoIcone nome={nome} tamanho={diametro * 0.56} cor={tema.destaque} traco={1.9} style={{ filter: tema.familia === "neon" ? "url(#ilustra-neon)" : tema.filtro }} />
  </Cartao>
);

const TIcone: React.FC<{ item: De<"icone">; c: Caixa }> = ({ item, c }) => {
  if (item.icone) {
    const p = pop(c.t);
    return (
      <div style={{ ...centro, gap: 16 }}>
        <Selo nome={item.icone} diametro={180} tema={c.tema} p={p} />
        {item.rotulo && (
          <Pilula tema={c.tema} tamanho={42} style={{ opacity: mola(c.t, 6, 14), translate: `0 ${(1 - mola(c.t, 6, 14)) * 10}px` }}>
            {item.rotulo}
          </Pilula>
        )}
      </div>
    );
  }
  const icones = item.icones ?? [];
  const n = icones.length;
  const diametro = Math.min(170, (c.largura - (n - 1) * 30) / n);
  return (
    <div style={{ ...centro, flexDirection: "row", alignItems: "flex-start", gap: 30, paddingTop: 10 }}>
      {icones.map((ic, k) => {
        const p = pop(c.agora - c.plano.pedacos[k]);
        return (
          <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: diametro }}>
            <Selo nome={ic.icone} diametro={diametro} tema={c.tema} p={p} />
            {ic.rotulo && (
              <Pilula tema={c.tema} tamanho={36} style={{ opacity: Math.min(1, p) }}>
                {ic.rotulo}
              </Pilula>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---- Número que conta até o valor ----

const TNumero: React.FC<{ item: De<"numero">; c: Caixa }> = ({ item, c }) => {
  const { tema } = c;
  const de = item.de ?? 0;
  const casas = item.casas ?? casasDe([item.valor, de]);
  const v = de + (item.valor - de) * cresce(c.t, 4, 34);
  const final = formatar(item.valor, casas, c.idioma);
  const letras = final.length + ((item.prefixo?.length ?? 0) + (item.sufixo?.trim().length ?? 0)) * 0.48;
  const tamanho = Math.min(130, Math.floor((c.largura - 120 - (item.icone ? 130 : 0)) / (letras * 0.6)));
  const p = mola(c.t, 0, 16);
  const pequeno = { fontFamily: tema.fonteNumero, fontWeight: 700, fontSize: tamanho * 0.45, color: tema.texto2, textShadow: tema.brilho } as const;
  return (
    <div style={centro}>
      <Cartao tema={tema} progresso={p} style={{ padding: item.rotulo ? "22px 48px 24px" : "22px 48px", display: "flex", alignItems: "center", gap: 26, maxWidth: c.largura }}>
        {item.icone && <DesenhoDoIcone nome={item.icone} tamanho={tamanho * 0.85} cor={tema.destaque} traco={1.9} />}
        <div style={{ display: "flex", flexDirection: "column", alignItems: item.icone ? "flex-start" : "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: tamanho * 0.1, whiteSpace: "nowrap" }}>
            {item.prefixo && <span style={pequeno}>{item.prefixo}</span>}
            <span style={{ fontFamily: tema.fonteNumero, fontWeight: 800, fontSize: tamanho, lineHeight: 1, letterSpacing: tema.familia === "giz" || tema.familia === "palito" ? undefined : "-0.03em", color: tema.destaque, textShadow: tema.brilho, ...TABULAR }}>
              {formatar(v, casas, c.idioma)}
            </span>
            {item.sufixo && <span style={pequeno}>{item.sufixo.trim()}</span>}
          </div>
          {item.rotulo && (
            <div style={{ fontFamily: tema.fonteTexto, fontWeight: 700, fontSize: 38, lineHeight: 1.1, color: tema.texto2, textShadow: tema.brilho, opacity: mola(c.t, 14, 16), maxWidth: c.largura - 140 }}>{item.rotulo}</div>
          )}
        </div>
      </Cartao>
    </div>
  );
};

// ---- Gráfico (os 9 do infográfico, num cartão) ----

const TGrafico: React.FC<{ item: De<"grafico">; c: Caixa }> = ({ item, c }) => {
  const { tema } = c;
  const g = item.grafico;
  const p = mola(c.t, 0, 16);
  const padding = 30;
  const titulo = g.titulo ? 58 : 0;
  const fonte = g.fonte ? 36 : 0;
  const largura = Math.min(960, c.largura);
  const altura = c.altura;
  return (
    <div style={centro}>
      <Cartao tema={tema} progresso={p} style={{ width: largura, height: altura, padding, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        {g.titulo && (
          <div style={{ height: titulo, fontFamily: tema.fonteTitulo, fontWeight: tema.peso, fontSize: g.titulo.length > 34 ? 36 : 42, lineHeight: 1.1, color: tema.texto, textShadow: tema.brilho, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {g.titulo}
          </div>
        )}
        <GraficoCompacto g={g} a={{ t: c.t - 6, w: largura - 2 * padding, h: altura - 2 * padding - titulo - fonte, tema, idioma: c.idioma }} />
        {g.fonte && (
          <div style={{ height: fonte, paddingTop: 8, boxSizing: "border-box", fontFamily: tema.fonteTexto, fontWeight: 600, fontSize: 24, color: tema.texto2, opacity: mola(c.t, 20, 16), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {g.fonte}
          </div>
        )}
      </Cartao>
    </div>
  );
};

// ---- Conta: as linhas uma a uma, o resultado em destaque ----

const TConta: React.FC<{ item: De<"conta">; c: Caixa }> = ({ item, c }) => {
  const { tema } = c;
  const p = mola(c.t, 0, 16);
  const n = item.passos.length;
  return (
    <div style={centro}>
      <Cartao tema={tema} progresso={p} style={{ width: Math.min(860, c.largura), height: c.altura, padding: "32px 44px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {item.passos.map((passo, k) => {
          const resultado = k === n - 1 && n > 1;
          const e = mola(c.agora - c.plano.pedacos[k], 0, 14);
          const risco = resultado ? cresce(c.agora - c.plano.pedacos[k], -2, 12) : 0;
          return (
            <div key={k} style={{ position: "relative", height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {resultado && <div style={{ position: "absolute", top: 2, left: "8%", width: `${84 * risco}%`, height: 5, borderRadius: 3, backgroundColor: tema.eixo }} />}
              <span
                style={{
                  fontFamily: tema.fonteNumero,
                  fontWeight: resultado ? 800 : 600,
                  fontSize: resultado ? 62 : 50,
                  lineHeight: 1,
                  color: resultado ? tema.destaque : tema.texto,
                  textShadow: tema.brilho,
                  whiteSpace: "nowrap",
                  opacity: e,
                  translate: `${(1 - e) * -26}px 0`,
                  ...TABULAR,
                }}
              >
                <ComExpoente texto={textoDoPasso(passo)} />
              </span>
            </div>
          );
        })}
      </Cartao>
    </div>
  );
};

// ---- Texto em destaque: sticker, carimbo ou marcador ----

const TTexto: React.FC<{ item: De<"texto">; c: Caixa }> = ({ item, c }) => {
  const { tema } = c;
  const forma = item.forma ?? "sticker";
  const letras = item.texto.length;
  if (forma === "carimbo") {
    // O carimbo desce de cima (maior e transparente) e assenta torto, em 9 quadros
    const e = cresce(c.t, 0, 9);
    const tamanho = Math.min(96, Math.floor((c.largura - 120) / (letras * 0.66)));
    return (
      <div style={centro}>
        <div
          style={{
            rotate: "-7deg",
            scale: String(1.5 - 0.5 * e),
            opacity: e,
            padding: "10px 34px",
            border: `8px solid ${tema.destaque}`,
            borderRadius: 18,
            outline: `3px solid ${tema.destaque}`,
            outlineOffset: 6,
            background: tema.escuro ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.78)",
            fontFamily: tema.fonteTitulo,
            fontWeight: 900,
            fontSize: tamanho,
            lineHeight: 1.05,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: tema.destaque,
            textShadow: tema.brilho,
            whiteSpace: "nowrap",
            filter: tema.filtro,
          }}
        >
          {item.texto}
        </div>
      </div>
    );
  }
  if (forma === "marcador") {
    const e = mola(c.t, 0, 12);
    const grifo = cresce(c.t, 6, 14);
    const tamanho = Math.min(88, Math.floor((c.largura - 80) / (letras * 0.6)));
    return (
      <div style={centro}>
        <div style={{ position: "relative", opacity: e, translate: `0 ${(1 - e) * 12}px`, padding: "0 18px" }}>
          <div style={{ position: "absolute", left: 0, bottom: tamanho * 0.08, height: tamanho * 0.5, width: `${100 * grifo}%`, backgroundColor: tema.destaque, opacity: tema.escuro ? 0.7 : 0.6, borderRadius: 8, rotate: "-1deg" }} />
          <div
            style={{
              position: "relative",
              fontFamily: tema.fonteTitulo,
              fontWeight: 900,
              fontSize: tamanho,
              lineHeight: 1.1,
              color: tema.texto,
              whiteSpace: "nowrap",
              // Um contorno da cor do cartão em volta das letras: lê em cima de qualquer cenário
              WebkitTextStroke: `${Math.round(tamanho * 0.16)}px ${tema.escuro ? "#0B0F1E" : "#FFFFFF"}`,
              paintOrder: "stroke fill",
              textShadow: tema.brilho,
            }}
          >
            <TextoComDestaque texto={item.texto} destaque={item.destaque} cor={tema.destaque} />
          </div>
        </div>
      </div>
    );
  }
  const p = pop(c.t);
  const tamanho = Math.min(84, Math.floor((c.largura - 140) / (letras * 0.6)));
  return (
    <div style={centro}>
      <Cartao tema={tema} progresso={p} style={{ rotate: "-2.5deg", scale: String(0.55 + 0.45 * p), opacity: Math.min(1, p * 1.8), padding: "16px 44px", fontFamily: tema.fonteTitulo, fontWeight: 900, fontSize: tamanho, lineHeight: 1.1, color: tema.texto, textShadow: tema.brilho, whiteSpace: "nowrap" }}>
        <TextoComDestaque texto={item.texto} destaque={item.destaque} cor={tema.destaque} />
      </Cartao>
    </div>
  );
};

// ---- Objeto de apoio (o desenho 2D do kit), num selo ----

/** O retângulo de cada objeto no desenho (0, 0 = onde a mão segura): para caber inteiro no selo */
const CAIXA_DO_OBJETO: Record<TipoDeApoio, [number, number, number, number]> = {
  alianca: [-46, -94, 92, 96],
  "caixinha-de-alianca": [-54, -104, 108, 112],
  terno: [-100, -8, 200, 286],
  "vestido-de-noiva": [-118, -8, 236, 346],
  buque: [-66, -160, 132, 208],
  bolo: [-92, -202, 184, 220],
  presente: [-66, -156, 132, 162],
  convite: [-66, -150, 132, 156],
  tacas: [-66, -170, 132, 176],
};

const TObjeto: React.FC<{ item: De<"objeto">; c: Caixa }> = ({ item, c }) => {
  const { tema } = c;
  const p = pop(c.t);
  const [x, y, w, h] = CAIXA_DO_OBJETO[item.objeto];
  const diametro = 250;
  const lado = diametro * 0.66;
  return (
    <div style={{ ...centro, gap: 14 }}>
      <Cartao tema={tema} progresso={p} redondo style={{ width: diametro, height: diametro, display: "grid", placeItems: "center", scale: String(0.35 + 0.65 * p), opacity: Math.min(1, p * 2) }}>
        <svg viewBox={`${x} ${y} ${w} ${h}`} width={lado} height={lado} style={{ overflow: "visible", rotate: `${(1 - Math.min(1, p)) * -12}deg`, filter: tema.familia === "giz" ? "url(#ilustra-giz)" : undefined }}>
          <DesenhoDoApoio tipo={item.objeto} />
        </svg>
      </Cartao>
      {item.rotulo && (
        <Pilula tema={tema} tamanho={40} style={{ opacity: mola(c.t, 6, 14) }}>
          {item.rotulo}
        </Pilula>
      )}
    </div>
  );
};

// ---- Pensamento de quem não está na tela: o balão no alto ----

export const ConteudoDoPensamento: React.FC<{ item: De<"pensamento">; tema: TemaDaIlustracao; tamanho: number }> = ({ item, tema, tamanho }) =>
  item.icone ? (
    <DesenhoDoIcone nome={item.icone} tamanho={tamanho} cor={tema.destaque} traco={1.9} />
  ) : (
    <div style={{ fontFamily: tema.fonteTexto, fontWeight: tema.peso, fontSize: Math.min(46, Math.floor(560 / Math.max(6, item.texto?.length ?? 6))), lineHeight: 1.1, color: tema.texto, textShadow: tema.brilho, textAlign: "center", maxWidth: 300 }}>
      {item.texto}
    </div>
  );

const TPensamentoSolto: React.FC<{ item: De<"pensamento">; c: Caixa }> = ({ item, c }) => {
  const p = pop(c.t);
  return (
    <div style={centro}>
      <Cartao tema={c.tema} progresso={p} style={{ borderRadius: c.tema.desenhado ? undefined : 120, padding: "28px 56px", minWidth: 220, minHeight: 140, display: "grid", placeItems: "center", scale: String(0.5 + 0.5 * p), opacity: Math.min(1, p * 2) }}>
        <ConteudoDoPensamento item={item} tema={c.tema} tamanho={110} />
      </Cartao>
    </div>
  );
};

/** O desenho de um item de faixa */
export const ItemDaFaixa: React.FC<{ item: Ilustracao; c: Caixa }> = ({ item, c }) => {
  switch (item.tipo) {
    case "icone":
      return <TIcone item={item} c={c} />;
    case "numero":
      return <TNumero item={item} c={c} />;
    case "grafico":
      return <TGrafico item={item} c={c} />;
    case "conta":
      return <TConta item={item} c={c} />;
    case "texto":
      return <TTexto item={item} c={c} />;
    case "objeto":
      return <TObjeto item={item} c={c} />;
    case "pensamento":
      return <TPensamentoSolto item={item} c={c} />;
    default:
      return null;
  }
};
