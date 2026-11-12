import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

/** Clarão branco rápido no quadro `em` (corte de trend, revelação) */
export const Flash: React.FC<{ em: number; duracao?: number; cor?: string }> = ({ em, duracao = 8, cor = "#fff" }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [em, em + 1, em + duracao], [0, 0.9, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (o <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: cor, opacity: o, pointerEvents: "none" }} />;
};
