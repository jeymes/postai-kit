import React from "react";

// Filtros SVG dos estilos (giz, neon, quadrinhos, massinha). Ficam num <svg>
// invisível dentro da cena; os personagens usam com style={{ filter: "url(#id)" }}.
// Cada estilo põe os seus no Fundo (registro.tsx).

export const FiltroDeGiz: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      {/* Giz: o traço treme e fica falhado, como na lousa */}
      <filter id="estilo-giz" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} result="ruido" />
        <feDisplacementMap in="SourceGraphic" in2="ruido" scale={6} xChannelSelector="R" yChannelSelector="G" result="tremido" />
        <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves={1} seed={7} result="poeira" />
        <feColorMatrix in="poeira" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -0.9 1.35" result="buracos" />
        <feComposite in="tremido" in2="buracos" operator="in" />
      </filter>
    </defs>
  </svg>
);

export const FiltroDeNeon: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      {/* Neon: o traço ganha um brilho em volta, na própria cor */}
      <filter id="estilo-neon" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation={6} result="brilho1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation={16} result="brilho2" />
        <feMerge>
          <feMergeNode in="brilho2" />
          <feMergeNode in="brilho1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
);

export const FiltroDeQuadrinhos: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      {/* Quadrinhos: contorno preto grosso em volta de tudo */}
      <filter id="estilo-quadrinhos" x="-10%" y="-10%" width="120%" height="120%">
        <feMorphology in="SourceAlpha" operator="dilate" radius={7} result="grosso" />
        <feFlood floodColor="#111111" result="preto" />
        <feComposite in="preto" in2="grosso" operator="in" result="contorno" />
        <feMerge>
          <feMergeNode in="contorno" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
);

export const FiltroDeMassinha: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      {/* Massinha: volume macio (luz de cima e sombra embaixo) e textura de dedo */}
      <filter id="estilo-massinha" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceAlpha" stdDeviation={7} result="borrado" />
        <feSpecularLighting in="borrado" surfaceScale={4} specularConstant={0.55} specularExponent={22} lightingColor="#FFFFFF" result="luz">
          <feDistantLight azimuth={235} elevation={55} />
        </feSpecularLighting>
        <feComposite in="luz" in2="SourceAlpha" operator="in" result="luzDentro" />
        <feGaussianBlur in="SourceAlpha" stdDeviation={10} result="sombraBorrada" />
        <feOffset in="sombraBorrada" dx={0} dy={-8} result="sombraDeslocada" />
        <feComposite in="SourceAlpha" in2="sombraDeslocada" operator="out" result="bordaDeBaixo" />
        <feFlood floodColor="#000000" floodOpacity={0.22} />
        <feComposite in2="bordaDeBaixo" operator="in" result="sombraDentro" />
        <feMerge result="comVolume">
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="sombraDentro" />
          <feMergeNode in="luzDentro" />
        </feMerge>
        <feDropShadow in="comVolume" dx={0} dy={10} stdDeviation={6} floodColor="#000000" floodOpacity={0.25} />
      </filter>
    </defs>
  </svg>
);

/** Todos os filtros de uma vez (para telas sem o fundo do estilo, como a ficha) */
export const FiltrosDosEstilos: React.FC = () => (
  <>
    <FiltroDeGiz />
    <FiltroDeNeon />
    <FiltroDeQuadrinhos />
    <FiltroDeMassinha />
  </>
);
