import QRCode from "qrcode";
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { suave } from "../../nucleo/animacao";
import { cores } from "../../nucleo/marca";

/** QR Code que se desenha na diagonal, módulo a módulo (copiado e adaptado do Laços) */
export const QrAnimado: React.FC<{ texto: string; tamanho: number; inicio?: number; duracao?: number; cor?: string }> = ({
  texto,
  tamanho,
  inicio = 0,
  duracao = 30,
  cor = cores.texto,
}) => {
  const frame = useCurrentFrame();
  const qr = useMemo(() => QRCode.create(texto, { errorCorrectionLevel: "M" }), [texto]);
  const n = qr.modules.size;
  const m = tamanho / n;
  const p = interpolate(frame, [inicio, inicio + duracao], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: suave,
  });
  const limite = p * (2 * n + 6);
  const modulos: React.ReactNode[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!qr.modules.get(y, x)) continue;
      const o = Math.min(1, Math.max(0, limite - (x + y)));
      if (o > 0) modulos.push(<rect key={`${x}-${y}`} x={x * m} y={y * m} width={m + 0.2} height={m + 0.2} opacity={o} />);
    }
  }
  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} fill={cor}>
      {modulos}
    </svg>
  );
};
