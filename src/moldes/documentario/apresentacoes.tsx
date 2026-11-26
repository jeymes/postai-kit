// Jeitos de mostrar a imagem no Canal dark (molde Documentario), além da foto
// em tela cheia: a colagem de papel (modelo Colagem), o desenho a giz (modelo
// Lousa) e o mapa com a rota se desenhando (campo "rota" da cena, em qualquer
// modelo). Tudo desenhado pelo kit; o jornal da mesa e o papel velho são
// texturas prontas (public/texturas), para não redesenhar ruído a cada quadro.
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { arquivo } from "../../componentes/base";
import { suave } from "../../nucleo/animacao";

const cinema = Easing.bezier(0.45, 0, 0.55, 1);
const preso = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * O papel de jornal velho atrás dos recortes: fibras, colunas de texto apagadas e
 * manchas. Desenhado só para gerar public/texturas/jornal.jpg (ver LEIA.md): o
 * vídeo usa a textura pronta (o ruído redesenhado a cada quadro deixava a
 * Colagem 3,3x mais lenta que o Clássico, medido em 26/11/2026).
 */
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
export function bordaRasgada(semente: string, dentes = 22, fundo = 1.6) {
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
export const Fita: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
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

// ---- Colagem (estilo das explicações em colagem, refeita em 26/11/2026) ----
//
// A mesa é o jornal velho com retalhos de papel parados nos cantos. Cada cena
// cola um recorte novo POR CIMA do anterior (sem misturar as fotos): ele entra
// deslizando e assenta, ou chega em tiras que se juntam. O recorte da cena
// anterior fica por baixo, meio de lado e um pouco na sombra, e o de duas cenas
// atrás é arrancado da mesa enquanto o novo chega. Tudo anda "de 3 em 3
// quadros", como animação quadro a quadro. A foto ganha textura de impressão
// (retícula e papel) e o vermelho do canal fica nos rabiscos e nos retalhos.

/** Quanto o recorte ocupa da tela e onde fica o canto dele (o meio, antes da pose) */
const CAIXA = { esquerda: 0.15, topo: 0.12, largura: 0.7, altura: 0.76 };
/** Quadros da chegada do recorte (deslize) e das tiras */
const CHEGADA = 15;
const TIRAS = 3;
const CHEGADA_DAS_TIRAS = 22;
/** Quadros do papel de duas cenas atrás saindo da mesa */
const SAIDA_DO_DE_BAIXO = 24;

/** O lado da cena (1 ou -1): o recorte assenta um pouco para o outro lado, e a palavra e o detalhe ficam deste */
const ladoDa = (indice: number) => (indice % 2 === 0 ? 1 : -1);

/** Onde o recorte da cena assenta: um pouco fora do meio (o de baixo aparece do outro lado) e torto */
function poseDoRecorte(indice: number) {
  const semente = `recorte-${indice}`;
  const lado = ladoDa(indice);
  return {
    lado,
    x: -lado * 46,
    y: (random(`${semente}-y`) - 0.5) * 26,
    giro: (random(`${semente}-giro`) - 0.5) * 5,
  };
}

/** A chegada da cena: deslizando e assentando, ou em tiras (1 a cada 3 cenas, a partir da 3ª) */
const chegaEmTiras = (indice: number) => indice % 3 === 2;

/** A escala do recorte e o zoom da foto, de t = 0 (começo da cena) a t = ritmo (fim) */
const escalaDoPapel = (t: number) => 0.98 + 0.03 * t;
const zoomDaFoto = (t: number) => 1.04 + 0.08 * t;

/** A imagem de uma cena anterior, que fica por baixo do recorte novo */
export interface RecorteDeBaixo {
  src: string;
  indice: number;
  inteira?: boolean;
  foco?: [number, number];
}

/** As linhas rasgadas entre as tiras (em % do recorte): a mesma linha fecha uma tira e abre a outra */
function cortesDasTiras(semente: string) {
  return Array.from({ length: TIRAS - 1 }, (_, k) => {
    const base = ((k + 1) / TIRAS) * 100;
    return Array.from({ length: 19 }, (_, i) => [i * (110 / 18) - 5, base + (random(`${semente}-tira-${k}-${i}`) - 0.5) * 2.4] as const);
  });
}
function poligonoDaTira(cortes: ReturnType<typeof cortesDasTiras>, i: number) {
  const cima = i === 0 ? [[-5, -10], [105, -10]] : cortes[i - 1];
  const baixo = i === TIRAS - 1 ? [[105, 110], [-5, 110]] : [...cortes[i]].reverse();
  return `polygon(${[...cima, ...baixo].map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(", ")})`;
}

/**
 * Um recorte de papel na mesa: a margem rasgada, a foto com textura de impressão
 * e as fitas. `chegada` (0 a 1) é a entrada (deslize ou tiras); `sombra` (0 a 1)
 * escurece o papel que ficou por baixo; `saida` (0 a 1) é o papel sendo arrancado.
 */
const PapelDaColagem: React.FC<{
  src: string;
  indice: number;
  filtro: string;
  t: number;
  inteira?: boolean;
  foco?: [number, number];
  chegada?: number;
  sombra?: number;
  saida?: number;
  /** Mais um pouco para fora (o de baixo se afasta devagar enquanto o novo fica: parallax) */
  deriva?: number;
  tremido?: { x: number; y: number; giro: number };
  children?: React.ReactNode;
}> = ({ src, indice, filtro, t, inteira, foco, chegada = 1, sombra = 0, saida = 0, deriva = 0, tremido, children }) => {
  const pose = poseDoRecorte(indice);
  const semente = `recorte-${indice}`;
  const borda = useMemo(() => bordaRasgada(semente), [semente]);
  const bordaDaFoto = useMemo(() => bordaRasgada(`${semente}-foto`, 26, 1.1), [semente]);
  const tiras = chegaEmTiras(indice) && chegada < 1;
  const cortes = useMemo(() => cortesDasTiras(semente), [semente]);
  // Deslize: vem de fora da tela (do lado oposto ao da cena), passa um pouco do ponto e assenta
  const deslize = tiras ? 1 : chegada;
  const fora = 1 - deslize;
  // Saindo: puxado para fora, do lado em que estava, girando
  const puxa = Easing.in(Easing.cubic)(saida);
  const x = pose.x + fora * -pose.lado * 1900 + deriva * -pose.lado * 34 + puxa * -pose.lado * 1900 + (tremido?.x ?? 0);
  const y = pose.y + fora * 60 + puxa * 140 + (tremido?.y ?? 0);
  const giro = pose.giro + fora * -pose.lado * 9 + puxa * -pose.lado * 14 + (tremido?.giro ?? 0);
  // Levantado (chegando ou saindo): maior e com a sombra longe
  const levantado = Math.max(tiras ? 0 : fora, puxa);
  const escala = escalaDoPapel(t) * (1 + 0.06 * levantado);
  const conteudo = (
    <>
      {/* A margem branca do papel, rasgada */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#f3eee2", clipPath: borda }} />
      {/* A imagem, recortada dentro da margem */}
      <div style={{ position: "absolute", inset: 22, clipPath: bordaDaFoto, overflow: "hidden", backgroundColor: "#2a2420" }}>
        {/* Retrato em pé (inteira): a própria imagem desfocada preenche os lados */}
        {inteira && (
          <Img
            src={arquivo(src)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: `blur(24px) brightness(0.55) ${filtro}`, scale: "1.15" }}
          />
        )}
        <Img
          src={arquivo(src)}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            objectFit: inteira ? "contain" : "cover",
            ...(foco && !inteira ? { objectPosition: `${foco[0]}% ${foco[1]}%`, transformOrigin: `${foco[0]}% ${foco[1]}%` } : {}),
            scale: String(zoomDaFoto(t)),
            filter: filtro,
          }}
        />
        {/* Textura de impressão: a retícula (pontinhos) e o papel por cima da foto, sem filtro por quadro */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle at 50% 50%, rgba(28,18,10,0.95) 0 0.9px, rgba(28,18,10,0) 1.7px)",
            backgroundSize: "4px 4px",
            mixBlendMode: "multiply",
            opacity: 0.16,
          }}
        />
        <Img
          src={staticFile("texturas/papel.webp")}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "multiply", opacity: 0.3 }}
        />
      </div>
      {/* O papel que ficou por baixo, na sombra do novo */}
      {sombra > 0 && <div style={{ position: "absolute", inset: 0, clipPath: borda, backgroundColor: `rgba(30,18,8,${0.3 * sombra})` }} />}
    </>
  );
  return (
    <div
      style={{
        position: "absolute",
        left: `${CAIXA.esquerda * 100}%`,
        top: `${CAIXA.topo * 100}%`,
        width: `${CAIXA.largura * 100}%`,
        height: `${CAIXA.altura * 100}%`,
        translate: `${x}px ${y}px`,
        rotate: `${giro}deg`,
        scale: String(escala),
      }}
    >
      {/* A sombra do papel na mesa: box-shadow num retângulo por baixo da borda rasgada (o drop-shadow
          no papel inteiro dobrava o tempo de render, medido em 26/11/2026) */}
      <div
        style={{
          position: "absolute",
          inset: "1.6%",
          boxShadow: `0 ${18 + 30 * levantado}px ${30 + 30 * levantado}px rgba(40,25,10,${0.5 - 0.1 * levantado})`,
          opacity: tiras ? chegada : 1,
        }}
      />
      {tiras
        ? // As tiras chegam de lados alternados, uma depois da outra, e se juntam na linha rasgada
          Array.from({ length: TIRAS }, (_, i) => {
            const p = interpolate(chegada * CHEGADA_DAS_TIRAS, [i * 4, i * 4 + 12], [0, 1], { ...preso, easing: Easing.out(Easing.back(1.3)) });
            const de = i % 2 === 0 ? -pose.lado : pose.lado;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  clipPath: poligonoDaTira(cortes, i),
                  translate: `${(1 - p) * de * 2100}px ${(1 - p) * (i - 1) * 40}px`,
                  rotate: `${(1 - p) * de * 6}deg`,
                }}
              >
                {conteudo}
              </div>
            );
          })
        : conteudo}
      {/* As fitas entram quando o papel assenta */}
      <div style={{ position: "absolute", inset: 0, opacity: chegada >= 1 ? 1 : interpolate(chegada, [0.75, 1], [0, 1], preso) }}>
        <Fita style={{ top: -22, left: 40, rotate: "-8deg" }} />
        <Fita style={{ bottom: -20, right: 50, rotate: "6deg" }} />
      </div>
      {children}
    </div>
  );
};

/** Os retalhos parados na mesa (os mesmos no vídeo todo), cada um andando de leve na sua profundidade */
const RETALHOS = [
  { left: -70, top: 610, largura: 560, altura: 460, giro: -9, cor: "#b58f5e", tipo: "kraft", prof: 0.5 },
  { left: 1460, top: -60, largura: 520, altura: 330, giro: 7, cor: "#ece4d0", tipo: "colunas", prof: 0.35 },
  { left: 1600, top: 720, largura: 330, altura: 270, giro: -13, cor: "destaque", tipo: "liso", prof: 0.8 },
  { left: 40, top: -40, largura: 380, altura: 220, giro: 4, cor: "#cfd6d4", tipo: "pautado", prof: 0.65 },
] as const;

const Retalhos: React.FC<{ quadro: number; destaque: string }> = ({ quadro, destaque }) => {
  const bordas = useMemo(() => RETALHOS.map((_, i) => bordaRasgada(`retalho-${i}`, 14, 3)), []);
  return (
    <>
      {RETALHOS.map((r, i) => {
        // Andam devagar com o vídeo inteiro (não volta no corte de cena): o de cima mais que o de baixo
        const dx = Math.sin(quadro / 260 + i * 1.7) * 18 * r.prof;
        const dy = Math.cos(quadro / 330 + i * 2.3) * 12 * r.prof;
        const fundo =
          r.tipo === "colunas"
            ? "repeating-linear-gradient(180deg, rgba(50,40,28,0.32) 0 6px, rgba(0,0,0,0) 6px 15px)"
            : r.tipo === "pautado"
              ? "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 22px, rgba(60,90,130,0.35) 22px 24px)"
              : r.tipo === "kraft"
                ? "repeating-linear-gradient(97deg, rgba(90,60,25,0.12) 0 3px, rgba(0,0,0,0) 3px 9px)"
                : "none";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: r.left,
              top: r.top,
              width: r.largura,
              height: r.altura,
              translate: `${dx}px ${dy}px`,
              rotate: `${r.giro}deg`,
            }}
          >
            <div style={{ position: "absolute", inset: "3%", boxShadow: "0 8px 16px rgba(40,25,10,0.35)" }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                clipPath: bordas[i],
                backgroundColor: r.cor === "destaque" ? destaque : r.cor,
                backgroundImage: fundo,
                backgroundClip: "content-box",
                padding: r.tipo === "colunas" ? "34px 30px" : 0,
                boxSizing: "border-box",
              }}
            />
          </div>
        );
      })}
    </>
  );
};

/** A mesa: o jornal velho pronto e os retalhos */
const Mesa: React.FC<{ quadro: number; destaque: string }> = ({ quadro, destaque }) => (
  <AbsoluteFill style={{ backgroundColor: "#d9cdb4" }}>
    <Img src={staticFile("texturas/jornal.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
    <Retalhos quadro={quadro} destaque={destaque} />
  </AbsoluteFill>
);

/**
 * Colagem: a imagem da cena vira um recorte de papel rasgado colado por cima do
 * da cena anterior, sobre a mesa de jornal com retalhos. Peças opcionais da cena:
 * `detalhe` (o ponto ampliado num recorte redondo, com círculo e seta à mão) e
 * `palavra` (a palavra-chave em letras recortadas, sublinhada a caneta).
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
  /** Onde está o detalhe na imagem ([x, y] em %): sai ampliado num recorte à parte */
  detalhe?: [number, number];
  /** A palavra-chave da cena, colada em letras recortadas de jornal */
  palavra?: string;
  fonte?: string;
  /** Onde está o que importa na imagem ([x, y] em %): o corte e o zoom ficam em volta dele (sem `detalhe`, que conta com o corte no meio) */
  foco?: [number, number];
  /** As imagens das cenas anteriores ([duas atrás, a anterior]): ficam por baixo, e a de duas atrás sai da mesa */
  debaixo?: RecorteDeBaixo[];
  /** Em que quadro do vídeo a cena começa: os retalhos da mesa andam com o vídeo, sem pular no corte */
  inicio?: number;
}> = ({ src, duracao, indice, filtro, destaque, ritmo, inteira, parada, detalhe, palavra, fonte, foco, debaixo = [], inicio = 0 }) => {
  const frameReal = useCurrentFrame();
  // O papel "respira" como animação quadro a quadro (stop-motion): o movimento
  // anda de 3 em 3 quadros e cada passo tem um tremido leve
  const passo = Math.floor(frameReal / 3);
  const frame = parada ? frameReal : passo * 3;
  const tremido = parada
    ? { x: 0, y: 0, giro: 0 }
    : {
        x: (random(`trem-x-${indice}-${passo}`) - 0.5) * 3,
        y: (random(`trem-y-${indice}-${passo}`) - 0.5) * 3,
        giro: (random(`trem-g-${indice}-${passo}`) - 0.5) * 0.5,
      };
  const t = (parada ? 1 : interpolate(frame, [0, duracao], [0, 1], { extrapolateRight: "clamp", easing: cinema })) * ritmo;
  // A 1ª cena do vídeo já começa colada (a miniatura do começo não sai com a mesa vazia)
  const semChegada = parada || indice === 0 || debaixo.length === 0;
  const tiras = chegaEmTiras(indice);
  const chegada = semChegada
    ? 1
    : tiras
      ? interpolate(frame, [0, CHEGADA_DAS_TIRAS], [0, 1], preso)
      : interpolate(frame, [0, CHEGADA], [0, 1], { ...preso, easing: Easing.out(Easing.back(1.25)) });
  // As peças da cena (linha, palavra, detalhe) saem nos últimos quadros: o próximo recorte chega na mesa limpa
  const pecas = parada ? 1 : interpolate(frame, [duracao - 12, duracao - 3], [1, 0], preso);
  const semente = `recorte-${indice}`;
  const pose = poseDoRecorte(indice);
  const lado = pose.lado;
  const linha = parada ? 1 : interpolate(frame, [14, 50], [0, 1], { ...preso, easing: suave });
  // As de baixo: a anterior fica na sombra e se afasta devagar; a de duas atrás é arrancada enquanto a nova chega
  const [deDuasAtras, anterior] = debaixo.length >= 2 ? debaixo : [undefined, debaixo[0]];
  const tAntes = ritmo;
  const sombraNova = interpolate(frame, [0, CHEGADA], [0, 1], preso);
  const deriva = interpolate(frame, [0, duracao], [0, 1], preso);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Mesa quadro={inicio + frame} destaque={destaque} />
      {deDuasAtras && frame < SAIDA_DO_DE_BAIXO && (
        <PapelDaColagem
          src={deDuasAtras.src}
          indice={deDuasAtras.indice}
          filtro={filtro}
          t={tAntes}
          inteira={deDuasAtras.inteira}
          foco={deDuasAtras.foco}
          sombra={1}
          deriva={1}
          saida={interpolate(frame, [2, SAIDA_DO_DE_BAIXO - 4], [0, 1], preso)}
        />
      )}
      {anterior && !parada && (
        <PapelDaColagem src={anterior.src} indice={anterior.indice} filtro={filtro} t={tAntes} inteira={anterior.inteira} foco={anterior.foco} sombra={sombraNova} deriva={deriva} />
      )}
      {/* Linha vermelha da reportagem, ligando o recorte à borda (com o detalhe ampliado, a seta faz esse papel) */}
      {!(detalhe && !inteira) && (
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: pecas }} viewBox="0 0 1920 1080">
          <path
            d={lado > 0 ? "M 1480 150 C 1690 270, 1750 520, 1850 800" : "M 440 150 C 230 270, 170 520, 70 800"}
            fill="none"
            stroke={destaque}
            strokeWidth={9}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - linha} opacity={linha > 0 ? 1 : 0}
          />
        </svg>
      )}
      <PapelDaColagem src={src} indice={indice} filtro={filtro} t={t} inteira={inteira} foco={detalhe ? undefined : foco} chegada={chegada} tremido={tremido}>
        {/* O círculo de marca-texto em volta do detalhe, desenhado à mão */}
        {detalhe && !inteira && (
          <div style={{ position: "absolute", inset: 0, opacity: pecas }}>
            <CirculoDeMarcaTexto x={detalhe[0]} y={detalhe[1]} cor={destaque} frame={frame} parada={parada} semente={semente} />
          </div>
        )}
      </PapelDaColagem>
      {detalhe && !inteira && (
        <div style={{ position: "absolute", inset: 0, opacity: pecas }}>
          <DetalheAmpliado src={src} filtro={filtro} x={detalhe[0]} y={detalhe[1]} lado={lado} pose={pose} cor={destaque} frame={frame} parada={parada} semente={semente} tremido={tremido} />
        </div>
      )}
      {palavra && (
        <div style={{ position: "absolute", inset: 0, opacity: pecas }}>
          <PalavraRecortada texto={palavra} fonte={fonte} cor={destaque} frame={frame} parada={parada} semente={semente} lado={lado} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---- Colagem: as peças que entram por cima do recorte ----

const aparece = (frame: number, de: number, parada?: boolean) =>
  parada ? 1 : interpolate(frame, [de, de + 12], [0, 1], { ...preso, easing: suave });

/** O círculo vermelho de marca-texto em volta do detalhe (no espaço do recorte, em %) */
const CirculoDeMarcaTexto: React.FC<{ x: number; y: number; cor: string; frame: number; parada?: boolean; semente: string }> = ({
  x,
  y,
  cor,
  frame,
  parada,
  semente,
}) => {
  const desenho = parada ? 1 : interpolate(frame, [24, 46], [0, 1], { ...preso, easing: suave });
  const torto = (random(`${semente}-circulo`) - 0.5) * 10;
  // Uma volta e um pouco, como quem risca rápido com caneta
  const d = "M 6 50 C 6 18, 40 4, 64 8 C 92 13, 98 44, 92 66 C 84 92, 40 98, 18 84 C 2 72, 8 40, 30 28";
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ position: "absolute", left: `${x - 9}%`, top: `${y - 13}%`, width: "18%", height: "26%", rotate: `${torto}deg`, overflow: "visible" }}
    >
      <path d={d} fill="none" stroke={cor} strokeWidth={4.5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - desenho} opacity={desenho > 0 ? 1 : 0} />
    </svg>
  );
};

/** O detalhe da imagem ampliado num recorte redondo, do lado da cena, com a seta desenhada até ele */
const DetalheAmpliado: React.FC<{
  src: string;
  filtro: string;
  x: number;
  y: number;
  lado: number;
  pose: { x: number; y: number };
  cor: string;
  frame: number;
  parada?: boolean;
  semente: string;
  tremido: { x: number; y: number; giro: number };
}> = ({ src, filtro, x, y, lado, pose, cor, frame, parada, semente, tremido }) => {
  const entrada = aparece(frame, 40, parada);
  const seta = parada ? 1 : interpolate(frame, [48, 66], [0, 1], { ...preso, easing: suave });
  if (entrada <= 0) return null;
  const giro = (random(`${semente}-lupa`) - 0.5) * 8;
  const TAMANHO = 380;
  const esquerda = lado > 0 ? 1920 - TAMANHO - 70 : 70;
  // Acima da legenda (ela fica em y 920)
  const topo = 470;
  const ZOOM = 3;
  return (
    <>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* Seta à mão: do círculo no recorte até o detalhe ampliado */}
        <path
          d={(() => {
            const cx = 1920 * CAIXA.esquerda + (x / 100) * 1920 * CAIXA.largura + pose.x;
            const cy = 1080 * CAIXA.topo + (y / 100) * 1080 * CAIXA.altura + pose.y;
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
          strokeDashoffset={1 - seta} opacity={seta > 0 ? 1 : 0}
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
        }}
      >
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: "#f3eee2", boxShadow: "0 14px 24px rgba(40,25,10,0.5)" }} />
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

/** A palavra-chave em letras recortadas de jornal (cada letra num papel, fonte e giro diferentes), sublinhada a caneta */
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
  const ultima = 14 + letras.length * 2 + 8;
  const risco = parada ? 1 : interpolate(frame, [ultima, ultima + 14], [0, 1], { ...preso, easing: suave });
  return (
    <div
      style={{
        position: "absolute",
        top: 70,
        ...(lado > 0 ? { left: 90 } : { right: 90 }),
      }}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
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
                boxShadow: "0 6px 10px rgba(40,25,10,0.4)",
              }}
            >
              {letra}
            </div>
          );
        })}
      </div>
      {/* O sublinhado a caneta, em duas passadas, embaixo das letras */}
      <svg viewBox="0 0 100 12" preserveAspectRatio="none" style={{ display: "block", width: "104%", height: 26, marginTop: 4, marginLeft: "-2%", overflow: "visible" }}>
        <path
          d="M 1 5 C 20 2, 45 7, 70 4 S 92 3, 99 5 C 70 8, 40 10, 4 9"
          fill="none"
          stroke={cor}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - risco} opacity={risco > 0 ? 1 : 0}
        />
      </svg>
    </div>
  );
};

/** O cartão do capítulo na Colagem: uma tira de papel preto rasgado, colada torta com fita, e o risco vermelho embaixo do título */
export const CapituloDeColagem: React.FC<{ titulo: string; fonte: string; peso: number; cor: string; textoClaro: string }> = ({ titulo, fonte, peso, cor, textoClaro }) => {
  const frameReal = useCurrentFrame();
  const frame = Math.floor(frameReal / 3) * 3;
  const borda = useMemo(() => bordaRasgada(`capitulo-${titulo}`, 18, 2.4), [titulo]);
  const chega = interpolate(frame, [0, 12], [0, 1], { ...preso, easing: Easing.out(Easing.back(1.4)) });
  const sai = interpolate(frame, [72, 88], [0, 1], { ...preso, easing: Easing.in(Easing.cubic) });
  const risco = interpolate(frame, [12, 30], [0, 1], { ...preso, easing: suave });
  const veu = interpolate(frameReal, [0, 10, 76, 90], [0, 1, 1, 0], preso);
  const giro = (random(`capitulo-${titulo}-giro`) - 0.5) * 3 - 1.5;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ backgroundColor: "rgba(24,16,8,0.45)", opacity: veu }} />
      <div
        style={{
          position: "relative",
          maxWidth: 1500,
          rotate: `${giro + (1 - chega) * 8 + sai * -10}deg`,
          scale: String(1 + 0.25 * (1 - chega)),
          translate: `${sai * -1600}px ${sai * 80}px`,
          opacity: chega > 0 ? 1 : 0,
        }}
      >
        <div style={{ position: "absolute", inset: "2.4%", boxShadow: `0 ${16 + 30 * (1 - chega)}px ${26 + 20 * (1 - chega)}px rgba(20,10,0,0.55)` }} />
        <div style={{ position: "absolute", inset: 0, backgroundColor: "#16120f", clipPath: borda }} />
        <div style={{ position: "relative", padding: "46px 90px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontFamily: fonte, fontWeight: peso, fontSize: 112, lineHeight: 1.02, color: textoClaro, textAlign: "center", letterSpacing: 2 }}>{titulo}</div>
          <svg viewBox="0 0 100 10" preserveAspectRatio="none" style={{ width: "70%", height: 22, marginTop: 10, overflow: "visible" }}>
            <path
              d="M 2 6 C 25 3, 55 8, 98 4"
              fill="none"
              stroke={cor}
              strokeWidth={4.5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - risco} opacity={risco > 0 ? 1 : 0}
            />
          </svg>
        </div>
        <Fita style={{ top: -26, left: -40, rotate: "-14deg", width: 170 }} />
        <Fita style={{ bottom: -24, right: -36, rotate: "-10deg", width: 170 }} />
      </div>
    </AbsoluteFill>
  );
};

/** O texto curto da cena (data, lugar) na Colagem: uma etiqueta de papel batida à máquina, presa com fita vermelha */
export const EtiquetaDeColagem: React.FC<{ texto: string; inicio: number; fim: number; fonte: string; cor: string; direita?: boolean }> = ({
  texto,
  inicio,
  fim,
  fonte,
  cor,
  direita,
}) => {
  const frameReal = useCurrentFrame();
  const frame = Math.floor(frameReal / 3) * 3;
  const borda = useMemo(() => bordaRasgada(`etiqueta-${texto}`, 16, 3), [texto]);
  const chega = interpolate(frame - inicio, [0, 12], [0, 1], { ...preso, easing: Easing.out(Easing.back(1.5)) });
  const sai = interpolate(frame, [fim - 12, fim - 3], [1, 0], preso);
  if (chega <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 96,
        ...(direita ? { right: 96 } : { left: 96 }),
        rotate: `${(direita ? 2 : -2) + (1 - chega) * (direita ? 10 : -10)}deg`,
        scale: String(0.8 + 0.2 * chega),
        opacity: Math.min(chega * 2, 1) * sai,
      }}
    >
      <div style={{ position: "absolute", inset: "3%", boxShadow: "0 8px 14px rgba(30,18,6,0.45)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#f3eee2", clipPath: borda }} />
      <div style={{ position: "relative", fontFamily: fonte, fontWeight: 700, fontSize: 46, color: "#16120f", padding: "14px 34px 12px 44px", whiteSpace: "nowrap" }}>{texto}</div>
      {/* A fita vermelha que prende a etiqueta */}
      <div style={{ position: "absolute", top: -10, bottom: -10, left: -8, width: 24, backgroundColor: cor, opacity: 0.92, rotate: "3deg" }} />
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
  /** Onde está o que importa na imagem ([x, y] em %): o corte fica em volta dele */
  foco?: [number, number];
}> = ({ src, duracao, indice, ritmo, inteira, parada, foco }) => {
  const posicao = foco && !inteira ? `${foco[0]}% ${foco[1]}%` : undefined;
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
              objectPosition: posicao,
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
              objectPosition: posicao,
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
