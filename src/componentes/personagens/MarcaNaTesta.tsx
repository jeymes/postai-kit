import React from "react";
import { useCurrentFrame } from "remotion";

// Marca e brilho na testa (26/11/2026, pedido da crítica: "o sinal de Caim
// nunca aparece no personagem"). O molde diz quem está marcado e desde quando
// (contexto, como o CelularAceso); o Boneco, o Liso e o Palito desenham aqui,
// dentro do grupo da cabeça, então a marca acompanha a cabeça quando ela mexe.
// O desenho é neutro (um sinal em losango), sem símbolo religioso nem letra.

export const TIPOS_DE_TESTA = ["marca", "brilho", "marca-brilho", "nenhuma"] as const;
export type TipoDeTesta = (typeof TIPOS_DE_TESTA)[number];

export type TestaAgora = { tipo: Exclude<TipoDeTesta, "nenhuma">; desde: number; cor?: string };
export const TestaContexto = React.createContext<TestaAgora | null>(null);

/** A marca na testa de alguém agora (ou nada): vale desde a fala que pediu até outra mudar (Conversa e Mundo3D) */
export function testaAgora(linha: Array<{ cena: { testa?: Partial<Record<string, TipoDeTesta>> }; inicio: number }>, id: string, frame: number): TestaAgora | null {
  let atual = null as TestaAgora | null;
  for (const { cena, inicio } of linha) {
    const pedido = cena.testa?.[id];
    if (!pedido || inicio - 6 > frame) continue;
    if (pedido === "nenhuma") atual = null;
    // A mesma marca repetida na fala seguinte não entra de novo
    else if (atual?.tipo !== pedido) atual = { tipo: pedido, desde: Math.max(0, inicio - 6) };
  }
  return atual;
}

/** A marca na testa, no espaço do desenho do personagem (viewBox -100 0 600 1000) */
export const MarcaNaTesta: React.FC<{ x: number; y: number; escala?: number }> = ({ x, y, escala = 1 }) => {
  const testa = React.useContext(TestaContexto);
  const frame = useCurrentFrame();
  if (!testa) return null;
  const desde = frame - testa.desde;
  if (desde < 0) return null;
  // Aparece em uns 12 quadros (cresce do nada); o brilho pulsa devagar depois
  const entra = Math.min(1, desde / 12);
  const pulso = 0.75 + 0.25 * Math.sin(desde / 7);
  const comMarca = testa.tipo !== "brilho";
  const comBrilho = testa.tipo !== "marca";
  const corDaMarca = testa.cor ?? (comBrilho ? "#FFD54A" : "#8E1F2A");
  const id = `brilho-testa-${Math.round(x)}-${Math.round(y)}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${escala * (0.4 + 0.6 * entra)})`} opacity={entra} pointerEvents="none">
      {comBrilho && (
        <>
          <defs>
            <radialGradient id={id}>
              <stop offset="0" stopColor="#FFF6C8" stopOpacity={0.95} />
              <stop offset="0.45" stopColor="#FFD54A" stopOpacity={0.55} />
              <stop offset="1" stopColor="#FFD54A" stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle r={70 * pulso} fill={`url(#${id})`} />
          {/* Raios curtos em volta: lê como "brilho" mesmo pequeno no celular */}
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={i}
              x1={0}
              y1={-34}
              x2={0}
              y2={-34 - 18 * pulso}
              stroke="#FFE27A"
              strokeWidth={6}
              strokeLinecap="round"
              transform={`rotate(${i * 45 + desde * 0.6})`}
              opacity={0.85}
            />
          ))}
        </>
      )}
      {comMarca && (
        <>
          <path d="M0 -22 L14 0 L0 22 L-14 0 Z" fill={corDaMarca} stroke={comBrilho ? "#FFF6C8" : "#4A0E16"} strokeWidth={4} strokeLinejoin="round" />
          <path d="M0 -10 L0 10" stroke={comBrilho ? "#FFFFFF" : "#C9485A"} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
        </>
      )}
      {!comMarca && <circle r={10 + 3 * pulso} fill="#FFFBE6" />}
    </g>
  );
};
