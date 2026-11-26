// Infográfico: o desenho de cada tipo de gráfico. Cada um é uma função do
// quadro `t` (quadros desde que a animação começou): o mesmo gráfico sai
// "montando" na cena dele e já montado (t enorme) quando sai deslizando no
// começo da cena seguinte. Tela de 1920x1080; o gráfico fica entre y 250 e 800
// (em cima, o título; embaixo, a fonte e a faixa da legenda).

import React from "react";
import { Icone } from "./icones";
import {
  casasDe,
  casasDoPasso,
  comUnidade,
  escalaBonita,
  formatar,
  palavrasDo,
} from "./numeros";
import type { Grafico, NomeDoIcone } from "./schema";
import { cresce, misturar, mola, textoSobre, type Tema } from "./tema";

export const AREA = { x0: 160, x1: 1760, y0: 250, y1: 800 } as const;
const tabular: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums lining-nums",
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
};

export interface Contexto {
  /** Quadros desde que os dados começam a se montar (a palavra `em` da fala) */
  t: number;
  /** Quadros desde o começo da cena: o "esqueleto" (eixo, rótulos, grade) aparece logo, antes dos dados */
  te: number;
  tema: Tema;
  idioma?: string;
  /** A letra dos números (algarismos de mesma largura) e a dos textos */
  numeros: string;
  texto: string;
  titulo: string;
  /** Quadros que a cena ainda tem depois que a animação começa (a conta se espalha neles) */
  disponivel: number;
}

type De<T extends Grafico["tipo"]> = Extract<Grafico, { tipo: T }>;

/** As casas do gráfico: as pedidas ou as dos próprios valores */
const casasDoGrafico = (pedidas: number | undefined, valores: number[]) =>
  pedidas ?? casasDe(valores);

// ---- Número grande que conta até o valor ----

const GNumero: React.FC<{ g: De<"numero">; c: Contexto }> = ({ g, c }) => {
  const { t, tema } = c;
  const de = g.de ?? 0;
  const casas = casasDoGrafico(g.casas, [g.valor, de]);
  const v = de + (g.valor - de) * cresce(t, 4, 56);
  const final = formatar(g.valor, casas, c.idioma);
  const letras =
    final.length + ((g.prefixo?.length ?? 0) + (g.sufixo?.length ?? 0)) * 0.42;
  const tamanho = Math.min(250, Math.floor(1450 / (letras * 0.6)));
  const entrada = mola(c.te, 0, 26);
  const rotulo = mola(Math.max(c.te, t + 22), 22, 30);
  return (
    <div
      style={{
        position: "absolute",
        left: AREA.x0,
        right: 1920 - AREA.x1,
        top: AREA.y0,
        height: AREA.y1 - AREA.y0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
      }}
    >
      {g.icone && (
        <div
          style={{
            opacity: entrada,
            scale: String(0.8 + 0.2 * entrada),
            width: 116,
            height: 116,
            borderRadius: 999,
            border: `3px solid ${tema.destaque}`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icone nome={g.icone} tamanho={62} cor={tema.destaque} />
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: tamanho * 0.08,
          opacity: entrada,
          translate: `0 ${(1 - entrada) * 30}px`,
          whiteSpace: "nowrap",
        }}
      >
        {g.prefixo && (
          <span
            style={{
              fontFamily: c.numeros,
              fontWeight: 600,
              fontSize: tamanho * 0.42,
              color: tema.texto2,
            }}
          >
            {g.prefixo}
          </span>
        )}
        <span
          style={{
            fontFamily: c.numeros,
            fontWeight: 800,
            fontSize: tamanho,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: tema.destaque,
            ...tabular,
          }}
        >
          {formatar(v, casas, c.idioma)}
        </span>
        {g.sufixo && (
          <span
            style={{
              fontFamily: c.numeros,
              fontWeight: 600,
              fontSize: tamanho * 0.42,
              color: tema.texto2,
            }}
          >
            {g.sufixo.trim()}
          </span>
        )}
      </div>
      <div
        style={{
          width: 260 * cresce(t, 10, 40),
          height: 6,
          borderRadius: 3,
          backgroundColor: tema.destaque,
          opacity: 0.85,
        }}
      />
      {g.rotulo && (
        <div
          style={{
            fontFamily: c.texto,
            fontWeight: 500,
            fontSize: 46,
            lineHeight: 1.25,
            color: tema.texto,
            textAlign: "center",
            maxWidth: 1300,
            opacity: rotulo,
            translate: `0 ${(1 - rotulo) * 16}px`,
          }}
        >
          {g.rotulo}
        </div>
      )}
    </div>
  );
};

// ---- Linha que se desenha ----

const GLinha: React.FC<{ g: De<"linha">; c: Contexto }> = ({ g, c }) => {
  const { t, tema } = c;
  const X0 = 300;
  const X1 = 1700;
  const Y0 = 300;
  const Y1 = 740;
  const ys = g.pontos.map((p) => p.y);
  const escala = escalaBonita(Math.min(...ys), Math.max(...ys), 4, true);
  const casas = casasDoGrafico(g.casas, ys);
  const numericos = g.pontos.every((p) => typeof p.x === "number");
  const xs = g.pontos.map((p, i) => {
    if (!numericos) return X0 + ((X1 - X0) * i) / (g.pontos.length - 1);
    const a = g.pontos[0].x as number;
    const b = g.pontos[g.pontos.length - 1].x as number;
    return X0 + ((X1 - X0) * ((p.x as number) - a)) / (b - a || 1);
  });
  const yDe = (v: number) =>
    Y1 - ((Y1 - Y0) * (v - escala.min)) / (escala.max - escala.min || 1);
  const pts = g.pontos.map((p, i) => [xs[i], yDe(p.y)] as const);
  // O comprimento de cada trecho: a ponta da linha anda no mesmo passo o caminho todo
  const trechos = pts
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = trechos.reduce((a, b) => a + b, 0);
  const desenho = cresce(
    t,
    6,
    Math.min(110, Math.max(55, 6 * g.pontos.length + 30)),
  );
  let resta = desenho * total;
  let ponta: readonly [number, number] = pts[0];
  let chegou = 0;
  for (let i = 0; i < trechos.length; i++) {
    if (resta >= trechos[i]) {
      resta -= trechos[i];
      ponta = pts[i + 1];
      chegou = i + 1;
      continue;
    }
    const f = trechos[i] ? resta / trechos[i] : 0;
    ponta = [
      pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
      pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
    ];
    break;
  }
  if (desenho >= 0.999) {
    chegou = pts.length - 1;
    ponta = pts[pts.length - 1];
  }
  const caminho = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${caminho} L${pts[pts.length - 1][0]},${Y1} L${pts[0][0]},${Y1} Z`;
  // Os rótulos do eixo x: no máximo 7, sempre o primeiro e o último
  const passoX = Math.max(1, Math.ceil((g.pontos.length - 1) / 6));
  const comRotulo = g.pontos.map(
    (_, i) =>
      i === 0 ||
      i === g.pontos.length - 1 ||
      (i % passoX === 0 && g.pontos.length - 1 - i >= passoX * 0.6),
  );
  const eixo = mola(c.te, 0, 24);
  const casasDoEixo = Math.max(casasDoPasso(escala.passo), 0);
  const noEixo = (v: number) =>
    Math.abs(escala.max) >= 10000
      ? comUnidade(v, g.unidade, 0, c.idioma, true)
      : comUnidade(v, g.unidade, casasDoEixo, c.idioma, false);
  const iDestaque = g.destaque
    ? g.pontos.findIndex((p) => String(p.x) === String(g.destaque?.x))
    : -1;
  const ultimo = g.pontos.length - 1;
  const Balao: React.FC<{ i: number; texto?: string; forte: boolean }> = ({
    i,
    texto,
    forte,
  }) => {
    const aparece = mola(t, 0, 20) * (chegou >= i ? 1 : 0);
    const valor = comUnidade(g.pontos[i].y, g.unidade, casas, c.idioma);
    const [px, py] = pts[i];
    const largura = Math.max(valor.length * 22, (texto?.length ?? 0) * 15) + 48;
    const altura = texto ? 96 : 62;
    const emCima = py - altura - 30 > Y0 - 60;
    const bx = Math.min(
      1780 - largura,
      Math.max(140, px - largura / 2 - (i === ultimo ? largura * 0.3 : 0)),
    );
    const by = emCima ? py - altura - 26 : py + 26;
    return (
      <g opacity={aparece} transform={`translate(0 ${(1 - aparece) * 10})`}>
        <circle
          cx={px}
          cy={py}
          r={forte ? 13 : 10}
          fill={tema.fundo}
          stroke={tema.destaque}
          strokeWidth={6}
        />
        <rect
          x={bx}
          y={by}
          width={largura}
          height={altura}
          rx={14}
          fill={forte ? tema.destaque : tema.cartao}
          stroke={forte ? "none" : tema.eixo}
          strokeWidth={2}
        />
        <text
          x={bx + largura / 2}
          y={by + (texto ? 42 : 43)}
          textAnchor="middle"
          fontFamily={c.numeros}
          fontWeight={800}
          fontSize={36}
          fill={forte ? textoSobre(tema.destaque) : tema.texto}
          style={tabular}
        >
          {valor}
        </text>
        {texto && (
          <text
            x={bx + largura / 2}
            y={by + 78}
            textAnchor="middle"
            fontFamily={c.texto}
            fontWeight={500}
            fontSize={25}
            fill={forte ? textoSobre(tema.destaque) : tema.texto2}
          >
            {texto}
          </text>
        )}
      </g>
    );
  };
  return (
    <>
      {/* Os rótulos do eixo x em HTML (26/11/2026: em texto de SVG, no render longo, o pedaço de baixo deles saía cortado com o zoom da câmera) */}
      {g.pontos.map((p, i) =>
        comRotulo[i] ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: xs[i] - 120,
              width: 240,
              top: Y1 + 20,
              textAlign: "center",
              fontFamily: c.numeros,
              fontWeight: 500,
              fontSize: 30,
              lineHeight: 1.2,
              color: tema.texto2,
              opacity: eixo,
              ...tabular,
            }}
          >
            {String(p.x)}
          </div>
        ) : null,
      )}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <defs>
          <linearGradient id="area-da-linha" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tema.destaque} stopOpacity={0.32} />
            <stop offset="100%" stopColor={tema.destaque} stopOpacity={0} />
          </linearGradient>
          <clipPath id="ate-a-ponta">
            <rect x={0} y={0} width={ponta[0] + 1} height={1080} />
          </clipPath>
        </defs>
        <g opacity={eixo}>
          {escala.ticks.map((v, i) => (
            <g key={i}>
              <line
                x1={X0}
                x2={X1}
                y1={yDe(v)}
                y2={yDe(v)}
                stroke={tema.eixo}
                strokeWidth={v === 0 ? 2.5 : 1.5}
                strokeDasharray={v === 0 ? undefined : "2 10"}
                strokeLinecap="round"
              />
              <text
                x={X0 - 26}
                y={yDe(v) + 11}
                textAnchor="end"
                fontFamily={c.numeros}
                fontWeight={500}
                fontSize={30}
                fill={tema.texto2}
                style={tabular}
              >
                {noEixo(v)}
              </text>
            </g>
          ))}
        </g>
        <path
          d={area}
          fill="url(#area-da-linha)"
          clipPath="url(#ate-a-ponta)"
        />
        {/* Só depois de começar: o traço de tamanho zero com ponta redonda desenhava um ponto solto */}
        {desenho > 0.002 && (
          <path
            d={caminho}
            fill="none"
            stroke={tema.destaque}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${total * desenho} ${total * 2}`}
          />
        )}
        {g.pontos.length <= 14 &&
          pts.map((p, i) =>
            i <= chegou && i !== iDestaque && i !== ultimo ? (
              <circle key={i} cx={p[0]} cy={p[1]} r={6} fill={tema.destaque} />
            ) : null,
          )}
        {desenho < 1 && (
          <circle
            cx={ponta[0]}
            cy={ponta[1]}
            r={12}
            fill={tema.destaque}
            opacity={0.9}
          />
        )}
        {iDestaque >= 0 && iDestaque !== ultimo && (
          <Balao i={iDestaque} texto={g.destaque?.rotulo} forte />
        )}
        <Balao
          i={ultimo}
          texto={iDestaque === ultimo ? g.destaque?.rotulo : undefined}
          forte={iDestaque < 0 || iDestaque === ultimo}
        />
      </svg>
    </>
  );
};

// ---- Barras que crescem (em pé ou deitadas, em ranking) ----

const GBarras: React.FC<{ g: De<"barras">; c: Contexto }> = ({ g, c }) => {
  const { t, tema } = c;
  const deitadas = Boolean(g.horizontal);
  const ordenar = g.ordenar ?? deitadas;
  const itens = ordenar
    ? [...g.itens].sort((a, b) => b.valor - a.valor)
    : g.itens;
  const valores = itens.map((i) => i.valor);
  const casas = casasDoGrafico(g.casas, valores);
  const algumDestaque = itens.some((i) => i.destaque);
  const maior = Math.max(...valores);
  const forte = (i: (typeof itens)[number]) =>
    algumDestaque ? Boolean(i.destaque) : i.valor === maior;
  const n = itens.length;
  const atrasoDe = (i: number) => i * Math.min(7, 42 / n);
  const escala = escalaBonita(
    Math.min(0, ...valores),
    Math.max(0, ...valores),
    4,
  );
  if (deitadas) {
    const altura = Math.min(84, 520 / n);
    const topo = (AREA.y0 + AREA.y1) / 2 - (altura * n) / 2 + 10;
    const L0 = 640;
    const L1 = 1560;
    const xDe = (v: number) =>
      L0 + ((L1 - L0) * (v - escala.min)) / (escala.max - escala.min || 1);
    const zero = xDe(0);
    const letra = Math.min(36, altura * 0.46);
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        {itens.map((item, i) => {
          const p = cresce(t, atrasoDe(i), 40);
          const aparece = mola(t, atrasoDe(i), 18);
          const rotulo = mola(c.te, atrasoDe(i) * 0.5, 18);
          const fim = xDe(item.valor * p);
          const y = topo + i * altura;
          const cor = forte(item) ? tema.destaque : tema.neutro;
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: "absolute",
                  left: 140,
                  width: L0 - 140 - 28,
                  top: y,
                  height: altura * 0.72,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  textAlign: "right",
                  fontFamily: c.texto,
                  fontWeight: forte(item) ? 700 : 500,
                  fontSize: letra,
                  lineHeight: 1.05,
                  color: forte(item) ? tema.texto : tema.texto2,
                  opacity: rotulo,
                }}
              >
                {item.rotulo}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: Math.min(zero, fim),
                  width: Math.max(0, Math.abs(fim - zero)),
                  top: y,
                  height: altura * 0.72,
                  borderRadius: 8,
                  backgroundColor: cor,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: item.valor >= 0 ? fim + 18 : undefined,
                  right: item.valor < 0 ? 1920 - fim + 18 : undefined,
                  top: y,
                  height: altura * 0.72,
                  display: "flex",
                  alignItems: "center",
                  fontFamily: c.numeros,
                  fontWeight: 800,
                  fontSize: letra * 1.08,
                  color: forte(item) ? tema.destaque : tema.texto,
                  opacity: aparece,
                  whiteSpace: "nowrap",
                  ...tabular,
                }}
              >
                {comUnidade(item.valor * p, g.unidade, casas, c.idioma)}
              </div>
            </React.Fragment>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: zero - 1,
            top: topo - 14,
            width: 2,
            height: altura * n + 6,
            backgroundColor: tema.eixo,
            opacity: mola(c.te, 0, 20),
          }}
        />
      </div>
    );
  }
  const X0 = 220;
  const X1 = 1700;
  const Y0 = 330;
  const Y1 = 720;
  const vaga = (X1 - X0) / n;
  const largura = Math.min(170, vaga * 0.62);
  const yDe = (v: number) =>
    Y1 - ((Y1 - Y0) * (v - escala.min)) / (escala.max - escala.min || 1);
  const zero = yDe(0);
  const letraValor = Math.min(44, vaga * 0.26);
  const letraRotulo = Math.min(32, vaga * 0.2);
  const base = escala.min < 0 ? Y1 : zero;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: X0 - 20,
          width: X1 - X0 + 40,
          top: zero - 1,
          height: 2.5,
          backgroundColor: tema.eixo,
          opacity: mola(c.te, 0, 20),
        }}
      />
      {itens.map((item, i) => {
        const p = cresce(t, atrasoDe(i), 42);
        const aparece = mola(t, atrasoDe(i), 18);
        const cx = X0 + vaga * (i + 0.5);
        const fim = yDe(item.valor * p);
        const cor = forte(item) ? tema.destaque : tema.neutro;
        const negativo = item.valor < 0;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: cx - largura / 2,
                width: largura,
                top: Math.min(zero, fim),
                height: Math.max(0, Math.abs(fim - zero)),
                borderRadius: negativo ? "0 0 10px 10px" : "10px 10px 0 0",
                backgroundColor: cor,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: cx - vaga / 2,
                width: vaga,
                top: negativo ? fim + 12 : fim - letraValor - 16,
                textAlign: "center",
                fontFamily: c.numeros,
                fontWeight: 800,
                fontSize: letraValor,
                lineHeight: 1,
                color: forte(item) ? tema.destaque : tema.texto,
                opacity: aparece,
                whiteSpace: "nowrap",
                ...tabular,
              }}
            >
              {comUnidade(item.valor * p, g.unidade, casas, c.idioma)}
            </div>
            <div
              style={{
                position: "absolute",
                left: cx - vaga / 2 + 4,
                width: vaga - 8,
                top: base + (escala.min < 0 ? 18 : 22),
                textAlign: "center",
                fontFamily: c.texto,
                fontWeight: forte(item) ? 700 : 500,
                fontSize: letraRotulo,
                lineHeight: 1.12,
                color: forte(item) ? tema.texto : tema.texto2,
                opacity: mola(c.te, atrasoDe(i) * 0.5, 18),
                ...tabular,
              }}
            >
              {item.rotulo}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---- Rosca que se completa, com a legenda ao lado ----

const GPizza: React.FC<{ g: De<"pizza">; c: Contexto }> = ({ g, c }) => {
  const { t, tema } = c;
  const soma = g.partes.reduce((a, p) => a + p.valor, 0) || 1;
  const algum = g.partes.some((p) => p.destaque);
  const iForte = algum ? g.partes.findIndex((p) => p.destaque) : 0;
  // Os tons neutros das outras fatias, do mais forte ao mais apagado
  const outras = g.partes.length - 1;
  const corDa = (i: number) => {
    if (i === iForte) return tema.destaque;
    const k = g.partes.slice(0, i).filter((_, j) => j !== iForte).length;
    return misturar(
      tema.neutro,
      tema.neutroClaro,
      outras > 1 ? k / (outras - 1) : 0,
    );
  };
  const cx = 600;
  const cy = 525;
  const R = 230;
  const grossura = 96;
  const C = 2 * Math.PI * R;
  const giro = cresce(t, 4, 64);
  const porcentos = g.partes.map((p) => (p.valor / soma) * 100);
  const casas = porcentos.some((p) => p < 10 && Math.round(p) !== p) ? 1 : 0;
  let acumulado = 0;
  const comPorcento = (g.unidade ?? "%").trim() === "%";
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0 }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke={tema.neutroClaro}
          strokeOpacity={0.35 * mola(c.te, 0, 20)}
          strokeWidth={grossura}
        />
        {g.partes.map((p, i) => {
          const fatia = (p.valor / soma) * C;
          const inicio = acumulado;
          acumulado += fatia;
          const visivel = Math.max(0, Math.min(fatia, giro * C - inicio));
          const folga = g.partes.length > 1 && fatia > 8 ? 4 : 0;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={corDa(i)}
              strokeWidth={i === iForte ? grossura + 14 : grossura}
              strokeDasharray={`${Math.max(0, visivel - folga)} ${C}`}
              strokeDashoffset={-inicio}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          left: cx - 160,
          width: 320,
          top: cy - 80,
          height: 160,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: mola(t, 30, 24),
        }}
      >
        <div
          style={{
            fontFamily: c.numeros,
            fontWeight: 800,
            fontSize: 96,
            lineHeight: 1,
            color: tema.destaque,
            ...tabular,
          }}
        >
          {formatar(porcentos[iForte] * cresce(t, 20, 50), casas, c.idioma)}%
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1010,
          width: 760,
          top: AREA.y0,
          height: AREA.y1 - AREA.y0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 26,
        }}
      >
        {g.partes.map((p, i) => {
          const aparece = mola(c.te, 6 + i * 6, 22);
          const numero = mola(t, 10 + i * 9, 22);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 26,
                opacity: aparece,
                translate: `${(1 - aparece) * 30}px 0`,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: corDa(i),
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: c.texto,
                    fontWeight: i === iForte ? 700 : 500,
                    fontSize: 38,
                    lineHeight: 1.1,
                    color: i === iForte ? tema.texto : tema.texto2,
                  }}
                >
                  {p.rotulo}
                </div>
                {!comPorcento && (
                  <div
                    style={{
                      fontFamily: c.numeros,
                      fontWeight: 500,
                      fontSize: 28,
                      color: tema.texto2,
                      marginTop: 4,
                      ...tabular,
                    }}
                  >
                    {comUnidade(
                      p.valor,
                      g.unidade,
                      casasDoGrafico(
                        g.casas,
                        g.partes.map((x) => x.valor),
                      ),
                      c.idioma,
                    )}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontFamily: c.numeros,
                  fontWeight: 800,
                  fontSize: 46,
                  color: i === iForte ? tema.destaque : tema.texto,
                  whiteSpace: "nowrap",
                  opacity: numero,
                  ...tabular,
                }}
              >
                {formatar(porcentos[i], casas, c.idioma)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---- Grade de ícones que acendem ("1 em cada 4") ----

const GUnidades: React.FC<{ g: De<"unidades">; c: Contexto }> = ({ g, c }) => {
  const { t, tema } = c;
  const total = g.total;
  const marcados = Math.min(g.marcados, total);
  const colunas = total <= 10 ? total : 10;
  const linhas = Math.ceil(total / colunas);
  const L = 920;
  const A = 540;
  const celula = Math.min(L / colunas, A / linhas, 150);
  const x0 = 140 + (L - celula * colunas) / 2;
  const y0 = (AREA.y0 + AREA.y1) / 2 - (celula * linhas) / 2;
  const icone: NomeDoIcone = g.icone ?? "pessoa";
  const passo = Math.min(4, 54 / Math.max(1, marcados));
  const palavras = palavrasDo(c.idioma);
  const texto = mola(c.te, 8, 26);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: total }, (_, i) => {
        const col = i % colunas;
        const lin = Math.floor(i / colunas);
        const aparece = mola(c.te, lin * 2 + col * 0.6, 16);
        const marcado = i < marcados;
        const acende = marcado ? mola(t, 18 + i * passo, 14) : 0;
        const cor = marcado
          ? misturar(tema.neutroClaro, tema.destaque, acende)
          : tema.neutroClaro;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x0 + col * celula + celula * 0.08,
              top: y0 + lin * celula + celula * 0.08,
              opacity: aparece,
              scale: String(
                0.7 +
                  0.3 * aparece +
                  0.12 * acende * (1 - mola(t, 30 + i * passo, 14)),
              ),
            }}
          >
            <Icone
              nome={icone}
              tamanho={celula * 0.84}
              cor={cor}
              traco={celula > 60 ? 1.7 : 2.1}
            />
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 1120,
          width: 640,
          top: AREA.y0,
          height: AREA.y1 - AREA.y0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 18,
          opacity: texto,
          translate: `${(1 - texto) * 30}px 0`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 22,
            whiteSpace: "nowrap",
            opacity: mola(t, 6, 20),
          }}
        >
          <span
            style={{
              fontFamily: c.numeros,
              fontWeight: 800,
              fontSize: 190,
              lineHeight: 0.9,
              color: tema.destaque,
              ...tabular,
            }}
          >
            {formatar(Math.round(marcados * cresce(t, 18, 54)), 0, c.idioma)}
          </span>
          <span
            style={{
              fontFamily: c.numeros,
              fontWeight: 600,
              fontSize: 60,
              color: tema.texto,
              ...tabular,
            }}
          >
            {palavras.emCada} {formatar(total, 0, c.idioma)}
          </span>
        </div>
        {g.rotulo && (
          <div
            style={{
              fontFamily: c.texto,
              fontWeight: 500,
              fontSize: 42,
              lineHeight: 1.22,
              color: tema.texto2,
            }}
          >
            {g.rotulo}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Dois lados, com VS: o maior cresce mais ----

const GComparacao: React.FC<{ g: De<"comparacao">; c: Contexto }> = ({
  g,
  c,
}) => {
  const { t, tema } = c;
  const lados = [g.a, g.b];
  const casas = casasDoGrafico(
    g.casas,
    lados.map((l) => l.valor),
  );
  const maior = Math.max(Math.abs(g.a.valor), Math.abs(g.b.valor)) || 1;
  const BASE = 650;
  const ALTURA = 330;
  const LARGURA = 230;
  const xs = [620, 1300];
  const vs = mola(c.te, 10, 20);
  const menor = Math.min(Math.abs(g.a.valor), Math.abs(g.b.valor));
  const razao = menor > 0 ? maior / menor : 0;
  const iMaior = Math.abs(g.a.valor) >= Math.abs(g.b.valor) ? 0 : 1;
  const palavras = palavrasDo(c.idioma);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: 300,
          width: 1320,
          top: BASE,
          height: 2.5,
          backgroundColor: tema.eixo,
          opacity: mola(c.te, 0, 20),
        }}
      />
      {lados.map((lado, i) => {
        const p = cresce(t, i * 16, 48);
        const aparece = mola(t, i * 16, 18);
        const h = (ALTURA * Math.abs(lado.valor) * p) / maior;
        const forte = i === iMaior;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: xs[i] - LARGURA / 2,
                width: LARGURA,
                top: BASE - h,
                height: h,
                borderRadius: "14px 14px 0 0",
                backgroundColor: forte ? tema.destaque : tema.neutro,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: xs[i] - 300,
                width: 600,
                top: BASE - h - 92,
                textAlign: "center",
                fontFamily: c.numeros,
                fontWeight: 800,
                fontSize: 72,
                lineHeight: 1,
                color: forte ? tema.destaque : tema.texto,
                opacity: aparece,
                whiteSpace: "nowrap",
                ...tabular,
              }}
            >
              {comUnidade(lado.valor * p, g.unidade, casas, c.idioma)}
            </div>
            <div
              style={{
                position: "absolute",
                left: xs[i] - 320,
                width: 640,
                top: BASE + 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                opacity: mola(c.te, i * 6, 20),
              }}
            >
              {lado.icone && (
                <Icone
                  nome={lado.icone}
                  tamanho={52}
                  cor={forte ? tema.destaque : tema.texto2}
                />
              )}
              <span
                style={{
                  fontFamily: c.texto,
                  fontWeight: forte ? 700 : 500,
                  fontSize: 42,
                  lineHeight: 1.1,
                  color: forte ? tema.texto : tema.texto2,
                  textAlign: "center",
                }}
              >
                {lado.rotulo}
              </span>
            </div>
          </React.Fragment>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 960 - 54,
          top: 440 - 54,
          width: 108,
          height: 108,
          borderRadius: 999,
          border: `3px solid ${tema.eixo}`,
          backgroundColor: tema.fundo,
          display: "grid",
          placeItems: "center",
          fontFamily: c.numeros,
          fontWeight: 800,
          fontSize: 40,
          color: tema.texto2,
          opacity: vs,
          scale: String(0.7 + 0.3 * vs),
        }}
      >
        {palavras.vs}
      </div>
      {razao >= 1.2 && Number.isFinite(razao) && (
        <div
          style={{
            position: "absolute",
            left: 960 - 160,
            width: 320,
            top: 540,
            textAlign: "center",
            fontFamily: c.numeros,
            fontWeight: 800,
            fontSize: 44,
            color: tema.destaque,
            opacity: mola(t, 58, 20),
            ...tabular,
          }}
        >
          {formatar(razao, razao >= 10 ? 0 : 1, c.idioma)}×
        </div>
      )}
    </div>
  );
};

// ---- Linha do tempo: a linha anda e cada marco acende quando ela chega ----

const GLinhaDoTempo: React.FC<{ g: De<"linhaDoTempo">; c: Contexto }> = ({
  g,
  c,
}) => {
  const { t, tema } = c;
  const n = g.marcos.length;
  const X0 = 250;
  const X1 = 1670;
  const Y = 540;
  const passo = (X1 - X0) / (n - 1);
  const duracao = Math.min(Math.max(c.disponivel - 50, 60), 40 + n * 34);
  const anda = cresce(t, 4, duracao);
  const ponta = X0 - 60 + (X1 - X0 + 120) * anda;
  const largura = Math.min(320, passo - 24);
  const letraQuando = Math.min(58, passo * 0.26);
  const atual = g.marcos.reduce(
    (ultimo, _, i) => (ponta >= X0 + passo * i ? i : ultimo),
    -1,
  );
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: X0 - 60,
          width: X1 - X0 + 120,
          top: Y - 2,
          height: 4,
          borderRadius: 2,
          backgroundColor: tema.neutroClaro,
          opacity: mola(c.te, 0, 16),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: X0 - 60,
          width: Math.max(0, ponta - (X0 - 60)),
          top: Y - 3,
          height: 6,
          borderRadius: 3,
          backgroundColor: tema.destaque,
        }}
      />
      {g.marcos.map((m, i) => {
        const x = X0 + passo * i;
        // Quantos quadros desde que a ponta chegou neste marco
        const quando = (x - (X0 - 60)) / (X1 - X0 + 120);
        const chegou = ponta >= x;
        const desde = chegou ? mola(t, 4 + duracao * quando * 0.6, 16) : 0;
        const ehAtual = i === atual;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: x - 15,
                top: Y - 15,
                width: 30,
                height: 30,
                borderRadius: 999,
                backgroundColor: chegou ? tema.destaque : tema.fundo,
                border: `5px solid ${chegou ? tema.destaque : tema.neutroClaro}`,
                boxShadow: ehAtual
                  ? `0 0 0 10px ${tema.destaque}33`
                  : undefined,
                scale: String(
                  1 +
                    0.25 *
                      desde *
                      (1 - mola(t, 4 + duracao * quando * 0.6 + 14, 16)),
                ),
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x - largura / 2,
                width: largura,
                bottom: 1080 - Y + 40,
                textAlign: "center",
                fontFamily: c.numeros,
                fontWeight: 800,
                fontSize: letraQuando,
                lineHeight: 1,
                color: ehAtual ? tema.destaque : tema.texto,
                opacity: Math.max(0.0, desde),
                translate: `0 ${(1 - desde) * 16}px`,
                ...tabular,
              }}
            >
              {m.quando}
            </div>
            <div
              style={{
                position: "absolute",
                left: x - largura / 2,
                width: largura,
                top: Y + 44,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                textAlign: "center",
                fontFamily: c.texto,
                fontWeight: 500,
                fontSize: Math.min(34, passo * 0.14),
                lineHeight: 1.2,
                color: ehAtual ? tema.texto : tema.texto2,
                opacity: desde,
                translate: `0 ${(1 - desde) * -12}px`,
              }}
            >
              {m.icone && (
                <Icone
                  nome={m.icone}
                  tamanho={54}
                  cor={ehAtual ? tema.destaque : tema.texto2}
                />
              )}
              {m.rotulo}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---- Escala: círculos com a área do tamanho do valor ----

const GEscala: React.FC<{ g: De<"escala">; c: Contexto }> = ({ g, c }) => {
  const { t, tema } = c;
  const valores = g.itens.map((i) => i.valor);
  const maior = Math.max(...valores);
  const casas = casasDoGrafico(g.casas, valores);
  const algum = g.itens.some((i) => i.destaque);
  const forte = (i: number) =>
    algum ? Boolean(g.itens[i].destaque) : g.itens[i].valor === maior;
  const BASE = 650;
  const VAO = 50;
  // O raio pela área (círculo com o dobro do valor tem o dobro da área), cabendo na largura
  let rMax = 200;
  const raios = () =>
    valores.map((v) => Math.max(5, rMax * Math.sqrt(v / maior)));
  const vagas = () => raios().map((r) => Math.max(2 * r, 250));
  while (
    vagas().reduce((a, b) => a + b, 0) + VAO * (valores.length - 1) > 1560 &&
    rMax > 60
  )
    rMax -= 5;
  const rs = raios();
  const vs = vagas();
  const largura = vs.reduce((a, b) => a + b, 0) + VAO * (valores.length - 1);
  let x = 960 - largura / 2;
  const centros = vs.map((v) => {
    const centro = x + v / 2;
    x += v + VAO;
    return centro;
  });
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: 160,
          width: 1600,
          top: BASE,
          height: 2.5,
          backgroundColor: tema.eixo,
          opacity: mola(c.te, 0, 20),
        }}
      />
      {g.itens.map((item, i) => {
        const p = mola(t, 6 + i * 20, 34);
        const r = rs[i] * p;
        const cor = forte(i) ? tema.destaque : tema.neutro;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: centros[i] - r,
                top: BASE - 2 * r,
                width: 2 * r,
                height: 2 * r,
                borderRadius: 999,
                backgroundColor: cor,
                display: "grid",
                placeItems: "center",
              }}
            >
              {item.icone && rs[i] >= 46 && (
                <Icone
                  nome={item.icone}
                  tamanho={r * 0.9}
                  cor={forte(i) ? textoSobre(tema.destaque) : tema.fundo}
                  traco={1.6}
                />
              )}
            </div>
            <div
              style={{
                position: "absolute",
                left: centros[i] - vs[i] / 2,
                width: vs[i],
                top: BASE + 24,
                textAlign: "center",
                opacity: mola(c.te, i * 6, 20),
              }}
            >
              <div
                style={{
                  fontFamily: c.numeros,
                  fontWeight: 800,
                  fontSize: 46,
                  lineHeight: 1.05,
                  color: forte(i) ? tema.destaque : tema.texto,
                  whiteSpace: "nowrap",
                  opacity: mola(t, 6 + i * 20, 20),
                  ...tabular,
                }}
              >
                {comUnidade(item.valor, g.unidade, casas, c.idioma)}
              </div>
              <div
                style={{
                  fontFamily: c.texto,
                  fontWeight: 500,
                  fontSize: 30,
                  lineHeight: 1.15,
                  color: tema.texto2,
                  marginTop: 8,
                }}
              >
                {item.rotulo}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---- A conta, passo a passo, com o resultado em destaque ----

/** "1,01^360" vira 1,01 com o 360 em expoente; "^(n·12)" também */
function comExpoente(texto: string, chave: string) {
  const partes = texto.split(/\^(\([^)]*\)|[\w.,]+)/);
  return partes.map((p, i) =>
    i % 2 === 1 ? (
      <sup
        key={`${chave}-${i}`}
        style={{ fontSize: "0.58em", verticalAlign: "0.72em", lineHeight: 0 }}
      >
        {p.replace(/^\((.*)\)$/, "$1")}
      </sup>
    ) : (
      <React.Fragment key={`${chave}-${i}`}>{p}</React.Fragment>
    ),
  );
}

const GConta: React.FC<{ g: De<"conta">; c: Contexto }> = ({ g, c }) => {
  const { t, tema } = c;
  const n = g.passos.length;
  const intervalo =
    n > 1 ? Math.max(18, Math.min(75, (c.disponivel - 60) / n)) : 0;
  const maiorLinha = Math.max(
    ...g.passos.map((p) => p.replace(/\^/g, "").length),
  );
  const letra = Math.min(76, Math.floor(1450 / (maiorLinha * 0.56)));
  return (
    <div
      style={{
        position: "absolute",
        left: AREA.x0,
        right: 1920 - AREA.x1,
        top: AREA.y0,
        height: AREA.y1 - AREA.y0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: n > 3 ? 18 : 28,
      }}
    >
      {g.passos.map((passo, i) => {
        const aparece = mola(t, i * intervalo, 22);
        const resultado = i === n - 1 && n > 1;
        const igual = /^\s*[=≈]/.test(passo);
        const corpo = passo.replace(/^\s*([=≈])\s*/, "");
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
              opacity: aparece,
              translate: `0 ${(1 - aparece) * 26}px`,
              padding: resultado ? "18px 44px 22px" : "0 10px",
              borderRadius: 20,
              border: resultado
                ? `3px solid ${tema.destaque}`
                : "3px solid transparent",
              backgroundColor: resultado ? `${tema.destaque}1f` : "transparent",
              whiteSpace: "nowrap",
            }}
          >
            {igual && (
              <span
                style={{
                  fontFamily: c.numeros,
                  fontWeight: 500,
                  fontSize: letra * (resultado ? 1.15 : 1),
                  color: tema.texto2,
                }}
              >
                {passo.trim()[0]}
              </span>
            )}
            <span
              style={{
                fontFamily: c.numeros,
                fontWeight: resultado ? 800 : 600,
                fontSize: letra * (resultado ? 1.15 : 1),
                lineHeight: 1.1,
                color: resultado
                  ? tema.destaque
                  : i < n - 1 && mola(t, (i + 1) * intervalo, 20) > 0.5 && n > 1
                    ? tema.texto2
                    : tema.texto,
                ...tabular,
              }}
            >
              {comExpoente(corpo, `p${i}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ---- Qual desenhar ----

export const DesenhoDoGrafico: React.FC<{ g: Grafico; c: Contexto }> = ({
  g,
  c,
}) => {
  switch (g.tipo) {
    case "numero":
      return <GNumero g={g} c={c} />;
    case "linha":
      return <GLinha g={g} c={c} />;
    case "barras":
      return <GBarras g={g} c={c} />;
    case "pizza":
      return <GPizza g={g} c={c} />;
    case "unidades":
      return <GUnidades g={g} c={c} />;
    case "comparacao":
      return <GComparacao g={g} c={c} />;
    case "linhaDoTempo":
      return <GLinhaDoTempo g={g} c={c} />;
    case "escala":
      return <GEscala g={g} c={c} />;
    case "conta":
      return <GConta g={g} c={c} />;
    default:
      return null;
  }
};
