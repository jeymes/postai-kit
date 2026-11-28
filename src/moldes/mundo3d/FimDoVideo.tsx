// O texto do fim dos vídeos 3D (28/11/2026), por cima da cena, em cada um dos
// quatro fins (ver fim.ts): a chamada no céu (grua), o botão embaixo do letreiro
// (placa), o letreiro de cinema (cinema) e a chamada embaixo da pose final
// (pose). Nada de cartão branco: a cena continua aparecendo. As cores vêm da
// marca (destaque e texto no destaque) e a letra é a do título da marca. Tudo
// acima de 1540 px (embaixo ficam a descrição e os botões do app).

import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame } from "remotion";
import { Som } from "../../componentes/audio/Som";
import { useConferirTexto } from "../../componentes/conferir";
import { PainelDoQr } from "../../componentes/midia/QrCode";
import { cores, fontes, marca } from "../../nucleo/marca";
import type { FimDo3D } from "./fim";

const entra = (t: number, de: number, d = 14) => interpolate(t, [de, de + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
const sobe = (t: number, de: number, d = 14, px = 26): React.CSSProperties => ({ opacity: entra(t, de, d), transform: `translateY(${(1 - entra(t, de, d)) * px}px)` });

/** A letra da chamada pelo tamanho dela (até 3 linhas na largura da tela) */
const letraDaChamada = (chamada: string, maior: number) => (chamada.length > 56 ? Math.round(maior * 0.72) : chamada.length > 40 ? Math.round(maior * 0.82) : chamada.length > 26 ? Math.round(maior * 0.92) : maior);
const inicialDaMarca = () => (marca.nome || "?").trim().charAt(0).toUpperCase();

/** O logo num círculo com anel na cor de destaque (sem logo: a inicial) */
const Logo: React.FC<{ tamanho: number; anel?: string; fundo?: string }> = ({ tamanho, anel = cores.destaque, fundo = "#FFFFFF" }) => (
  <div style={{ width: tamanho, height: tamanho, borderRadius: "50%", border: `${Math.max(3, Math.round(tamanho * 0.045))}px solid ${anel}`, background: marca.logo ? fundo : cores.destaque, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 22px rgba(0,0,0,0.3)" }}>
    {marca.logo ? (
      <Img src={marca.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ) : (
      <span style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: tamanho * 0.5, color: cores.textoNoDestaque }}>{inicialDaMarca()}</span>
    )}
  </div>
);

/** A chamada entrando palavra a palavra (sobe e aparece) */
const Chamada: React.FC<{ texto: string; tamanho: number; de: number; cor?: string; peso?: number; sombra?: string; nome?: string }> = ({ texto, tamanho, de, cor = "#FFFFFF", peso = 800, sombra = "0 4px 26px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.35)", nome = "fim" }) => {
  const t = useCurrentFrame();
  const ref = useConferirTexto<HTMLDivElement>(nome);
  return (
    <div ref={ref} style={{ fontFamily: fontes.titulo, fontWeight: peso, fontSize: tamanho, lineHeight: 1.06, color: cor, textAlign: "center", textShadow: sombra, letterSpacing: "-0.01em" }}>
      {texto.split(" ").map((p, i) => (
        <span key={i} style={{ display: "inline-block", ...sobe(t, de + i * 2.5, 12, 30), whiteSpace: "pre" }}>
          {p}
          {" "}
        </span>
      ))}
    </div>
  );
};

/** O botão: cheio na cor de destaque (ou só o contorno, no cinema), respirando de leve */
const Botao: React.FC<{ texto: string; de: number; contorno?: boolean; tamanho?: number }> = ({ texto, de, contorno = false, tamanho = 46 }) => {
  const t = useCurrentFrame();
  const pulso = 1 + 0.03 * Math.max(0, Math.sin(Math.max(0, t - de - 14) / 6));
  const e = entra(t, de, 12);
  return (
    <div
      style={{
        opacity: e,
        transform: `translateY(${(1 - e) * 20}px) scale(${(0.86 + 0.14 * e) * pulso})`,
        fontFamily: fontes.titulo,
        fontWeight: 800,
        fontSize: tamanho,
        padding: `${Math.round(tamanho * 0.36)}px ${Math.round(tamanho * 0.95)}px`,
        borderRadius: 80,
        whiteSpace: "nowrap",
        ...(contorno
          ? { border: `3px solid ${cores.destaque}`, color: "#FFFFFF", background: "rgba(0,0,0,0.35)" }
          : { background: cores.destaque, color: cores.textoNoDestaque, boxShadow: "0 10px 26px rgba(0,0,0,0.3)" }),
      }}
    >
      {texto}
    </div>
  );
};

/** O nome da marca em versal, espaçado, com um fio de cada lado */
const Versal: React.FC<{ de: number; cor?: string; fio?: string; tamanho?: number }> = ({ de, cor = "#FFFFFF", fio = cores.destaque, tamanho = 30 }) => {
  const t = useCurrentFrame();
  const largura = 70 * entra(t, de + 4, 18);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, ...sobe(t, de) }}>
      <div style={{ width: largura, height: 2, background: fio }} />
      <div style={{ fontFamily: fontes.titulo, fontWeight: 700, fontSize: tamanho, letterSpacing: "0.32em", marginRight: "-0.32em", textTransform: "uppercase", color: cor, textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}>{marca.nome}</div>
      <div style={{ width: largura, height: 2, background: fio }} />
    </div>
  );
};

type Qr = { texto: string; legenda?: string } | null;

/** Grua: a chamada no céu, em cima; o grupo lá embaixo, acenando */
const FimGrua: React.FC<{ chamada: string; botao?: string; qr: Qr }> = ({ chamada, botao, qr }) => {
  const t = useCurrentFrame();
  return (
    <AbsoluteFill>
      {/* O alto do céu escurece um pouco (a letra branca lê em qualquer céu) */}
      <AbsoluteFill style={{ opacity: entra(t, 6, 30), background: "linear-gradient(180deg, rgba(8,12,28,0.55) 0%, rgba(8,12,28,0.28) 30%, rgba(8,12,28,0) 52%)" }} />
      <div style={{ position: "absolute", top: 150, left: 80, right: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, ...sobe(t, 14) }}>
          <Logo tamanho={84} />
          <div style={{ fontFamily: fontes.titulo, fontWeight: 700, fontSize: 32, letterSpacing: "0.18em", textTransform: "uppercase", color: "#FFFFFF", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>{marca.nome}</div>
        </div>
        <Chamada texto={chamada} tamanho={letraDaChamada(chamada, 100)} de={20} nome="fim-grua" />
        {botao && <Botao texto={botao} de={40} />}
      </div>
      {qr && <PainelDoQr texto={qr.texto} legenda={qr.legenda} tamanho={230} em={34} style={{ top: 760, left: 0, right: 0, marginLeft: "auto", marginRight: "auto", width: "fit-content" }} />}
      <Som tipo="transicao" em={2} />
      <Som tipo="sucesso" em={22} />
    </AbsoluteFill>
  );
};

/** Placa: o letreiro (3D) leva a chamada e o @; aqui, só o botão embaixo */
const FimPlaca: React.FC<{ botao?: string; qr: Qr }> = ({ botao, qr }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(8,12,28,0.5) 0%, rgba(8,12,28,0) 26%)" }} />
    {botao && (
      <div style={{ position: "absolute", top: 1430, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Botao texto={botao} de={30} />
      </div>
    )}
    {qr && <PainelDoQr texto={qr.texto} legenda={qr.legenda} tamanho={200} em={30} style={{ top: 1090, right: 60 }} />}
    <Som tipo="impacto" em={5} />
    <Som tipo="sucesso" em={30} />
  </AbsoluteFill>
);

/** Cinema: o quadro congelado escurece; faixas pretas, linha fina, versal, a chamada e o botão discreto */
const FimCinema: React.FC<{ chamada: string; botao?: string; qr: Qr }> = ({ chamada, botao, qr }) => {
  const t = useCurrentFrame();
  const faixa = 190 * entra(t, 0, 22);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: entra(t, 0, 24), background: "radial-gradient(ellipse 85% 60% at 50% 48%, rgba(6,6,10,0.45) 0%, rgba(6,6,10,0.72) 62%, rgba(6,6,10,0.9) 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: faixa, background: "#050507" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: faixa, background: "#050507" }} />
      {qr && <PainelDoQr texto={qr.texto} legenda={qr.legenda} tamanho={220} em={16} style={{ top: 250, left: 0, right: 0, marginLeft: "auto", marginRight: "auto", width: "fit-content" }} />}
      {/* Embaixo (de 1530 para cima): no último plano, os rostos ficam no meio da tela, livres */}
      <div style={{ position: "absolute", bottom: 1920 - 1530, left: 90, right: 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div style={sobe(t, 12, 18, 16)}>
          <Logo tamanho={qr ? 90 : 104} anel={cores.destaque} />
        </div>
        <Versal de={18} />
        <Chamada texto={chamada} tamanho={letraDaChamada(chamada, 86)} de={26} peso={700} sombra="0 3px 22px rgba(0,0,0,0.7)" nome="fim-cinema" />
        <div style={{ width: 240 * entra(t, 38, 20), height: 2, background: cores.destaque }} />
        {botao && <Botao texto={botao} de={46} contorno tamanho={40} />}
      </div>
      <Som tipo="congela" em={0} />
      <Som tipo="transicao" em={20} />
    </AbsoluteFill>
  );
};

const CONFETES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

/** Pose: o grupo no meio fazendo a pose; a chamada embaixo, com confete na cor da marca */
const FimPose: React.FC<{ chamada: string; botao?: string; qr: Qr }> = ({ chamada, botao, qr }) => {
  const t = useCurrentFrame();
  const corDoConfete = [cores.destaque, "#FFFFFF", "#FFD23F", cores.destaque, "#FFFFFF"];
  return (
    <AbsoluteFill>
      {/* Confete caindo devagar pela tela */}
      {CONFETES.map((i) => {
        const x = ((i * 397) % 1000) + 40;
        const vel = 7 + (i % 5) * 1.6;
        const y = -60 + (t - 8 - (i % 7) * 3) * vel;
        if (y < -60 || y > 1960) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.sin(t / 9 + i) * 26,
              top: y,
              width: 16,
              height: i % 2 ? 16 : 28,
              borderRadius: 4,
              background: corDoConfete[i % corDoConfete.length],
              rotate: `${i * 47 + t * (5 + (i % 4))}deg`,
              opacity: 0.92,
            }}
          />
        );
      })}
      <AbsoluteFill style={{ opacity: entra(t, 4, 20), background: "linear-gradient(0deg, rgba(8,10,22,0.82) 0%, rgba(8,10,22,0.62) 26%, rgba(8,10,22,0) 46%)" }} />
      {qr && <PainelDoQr texto={qr.texto} legenda={qr.legenda} tamanho={220} em={18} style={{ top: 150, left: 0, right: 0, marginLeft: "auto", marginRight: "auto", width: "fit-content" }} />}
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 1920 - 1530, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, ...sobe(t, 12) }}>
          <Logo tamanho={74} />
          <div style={{ fontFamily: fontes.titulo, fontWeight: 700, fontSize: 30, letterSpacing: "0.16em", textTransform: "uppercase", color: "#FFFFFF" }}>{marca.nome}</div>
        </div>
        <Chamada texto={chamada} tamanho={letraDaChamada(chamada, 84)} de={16} nome="fim-pose" />
        {botao && <Botao texto={botao} de={34} />}
      </div>
      <Som tipo="sucesso" em={6} />
    </AbsoluteFill>
  );
};

/** O texto do fim (no relógio do fim: o quadro 0 é o primeiro do fim) */
export const TextoDoFim3D: React.FC<{ fim: FimDo3D; chamada: string; botao?: string; qr: Qr }> = ({ fim, chamada, botao, qr }) => {
  if (fim === "grua") return <FimGrua chamada={chamada} botao={botao} qr={qr} />;
  if (fim === "placa") return <FimPlaca botao={botao} qr={qr} />;
  if (fim === "cinema") return <FimCinema chamada={chamada} botao={botao} qr={qr} />;
  return <FimPose chamada={chamada} botao={botao} qr={qr} />;
};
