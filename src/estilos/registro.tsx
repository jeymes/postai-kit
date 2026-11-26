import React from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { FundoNoite, FundoPapel, VeuDeNoite } from "../componentes/cenarios/FundoNoite";
import { Boneco, type Desenho, type FormaDaBoca, type Momento, type Palavra, type Visual } from "../componentes/personagens/Boneco";
import { Palito } from "../componentes/personagens/Palito";
import { Liso } from "../componentes/personagens/Liso";
import { FundoLousa, FundoNeon, FundoQuadrinhos } from "../componentes/cenarios/FundosDosEstilos";
import { CENARIOS_SEM_HISTORIA } from "../componentes/cenarios/Cenarios";
import { FiltroDeGiz, FiltroDeMassinha, FiltroDeNeon, FiltroDeQuadrinhos } from "./filtros";

// A cor de neon do personagem: o mesmo tom, saturado e claro, para brilhar no escuro
const neonDe = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  }
  return `hsl(${Math.round(h * 60 + 360) % 360}, 100%, 64%)`;
};

// Clareia uma cor (o giz é a cor do personagem, bem clara)
const clarear = (hex: string, quanto: number) => {
  const n = parseInt(hex.slice(1), 16);
  const canal = (d: number) => Math.round(((n >> d) & 255) + (255 - ((n >> d) & 255)) * quanto);
  return `rgb(${canal(16)}, ${canal(8)}, ${canal(0)})`;
};

// Registro dos estilos visuais do canal animado, em um lugar só. Espelha o
// ESTILOS_VISUAIS do Postaí (functions/src/animacaoCore.ts). Para um estilo
// novo (ex.: "cartoon-biblico", "silhueta"): desenhe o personagem num
// componente com as mesmas entradas do Boneco, ponha aqui uma linha com ele, o
// fundo e o tamanho da legenda, e acrescente o nome no Postaí. O Conversa, a
// capa, a ficha e as prévias leem daqui.

export const FUNDOS = ["claro", "noite"] as const;
export type Fundo = (typeof FUNDOS)[number];

export type PropsDoPersonagem = {
  visual: Visual;
  desenho?: Desenho;
  momentos: Momento[];
  palavras: Palavra[];
  boca?: FormaDaBoca[];
  altura: number;
  espelhar?: boolean;
  semente?: number;
  style?: React.CSSProperties;
};

type Estilo = {
  nome: string;
  /** Desenha uma pessoa do elenco. `noite`: o fundo do canal é o escuro */
  Personagem: React.FC<PropsDoPersonagem & { noite: boolean }>;
  /** O fundo atrás de tudo. `Cenario`: o cenário do roteiro; `cenario`: o nome dele */
  Fundo: React.FC<{ fundo: Fundo; Cenario: React.FC; cenario?: string }>;
  /** Desenha uma camada de cenário no jeito do estilo */
  Camada: React.FC<{ fundo: Fundo; children: React.ReactNode }>;
  /** A cama ou o sofá da frente (cobrem as pernas: precisam ser opacos). Sem isso: a Camada */
  Frente?: React.FC<{ fundo: Fundo; children: React.ReactNode }>;
  /** Tamanho da legenda (o palito usa legenda grande) */
  legenda: number;
  /** O fundo deste estilo é escuro (legenda clara, hora clara)? Sem isso: só no fundo noite */
  escuro?: (fundo: Fundo) => boolean;
  /** Grupo na galeria do Postaí */
  grupo: "bonecos" | "traco" | "hq";
};

// Os cenários em que a história acontece (com móveis): nos estilos de traço eles
// aparecem desenhados no traço do estilo; nos outros cenários (ateliê,
// escritório, café), os estilos de traço usam só o fundo deles
export const CENARIOS_DA_HISTORIA = ["quarto", "sala", "cozinha", "banheiro", "garagem", "carro"];
/** O cenário tem os móveis da história? (os do kit acima e todos os criados pela equipe) */
const temMoveis = (cenario?: string) => Boolean(cenario) && !CENARIOS_SEM_HISTORIA.includes(cenario ?? "");

const Normal: Estilo["Camada"] = ({ children }) => <>{children}</>;

// Nos estilos sem contorno (liso, massinha), o cenário perde o traço grosso do
// chapado: o contorno fica suave, para o vídeo ter um estilo só
const Suave: Estilo["Camada"] = ({ children }) => (
  <AbsoluteFill className="cenario-suave">
    <style>{`.cenario-suave [stroke="#2B2340"] { stroke: rgba(30, 26, 45, 0.22); }`}</style>
    {children}
  </AbsoluteFill>
);

// Nos estilos de traço, o cenário vira desenho de linha: as cores quase somem e o
// contorno fica na cor (e com o filtro) do estilo
// `preenchimento`: na cama e no sofá da frente, o miolo fica opaco na cor do
// fundo (cobre as pernas de quem está sentado)
const emTraco = (classe: string, cor: string, filtro?: string, preenchimento?: string): Estilo["Camada"] => {
  const miolo = preenchimento ? `fill: ${preenchimento}; fill-opacity: 1;` : "fill-opacity: 0.1;";
  const Camada: Estilo["Camada"] = ({ children }) => (
    <AbsoluteFill className={classe} style={filtro ? { filter: filtro } : undefined}>
      <style>{`.${classe} svg * { ${miolo} } .${classe} [stroke="#2B2340"] { stroke: ${cor}; }`}</style>
      {children}
    </AbsoluteFill>
  );
  return Camada;
};
const TracoClaro = emTraco("cenario-traco-claro", "#2B2340");
const TracoNoite = emTraco("cenario-traco-noite", "#7F8FD6");
const TracoGiz = emTraco("cenario-traco-giz", "rgba(244,241,232,0.8)", "url(#estilo-giz)");
const TracoNeon = emTraco("cenario-traco-neon", "#22E1FF", "url(#estilo-neon)");
const FrenteClara = emTraco("frente-traco-claro", "#2B2340", undefined, "#F6F3EC");
const FrenteNoite = emTraco("frente-traco-noite", "#7F8FD6", undefined, "#131A3A");
const FrenteGiz: Estilo["Camada"] = ({ fundo, children }) => {
  const Camada = emTraco(`frente-traco-giz-${fundo}`, "rgba(244,241,232,0.8)", "url(#estilo-giz)", fundo === "noite" ? "#1D2124" : "#2F4A3E");
  return <Camada fundo={fundo}>{children}</Camada>;
};
const FrenteNeon: Estilo["Camada"] = ({ fundo, children }) => {
  const Camada = emTraco(`frente-traco-neon-${fundo}`, "#22E1FF", "url(#estilo-neon)", fundo === "noite" ? "#0A0614" : "#1B1046");
  return <Camada fundo={fundo}>{children}</Camada>;
};

export const ESTILOS = {
  chapado: {
    nome: "Chapado",
    // O desenho próprio continua valendo no chapado, como sempre
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- o chapado não muda à noite
    Personagem: ({ noite: _noite, ...props }) => <Boneco {...props} />,
    Fundo: ({ fundo, Cenario }) => (
      <>
        <Cenario />
        {fundo === "noite" && <VeuDeNoite />}
      </>
    ),
    Camada: Normal,
    legenda: 68,
    grupo: "bonecos",
  },
  palito: {
    nome: "Palito",
    Personagem: ({ desenho, ...props }) => (desenho ? <Boneco desenho={desenho} {...props} /> : <Palito {...props} />),
    Fundo: ({ fundo, Cenario, cenario }) => {
      const daHistoria = temMoveis(cenario);
      const Camada = fundo === "noite" ? TracoNoite : TracoClaro;
      return (
        <>
          {fundo === "noite" ? <FundoNoite janela={!daHistoria} /> : <FundoPapel />}
          {daHistoria && (
            <Camada fundo={fundo}>
              <Cenario />
            </Camada>
          )}
        </>
      );
    },
    Camada: ({ fundo, children }) => (fundo === "noite" ? <TracoNoite fundo={fundo}>{children}</TracoNoite> : <TracoClaro fundo={fundo}>{children}</TracoClaro>),
    Frente: ({ fundo, children }) => (fundo === "noite" ? <FrenteNoite fundo={fundo}>{children}</FrenteNoite> : <FrenteClara fundo={fundo}>{children}</FrenteClara>),
    legenda: 84,
    grupo: "traco",
  },
  liso: {
    nome: "Liso",
    // Gente em formas lisas, sem contorno (o jeito dos storyboards)
    Personagem: ({ desenho, ...props }) => (desenho ? <Boneco desenho={desenho} {...props} /> : <Liso {...props} />),
    Fundo: ({ fundo, Cenario }) => (
      <>
        <Suave fundo={fundo}>
          <Cenario />
        </Suave>
        {fundo === "noite" && <VeuDeNoite />}
      </>
    ),
    Camada: Suave,
    legenda: 76,
    grupo: "bonecos",
  },
  giz: {
    nome: "Quadro-negro",
    // Bonecos de traço feitos a giz: a cor do personagem bem clara, o traço tremido
    Personagem: ({ desenho, visual, style, ...props }) =>
      desenho ? (
        <Boneco desenho={desenho} visual={visual} style={style} {...props} />
      ) : (
        <Palito
          {...props}
          visual={{ ...visual, roupa: clarear(visual.roupa, 0.72) }}
          cores={{ cabeca: "transparent", rosto: "#F4F1E8" }}
          style={{ ...style, filter: "url(#estilo-giz)" }}
        />
      ),
    Fundo: ({ fundo, Cenario, cenario }) => (
      <>
        <FiltroDeGiz />
        <FundoLousa noite={fundo === "noite"} />
        {temMoveis(cenario) && (
          <TracoGiz fundo={fundo}>
            <Cenario />
          </TracoGiz>
        )}
      </>
    ),
    Camada: TracoGiz,
    Frente: FrenteGiz,
    legenda: 80,
    escuro: () => true,
    grupo: "traco",
  },
  neon: {
    nome: "Traço que brilha",
    // Bonecos de traço em neon, no escuro
    Personagem: ({ desenho, visual, style, ...props }) =>
      desenho ? (
        <Boneco desenho={desenho} visual={visual} style={style} {...props} />
      ) : (
        <Palito
          {...props}
          visual={{ ...visual, roupa: neonDe(visual.roupa) }}
          cores={{ cabeca: "transparent", rosto: "#FFFFFF" }}
          style={{ ...style, filter: "url(#estilo-neon)" }}
        />
      ),
    Fundo: ({ fundo, Cenario, cenario }) => (
      <>
        <FiltroDeNeon />
        <FundoNeon noite={fundo === "noite"} />
        {temMoveis(cenario) && (
          <TracoNeon fundo={fundo}>
            <Cenario />
          </TracoNeon>
        )}
      </>
    ),
    Camada: TracoNeon,
    Frente: FrenteNeon,
    legenda: 80,
    escuro: () => true,
    grupo: "traco",
  },
  quadrinhos: {
    nome: "Quadrinhos",
    // Gente lisa com contorno preto grosso, em fundo de retícula e explosão
    Personagem: ({ desenho, style, ...props }) =>
      desenho ? (
        <Boneco desenho={desenho} style={style} {...props} />
      ) : (
        <Liso {...props} style={{ ...style, filter: "url(#estilo-quadrinhos)" }} />
      ),
    // Nos cenários da história, o cenário normal (o contorno já é de gibi); nos
    // outros, a retícula com a explosão
    Fundo: ({ fundo, Cenario, cenario }) => (
      <>
        <FiltroDeQuadrinhos />
        {temMoveis(cenario) ? (
          <>
            <Cenario />
            {fundo === "noite" && <VeuDeNoite />}
          </>
        ) : (
          <FundoQuadrinhos noite={fundo === "noite"} />
        )}
      </>
    ),
    Camada: Normal,
    legenda: 84,
    grupo: "hq",
  },
  massinha: {
    nome: "Massinha",
    // Gente de massinha: volume macio, luz de cima e textura de dedo
    Personagem: ({ desenho, style, ...props }) =>
      desenho ? (
        <Boneco desenho={desenho} style={style} {...props} />
      ) : (
        <Liso {...props} style={{ ...style, filter: "url(#estilo-massinha)" }} />
      ),
    Fundo: ({ fundo, Cenario }) => (
      <>
        <FiltroDeMassinha />
        <Suave fundo={fundo}>
          <Cenario />
        </Suave>
        {fundo === "noite" && <VeuDeNoite />}
      </>
    ),
    Camada: Suave,
    legenda: 76,
    grupo: "bonecos",
  },
} satisfies Record<string, Estilo>;

export type Modelo = keyof typeof ESTILOS;
export const MODELOS = Object.keys(ESTILOS) as [Modelo, ...Modelo[]];

export const estiloSchema = z
  .object({ modelo: z.enum(MODELOS).default("chapado"), fundo: z.enum(FUNDOS).default("claro") })
  .describe("Estilo visual do canal (npm run elenco põe o do canal). Sem ele: chapado, claro");
export type EstiloDaPeca = z.infer<typeof estiloSchema>;

export const ESTILO_PADRAO: EstiloDaPeca = { modelo: "chapado", fundo: "claro" };

export const estiloDe = (estilo?: Partial<EstiloDaPeca>): { modelo: Modelo; fundo: Fundo; def: Estilo; escuro: boolean } => {
  const modelo = estilo?.modelo && estilo.modelo in ESTILOS ? estilo.modelo : ESTILO_PADRAO.modelo;
  const fundo = estilo?.fundo === "noite" ? "noite" : "claro";
  const def: Estilo = ESTILOS[modelo];
  return { modelo, fundo, def, escuro: def.escuro?.(fundo) ?? fundo === "noite" };
};
