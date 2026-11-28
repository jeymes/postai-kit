import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Som } from "../../componentes/audio/Som";
import { cores } from "../../nucleo/marca";
import type { Troca } from "./direcao";

const TRACO = "#2B2340";
/** Quantos quadros a cortina leva para atravessar a tela (a troca acontece no meio) */
export const QUADROS_DA_TROCA = 18;

/**
 * A transição de uma troca de lugar (27/11/2026: o cenário "mudava do nada"): uma
 * cortina inclinada na cor da marca atravessa a tela com um whoosh e o lugar novo
 * aparece atrás dela. Só dia/noite (o mesmo lugar): escurece e clareia.
 */
export const TrocaDeCena: React.FC<{ trocas: Troca[]; escuro: boolean }> = ({ trocas, escuro }) => {
  const frame = useCurrentFrame();
  const meio = QUADROS_DA_TROCA / 2;
  return (
    <>
      {trocas.slice(1).map((t) => {
        const desde = frame - (t.em - meio);
        const som = <Som key={`som-${t.em}`} tipo="whoosh" em={Math.max(0, t.em - meio)} />;
        if (desde < 0 || desde > QUADROS_DA_TROCA) return som;
        if (!t.mudouLugar) {
          const escurece = interpolate(desde, [0, meio, QUADROS_DA_TROCA], [0, 1, 0], { easing: Easing.inOut(Easing.quad) });
          return (
            <React.Fragment key={t.em}>
              {som}
              <AbsoluteFill style={{ background: "#0A0F26", opacity: escurece * 0.92 }} />
            </React.Fragment>
          );
        }
        // A cortina: entra pela direita e sai pela esquerda, cobrindo tudo no meio
        const x = interpolate(desde, [0, QUADROS_DA_TROCA], [1500, -1500], { easing: Easing.inOut(Easing.cubic) });
        const cor = escuro ? "#1B2147" : cores.destaque;
        return (
          <React.Fragment key={t.em}>
            {som}
            <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
              <div
                style={{
                  position: "absolute",
                  top: -200,
                  bottom: -200,
                  left: x - 400,
                  width: 1880,
                  transform: "skewX(-14deg)",
                  background: cor,
                  borderLeft: `26px solid ${TRACO}`,
                  borderRight: `26px solid ${TRACO}`,
                  boxShadow: `inset 60px 0 0 rgba(255,255,255,0.18), inset -60px 0 0 rgba(255,255,255,0.18)`,
                }}
              />
            </AbsoluteFill>
          </React.Fragment>
        );
      })}
    </>
  );
};
