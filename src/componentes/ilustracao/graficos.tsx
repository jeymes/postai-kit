// Ilustração da fala: os 9 gráficos do infográfico (mesmo schema, mesmas
// contas de número e de eixo, em numeros.ts), redesenhados para um cartão em pé
// no vídeo vertical: menos rótulos, letra grande (nada abaixo de 28 px numa
// tela de 1080), o dado que importa na cor de destaque. Cada um é função de
// `t` (quadros desde que o cartão entrou): se monta sozinho, sem pular.

import React from "react";
import { casasDe, casasDoPasso, comUnidade, escalaBonita, formatar, palavrasDo } from "../../moldes/documentario/infografico/numeros";
import type { Grafico } from "../../moldes/documentario/infografico/schema";
import { cresce, misturar, mola } from "../../moldes/documentario/infografico/tema";
import { DesenhoDoIcone } from "./icones";
import { ComExpoente, TABULAR } from "./pecas";
import type { TemaDaIlustracao } from "./tema";

type De<T extends Grafico["tipo"]> = Extract<Grafico, { tipo: T }>;

export interface Area {
  t: number;
  w: number;
  h: number;
  tema: TemaDaIlustracao;
  idioma?: string;
}

const hexDe = (cor: string, reserva: string) => (cor.startsWith("#") ? cor : reserva);
/** Os tons das partes que não são destaque (fatias, barras), do mais forte ao mais fraco */
const tonsNeutros = (tema: TemaDaIlustracao, n: number) =>
  Array.from({ length: n }, (_, i) => misturar(hexDe(tema.neutro, "#888888"), hexDe(tema.neutroClaro, "#cccccc"), n <= 1 ? 0 : i / (n - 1)));

const texto = (tema: TemaDaIlustracao, tamanho: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: tema.fonteTexto,
  fontWeight: 700,
  fontSize: tamanho,
  lineHeight: 1.1,
  color: tema.texto,
  textShadow: tema.brilho,
  ...extra,
});
const numeroCss = (tema: TemaDaIlustracao, tamanho: number, cor: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: tema.fonteNumero,
  fontWeight: 800,
  fontSize: tamanho,
  lineHeight: 1,
  letterSpacing: tema.fonteNumero === tema.fonteTexto ? undefined : "-0.02em",
  color: cor,
  textShadow: tema.brilho,
  whiteSpace: "nowrap",
  ...TABULAR,
  ...extra,
});

// ---- Número grande ----

const CNumero: React.FC<{ g: De<"numero">; a: Area }> = ({ g, a }) => {
  const de = g.de ?? 0;
  const casas = g.casas ?? casasDe([g.valor, de]);
  const v = de + (g.valor - de) * cresce(a.t, 6, 40);
  const final = formatar(g.valor, casas, a.idioma);
  const letras = final.length + ((g.prefixo?.length ?? 0) + (g.sufixo?.length ?? 0)) * 0.45;
  const tamanho = Math.min(170, Math.floor((a.w - (g.icone ? 150 : 0)) / (letras * 0.62)));
  return (
    <div style={{ width: a.w, height: a.h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {g.icone && <DesenhoDoIcone nome={g.icone} tamanho={110} cor={a.tema.destaque} traco={1.8} />}
        <div style={{ display: "flex", alignItems: "baseline", gap: tamanho * 0.08 }}>
          {g.prefixo && <span style={numeroCss(a.tema, tamanho * 0.42, a.tema.texto2, { fontWeight: 700 })}>{g.prefixo}</span>}
          <span style={numeroCss(a.tema, tamanho, a.tema.destaque)}>{formatar(v, casas, a.idioma)}</span>
          {g.sufixo && <span style={numeroCss(a.tema, tamanho * 0.42, a.tema.texto2, { fontWeight: 700 })}>{g.sufixo.trim()}</span>}
        </div>
      </div>
      {g.rotulo && <div style={texto(a.tema, 38, { color: a.tema.texto2, textAlign: "center", maxWidth: a.w, opacity: mola(a.t, 20, 20) })}>{g.rotulo}</div>}
    </div>
  );
};

// ---- Linha que se desenha ----

const CLinha: React.FC<{ g: De<"linha">; a: Area }> = ({ g, a }) => {
  const { tema } = a;
  const ys = g.pontos.map((p) => p.y);
  const esc = escalaBonita(Math.min(...ys), Math.max(...ys), 3, true);
  const casas = g.casas ?? casasDe(ys);
  const casasEixo = Math.min(casas, casasDoPasso(esc.passo));
  const m = { e: 128, d: 40, c: 64, b: 50 };
  const W = a.w - m.e - m.d;
  const H = a.h - m.c - m.b;
  const x = (i: number) => m.e + (W * i) / (g.pontos.length - 1);
  const y = (v: number) => m.c + H - ((v - esc.min) / (esc.max - esc.min)) * H;
  const desenho = cresce(a.t, 6, 44);
  const caminho = g.pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(" ");
  const area = `${caminho} L${x(g.pontos.length - 1)} ${m.c + H} L${m.e} ${m.c + H} Z`;
  const ponta = desenho * (g.pontos.length - 1);
  const k = Math.min(g.pontos.length - 2, Math.floor(ponta));
  const f = ponta - k;
  const px = x(k) + (x(k + 1) - x(k)) * f;
  const py = y(g.pontos[k].y) + (y(g.pontos[k + 1].y) - y(g.pontos[k].y)) * f;
  const ultimo = g.pontos[g.pontos.length - 1];
  const marcasX = [0, Math.floor((g.pontos.length - 1) / 2), g.pontos.length - 1].filter((v, i, l) => l.indexOf(v) === i);
  const iDestaque = g.destaque ? g.pontos.findIndex((p) => String(p.x) === String(g.destaque?.x)) : -1;
  const fim = mola(a.t, 46, 18);
  const corDaLinha = tema.destaque;
  return (
    <div style={{ position: "relative", width: a.w, height: a.h }}>
      <svg width={a.w} height={a.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="ilustra-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={corDaLinha} stopOpacity={0.28} />
            <stop offset="1" stopColor={corDaLinha} stopOpacity={0} />
          </linearGradient>
          <clipPath id="ilustra-revela">
            <rect x={0} y={0} width={px + 2} height={a.h} />
          </clipPath>
        </defs>
        {esc.ticks.map((v) => (
          <line key={v} x1={m.e} x2={m.e + W} y1={y(v)} y2={y(v)} stroke={tema.eixo} strokeWidth={2} strokeDasharray={v === esc.min ? undefined : "4 10"} opacity={0.9} />
        ))}
        <g clipPath="url(#ilustra-revela)">
          <path d={area} fill="url(#ilustra-area)" />
          <path d={caminho} fill="none" stroke={corDaLinha} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" filter={tema.familia === "neon" ? "url(#ilustra-neon)" : tema.filtro} />
        </g>
        {desenho > 0.01 && <circle cx={px} cy={py} r={11} fill={corDaLinha} stroke={tema.escuro ? "#00000055" : "#ffffff"} strokeWidth={4} />}
        {iDestaque >= 0 && desenho * (g.pontos.length - 1) >= iDestaque && (
          <circle cx={x(iDestaque)} cy={y(g.pontos[iDestaque].y)} r={10} fill={tema.texto} opacity={mola(a.t, 20 + iDestaque * 2, 14)} />
        )}
      </svg>
      {/* Os números do eixo e os rótulos de x, em HTML (o texto do SVG some com o zoom) */}
      {esc.ticks.map((v) => (
        <div key={v} style={{ position: "absolute", right: a.w - m.e + 14, top: y(v) - 16, ...texto(tema, 28, { color: tema.texto2, fontWeight: 600, fontFamily: tema.fonteNumero, ...TABULAR, whiteSpace: "nowrap" }) }}>
          {comUnidade(v, g.unidade, casasEixo, a.idioma, Math.abs(v) >= 1e4)}
        </div>
      ))}
      {marcasX.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: m.c + H + 12,
            left: x(i) - 120,
            width: 240,
            textAlign: i === 0 ? "left" : i === g.pontos.length - 1 ? "right" : "center",
            translate: i === 0 ? "120px 0" : i === g.pontos.length - 1 ? "-120px 0" : undefined,
            ...texto(tema, 28, { color: tema.texto2, fontWeight: 600 }),
          }}
        >
          {typeof g.pontos[i].x === "number" ? formatar(g.pontos[i].x as number, 0, a.idioma).replace(/\D(?=\d{3}$)/, "") : g.pontos[i].x}
        </div>
      ))}
      {/* O valor final, em cima da ponta */}
      <div
        style={{
          position: "absolute",
          right: m.d - 10,
          top: Math.max(-6, y(ultimo.y) - 62),
          opacity: fim,
          translate: `0 ${(1 - fim) * 12}px`,
          ...numeroCss(tema, 44, tema.destaque),
        }}
      >
        {comUnidade(ultimo.y, g.unidade, casas, a.idioma)}
      </div>
      {iDestaque >= 0 && g.destaque && (
        <div
          style={{
            position: "absolute",
            left: Math.min(a.w - 300, Math.max(0, x(iDestaque) - 150)),
            width: 300,
            top: Math.min(m.c + H - 40, y(g.pontos[iDestaque].y) + 22),
            textAlign: "center",
            opacity: mola(a.t, 24 + iDestaque * 2, 16),
            ...texto(tema, 28, { color: tema.texto }),
          }}
        >
          {g.destaque.rotulo}
        </div>
      )}
    </div>
  );
};

// ---- Barras (em pé até 4; deitadas com mais ou se pedir) ----

const CBarras: React.FC<{ g: De<"barras">; a: Area }> = ({ g, a }) => {
  const { tema } = a;
  const deitadas = g.horizontal ?? g.itens.length > 4;
  const ordenar = g.ordenar ?? deitadas;
  const itens = ordenar ? [...g.itens].sort((p, q) => q.valor - p.valor) : g.itens;
  const casas = g.casas ?? casasDe(itens.map((i) => i.valor));
  const maior = Math.max(...itens.map((i) => Math.abs(i.valor)), 1e-9);
  const algumDestaque = itens.some((i) => i.destaque);
  const tons = tonsNeutros(tema, itens.length);
  const corDe = (i: number) => (itens[i].destaque || (!algumDestaque && itens[i].valor === Math.max(...itens.map((x) => x.valor))) ? tema.destaque : tons[Math.min(i, tons.length - 1)]);
  if (deitadas) {
    const linha = a.h / itens.length;
    const rotulo = 250;
    const valor = 170;
    const W = a.w - rotulo - valor - 24;
    return (
      <div style={{ position: "relative", width: a.w, height: a.h }}>
        {itens.map((it, i) => {
          const cresceu = cresce(a.t, 4 + i * 5, 30);
          const largura = Math.max(6, (Math.abs(it.valor) / maior) * W * cresceu);
          const topo = i * linha + linha / 2;
          const alto = Math.min(54, linha * 0.62);
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: 0, width: rotulo - 18, top: topo - 18, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...texto(tema, 30, { fontWeight: it.destaque ? 800 : 600 }) }}>
                {it.rotulo}
              </div>
              <div style={{ position: "absolute", left: rotulo, top: topo - alto / 2, width: largura, height: alto, borderRadius: alto / 3, backgroundColor: corDe(i), boxShadow: tema.familia === "neon" ? `0 0 14px ${corDe(i)}` : undefined }} />
              <div style={{ position: "absolute", left: rotulo + largura + 14, top: topo - 19, opacity: mola(a.t, 14 + i * 5, 16), ...numeroCss(tema, 36, corDe(i) === tema.destaque ? tema.destaque : tema.texto) }}>
                {comUnidade(it.valor, g.unidade, casas, a.idioma)}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }
  const base = a.h - 56;
  const alturaMax = base - 64;
  const coluna = a.w / itens.length;
  const largura = Math.min(150, coluna * 0.56);
  return (
    <div style={{ position: "relative", width: a.w, height: a.h }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: base, height: 3, backgroundColor: tema.eixo }} />
      {itens.map((it, i) => {
        const cresceu = cresce(a.t, 4 + i * 6, 30);
        const alt = Math.max(4, (Math.abs(it.valor) / maior) * alturaMax * cresceu);
        const cx = coluna * i + coluna / 2;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: cx - largura / 2, width: largura, top: base - alt, height: alt, borderRadius: `${largura / 5}px ${largura / 5}px 0 0`, backgroundColor: corDe(i), boxShadow: tema.familia === "neon" ? `0 0 14px ${corDe(i)}` : undefined }} />
            <div style={{ position: "absolute", left: cx - coluna / 2, width: coluna, textAlign: "center", top: base - alt - 50, opacity: mola(a.t, 16 + i * 6, 16), ...numeroCss(tema, 38, corDe(i) === tema.destaque ? tema.destaque : tema.texto) }}>
              {comUnidade(it.valor, g.unidade, casas, a.idioma)}
            </div>
            <div style={{ position: "absolute", left: cx - coluna / 2, width: coluna, textAlign: "center", top: base + 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...texto(tema, 30, { fontWeight: it.destaque ? 800 : 600 }) }}>
              {it.rotulo}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---- Rosca ----

const CPizza: React.FC<{ g: De<"pizza">; a: Area }> = ({ g, a }) => {
  const { tema } = a;
  const total = g.partes.reduce((s, p) => s + p.valor, 0) || 1;
  const maior = g.partes.reduce((m, p, i) => (p.valor > g.partes[m].valor ? i : m), 0);
  const iDestaque = g.partes.findIndex((p) => p.destaque);
  const alvo = iDestaque >= 0 ? iDestaque : maior;
  const tons = tonsNeutros(tema, g.partes.length - 1);
  let k = 0;
  const cores = g.partes.map((_, i) => (i === alvo ? tema.destaque : tons[k++] ?? tema.neutro));
  const r = Math.min(a.h / 2 - 6, 200);
  const espessura = r * 0.38;
  const cx = r + 8;
  const cy = a.h / 2;
  const giro = cresce(a.t, 4, 40);
  const circ = 2 * Math.PI * (r - espessura / 2);
  let acumulado = 0;
  const casas = g.casas ?? 0;
  const pct = (v: number) => `${formatar((v / total) * 100, casas, a.idioma)}%`;
  return (
    <div style={{ position: "relative", width: a.w, height: a.h }}>
      <svg width={2 * r + 16} height={a.h} style={{ position: "absolute", left: 0, top: 0 }}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {g.partes.map((p, i) => {
            const fatia = (p.valor / total) * circ;
            const inicio = acumulado;
            acumulado += fatia;
            const visivel = Math.max(0, Math.min(fatia, giro * circ - inicio));
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r - espessura / 2}
                fill="none"
                stroke={cores[i]}
                strokeWidth={i === alvo ? espessura + 8 : espessura}
                strokeDasharray={`${Math.max(0, visivel - 3)} ${circ}`}
                strokeDashoffset={-inicio}
              />
            );
          })}
        </g>
      </svg>
      <div style={{ position: "absolute", left: cx - r + espessura, width: 2 * (r - espessura), top: cy - 32, textAlign: "center", opacity: mola(a.t, 30, 16), ...numeroCss(tema, 56, tema.destaque) }}>
        {pct(g.partes[alvo].valor)}
      </div>
      <div style={{ position: "absolute", left: 2 * r + 56, right: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        {g.partes.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, opacity: mola(a.t, 8 + i * 5, 16) }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: cores[i], flex: "none" }} />
            <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...texto(tema, 32, { fontWeight: i === alvo ? 800 : 600 }) }}>{p.rotulo}</div>
            <div style={numeroCss(tema, 32, i === alvo ? tema.destaque : tema.texto2, { fontWeight: 700 })}>{pct(p.valor)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- Grade de ícones (X em cada Y) ----

const CUnidades: React.FC<{ g: De<"unidades">; a: Area }> = ({ g, a }) => {
  const { tema } = a;
  // Poucos: uma linha; até 12: duas linhas (ícones maiores); mais: 10 por linha
  const colunas = g.total <= 5 ? g.total : g.total <= 12 ? Math.ceil(g.total / 2) : 10;
  const linhas = Math.ceil(g.total / colunas);
  const cabecalho = 96;
  const celula = Math.min(a.w / colunas, (a.h - cabecalho) / linhas, 150);
  const largura = celula * colunas;
  // A grade no meio do espaço que sobra embaixo do "X em cada Y"
  const topo = cabecalho + Math.max(0, (a.h - cabecalho - celula * linhas) / 2);
  const palavras = palavrasDo(a.idioma);
  return (
    <div style={{ position: "relative", width: a.w, height: a.h }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: "center", opacity: mola(a.t, 0, 18), ...texto(tema, 46, { fontWeight: 800 }) }}>
        <span style={numeroCss(tema, 64, tema.destaque)}>{formatar(g.marcados, 0, a.idioma)}</span> {palavras.emCada} {formatar(g.total, 0, a.idioma)}
        {g.rotulo ? <span style={{ color: tema.texto2, fontWeight: 600, fontSize: 32 }}> · {g.rotulo}</span> : null}
      </div>
      {Array.from({ length: g.total }, (_, i) => {
        const marcado = i < g.marcados;
        const aparece = mola(a.t, 6 + i * Math.min(2, 50 / g.total), 12);
        const acende = marcado ? cresce(a.t, 18 + i * Math.min(3, 30 / Math.max(1, g.marcados)), 10) : 0;
        const linha = Math.floor(i / colunas);
        const coluna = i % colunas;
        return (
          <div key={i} style={{ position: "absolute", left: (a.w - largura) / 2 + coluna * celula, top: topo + linha * celula, width: celula, height: celula, display: "grid", placeItems: "center", opacity: aparece, scale: String(0.7 + 0.3 * aparece) }}>
            <DesenhoDoIcone nome={g.icone ?? "pessoa"} tamanho={celula * 0.78} cor={acende > 0.5 ? tema.destaque : tema.neutro} traco={2} />
          </div>
        );
      })}
    </div>
  );
};

// ---- Um contra o outro ----

const CComparacao: React.FC<{ g: De<"comparacao">; a: Area }> = ({ g, a }) => {
  const { tema } = a;
  const casas = g.casas ?? casasDe([g.a.valor, g.b.valor]);
  const maior = Math.max(Math.abs(g.a.valor), Math.abs(g.b.valor), 1e-9);
  const lados = [g.a, g.b];
  const meio = a.w / 2;
  return (
    <div style={{ position: "relative", width: a.w, height: a.h }}>
      {lados.map((l, i) => {
        const ganha = Math.abs(l.valor) === maior;
        const cor = ganha ? tema.destaque : tema.texto2;
        const entra = mola(a.t, i * 8, 20);
        const conta = cresce(a.t, 6 + i * 8, 34);
        const barra = (Math.abs(l.valor) / maior) * (meio - 80) * conta;
        return (
          <div key={i} style={{ position: "absolute", left: i === 0 ? 0 : meio + 30, width: meio - 30, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, opacity: entra, translate: `${(1 - entra) * (i === 0 ? -20 : 20)}px 0` }}>
            {l.icone && <DesenhoDoIcone nome={l.icone} tamanho={84} cor={cor} traco={1.8} />}
            <div style={numeroCss(tema, Math.min(84, Math.floor((meio - 60) / (comUnidade(l.valor, g.unidade, casas, a.idioma).length * 0.6))), cor)}>{comUnidade(l.valor * (0.0 + conta), g.unidade, casas, a.idioma)}</div>
            <div style={{ textAlign: "center", ...texto(tema, 32, { color: tema.texto, fontWeight: 700 }) }}>{l.rotulo}</div>
            <div style={{ width: meio - 80, height: 18, borderRadius: 9, backgroundColor: tema.neutroClaro, overflow: "hidden" }}>
              <div style={{ width: barra, height: "100%", borderRadius: 9, backgroundColor: ganha ? tema.destaque : tema.neutro }} />
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: meio - 36, top: a.h / 2 - 36, width: 72, height: 72, borderRadius: 999, display: "grid", placeItems: "center", backgroundColor: tema.escuro ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", opacity: mola(a.t, 4, 14), ...texto(tema, 30, { fontWeight: 800, color: tema.texto2 }) }}>
        {palavrasDo(a.idioma).vs}
      </div>
    </div>
  );
};

// ---- Linha do tempo (até 4 marcos) ----

const CLinhaDoTempo: React.FC<{ g: De<"linhaDoTempo">; a: Area }> = ({ g, a }) => {
  const { tema } = a;
  const n = g.marcos.length;
  const passo = a.w / n;
  const Y = a.h * 0.4;
  const linha = cresce(a.t, 2, 16 + n * 12);
  return (
    <div style={{ position: "relative", width: a.w, height: a.h }}>
      <div style={{ position: "absolute", left: passo / 2, top: Y - 3, width: (a.w - passo) * linha, height: 6, borderRadius: 3, backgroundColor: tema.eixo }} />
      {g.marcos.map((m, i) => {
        const chega = mola(a.t, 6 + i * 12, 16);
        const ultimo = i === n - 1;
        const cx = passo * i + passo / 2;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: cx - passo / 2, width: passo, top: Y - 92, textAlign: "center", opacity: chega, translate: `0 ${(1 - chega) * 14}px`, ...numeroCss(tema, n > 3 ? 40 : 46, ultimo ? tema.destaque : tema.texto) }}>
              {m.quando}
            </div>
            <div style={{ position: "absolute", left: cx - 18, top: Y - 18, width: 36, height: 36, borderRadius: 99, backgroundColor: ultimo ? tema.destaque : tema.texto, border: `6px solid ${tema.escuro ? "#00000055" : "#FFFFFF"}`, boxSizing: "border-box", scale: String(chega) }} />
            {m.icone && (
              <div style={{ position: "absolute", left: cx - 28, top: Y + 34, opacity: chega }}>
                <DesenhoDoIcone nome={m.icone} tamanho={56} cor={ultimo ? tema.destaque : tema.texto2} traco={1.9} />
              </div>
            )}
            <div style={{ position: "absolute", left: cx - passo / 2 + 8, width: passo - 16, top: Y + (m.icone ? 100 : 40), textAlign: "center", opacity: chega, ...texto(tema, 29, { fontWeight: 600, color: tema.texto, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }) }}>
              {m.rotulo}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---- Escala (círculos do tamanho do valor) ----

const CEscala: React.FC<{ g: De<"escala">; a: Area }> = ({ g, a }) => {
  const { tema } = a;
  const casas = g.casas ?? casasDe(g.itens.map((i) => i.valor));
  const maior = Math.max(...g.itens.map((i) => i.valor));
  const coluna = a.w / g.itens.length;
  const diametroMax = Math.min(a.h - 120, coluna - 24);
  const chao = a.h - 100;
  return (
    <div style={{ position: "relative", width: a.w, height: a.h }}>
      {g.itens.map((it, i) => {
        const d = Math.max(18, diametroMax * Math.sqrt(it.valor / maior));
        const entra = mola(a.t, 4 + i * 8, 20);
        const cor = it.destaque || (!g.itens.some((x) => x.destaque) && it.valor === maior) ? tema.destaque : tema.neutro;
        const cx = coluna * i + coluna / 2;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: cx - d / 2, top: chao - d, width: d, height: d, borderRadius: 999, backgroundColor: cor, opacity: 0.92, scale: String(entra), transformOrigin: "50% 100%", display: "grid", placeItems: "center" }}>
              {it.icone && d > 70 && <DesenhoDoIcone nome={it.icone} tamanho={d * 0.5} cor={tema.escuro ? "#0B0F1E" : "#FFFFFF"} traco={2} />}
            </div>
            <div style={{ position: "absolute", left: cx - coluna / 2, width: coluna, top: chao + 10, textAlign: "center", opacity: entra, ...numeroCss(tema, 34, cor === tema.destaque ? tema.destaque : tema.texto) }}>
              {comUnidade(it.valor, g.unidade, casas, a.idioma)}
            </div>
            <div style={{ position: "absolute", left: cx - coluna / 2, width: coluna, top: chao + 52, textAlign: "center", opacity: entra, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...texto(tema, 28, { fontWeight: 600, color: tema.texto2 }) }}>
              {it.rotulo}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---- Conta passo a passo ----

const CConta: React.FC<{ g: De<"conta">; a: Area }> = ({ g, a }) => {
  const { tema } = a;
  const n = g.passos.length;
  const espaco = Math.max(10, Math.min(24, 60 / n));
  const alturaLinha = Math.min(96, a.h / n);
  return (
    <div style={{ width: a.w, height: a.h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 0 }}>
      {g.passos.map((p, i) => {
        const resultado = i === n - 1 && n > 1;
        const entra = mola(a.t, 4 + i * espaco, 16);
        return (
          <div key={i} style={{ height: alturaLinha, display: "flex", alignItems: "center", justifyContent: "center", borderTop: resultado ? `4px solid ${tema.eixo}` : undefined, opacity: entra, translate: `${(1 - entra) * -24}px 0` }}>
            <span style={numeroCss(tema, resultado ? 64 : 50, resultado ? tema.destaque : tema.texto, { fontWeight: resultado ? 800 : 600 })}>
              <ComExpoente texto={p} />
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** O gráfico no tamanho pedido (`w` x `h`), montando com `t` */
export const GraficoCompacto: React.FC<{ g: Grafico; a: Area }> = ({ g, a }) => {
  switch (g.tipo) {
    case "numero":
      return <CNumero g={g} a={a} />;
    case "linha":
      return <CLinha g={g} a={a} />;
    case "barras":
      return <CBarras g={g} a={a} />;
    case "pizza":
      return <CPizza g={g} a={a} />;
    case "unidades":
      return <CUnidades g={g} a={a} />;
    case "comparacao":
      return <CComparacao g={g} a={a} />;
    case "linhaDoTempo":
      return <CLinhaDoTempo g={g} a={a} />;
    case "escala":
      return <CEscala g={g} a={a} />;
    case "conta":
      return <CConta g={g} a={a} />;
  }
};
