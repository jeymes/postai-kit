// Ilustração da fala: a camada que vai por cima da cena animada e mostra, na
// palavra exata da fala, o que está sendo dito (o número, a conta, o gráfico,
// o ícone, o objeto, o pensamento, a seta). O plano (tempo.ts) diz quando cada
// item entra e sai e em que faixa fica; aqui cada quadro só desenha:
//   - faixas: "topo" (entre o título e as cabeças), "meio" e "baixo" (entre os
//     ombros e a legenda). Os itens se empilham sem se cobrir; quando um sai, os
//     outros deslizam para o lugar dele; se não cabem, a pilha encolhe junto;
//   - pensamento: o balão em cima da cabeça de quem pensa (posição que o molde dá);
//   - seta e círculo: num ponto da tela, desenhando-se.
// Tudo entra com mola sem quique (ou um "pop" de leve) e sai em 12 quadros:
// nada aparece nem some num quadro só.

import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { mola } from "../../moldes/documentario/infografico/tema";
import { FiltrosDaIlustracao, Pilula } from "./pecas";
import type { Ilustracao } from "./schema";
import { alturaDaPilha, planejarIlustracoes, TEMPO, type Faixa, type ItemPlanejado, type PalavraNoTempo } from "./tempo";
import { temaDaIlustracao, type TemaDaIlustracao } from "./tema";
import { ConteudoDoPensamento, ItemDaFaixa, linhasDaConta, pop } from "./tipos";
import { alturaDaConta } from "./layout";

const LARGURA = 1080;
const ALTURA = 1920;
const MARGEM = 60;
const FOLGA = 20;

type Trecho = { y0: number; y1: number };
export type Faixas = Record<Faixa, Trecho>;

/**
 * As faixas livres de cada molde (tela 1080x1920). Conversa: o título vai até
 * ~300, as cabeças começam em ~860, a legenda fica entre ~1350 (a do narrador) e 1560. Mundo3D:
 * o título some no começo, a legenda fica em 1180 (no close, 1420).
 */
export const FAIXAS_DO_MOLDE: Record<"conversa" | "mundo3d", Faixas> = {
  // O baixo acaba acima da legenda grande do narrador (~1350; antes ia até 1400 e o item ficava
  // atrás dela). No Conversa ele nem é usado (semBaixo: cobriria o corpo de quem está de pé)
  conversa: { topo: { y0: 330, y1: 850 }, meio: { y0: 600, y1: 1200 }, baixo: { y0: 1080, y1: 1320 } },
  mundo3d: { topo: { y0: 210, y1: 880 }, meio: { y0: 620, y1: 1160 }, baixo: { y0: 1320, y1: 1520 } },
};

export interface PropsDaCamada {
  /** O campo `ilustra` da cena */
  ilustra?: Ilustracao[];
  /** O tempo de cada palavra da fala, na mesma base de quadros do useCurrentFrame() de onde a camada está */
  palavras: PalavraNoTempo[];
  /** Quadro em que a fala (ou a cena) acaba: quem não tem `ate` sai antes dele */
  fim: number;
  /** Quadro em que a fala começa (padrão: 3 quadros antes da primeira palavra) */
  inicio?: number;
  /** O estilo do canal (modelo e fundo, como no roteiro) e a cor de destaque (padrão: a da marca) */
  estilo?: { modelo?: string; fundo?: "claro" | "noite" };
  destaque?: string;
  idioma?: string;
  /** As faixas do molde (padrão: conversa) e ajustes: `topo` = onde a faixa do alto começa (embaixo do título) */
  molde?: "conversa" | "mundo3d";
  faixas?: Partial<Faixas>;
  topo?: number;
  /** Onde fica o alto da cabeça de cada personagem na tela (para o balão de pensamento), por id */
  personagens?: Record<string, { x: number; y: number }>;
  /** Sem faixa de baixo (ela cobriria o corpo de quem está de pé): o "baixo" sobe para o alto */
  semBaixo?: boolean;
}

/** A entrada (mola sem quique) e a saída (12 quadros, suave) de um item, de 0 a 1 */
function presenca(p: ItemPlanejado, t: number) {
  if (t < p.entra || t >= p.sai + TEMPO.saida) return { e: 0, s: 1, peso: 0 };
  const e = mola(t, p.entra, TEMPO.entrada + 4);
  const s = interpolate(t, [p.sai, p.sai + TEMPO.saida], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return { e, s, peso: e * (1 - s) };
}

/** A cor lisa do cartão (no SVG não dá para usar o gradiente do CSS) */
const cartaoLiso = (tema: TemaDaIlustracao) =>
  tema.cartao.startsWith("#") ? tema.cartao : tema.familia === "3d" ? (tema.escuro ? "#2A3366" : "#FFFFFF") : tema.familia === "giz" ? "#26382F" : tema.familia === "neon" ? "#120A2A" : tema.escuro ? "#1B2350" : "#FFFFFF";

// ---- O balão de pensamento ----

/** Onde fica o balão de quem pensa: em cima da cabeça, um pouco para fora da tela; o topo dele limita a faixa do alto */
function lugarDoBalao(cabeca: { x: number; y: number }) {
  const lado = cabeca.x < LARGURA / 2 - 20 ? -1 : 1;
  const largura = 330;
  const altura = 200;
  const cx = Math.min(LARGURA - MARGEM - largura / 2, Math.max(MARGEM + largura / 2, cabeca.x + lado * 70));
  const cy = cabeca.y - 120 - altura / 2;
  return { lado, largura, altura, cx, cy, topo: cy - altura / 2 - 24 };
}

const Balao: React.FC<{ p: ItemPlanejado; cabeca: { x: number; y: number }; t: number; tema: TemaDaIlustracao }> = ({ p, cabeca, t, tema }) => {
  const item = p.item as Extract<Ilustracao, { tipo: "pensamento" }>;
  const b = lugarDoBalao(cabeca);
  const { s } = presenca(p, t);
  const local = t - p.entra;
  // As bolinhas sobem da cabeça uma por uma; depois o balão abre
  const bolinhas = [0, 1, 2].map((k) => ({
    r: 11 + k * 7,
    x: cabeca.x + b.lado * 24 + (b.cx - b.lado * 40 - cabeca.x - b.lado * 24) * ((k + 1) / 4),
    y: cabeca.y - 14 - (cabeca.y - 14 - (b.cy + b.altura / 2)) * ((k + 1) / 4),
    q: pop(local, k * 3),
  }));
  const abre = pop(local, 7);
  const contorno = tema.larguraDoContorno > 0 ? tema.contorno : "transparent";
  const lw = Math.max(tema.larguraDoContorno, tema.familia === "liso" ? 0 : 4);
  // A nuvem: uma elipse com calombos; primeiro o contorno de todos, depois o miolo por cima (sem linhas por dentro)
  const calombos = Array.from({ length: 9 }, (_, k) => {
    const a = (k / 9) * Math.PI * 2 + 0.3;
    return { x: b.cx + Math.cos(a) * b.largura * 0.42, y: b.cy + Math.sin(a) * b.altura * 0.38, r: b.altura * (0.26 + 0.05 * Math.sin(k * 2.3)) };
  });
  const formas = (fill: string, stroke: string, largura: number) => (
    <>
      <ellipse cx={b.cx} cy={b.cy} rx={b.largura * 0.46} ry={b.altura * 0.42} fill={fill} stroke={stroke} strokeWidth={largura} />
      {calombos.map((c, k) => (
        <circle key={k} cx={c.x} cy={c.y} r={c.r} fill={fill} stroke={stroke} strokeWidth={largura} />
      ))}
    </>
  );
  const miolo = cartaoLiso(tema);
  const sombra = tema.familia === "liso" || tema.familia === "3d" ? `drop-shadow(0 14px 22px rgba(0,0,0,${tema.escuro ? 0.45 : 0.2}))` : undefined;
  return (
    <AbsoluteFill style={{ opacity: 1 - s }}>
      <svg width={LARGURA} height={ALTURA} style={{ position: "absolute", inset: 0, overflow: "visible", filter: sombra }}>
        <g filter={tema.filtro}>
          {bolinhas.map((o, k) => (
            <circle key={k} cx={o.x} cy={o.y} r={o.r * o.q} fill={miolo} stroke={contorno} strokeWidth={lw} />
          ))}
        </g>
        <g style={{ transformOrigin: `${b.cx - b.lado * 40}px ${b.cy + b.altura / 2}px`, scale: String(0.2 + 0.8 * abre) }} opacity={Math.min(1, abre * 2)}>
          <g filter={tema.familia === "neon" ? "url(#ilustra-neon)" : tema.filtro}>{formas("none", contorno, lw * 2)}</g>
          {formas(miolo, "none", 0)}
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          left: b.cx - b.largura / 2,
          width: b.largura,
          top: b.cy - b.altura / 2,
          height: b.altura,
          display: "grid",
          placeItems: "center",
          opacity: mola(local, 10, 12),
          scale: String(0.8 + 0.2 * abre),
        }}
      >
        <ConteudoDoPensamento item={item} tema={tema} tamanho={116} />
      </div>
    </AbsoluteFill>
  );
};

// ---- Seta e círculo (num ponto da tela, desenhando-se) ----

const pontoNaTela = (ponto: { x: number; y: number }) => ({ x: (ponto.x / 100) * LARGURA, y: (ponto.y / 100) * ALTURA });
const preso = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** O traço de baixo (claro no claro, escuro no escuro): a seta lê em cima de qualquer cenário */
const corDeBaixo = (tema: TemaDaIlustracao) => (tema.escuro ? "#0B0F1E" : "#FFFFFF");

const Seta: React.FC<{ p: ItemPlanejado; t: number; tema: TemaDaIlustracao }> = ({ p, t, tema }) => {
  const item = p.item as Extract<Ilustracao, { tipo: "seta" }>;
  const alvo = pontoNaTela(item.ponto);
  const de = item.de ?? (item.ponto.x < 50 ? "direita" : "esquerda");
  const desvio = { direita: [290, -150], esquerda: [-290, -150], cima: [90, -320], baixo: [90, 320] }[de];
  const cauda = { x: preso(alvo.x + desvio[0], 90, LARGURA - 90), y: preso(alvo.y + desvio[1], 160, ALTURA - 220) };
  const dx = alvo.x - cauda.x;
  const dy = alvo.y - cauda.y;
  const comprimento = Math.hypot(dx, dy) || 1;
  // A ponta para um pouco antes do alvo; a curva entorta para o lado de fora
  const ponta = { x: alvo.x - (dx / comprimento) * 22, y: alvo.y - (dy / comprimento) * 22 };
  const curva = { x: (cauda.x + ponta.x) / 2 + (-dy / comprimento) * comprimento * 0.22, y: (cauda.y + ponta.y) / 2 + (dx / comprimento) * comprimento * 0.22 };
  const d = `M${cauda.x} ${cauda.y} Q${curva.x} ${curva.y} ${ponta.x} ${ponta.y}`;
  const local = t - p.entra;
  const traco = interpolate(local, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const cabeca = interpolate(local, [12, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4)) });
  const { s } = presenca(p, t);
  // A direção da ponta (a tangente da curva no fim) e as duas asas
  const tx = ponta.x - curva.x;
  const ty = ponta.y - curva.y;
  const ang = Math.atan2(ty, tx);
  const asa = 50 * cabeca;
  const asas = [ang + Math.PI - 0.5, ang + Math.PI + 0.5].map((a) => `M${ponta.x} ${ponta.y} L${ponta.x + Math.cos(a) * asa} ${ponta.y + Math.sin(a) * asa}`).join(" ");
  const filtro = tema.familia === "neon" ? "url(#ilustra-neon)" : tema.filtro;
  return (
    <AbsoluteFill style={{ opacity: 1 - s }}>
      <svg width={LARGURA} height={ALTURA} style={{ position: "absolute", inset: 0 }}>
        <g filter={filtro}>
          {[corDeBaixo(tema), tema.destaque].map((cor, k) => (
            <g key={k} stroke={cor} strokeWidth={k === 0 ? 26 : 13} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={k === 0 ? 0.85 : 1}>
              <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traco} />
              {cabeca > 0 && <path d={asas} />}
            </g>
          ))}
        </g>
      </svg>
      {item.rotulo && (
        <div
          style={{
            position: "absolute",
            // O rótulo fica depois da cauda, do lado contrário ao alvo (nunca em cima do que a seta aponta)
            left: preso(cauda.x - (dx / comprimento) * 70, 150, LARGURA - 150),
            top: preso(cauda.y - (dy / comprimento) * 60, 120, ALTURA - 200),
            translate: "-50% -50%",
            opacity: mola(local, 4, 12),
          }}
        >
          <Pilula tema={tema} tamanho={40}>
            {item.rotulo}
          </Pilula>
        </div>
      )}
    </AbsoluteFill>
  );
};

const Circulo: React.FC<{ p: ItemPlanejado; t: number; tema: TemaDaIlustracao }> = ({ p, t, tema }) => {
  const item = p.item as Extract<Ilustracao, { tipo: "circulo" }>;
  const c = pontoNaTela(item.ponto);
  const r = ((item.raio ?? 12) / 100) * LARGURA;
  // Uma volta e um pouco, como à mão: o raio varia de leve e o fim passa do começo
  const pontos: string[] = [];
  const passos = 72;
  const a0 = -1.9;
  for (let k = 0; k <= passos; k++) {
    const f = k / passos;
    const a = a0 + f * Math.PI * 2 * 1.08;
    const rr = r * (1 + 0.035 * Math.sin(3 * a + 1) + 0.05 * f);
    pontos.push(`${k ? "L" : "M"}${(c.x + Math.cos(a) * rr * 1.08).toFixed(1)} ${(c.y + Math.sin(a) * rr * 0.92).toFixed(1)}`);
  }
  const local = t - p.entra;
  const traco = interpolate(local, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const { s } = presenca(p, t);
  const filtro = tema.familia === "neon" ? "url(#ilustra-neon)" : tema.filtro;
  const embaixo = c.y + r * 0.92 + 70 < ALTURA - 260;
  return (
    <AbsoluteFill style={{ opacity: 1 - s }}>
      <svg width={LARGURA} height={ALTURA} style={{ position: "absolute", inset: 0 }}>
        <g filter={filtro} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={pontos.join(" ")} stroke={corDeBaixo(tema)} strokeWidth={22} opacity={0.8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traco} />
          <path d={pontos.join(" ")} stroke={tema.destaque} strokeWidth={11} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - traco} />
        </g>
      </svg>
      {item.rotulo && (
        <div style={{ position: "absolute", left: preso(c.x, 200, LARGURA - 200), top: embaixo ? c.y + r * 0.92 + 50 : c.y - r * 0.92 - 50, translate: "-50% -50%", opacity: mola(local, 12, 12) }}>
          <Pilula tema={tema} tamanho={40}>
            {item.rotulo}
          </Pilula>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---- A camada ----

export const CamadaDaFala: React.FC<PropsDaCamada> = ({ ilustra, palavras, fim, inicio, estilo, destaque, idioma, molde = "conversa", faixas: ajustes, topo, personagens, semBaixo }) => {
  const t = useCurrentFrame();
  const tema = useMemo(() => temaDaIlustracao({ modelo: estilo?.modelo, fundo: estilo?.fundo, destaque }), [estilo?.modelo, estilo?.fundo, destaque]);
  const faixas = useMemo<Faixas>(() => {
    const f = { ...FAIXAS_DO_MOLDE[molde], ...ajustes };
    return topo === undefined ? f : { ...f, topo: { y0: topo, y1: Math.max(topo + 200, f.topo.y1) } };
  }, [molde, ajustes, topo]);
  const planos = useMemo(
    () =>
      planejarIlustracoes(ilustra, palavras, {
        fim,
        inicio,
        personagens: personagens ? Object.keys(personagens) : [],
        semBaixo,
        capacidade: { topo: faixas.topo.y1 - faixas.topo.y0, meio: faixas.meio.y1 - faixas.meio.y0, baixo: faixas.baixo.y1 - faixas.baixo.y0 },
      }),
    [ilustra, palavras, fim, inicio, personagens, faixas, semBaixo],
  );
  if (!planos.length) return null;
  const naTela = planos.filter((p) => t >= p.entra && t < p.sai + TEMPO.saida);
  if (!naTela.length) return null;

  // O balão de pensamento empurra o fim da faixa do alto para cima dele (sem cobrir)
  let fimDoTopo = faixas.topo.y1;
  for (const p of naTela) {
    if (!("preso" in p.destino) || !personagens?.[p.destino.preso]) continue;
    const { peso } = presenca(p, t);
    const limite = Math.min(faixas.topo.y1, lugarDoBalao(personagens[p.destino.preso]).topo);
    fimDoTopo -= (faixas.topo.y1 - limite) * peso;
  }

  const desenhos: React.ReactNode[] = [];
  (["topo", "meio", "baixo"] as const).forEach((faixa) => {
    const itens = naTela
      .filter((p) => "faixa" in p.destino && p.destino.faixa === faixa)
      .sort((a, b) => a.entra - b.entra || a.indice - b.indice)
      // A conta ocupa só as linhas que já entraram (o cartão cresce com elas: tipos.tsx)
      .map((p) => ({ p, destino: p.destino, altura: p.item.tipo === "conta" ? alturaDaConta(linhasDaConta(p.pedacos, t)) : p.altura, ...presenca(p, t) }));
    if (!itens.length) return;
    const y1 = faixa === "topo" ? fimDoTopo : faixas[faixa].y1;
    const y0 = faixas[faixa].y0;
    const livre = Math.max(120, y1 - y0);
    const total = alturaDaPilha(itens, FOLGA);
    const escala = Math.min(1, livre / Math.max(1, total));
    // Onde a pilha começa: do alto para baixo no topo; de baixo para cima no baixo; no meio, centrada
    const comeco = faixa === "topo" ? y0 : faixa === "baixo" ? y1 - total * escala : (y0 + y1) / 2 - (total * escala) / 2;
    const cheios = itens.filter((i) => "coluna" in i.destino && i.destino.coluna === "cheia");
    let y = comeco;
    const posicoes = new Map<ItemPlanejado, { x: number; y: number; largura: number }>();
    for (const i of cheios) {
      posicoes.set(i.p, { x: MARGEM, y, largura: LARGURA - 2 * MARGEM });
      y += (i.altura + FOLGA) * i.peso * escala;
    }
    const meia = (LARGURA - 2 * MARGEM - FOLGA) / 2;
    (["esquerda", "direita"] as const).forEach((coluna) => {
      let yc = y;
      for (const i of itens.filter((k) => "coluna" in k.destino && k.destino.coluna === coluna)) {
        posicoes.set(i.p, { x: coluna === "esquerda" ? MARGEM : MARGEM + meia + FOLGA, y: yc, largura: meia });
        yc += (i.altura + FOLGA) * i.peso * escala;
      }
    });
    for (const i of itens) {
      const pos = posicoes.get(i.p);
      if (!pos) continue;
      desenhos.push(
        <div
          key={`${faixa}-${i.p.indice}`}
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            width: pos.largura,
            height: i.altura,
            scale: String(escala * (1 - 0.05 * i.s)),
            transformOrigin: faixa === "baixo" ? "50% 100%" : "50% 0%",
            opacity: Math.min(1, i.e * 1.4) * (1 - i.s),
            translate: `0 ${(1 - i.e) * 26 - i.s * 14}px`,
          }}
        >
          <ItemDaFaixa item={i.p.item} c={{ t: t - i.p.entra, agora: t, plano: i.p, largura: pos.largura, altura: i.altura, tema, idioma, chave: `ilustra-${i.p.indice}` }} />
        </div>,
      );
    }
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <FiltrosDaIlustracao />
      {desenhos}
      {naTela.map((p) =>
        "preso" in p.destino && personagens?.[p.destino.preso] ? <Balao key={`b-${p.indice}`} p={p} cabeca={personagens[p.destino.preso]} t={t} tema={tema} /> : null,
      )}
      {naTela.map((p) =>
        p.item.tipo === "seta" ? <Seta key={`s-${p.indice}`} p={p} t={t} tema={tema} /> : p.item.tipo === "circulo" ? <Circulo key={`c-${p.indice}`} p={p} t={t} tema={tema} /> : null,
      )}
    </AbsoluteFill>
  );
};
