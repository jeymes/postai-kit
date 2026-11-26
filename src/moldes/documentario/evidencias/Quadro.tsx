// Quadro de evidências (modelo "evidencias" do Canal dark): o desenho. O vídeo
// inteiro acontece sobre UM quadro de cortiça escura; cada cena prende uma peça
// (foto em preto e branco com alfinete, ficha de capítulo, cartão de ano) e a
// câmera viaja até ela. O vermelho é só para o que tem significado: barbante
// entre peças ligadas, círculo no detalhe, sublinhado da palavra e carimbo.
// O plano (lugares, tempos, câmera) fica em plano.ts; o filme mudo em cinemaMudo.tsx.

import { Video } from "@remotion/media";
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { arquivo } from "../../../componentes/base";
import { Som } from "../../../componentes/audio/Som";
import { textosDoIdioma } from "../../../nucleo/textosFixos";
import type { Aparencia } from "../../../estilos/narrado";
import {
  ALTURA,
  BORDA_DA_FOTO,
  cameraNo,
  LARGURA,
  pecaNaVista,
  planejarQuadro,
  pontaDoFio,
  ROMANOS,
  SOBRA_DO_INSERT,
  sorteio,
  tremorNo,
  vista,
  type CenaDoQuadro,
  type Fio,
  type Peca,
} from "./plano";
import { InsertDeCinema } from "./cinemaMudo";

/** O vermelho das evidências: só no que tem significado */
export const VERMELHO = "#d0312d";
const PAPEL = "#e7e4dd";
const TINTA = "#1d1c1a";
const preso = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const saida = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

// ---- A proporção de cada foto (o cartão tem o formato da foto, sem cortar) ----

const proporcoesMedidas = new Map<string, number>();

/** Mede as fotos uma vez (o render espera); o plano precisa delas para arrumar o quadro */
function useProporcoes(fotos: string[]) {
  const chave = fotos.join("|");
  const faltam = fotos.filter((f) => !proporcoesMedidas.has(f));
  const [pronto, setPronto] = useState(faltam.length === 0);
  const [espera] = useState(() => (faltam.length ? delayRender("Medindo as fotos do quadro de evidências") : null));
  useEffect(() => {
    if (pronto) return;
    let vivo = true;
    Promise.all(
      fotos
        .filter((f) => !proporcoesMedidas.has(f))
        .map(
          (f) =>
            new Promise<void>((resolver) => {
              const img = new Image();
              img.onload = () => {
                proporcoesMedidas.set(f, img.naturalWidth / Math.max(1, img.naturalHeight));
                resolver();
              };
              // Foto que não abre: o cartão fica no formato padrão (o render não para por isso)
              img.onerror = () => {
                proporcoesMedidas.set(f, NaN);
                resolver();
              };
              img.src = arquivo(f);
            }),
        ),
    ).then(() => {
      if (!vivo) return;
      setPronto(true);
      if (espera !== null) continueRender(espera);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return pronto ? proporcoesMedidas : null;
}

// ---- O quadro ----

export const QuadroDeEvidencias: React.FC<{
  cenas: CenaDoQuadro[];
  tese?: string;
  encerramento?: string;
  chamada?: string;
  idioma?: string;
  ap: Aparencia;
}> = ({ cenas, tese, encerramento, chamada, idioma, ap }) => {
  const fotos = useMemo(() => [...new Set(cenas.map((c) => c.foto).filter((f): f is string => Boolean(f)))], [cenas]);
  const proporcoes = useProporcoes(fotos);
  const plano = useMemo(
    () => (proporcoes ? planejarQuadro(cenas, { tese, encerramento: Boolean(encerramento), proporcoes }) : null),
    [proporcoes, cenas, tese, encerramento],
  );
  const frame = useCurrentFrame();
  if (!plano) return <AbsoluteFill style={{ backgroundColor: ap.fundo }} />;
  const cam = cameraNo(plano.trechos, frame);
  const tremor = tremorNo(plano.tremores, frame);
  const v = vista(cam);
  const visiveis = plano.pecas.filter((p) => frame >= p.aparece && pecaNaVista(p, v));
  // Só os barbantes que já começaram e que passam pela tela
  const fios = plano.fios.filter((f) => {
    if (frame < f.em) return false;
    const a = plano.pecas[f.de];
    const b = plano.pecas[f.ate];
    if (frame < a.aparece || frame < b.aparece) return false;
    return Math.min(a.x, b.x) < v.x1 && Math.max(a.x, b.x) > v.x0 && Math.min(a.y, b.y) - 200 < v.y1 && Math.max(a.y, b.y) + 200 > v.y0;
  });
  const insert = plano.inserts.find((ins) => frame >= ins.de && frame < ins.ate + SOBRA_DO_INSERT);
  return (
    <AbsoluteFill style={{ backgroundColor: ap.fundo, overflow: "hidden" }}>
      <FundoDeCortica x={cam.x} y={cam.y} z={cam.z} tremor={tremor} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          transformOrigin: "0 0",
          transform: `translate(${LARGURA / 2 + tremor.x}px, ${ALTURA / 2 + tremor.y}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`,
        }}
      >
        {/* Os barbantes passam POR BAIXO das peças: nunca em cima de um rosto ou de um texto */}
        <Barbantes fios={fios} pecas={plano.pecas} frame={frame} vista={v} z={cam.z} />
        {visiveis.map((p) => (
          <PecaDoQuadro key={p.id} peca={p} frame={frame} ap={ap} />
        ))}
        <AlfinetesDosBarbantes fios={fios} pecas={plano.pecas} frame={frame} />
      </div>
      {/* Luz de abajur: o meio mais claro, as bordas no escuro */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 65% at 50% 42%, rgba(255,250,240,0.05) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
      {/* O pé mais escuro: a legenda lê bem até em cima de uma foto clara */}
      {/* Faixa escura no pé (26/11/2026): a peça vizinha que cai atrás da legenda some
          no escuro, como nos documentários; antes a ficha e a tese brigavam com a legenda */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 72%, rgba(8,7,6,0.8) 83%, rgba(8,7,6,0.92) 100%)" }} />
      {insert && (
        <Sequence from={insert.de} durationInFrames={insert.ate - insert.de + SOBRA_DO_INSERT} layout="none" name="Cinema mudo">
          <InsertDeCinema tipo={insert.tipo} cena={cenas[insert.cena]} duracao={insert.ate - insert.de} indice={insert.cena} ap={ap} />
        </Sequence>
      )}
      <ap.Camadas />
      {plano.inicioDoFim !== null && encerramento && (
        <Sequence from={plano.inicioDoFim} layout="none" name="Título final">
          <TituloComGlitch texto={encerramento} chamada={chamada} idioma={idioma} ap={ap} />
        </Sequence>
      )}
      {plano.sons.map((s, i) => (
        <Som key={i} tipo={s.tipo} em={s.em} />
      ))}
    </AbsoluteFill>
  );
};

/**
 * A cortiça escura, que anda com a câmera: ladrilhos de 900 pontos do quadro,
 * só os que caem na tela (nada de um quadro gigante desenhado inteiro).
 */
const TAMANHO_DA_CORTICA = 900;
const FundoDeCortica: React.FC<{ x: number; y: number; z: number; tremor: { x: number; y: number } }> = ({ x, y, z, tremor }) => {
  const lado = TAMANHO_DA_CORTICA * z;
  const src = staticFile("texturas/cortica.jpg");
  // Onde fica o canto (0, 0) do quadro na tela, e o primeiro ladrilho à esquerda/acima da tela
  const ox = LARGURA / 2 + tremor.x - x * z;
  const oy = ALTURA / 2 + tremor.y - y * z;
  const i0 = Math.floor(-ox / lado);
  const j0 = Math.floor(-oy / lado);
  const colunas = Math.ceil(LARGURA / lado) + 1;
  const linhas = Math.ceil(ALTURA / lado) + 1;
  const ladrilhos: React.ReactNode[] = [];
  for (let j = j0; j < j0 + linhas; j++)
    for (let i = i0; i < i0 + colunas; i++)
      ladrilhos.push(
        <Img
          key={`${i}-${j}`}
          src={src}
          // 1 px a mais: sem fresta entre um ladrilho e outro
          style={{ position: "absolute", left: ox + i * lado, top: oy + j * lado, width: lado + 1, height: lado + 1 }}
        />,
      );
  return <AbsoluteFill>{ladrilhos}</AbsoluteFill>;
};

// ---- Peças ----

/** Entrada da peça: cai de um pouco acima, com a sombra grande que encolhe, e o alfinete crava */
function entrada(peca: Peca, frame: number) {
  if (!peca.animar) return { escala: 1, opacidade: 1, sombra: 1, cravou: 1 };
  const q = frame - peca.aparece;
  const t = saida(q / 12);
  return { escala: 1.16 - 0.16 * t, opacidade: Math.min(1, q / 4), sombra: 1 + 1.6 * (1 - t), cravou: interpolate(q, [10, 14], [0, 1], preso) };
}

const PecaDoQuadro: React.FC<{ peca: Peca; frame: number; ap: Aparencia }> = ({ peca, frame, ap }) => {
  const e = entrada(peca, frame);
  const base: React.CSSProperties = {
    position: "absolute",
    left: peca.x - peca.w / 2,
    top: peca.y - peca.h / 2,
    width: peca.w,
    height: peca.h,
    rotate: `${peca.giro}deg`,
    scale: String(e.escala),
    opacity: e.opacidade,
  };
  const sombra = `${6 * e.sombra}px ${14 * e.sombra}px ${26 * e.sombra}px rgba(0,0,0,${0.55 / Math.sqrt(e.sombra)})`;
  if (peca.tipo === "foto") return <CartaoDeFoto peca={peca} frame={frame} ap={ap} base={base} sombra={sombra} cravou={e.cravou} />;
  if (peca.tipo === "capitulo") return <FichaDeCapitulo peca={peca} ap={ap} base={base} sombra={sombra} cravou={e.cravou} />;
  if (peca.tipo === "ano") return <CartaoDeAno peca={peca} ap={ap} base={base} sombra={sombra} cravou={e.cravou} />;
  return <CartaoDaTese peca={peca} frame={frame} ap={ap} base={base} sombra={sombra} cravou={e.cravou} />;
};

/** O alfinete (cabeça de metal escuro, com brilho e sombra) */
const Alfinete: React.FC<{ x: number; y: number; cravou?: number; tamanho?: number }> = ({ x, y, cravou = 1, tamanho = 30 }) => (
  <div
    style={{
      position: "absolute",
      left: x - tamanho / 2,
      top: y - tamanho / 2,
      width: tamanho,
      height: tamanho,
      borderRadius: "50%",
      background: "radial-gradient(circle at 35% 32%, #f4f4f2 0%, #a9a8a4 22%, #4a4946 60%, #151514 100%)",
      boxShadow: `${3 + 5 * (1 - cravou)}px ${5 + 9 * (1 - cravou)}px ${6 + 8 * (1 - cravou)}px rgba(0,0,0,0.6)`,
      scale: String(1.3 - 0.3 * cravou),
    }}
  />
);

/** Mostra o texto letra a letra, como batido à máquina (2 letras por quadro) */
const batido = (texto: string, frame: number, em: number, porQuadro = 2) => texto.slice(0, Math.max(0, Math.floor((frame - em) * porQuadro)));

const CartaoDeFoto: React.FC<{ peca: Peca; frame: number; ap: Aparencia; base: React.CSSProperties; sombra: string; cravou: number }> = ({
  peca,
  frame,
  ap,
  base,
  sombra,
  cravou,
}) => {
  const fw = peca.fotoW ?? peca.w;
  const fh = peca.fotoH ?? peca.h;
  const foco = peca.foco ?? [50, 50];
  const etiqueta = [...(peca.etiquetas ?? [])].reverse().find((et) => frame >= et.em);
  return (
    <div style={base}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: PAPEL, boxShadow: sombra }} />
      {/* A foto em preto e branco (gelatina e prata): contraste alto e um pouco de brilho prateado */}
      <div style={{ position: "absolute", left: BORDA_DA_FOTO, top: BORDA_DA_FOTO, width: fw, height: fh, overflow: "hidden", backgroundColor: "#222" }}>
        {peca.video ? (
          <Sequence from={peca.aparece} layout="none">
            <Video src={arquivo(peca.video)} muted loop objectFit="cover" style={{ width: "100%", height: "100%", filter: ap.filtro }} />
          </Sequence>
        ) : peca.src ? (
          <Img
            src={arquivo(peca.src)}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${foco[0]}% ${foco[1]}%`, filter: ap.filtro }}
          />
        ) : null}
        <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 40px rgba(0,0,0,0.35)" }} />
        {peca.detalhe && frame >= peca.detalhe.em && <CirculoTremido x={peca.detalhe.x} y={peca.detalhe.y} w={fw} h={fh} frame={frame - peca.detalhe.em} semente={`d${peca.id}`} />}
        {peca.carimbo && frame >= peca.carimbo.em && <Carimbo texto={peca.carimbo.texto} q={frame - peca.carimbo.em} largura={fw} semente={`c${peca.id}`} fonte={ap.fonteTitulo} />}
      </div>
      {/* O número da evidência, na borda de baixo */}
      <div
        style={{
          position: "absolute",
          right: 22,
          bottom: 10,
          fontFamily: ap.fonteTexto,
          fontSize: 26,
          color: "#3a3936",
          letterSpacing: "0.06em",
        }}
      >
        Nº {String(peca.numero ?? 0).padStart(2, "0")}
      </div>
      <Alfinete x={peca.w / 2} y={22} cravou={cravou} />
      {etiqueta && <Etiqueta texto={etiqueta.texto} q={frame - etiqueta.em} fonte={ap.fonteTexto} largura={peca.w} altura={peca.h} semente={`e${peca.id}`} />}
      {peca.palavra && frame >= peca.palavra.em && <PalavraSublinhada texto={peca.palavra.texto} q={frame - peca.palavra.em} fonte={ap.fonteTexto} largura={peca.w} semente={`p${peca.id}`} />}
    </div>
  );
};

/** A etiqueta batida à máquina (o `texto` da cena), presa com fita na borda de baixo */
const Etiqueta: React.FC<{ texto: string; q: number; fonte: string; largura: number; altura: number; semente: string }> = ({ texto, q, fonte, largura, altura, semente }) => {
  const giro = (sorteio(semente) - 0.5) * 4;
  const visivel = batido(texto.toUpperCase(), q, 0);
  return (
    <div
      style={{
        position: "absolute",
        left: -26,
        top: altura - 46,
        maxWidth: largura * 0.92,
        rotate: `${giro}deg`,
        backgroundColor: "#f1efe9",
        padding: "12px 22px 10px",
        boxShadow: "3px 6px 12px rgba(0,0,0,0.45)",
        opacity: interpolate(q, [0, 4], [0, 1], preso),
      }}
    >
      {/* Fita adesiva meio transparente */}
      <div style={{ position: "absolute", left: -14, top: -10, width: 70, height: 30, rotate: "-28deg", backgroundColor: "rgba(235,232,222,0.6)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      <div style={{ fontFamily: fonte, fontSize: 32, lineHeight: 1.15, color: TINTA, letterSpacing: "0.04em", whiteSpace: "pre-wrap" }}>
        {/* A linha inteira ocupa o lugar desde o começo: a etiqueta não cresce enquanto digita */}
        <span>{visivel}</span>
        <span style={{ opacity: 0 }}>{texto.toUpperCase().slice(visivel.length)}</span>
      </div>
    </div>
  );
};

/** Caminho tremido de uma volta e pouco (como quem circula à mão, rápido) */
function voltaTremida(cx: number, cy: number, rx: number, ry: number, semente: string) {
  const pontos: string[] = [];
  const passos = 46;
  const inicio = -2.3 + sorteio(semente) * 0.6;
  for (let k = 0; k <= passos; k++) {
    const a = inicio + (k / passos) * Math.PI * 2.25;
    const torto = 1 + (sorteio(`${semente}-${Math.floor(k / 3)}`) - 0.5) * 0.12 + (k / passos) * 0.08;
    pontos.push(`${(cx + Math.cos(a) * rx * torto).toFixed(1)},${(cy + Math.sin(a) * ry * torto).toFixed(1)}`);
  }
  return `M ${pontos.join(" L ")}`;
}

/** Círculo vermelho tremido que se desenha em volta do detalhe */
const CirculoTremido: React.FC<{ x: number; y: number; w: number; h: number; frame: number; semente: string }> = ({ x, y, w, h, frame, semente }) => {
  const desenho = saida(frame / 16);
  const r = Math.min(w, h) * 0.17;
  const d = voltaTremida((x / 100) * w, (y / 100) * h, r * 1.18, r, semente);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={d} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - desenho} transform="translate(2 3)" />
      <path d={d} fill="none" stroke={VERMELHO} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - desenho} />
    </svg>
  );
};

/** O carimbo vermelho que bate com força (e a tela treme): tinta falhada, inclinado */
const Carimbo: React.FC<{ texto: string; q: number; largura: number; semente: string; fonte: string }> = ({ texto, q, largura, semente, fonte }) => {
  const bate = saida(q / 5);
  const giro = -11 + (sorteio(semente) - 0.5) * 8;
  const tamanho = Math.max(56, Math.min(124, (largura * 1.55) / Math.max(5, texto.length)));
  const grao = staticFile(`texturas/grao-${Math.floor(sorteio(semente) * 6)}.webp`);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "56%",
        translate: "-50% -50%",
        rotate: `${giro}deg`,
        scale: String(1.7 - 0.7 * bate),
        opacity: Math.min(1, q / 2) * 0.94,
        padding: `${tamanho * 0.08}px ${tamanho * 0.3}px ${tamanho * 0.02}px`,
        border: `${Math.max(5, tamanho * 0.08)}px solid ${VERMELHO}`,
        outline: `${Math.max(2, tamanho * 0.03)}px solid ${VERMELHO}`,
        outlineOffset: tamanho * 0.06,
        borderRadius: tamanho * 0.1,
        color: VERMELHO,
        fontFamily: fonte,
        fontSize: tamanho,
        lineHeight: 1.05,
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
        textTransform: "uppercase",
        backgroundColor: "rgba(240,236,228,0.12)",
        // Tinta falhada: o granulado do kit como máscara (claro = tinta, escuro = falha)
        maskImage: `linear-gradient(rgba(255,255,255,0.86), rgba(255,255,255,0.86)), url(${grao})`,
        maskMode: "luminance",
        maskSize: "100% 100%, 300px 170px",
        maskComposite: "add",
      }}
    >
      {texto}
    </div>
  );
};

/** A palavra-chave numa tira de papel, sublinhada à mão em vermelho */
const PalavraSublinhada: React.FC<{ texto: string; q: number; fonte: string; largura: number; semente: string }> = ({ texto, q, fonte, largura, semente }) => {
  const giro = 3 + (sorteio(semente) - 0.5) * 4;
  const risco = saida((q - 14) / 14);
  const letras = texto.toUpperCase();
  const largo = Math.min(largura * 0.8, letras.length * 30 + 60);
  const tremido = Array.from({ length: 9 }, (_, k) => `${(8 + (k / 8) * (largo - 30)).toFixed(1)},${(6 + (sorteio(`${semente}-${k}`) - 0.5) * 7 + k * 0.6).toFixed(1)}`).join(" L ");
  return (
    <div
      style={{
        position: "absolute",
        right: -30,
        top: -34,
        rotate: `${giro}deg`,
        backgroundColor: "#f3f1eb",
        padding: "14px 26px 22px",
        boxShadow: "3px 7px 14px rgba(0,0,0,0.5)",
        opacity: interpolate(q, [0, 5], [0, 1], preso),
        scale: String(1.1 - 0.1 * saida(q / 8)),
      }}
    >
      <div style={{ fontFamily: fonte, fontSize: 46, color: TINTA, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{letras}</div>
      <svg width={largo} height={16} viewBox={`0 0 ${largo} 16`} style={{ position: "absolute", left: 20, bottom: 8, overflow: "visible" }}>
        <path d={`M ${tremido}`} fill="none" stroke={VERMELHO} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - risco} />
      </svg>
    </div>
  );
};

/** Linhas de ficha pautada (cinza claro) */
const pautado = "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 37px, rgba(60,60,60,0.22) 37px, rgba(60,60,60,0.22) 39px)";

const FichaDeCapitulo: React.FC<{ peca: Peca; ap: Aparencia; base: React.CSSProperties; sombra: string; cravou: number }> = ({ peca, ap, base, sombra, cravou }) => {
  const titulo = (peca.titulo ?? "").toUpperCase();
  const tamanho = titulo.length > 26 ? 76 : titulo.length > 16 ? 92 : 112;
  return (
    <div style={base}>
      {/* A aba da pasta, com o número do capítulo */}
      <div
        style={{
          position: "absolute",
          left: 34,
          top: -62,
          width: 170,
          height: 76,
          backgroundColor: "#cfcac0",
          borderRadius: "14px 14px 0 0",
          boxShadow: sombra,
          display: "flex",
          justifyContent: "center",
          paddingTop: 10,
          fontFamily: ap.fonteTitulo,
          fontSize: 50,
          color: "#2b2a27",
          letterSpacing: "0.1em",
        }}
      >
        {ROMANOS[(peca.numeroDoCapitulo ?? 1) - 1] ?? peca.numeroDoCapitulo}
      </div>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#d6d1c7", boxShadow: sombra }} />
      <div style={{ position: "absolute", left: 40, right: 40, top: 96, bottom: 40, backgroundImage: pautado, opacity: 0.8 }} />
      <div
        style={{
          position: "absolute",
          left: 50,
          right: 50,
          top: 60,
          bottom: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: ap.fonteTitulo,
          fontWeight: ap.pesoTitulo,
          fontSize: tamanho,
          lineHeight: 1.0,
          color: TINTA,
          letterSpacing: "0.02em",
        }}
      >
        {titulo}
      </div>
      <Alfinete x={peca.w / 2} y={24} cravou={cravou} />
    </div>
  );
};

const CartaoDeAno: React.FC<{ peca: Peca; ap: Aparencia; base: React.CSSProperties; sombra: string; cravou: number }> = ({ peca, ap, base, sombra, cravou }) => {
  const ano = peca.titulo ?? "";
  const tamanho = ano.length <= 4 ? 210 : Math.max(90, Math.round(820 / ano.length));
  return (
    <div style={base}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#efede8", boxShadow: sombra, backgroundImage: pautado, backgroundPosition: "0 20px" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: ap.fonteTitulo,
          fontSize: tamanho,
          lineHeight: 1,
          paddingTop: 22,
          color: TINTA,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {ano}
      </div>
      <Alfinete x={peca.w / 2} y={22} cravou={cravou} />
    </div>
  );
};

const CartaoDaTese: React.FC<{ peca: Peca; frame: number; ap: Aparencia; base: React.CSSProperties; sombra: string; cravou: number }> = ({
  peca,
  frame,
  ap,
  base,
  sombra,
  cravou,
}) => {
  const texto = peca.titulo ?? "";
  const visivel = peca.digitaEm === undefined ? texto : batido(texto, frame, peca.digitaEm, 2.5);
  // Maior (26/11/2026): na visão geral do quadro a pergunta quase não se lia
  const tamanho = texto.length > 70 ? 62 : 74;
  return (
    <div style={base}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#f0eee9", boxShadow: sombra, backgroundImage: pautado, backgroundPosition: "0 30px" }} />
      <div style={{ position: "absolute", left: 40, top: 0, bottom: 0, width: 260, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ap.fonteTitulo, fontSize: 470, color: "#2a2927", lineHeight: 1 }}>?</div>
      <div
        style={{
          position: "absolute",
          left: 310,
          right: 54,
          top: 40,
          bottom: 40,
          display: "flex",
          alignItems: "center",
          fontFamily: ap.fonteTexto,
          fontSize: tamanho,
          lineHeight: 1.25,
          color: TINTA,
        }}
      >
        <div>
          <span>{visivel}</span>
          <span style={{ opacity: 0 }}>{texto.slice(visivel.length)}</span>
        </div>
      </div>
      <Alfinete x={peca.w / 2} y={24} cravou={cravou} tamanho={34} />
    </div>
  );
};

// ---- Barbantes vermelhos ----

function caminhoDoFio(fio: Fio, pecas: Peca[]) {
  const a = pecas[fio.de];
  const b = pecas[fio.ate];
  const p = pontaDoFio(a, b);
  const q = pontaDoFio(b, a);
  const comprimento = Math.hypot(q.x - p.x, q.y - p.y);
  // O barbante cede um pouco no meio (gravidade), mais nos longos
  const cede = Math.min(220, 30 + comprimento * 0.07);
  const mx = (p.x + q.x) / 2;
  const my = (p.y + q.y) / 2 + cede;
  return { p, q, d: `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}` };
}

const Barbantes: React.FC<{ fios: Fio[]; pecas: Peca[]; frame: number; vista: { x0: number; y0: number; x1: number; y1: number }; z: number }> = ({
  fios,
  pecas,
  frame,
  vista: v,
  z,
}) => {
  if (!fios.length) return null;
  // Nunca mais fino que ~2,5 px na tela (na vista de longe)
  const grossura = Math.max(5, 2.6 / z);
  return (
    <svg
      width={v.x1 - v.x0}
      height={v.y1 - v.y0}
      viewBox={`${v.x0} ${v.y0} ${v.x1 - v.x0} ${v.y1 - v.y0}`}
      style={{ position: "absolute", left: v.x0, top: v.y0, overflow: "visible", pointerEvents: "none" }}
    >
      {fios.map((f, i) => {
        const { d } = caminhoDoFio(f, pecas);
        const estica = saida((frame - f.em) / 22);
        return (
          <g key={i}>
            <path d={d} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={grossura * 1.3} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - estica} transform="translate(5 9)" />
            <path d={d} fill="none" stroke={VERMELHO} strokeWidth={grossura} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - estica} />
          </g>
        );
      })}
    </svg>
  );
};

/** Os alfinetes onde o barbante encosta (por cima das peças) */
const AlfinetesDosBarbantes: React.FC<{ fios: Fio[]; pecas: Peca[]; frame: number }> = ({ fios, pecas, frame }) => (
  <>
    {fios.map((f, i) => {
      const { p, q } = caminhoDoFio(f, pecas);
      const estica = (frame - f.em) / 22;
      return (
        <React.Fragment key={i}>
          <Alfinete x={p.x} y={p.y} tamanho={24} />
          {estica >= 1 && <Alfinete x={q.x} y={q.y} tamanho={24} cravou={interpolate(estica, [1, 1.3], [0, 1], preso)} />}
        </React.Fragment>
      );
    })}
  </>
);

// ---- Título final com glitch ----

const FAIXAS = 7;
const TituloComGlitch: React.FC<{ texto: string; chamada?: string; idioma?: string; ap: Aparencia }> = ({ texto, chamada, idioma, ap }) => {
  const frame = useCurrentFrame();
  const veu = interpolate(frame, [0, 40], [0, 0.62], preso);
  const aparece = interpolate(frame, [18, 24], [0, 1], preso);
  // Glitch forte na entrada, depois só uns soluços de vez em quando
  const forca = frame < 18 ? 0 : frame < 46 ? 1 : sorteio(`g-${Math.floor(frame / 2)}`) > 0.9 ? 0.6 : 0;
  const pisca = forca > 0 && sorteio(`pisca-${frame}`) > 0.7 ? 0.35 : 1;
  const desvio = forca * (8 + sorteio(`dv-${frame}`) * 14);
  const tamanho = texto.length > 34 ? 96 : 124;
  const estiloDoTexto: React.CSSProperties = {
    fontFamily: ap.fonteTitulo,
    fontWeight: ap.pesoTitulo,
    fontSize: tamanho,
    lineHeight: 1.02,
    textAlign: "center",
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    maxWidth: 1500,
  };
  const camada = (cor: string, dx: number, extra: React.CSSProperties = {}) => (
    <div style={{ ...estiloDoTexto, position: "absolute", left: "50%", top: 0, translate: `calc(-50% + ${dx}px) 0`, color: cor, width: 1500, ...extra }}>{texto.replace(/-/g, "‑")}</div>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(6,6,6,${veu})`, alignItems: "center", justifyContent: "center", gap: 44 }}>
      <div style={{ position: "relative", width: 1500, height: tamanho * (texto.length > 26 ? 2.1 : 1.1), opacity: aparece * pisca }}>
        {forca > 0 && camada(VERMELHO, -desvio, { mixBlendMode: "screen", opacity: 0.9 })}
        {forca > 0 && camada("#9a9a9a", desvio * 0.8, { mixBlendMode: "screen", opacity: 0.7 })}
        {/* O texto em faixas: no glitch, algumas faixas pulam para o lado */}
        {Array.from({ length: FAIXAS }, (_, k) => {
          const pula = forca > 0 && sorteio(`fp-${frame}-${k}`) > 0.62;
          const dx = pula ? (sorteio(`fx-${frame}-${k}`) - 0.5) * 90 * forca : 0;
          const topo = (k * 100) / FAIXAS;
          return <React.Fragment key={k}>{camada("#f1eee8", dx, { clipPath: `inset(${topo}% -20% ${100 - topo - 100 / FAIXAS}% -20%)` })}</React.Fragment>;
        })}
      </div>
      {chamada && (
        <div
          style={{
            fontFamily: ap.fonteTexto,
            fontSize: 46,
            lineHeight: 1.25,
            color: "#e9e5dc",
            textAlign: "center",
            maxWidth: 1300,
            opacity: interpolate(frame, [40, 56], [0, 1], preso),
            textShadow: "0 3px 16px rgba(0,0,0,0.8)",
          }}
        >
          {chamada.replace(/-/g, "‑")}
        </div>
      )}
      <div
        style={{
          fontFamily: ap.fonteTitulo,
          fontSize: 50,
          letterSpacing: "0.08em",
          color: "#ffffff",
          backgroundColor: VERMELHO,
          padding: "12px 46px 8px",
          opacity: interpolate(frame, [50, 62], [0, 1], preso),
          scale: String(interpolate(frame, [50, 62], [0.9, 1], preso)),
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        {textosDoIdioma(idioma).inscrevase.replace(/-/g, "‑")}
      </div>
    </AbsoluteFill>
  );
};
