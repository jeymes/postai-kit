// Jeitos de mostrar a imagem no Canal dark (molde Documentario), além da foto
// em tela cheia: o recorte de papel (modelo Colagem), o desenho a giz (modelo
// Lousa) e o mapa com a rota se desenhando (campo "rota" da cena, em qualquer
// modelo). Tudo desenhado pelo kit, sem arquivo de textura.
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame } from "remotion";
import { arquivo } from "../../componentes/base";
import { suave } from "../../nucleo/animacao";

const cinema = Easing.bezier(0.45, 0, 0.55, 1);

/** O papel de jornal velho atrás dos recortes: fibras, colunas de texto apagadas e manchas */
export const FundoDeJornal: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#d9cdb4" }}>
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <filter id="jornal-fibras">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.35 0" />
      </filter>
      <filter id="jornal-manchas">
        <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed="11" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.16  0 0 0 0.55 -0.1" />
      </filter>
      <pattern id="jornal-colunas" width="320" height="26" patternUnits="userSpaceOnUse">
        <rect x="18" y="9" width="280" height="7" rx="2" fill="rgba(60,50,35,0.10)" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#jornal-colunas)" />
      <rect width="100%" height="100%" filter="url(#jornal-manchas)" />
      <rect width="100%" height="100%" filter="url(#jornal-fibras)" />
    </svg>
  </AbsoluteFill>
);

/** Contorno rasgado: pontos em volta do retângulo, cada um um pouco para dentro (sempre igual para a mesma cena) */
function bordaRasgada(semente: string, dentes = 22, fundo = 1.6) {
  const pontos: string[] = [];
  const lado = (de: [number, number], para: [number, number], nome: string) => {
    for (let i = 0; i < dentes; i++) {
      const t = i / dentes;
      const x = de[0] + (para[0] - de[0]) * t;
      const y = de[1] + (para[1] - de[1]) * t;
      const d = random(`${semente}-${nome}-${i}`) * fundo;
      // Para dentro: no lado de cima desce, no de baixo sobe, e assim por diante
      const dx = nome === "esq" ? d : nome === "dir" ? -d : 0;
      const dy = nome === "cima" ? d : nome === "baixo" ? -d : 0;
      pontos.push(`${(x + dx).toFixed(2)}% ${(y + dy).toFixed(2)}%`);
    }
  };
  lado([0, 0], [100, 0], "cima");
  lado([100, 0], [100, 100], "dir");
  lado([100, 100], [0, 100], "baixo");
  lado([0, 100], [0, 0], "esq");
  return `polygon(${pontos.join(", ")})`;
}

/** Fita adesiva meio transparente presa num canto */
const Fita: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div
    style={{
      position: "absolute",
      width: 190,
      height: 54,
      background: "linear-gradient(180deg, rgba(240,228,190,0.82), rgba(225,210,165,0.78))",
      boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
      ...style,
    }}
  />
);

/**
 * Colagem: a imagem vira um recorte de papel com a borda rasgada e uma margem
 * branca, preso com fita sobre o jornal velho, levemente torto. Uma linha da cor
 * de destaque se desenha ao lado, como nas colagens de reportagem.
 */
export const Recorte: React.FC<{
  src: string;
  duracao: number;
  indice: number;
  filtro: string;
  destaque: string;
  ritmo: number;
  inteira?: boolean;
  parada?: boolean;
  /** Colagem Viva: onde está o detalhe na imagem ([x, y] em %): sai ampliado num recorte à parte */
  detalhe?: [number, number];
  /** Colagem Viva: a palavra-chave da cena, colada em letras recortadas de jornal */
  palavra?: string;
  fonte?: string;
}> = ({ src, duracao, indice, filtro, destaque, ritmo, inteira, parada, detalhe, palavra, fonte }) => {
  const frameReal = useCurrentFrame();
  // Colagem Viva (23/11/2026): o papel "respira" como animação quadro a quadro (stop-motion):
  // o movimento anda de 3 em 3 quadros e cada passo tem um tremido leve
  const passo = Math.floor(frameReal / 3);
  const frame = parada ? frameReal : passo * 3;
  const tremido = parada ? { x: 0, y: 0, giro: 0 } : {
    x: (random(`trem-x-${indice}-${passo}`) - 0.5) * 3,
    y: (random(`trem-y-${indice}-${passo}`) - 0.5) * 3,
    giro: (random(`trem-g-${indice}-${passo}`) - 0.5) * 0.5,
  };
  const t = (parada ? 1 : interpolate(frame, [0, duracao], [0, 1], { extrapolateRight: "clamp", easing: cinema })) * ritmo;
  const entrada = parada ? 1 : interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp", easing: suave });
  const semente = `recorte-${indice}`;
  const giro = (random(`${semente}-giro`) - 0.5) * 5;
  const lado = indice % 2 === 0 ? 1 : -1;
  const borda = useMemo(() => bordaRasgada(semente), [semente]);
  const bordaDaFoto = useMemo(() => bordaRasgada(`${semente}-foto`, 26, 1.1), [semente]);
  const linha = parada ? 1 : interpolate(frame, [10, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <FundoDeJornal />
      {/* Linha vermelha da reportagem, ligando o recorte à borda (com o detalhe ampliado, a seta faz esse papel) */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: detalhe && !inteira ? 0 : 1 }} viewBox="0 0 1920 1080">
        <path
          d={lado > 0 ? "M 1500 140 C 1700 260, 1760 520, 1860 820" : "M 420 140 C 220 260, 160 520, 60 820"}
          fill="none"
          stroke={destaque}
          strokeWidth={9}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - linha}
        />
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            width: "70%",
            height: "76%",
            rotate: `${giro + tremido.giro}deg`,
            translate: `${lado * (1 - entrada) * -60 + tremido.x}px ${(1 - entrada) * 40 + tremido.y}px`,
            scale: String(0.94 + 0.04 * entrada + 0.03 * t),
            opacity: entrada,
            filter: "drop-shadow(0 18px 26px rgba(40,25,10,0.45))",
          }}
        >
          {/* A margem branca do papel, rasgada */}
          <div style={{ position: "absolute", inset: 0, backgroundColor: "#f3eee2", clipPath: borda }} />
          {/* A imagem, recortada dentro da margem */}
          <div style={{ position: "absolute", inset: 22, clipPath: bordaDaFoto, overflow: "hidden", backgroundColor: "#2a2420" }}>
            {/* Retrato em pé (inteira): a própria imagem desfocada preenche os lados (antes, faixas escuras) */}
            {inteira && (
              <Img
                src={arquivo(src)}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: `blur(24px) brightness(0.55)`, scale: "1.15" }}
              />
            )}
            <Img
              src={arquivo(src)}
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                objectFit: inteira ? "contain" : "cover",
                scale: String(1.04 + 0.08 * t),
                filter: filtro,
              }}
            />
          </div>
          <Fita style={{ top: -22, left: 40, rotate: "-8deg" }} />
          <Fita style={{ bottom: -20, right: 50, rotate: "6deg" }} />
          {/* O círculo de marca-texto em volta do detalhe, desenhado à mão */}
          {detalhe && !inteira && <CirculoDeMarcaTexto x={detalhe[0]} y={detalhe[1]} cor={destaque} frame={frame} parada={parada} semente={semente} />}
        </div>
      </AbsoluteFill>
      {detalhe && !inteira && (
        <DetalheAmpliado src={src} filtro={filtro} x={detalhe[0]} y={detalhe[1]} lado={lado} cor={destaque} frame={frame} parada={parada} semente={semente} tremido={tremido} />
      )}
      {palavra && <PalavraRecortada texto={palavra} fonte={fonte} cor={destaque} frame={frame} parada={parada} semente={semente} lado={lado} />}
    </AbsoluteFill>
  );
};

// ---- Colagem Viva: as peças que entram por cima do recorte ----

const aparece = (frame: number, de: number, parada?: boolean) =>
  parada ? 1 : interpolate(frame, [de, de + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });

/** O círculo vermelho de marca-texto em volta do detalhe (no espaço do recorte, em %) */
const CirculoDeMarcaTexto: React.FC<{ x: number; y: number; cor: string; frame: number; parada?: boolean; semente: string }> = ({
  x,
  y,
  cor,
  frame,
  parada,
  semente,
}) => {
  const desenho = parada ? 1 : interpolate(frame, [24, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  const torto = (random(`${semente}-circulo`) - 0.5) * 10;
  // Uma volta e um pouco, como quem risca rápido com caneta
  const d = "M 6 50 C 6 18, 40 4, 64 8 C 92 13, 98 44, 92 66 C 84 92, 40 98, 18 84 C 2 72, 8 40, 30 28";
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ position: "absolute", left: `${x - 9}%`, top: `${y - 13}%`, width: "18%", height: "26%", rotate: `${torto}deg`, overflow: "visible" }}
    >
      <path d={d} fill="none" stroke={cor} strokeWidth={4.5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - desenho} />
    </svg>
  );
};

/** O detalhe da imagem ampliado num recorte redondo, do outro lado, com a seta desenhada até ele */
const DetalheAmpliado: React.FC<{
  src: string;
  filtro: string;
  x: number;
  y: number;
  lado: number;
  cor: string;
  frame: number;
  parada?: boolean;
  semente: string;
  tremido: { x: number; y: number; giro: number };
}> = ({ src, filtro, x, y, lado, cor, frame, parada, semente, tremido }) => {
  const entrada = aparece(frame, 40, parada);
  const seta = parada ? 1 : interpolate(frame, [48, 66], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  if (entrada <= 0) return null;
  const giro = (random(`${semente}-lupa`) - 0.5) * 8;
  const TAMANHO = 380;
  const esquerda = lado > 0 ? 1920 - TAMANHO - 70 : 70;
  const topo = 560;
  const ZOOM = 3;
  return (
    <>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* Seta à mão: do círculo no recorte até o detalhe ampliado (o recorte ocupa 70% x 76% no meio da tela) */}
        <path
          d={(() => {
            const cx = 1920 * 0.15 + (x / 100) * 1920 * 0.7;
            const cy = 1080 * 0.12 + (y / 100) * 1080 * 0.76;
            const lx = esquerda + TAMANHO / 2;
            const ly = topo + TAMANHO / 2;
            // Sai da borda do círculo e chega na borda do recorte redondo
            const ang = Math.atan2(ly - cy, lx - cx);
            const de = [cx + Math.cos(ang) * 110, cy + Math.sin(ang) * 110];
            const ate = [lx - Math.cos(ang) * (TAMANHO / 2 + 14), ly - Math.sin(ang) * (TAMANHO / 2 + 14)];
            const meio = [(de[0] + ate[0]) / 2, (de[1] + ate[1]) / 2 - 90];
            return `M ${de[0]} ${de[1]} Q ${meio[0]} ${meio[1]} ${ate[0]} ${ate[1]}`;
          })()}
          fill="none"
          stroke={cor}
          strokeWidth={8}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - seta}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: esquerda + tremido.x,
          top: topo + tremido.y,
          width: TAMANHO,
          height: TAMANHO,
          rotate: `${giro + tremido.giro}deg`,
          scale: String(0.7 + 0.3 * entrada),
          opacity: entrada,
          filter: "drop-shadow(0 14px 20px rgba(40,25,10,0.5))",
        }}
      >
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: "#f3eee2" }} />
        <div style={{ position: "absolute", inset: 16, borderRadius: "50%", overflow: "hidden", backgroundColor: "#2a2420" }}>
          <Img
            src={arquivo(src)}
            style={{
              position: "absolute",
              width: `${ZOOM * 100}%`,
              height: `${ZOOM * 100}%`,
              left: `${-(x / 100) * ZOOM * 100 + 50}%`,
              top: `${-(y / 100) * ZOOM * 100 + 50}%`,
              objectFit: "cover",
              filter: filtro,
            }}
          />
        </div>
        <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: `7px solid ${cor}` }} />
      </div>
    </>
  );
};

/** A palavra-chave em letras recortadas de jornal: cada letra num papel, fonte e giro diferentes */
const PalavraRecortada: React.FC<{ texto: string; fonte?: string; cor: string; frame: number; parada?: boolean; semente: string; lado: number }> = ({
  texto,
  fonte,
  cor,
  frame,
  parada,
  semente,
  lado,
}) => {
  const PAPEIS = ["#f3eee2", "#111111", cor, "#e9dcc0", "#ffffff"];
  const FONTES = [fonte ?? "Georgia, serif", "Impact, 'Arial Black', sans-serif", "'Courier New', monospace", "Georgia, serif"];
  const letras = [...texto.toUpperCase()];
  return (
    <div
      style={{
        position: "absolute",
        top: 70,
        ...(lado > 0 ? { left: 90 } : { right: 90 }),
        display: "flex",
        gap: 6,
        alignItems: "flex-end",
        filter: "drop-shadow(0 6px 8px rgba(40,25,10,0.4))",
      }}
    >
      {letras.map((letra, i) => {
        if (letra === " ") return <div key={i} style={{ width: 24 }} />;
        const e = aparece(frame, 14 + i * 2, parada);
        const papel = PAPEIS[Math.floor(random(`${semente}-papel-${i}`) * PAPEIS.length)];
        const escuro = papel === "#111111" || papel === cor;
        return (
          <div
            key={i}
            style={{
              opacity: e,
              scale: String(0.6 + 0.4 * e),
              rotate: `${(random(`${semente}-letra-${i}`) - 0.5) * 14}deg`,
              backgroundColor: papel,
              color: escuro ? "#ffffff" : "#111111",
              fontFamily: FONTES[Math.floor(random(`${semente}-fonte-${i}`) * FONTES.length)],
              fontWeight: 800,
              fontSize: 64 + Math.floor(random(`${semente}-tam-${i}`) * 22),
              lineHeight: 1,
              padding: "6px 10px 8px",
            }}
          >
            {letra}
          </div>
        );
      })}
    </div>
  );
};

/** O quadro-negro: verde bem escuro, com o pó de giz apagado e manchas */
export const FundoDeLousa: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1f2b25" }}>
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <filter id="lousa-po">
        <feTurbulence type="fractalNoise" baseFrequency="0.004 0.02" numOctaves="3" seed="5" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0.16 0" />
      </filter>
      <filter id="lousa-grao">
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="2" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0.08 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#lousa-po)" />
      <rect width="100%" height="100%" filter="url(#lousa-grao)" />
    </svg>
    {/* A moldura de madeira */}
    <AbsoluteFill style={{ boxShadow: "inset 0 0 0 26px #5b3e26, inset 0 0 0 30px #3d2918, inset 0 0 90px 40px rgba(0,0,0,0.55)" }} />
  </AbsoluteFill>
);

/**
 * Lousa: a imagem vira um desenho a giz (só os traços claros, com grão) sobre o
 * quadro-negro, revelado da esquerda para a direita como se fosse desenhado.
 */
export const Giz: React.FC<{
  src: string;
  duracao: number;
  indice: number;
  ritmo: number;
  inteira?: boolean;
  parada?: boolean;
}> = ({ src, duracao, indice, ritmo, inteira, parada }) => {
  const frame = useCurrentFrame();
  const t = (parada ? 1 : interpolate(frame, [0, duracao], [0, 1], { extrapolateRight: "clamp", easing: cinema })) * ritmo;
  // O desenho aparece em 1,5 s, da esquerda para a direita
  const desenho = parada ? 1 : interpolate(frame, [4, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  const id = `giz-${indice}`;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <FundoDeLousa />
      <svg width="0" height="0" style={{ position: "absolute" }}>
        {/* Traço: as bordas da imagem (onde a luz muda) ficam brancas, o resto some; o grão quebra o traço como giz */}
        <filter id={id} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" result="cinza" />
          <feGaussianBlur in="cinza" stdDeviation="1.2" result="liso" />
          <feConvolveMatrix in="liso" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="bordas" />
          <feComponentTransfer in="bordas" result="forte">
            <feFuncR type="linear" slope="9" intercept="-0.12" />
            <feFuncG type="linear" slope="9" intercept="-0.12" />
            <feFuncB type="linear" slope="9" intercept="-0.12" />
          </feComponentTransfer>
          {/* Engrossa o traço, como a ponta do giz */}
          <feMorphology in="forte" operator="dilate" radius="0.9" result="traco" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed={indice % 7} result="grao" />
          <feColorMatrix in="grao" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.35" result="buracos" />
          <feComposite in="traco" in2="buracos" operator="in" />
        </filter>
      </svg>
      <AbsoluteFill style={{ padding: "90px 140px", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            clipPath: `inset(0 ${(1 - desenho) * 100}% 0 0)`,
            scale: String(1 + 0.05 * t),
            // Some nas bordas: sem o retângulo da foto aparecendo na lousa
            maskImage: "radial-gradient(ellipse 72% 72% at 50% 50%, #000 62%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 72% 72% at 50% 50%, #000 62%, transparent 100%)",
          }}
        >
          {/* O sombreado: a imagem bem clarinha, como giz esfregado */}
          <Img
            src={arquivo(src)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: inteira ? "contain" : "cover",
              filter: "grayscale(1) contrast(1.2) brightness(1.2)",
              opacity: 0.1,
              mixBlendMode: "screen",
            }}
          />
          {/* Os traços de giz */}
          <Img
            src={arquivo(src)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: inteira ? "contain" : "cover",
              filter: `url(#${id})`,
              mixBlendMode: "screen",
              opacity: 0.92,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export type Ponto = [number, number];

/** Onde a ponta da rota está (em %), andando pelos trechos retos na mesma velocidade */
function pontaDaRota(pontos: Ponto[], progresso: number): Ponto {
  const trechos = pontos.slice(1).map((p, i) => Math.hypot(p[0] - pontos[i][0], p[1] - pontos[i][1]));
  const total = trechos.reduce((a, b) => a + b, 0) || 1;
  let falta = progresso * total;
  for (let i = 0; i < trechos.length; i++) {
    if (falta <= trechos[i] || i === trechos.length - 1) {
      const f = trechos[i] ? Math.min(1, falta / trechos[i]) : 1;
      return [pontos[i][0] + (pontos[i + 1][0] - pontos[i][0]) * f, pontos[i][1] + (pontos[i + 1][1] - pontos[i][1]) * f];
    }
    falta -= trechos[i];
  }
  return pontos[pontos.length - 1];
}

/** Quanto da rota já foi andado quando a ponta chega em cada ponto (0 a 1) */
function chegadas(pontos: Ponto[]) {
  const trechos = pontos.slice(1).map((p, i) => Math.hypot(p[0] - pontos[i][0], p[1] - pontos[i][1]));
  const total = trechos.reduce((a, b) => a + b, 0) || 1;
  let soma = 0;
  return pontos.map((_, i) => {
    if (i > 0) soma += trechos[i - 1];
    return soma / total;
  });
}

/**
 * Onde fica o nome de cada lugar no mapa (25/11/2026: Samaria, Garizim e
 * Jerusalém ficavam encostados). Tenta à direita do ponto (à esquerda perto da
 * borda direita), depois do outro lado, acima e abaixo, e fica com o primeiro
 * lado que não bate nos nomes já postos nem nos outros pontos (sem lado livre,
 * o que menos encosta). Conta em pixels
 * num mapa de 1470 x 980 (o tamanho comum na tela; basta para separar).
 */
export type LadoDoNome = "direita" | "esquerda" | "acima" | "abaixo";
export function ladosDosNomes(rota: Ponto[], lugares: string[]): LadoDoNome[] {
  const L = 1470;
  const A = 980;
  type Caixa = { x1: number; y1: number; x2: number; y2: number };
  const bate = (a: Caixa, b: Caixa) => a.x1 < b.x2 + 8 && b.x1 < a.x2 + 8 && a.y1 < b.y2 + 6 && b.y1 < a.y2 + 6;
  const pontos: Caixa[] = rota.map((p) => ({ x1: (p[0] / 100) * L - 15, y1: (p[1] / 100) * A - 15, x2: (p[0] / 100) * L + 15, y2: (p[1] / 100) * A + 15 }));
  const postas: Caixa[] = [];
  return rota.map((p, i) => {
    const nome = lugares[i] ?? "";
    const x = (p[0] / 100) * L;
    const y = (p[1] / 100) * A;
    const w = nome.length * 21 + 32;
    const h = 54;
    const caixa = (lado: LadoDoNome): Caixa =>
      lado === "direita"
        ? { x1: x + 24, y1: y - 24, x2: x + 24 + w, y2: y - 24 + h }
        : lado === "esquerda"
          ? { x1: x - 24 - w, y1: y - 24, x2: x - 24, y2: y - 24 + h }
          : lado === "acima"
            ? { x1: x - w / 2, y1: y - 28 - h, x2: x + w / 2, y2: y - 28 }
            : { x1: x - w / 2, y1: y + 28, x2: x + w / 2, y2: y + 28 + h };
    const ordem: LadoDoNome[] = p[0] > 70 ? ["esquerda", "direita", "acima", "abaixo"] : ["direita", "esquerda", "acima", "abaixo"];
    // Quanto o nome encosta nos outros (0 = lado livre); sem lado livre, fica com o que menos encosta
    const encosta = (lado: LadoDoNome) => {
      const c = caixa(lado);
      const area = (o: Caixa) => (bate(c, o) ? Math.max(1, (Math.min(c.x2, o.x2) - Math.max(c.x1, o.x1)) * (Math.min(c.y2, o.y2) - Math.max(c.y1, o.y1))) : 0);
      return postas.reduce((t, o) => t + area(o), 0) + pontos.reduce((t, o, j) => t + (j === i ? 0 : area(o)), 0);
    };
    const notas = ordem.map(encosta);
    const lado = ordem[notas.indexOf(Math.min(...notas))];
    if (nome) postas.push(caixa(lado));
    return lado;
  });
}

/**
 * Mapa animado: o mapa inteiro (sem cortar), com zoom lento, e a rota na cor de
 * destaque se desenhando de um ponto ao outro; cada lugar ganha um ponto e o
 * nome quando a rota chega nele. Os pontos são em % da imagem (0,0 = canto de
 * cima à esquerda).
 */
export const MapaAnimado: React.FC<{
  src: string;
  duracao: number;
  rota: Ponto[];
  lugares?: string[];
  filtro: string;
  destaque: string;
  fonte: string;
  parada?: boolean;
}> = ({ src, duracao, rota, lugares = [], filtro, destaque, fonte, parada }) => {
  const frame = useCurrentFrame();
  // A rota se desenha entre 0,8 s e 75% da cena; depois fica parada
  const progresso = parada
    ? 1
    : interpolate(frame, [24, Math.max(60, duracao * 0.75)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: cinema });
  const zoom = parada ? 1.06 : interpolate(frame, [0, duracao], [1, 1.06], { extrapolateRight: "clamp", easing: cinema });
  const ponta = pontaDaRota(rota, progresso);
  const ate = chegadas(rota);
  const linha = rota.map((p) => p.join(",")).join(" ");
  const lados = ladosDosNomes(rota, lugares);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <Img src={arquivo(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `blur(40px) brightness(0.4) ${filtro === "none" ? "" : filtro}`, scale: "1.15" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "50px 0" }}>
        {/* A caixa abraça a imagem: os % da rota batem com o mapa */}
        <div style={{ position: "relative", height: "100%", display: "inline-block", scale: String(zoom), boxShadow: "0 30px 90px rgba(0,0,0,0.6)" }}>
          <Img src={arquivo(src)} style={{ height: "100%", width: "auto", maxWidth: 1800, display: "block", filter: filtro }} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
            {/* Sombra por baixo, para a linha ler em mapa claro */}
            <polyline points={linha} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progresso} />
            <polyline points={linha} fill="none" stroke={destaque} strokeWidth={0.6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progresso} />
          </svg>
          {rota.map((p, i) => {
            // Acende um pouco antes de a ponta chegar e fica inteiro na chegada. Antes
            // era um pouco depois: o último ponto (a rota termina nele) ficava com o
            // nome quase invisível (25/11/2026: Jericó e Jerusalém sumiram do mapa)
            const chegou = interpolate(progresso, [ate[i] - 0.04, ate[i] - 0.001], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            // O lado do nome que não bate nos outros (perto da borda direita, à esquerda)
            const lado = lados[i];
            const nome = lugares[i];
            return (
              <div key={i} style={{ position: "absolute", left: `${p[0]}%`, top: `${p[1]}%`, opacity: chegou }}>
                <div style={{ position: "absolute", width: 26, height: 26, marginLeft: -13, marginTop: -13, borderRadius: 13, backgroundColor: destaque, border: "4px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.6)", scale: String(0.6 + 0.4 * chegou) }} />
                {nome && (
                  <div
                    style={{
                      position: "absolute",
                      ...(lado === "direita"
                        ? { left: 24, top: -24 }
                        : lado === "esquerda"
                          ? { right: 24, top: -24 }
                          : { left: 0, translate: "-50% 0", top: lado === "acima" ? -82 : 28 }),
                      whiteSpace: "nowrap",
                      fontFamily: fonte,
                      fontWeight: 700,
                      fontSize: 38,
                      color: "#fff",
                      backgroundColor: "rgba(10,8,12,0.78)",
                      padding: "4px 16px",
                      borderRadius: 10,
                    }}
                  >
                    {nome}
                  </div>
                )}
              </div>
            );
          })}
          {/* A ponta que anda (o barco, a caravana) */}
          {progresso > 0 && progresso < 1 && (
            <div style={{ position: "absolute", left: `${ponta[0]}%`, top: `${ponta[1]}%`, width: 18, height: 18, marginLeft: -9, marginTop: -9, borderRadius: 9, backgroundColor: "#fff", boxShadow: `0 0 0 6px ${destaque}88, 0 0 22px 6px ${destaque}` }} />
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
