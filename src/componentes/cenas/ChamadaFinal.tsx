import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, pulo } from "../../nucleo/animacao";
import { cores, fontes, marca } from "../../nucleo/marca";
import { Assinatura, Fundo } from "../base";
import { Texto } from "../texto/Texto";

/** Última cena: logo, a chamada e o site ou @ da marca, no fundo de destaque */
export const ChamadaFinal: React.FC<{ chamada?: string }> = ({ chamada }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const escala = pulo(frame, 0, fps);
  return (
    <Fundo escuro>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70, padding: 90 }}>
        <div style={{ scale: String(escala) }}>
          <Assinatura tamanho={180} cor={cores.textoNoDestaque} />
        </div>
        <Texto texto={chamada ?? marca.chamada} inicio={8} cor={cores.textoNoDestaque} tamanho={110} />
        <div
          style={{
            ...entrada(frame, 22),
            fontFamily: fontes.texto,
            fontWeight: 600,
            fontSize: 48,
            color: cores.textoNoDestaque,
            opacity: 0.9 * entrada(frame, 22).opacity,
          }}
        >
          {marca.instagram || marca.site}
        </div>
      </AbsoluteFill>
    </Fundo>
  );
};
