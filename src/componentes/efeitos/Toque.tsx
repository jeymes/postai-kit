import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Som } from "../audio/Som";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Dedo que chega, toca (com ondinha e som) e sai, na posição x, y (px dentro
 * do elemento pai). Copiado e adaptado do Toque do Laços.
 */
export const Toque: React.FC<{ em: number; x: number; y: number; som?: boolean }> = ({ em, x, y, som = true }) => {
  const frame = useCurrentFrame();
  const chegada = interpolate(frame, [em - 14, em - 2], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const saida = interpolate(frame, [em + 8, em + 18], [1, 0], clamp);
  const pressao = interpolate(frame, [em - 2, em, em + 5], [1, 0.8, 1], clamp);
  const onda = interpolate(frame, [em, em + 14], [0, 1], clamp);
  return (
    <>
      {som && <Som tipo="toque" em={em} />}
      {frame >= em - 14 && frame <= em + 18 && (
        <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, pointerEvents: "none", zIndex: 10 }}>
          <div
            style={{
              position: "absolute",
              width: 110,
              height: 110,
              left: -55,
              top: -55,
              borderRadius: 99,
              border: "3px solid rgba(0,0,0,0.3)",
              opacity: frame >= em ? 1 - onda : 0,
              scale: String(0.5 + onda),
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 66,
              height: 66,
              left: -33,
              top: -33,
              borderRadius: 99,
              background: "rgba(255,255,255,0.6)",
              border: "3px solid rgba(0,0,0,0.4)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
              opacity: chegada * saida,
              translate: `${(1 - chegada) * 40}px ${(1 - chegada) * 52}px`,
              scale: String(pressao),
            }}
          />
        </div>
      )}
    </>
  );
};
