import React from "react";
import { AbsoluteFill } from "remotion";
import { Atelie } from "../componentes/cenarios/Atelie";
import { FraseNaLuz } from "../componentes/cenas/FraseNaLuz";
import { LuzDoAviso } from "../componentes/efeitos/LuzDoAviso";
import { ELENCO } from "../componentes/personagens/elenco";
import { Sombra } from "../componentes/personagens/Sombra";
import { type Visual } from "../componentes/personagens/Boneco";
import { cores, fontes } from "../nucleo/marca";
import { estiloDe, type EstiloDaPeca } from "./registro";

// Prévia de um estilo visual: o que o dono vê na tela Animação do Postaí para
// escolher (npx remotion still PreviaDoEstilo --props='{"modelo":"palito","fundo":"noite"}').
// "sombra": a Sombra saindo do celular e a luz do aviso; "versiculo": a cena final.

export type PropsDaPrevia = EstiloDaPeca & { cena?: "dupla" | "sombra" | "luz" | "versiculo" };

const Legenda: React.FC<{ tamanho: number; noite: boolean }> = ({ tamanho, noite }) => (
  <div
    style={{
      position: "absolute",
      top: 1680,
      left: 70,
      right: 70,
      textAlign: "center",
      fontFamily: fontes.titulo,
      fontWeight: 900,
      fontSize: tamanho,
      lineHeight: 1.15,
      color: "#FFFFFF",
      WebkitTextStroke: noite ? undefined : "10px #2B2340",
      paintOrder: "stroke",
      textShadow: noite ? "0 6px 18px rgba(0,0,0,0.6)" : undefined,
    }}
  >
    Isso não é o <span style={{ color: noite ? "#F5C94A" : cores.destaque }}>fim</span>
  </div>
);

export const PreviaDoEstilo: React.FC<PropsDaPrevia> = ({ modelo, fundo, cena = "dupla" }) => {
  const { def: estilo, fundo: f, escuro } = estiloDe({ modelo, fundo });
  const noite = f === "noite";
  if (cena === "versiculo") {
    return <FraseNaLuz frase="A luz resplandece nas trevas, e as trevas não a venceram." linha="João 1:5" />;
  }
  const bia = { ...(ELENCO.noiva.visual as Visual), roupa: modelo === "palito" ? "#FF8A7A" : ELENCO.noiva.visual.roupa };
  const lu = { ...(ELENCO.organizadora.visual as Visual), roupa: modelo === "palito" ? "#7FB2FF" : ELENCO.organizadora.visual.roupa };
  return (
    <AbsoluteFill style={{ background: noite ? "#0A0F26" : "#FBE7DA" }}>
      <estilo.Fundo fundo={f} Cenario={Atelie} />
      {cena === "sombra" || cena === "luz" ? (
        <>
          <estilo.Personagem noite={noite} visual={bia} momentos={[{ em: 0, pose: "celular", expressao: "preocupada" }]} palavras={[]} altura={900} style={{ position: "absolute", left: 50, top: 790 }} />
          <Sombra momentos={[{ em: 0, pose: "normal", expressao: cena === "luz" ? "preocupada" : "feliz" }]} palavras={cena === "luz" ? [] : [{ inicio: 0, fim: 999 }]} altura={900} espelhar semente={3} objeto="celular" sussurro="ninguém vai saber…" some={cena === "luz" ? 30 : undefined} style={{ position: "absolute", left: 490, top: 790 }} />
          {cena === "luz" && <LuzDoAviso em={26} x={258} y={1190} />}
        </>
      ) : (
        <>
          <estilo.Personagem noite={noite} visual={bia} momentos={[{ em: 0, pose: "explicando", expressao: "feliz" }]} palavras={[]} altura={900} style={{ position: "absolute", left: 50, top: 790 }} />
          <estilo.Personagem noite={noite} visual={lu} momentos={[{ em: 0, pose: "celular", expressao: "surpresa" }]} palavras={[]} altura={900} espelhar semente={3} style={{ position: "absolute", left: 490, top: 790 }} />
        </>
      )}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 90,
          right: 90,
          background: escuro ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          border: `6px solid ${escuro ? "#2C3870" : "#2B2340"}`,
          borderRadius: 34,
          padding: "26px 36px",
          textAlign: "center",
          fontFamily: fontes.titulo,
          fontWeight: 800,
          fontSize: 60,
          color: escuro ? "#F4F6FF" : "#2B2340",
        }}
      >
        {estilo.nome}
      </div>
      <Legenda tamanho={estilo.legenda} noite={escuro} />
    </AbsoluteFill>
  );
};
