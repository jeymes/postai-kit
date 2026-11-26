import { loadFont as bebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as caveat } from "@remotion/google-fonts/Caveat";
import { loadFont as cinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as cormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as garamond } from "@remotion/google-fonts/EBGaramond";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as lora } from "@remotion/google-fonts/Lora";
import { loadFont as specialElite } from "@remotion/google-fonts/SpecialElite";
import React from "react";
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame } from "remotion";
import { z } from "zod";
import { cores, fontes } from "../nucleo/marca";
import { FundoDeJornal } from "../moldes/documentario/apresentacoes";

// Os modelos do Canal dark (molde Documentario): cada um muda o tratamento da
// imagem (filtro e texturas por cima), as letras, as cores e o ritmo. O dono
// escolhe na tela Canal dark > Configurar > Estilo visual (o Postaí guarda e o
// npm run canal grava em canais/dark/estilo-narrado.json); a cor e a letra
// podem mudar à parte. O que o dono pedir e o kit não fizer, a equipe anota com
// npm run limite (o kit aprende depois). Espelha functions/src/animacaoCore.ts.

export const MODELOS_DO_NARRADO = ["classico", "pergaminho", "misterio", "pb", "dormir", "colagem", "lousa", "evidencias", "infografico"] as const;
export type ModeloDoNarrado = (typeof MODELOS_DO_NARRADO)[number];

const latino = { subsets: ["latin" as const] };
// A letra do Infográfico (algarismos de mesma largura): só ele carrega
let interCarregada: string | null = null;
const interDoInfografico = () => (interCarregada ??= inter("normal", { ...latino, weights: ["400", "500", "600", "700", "800"] }).fontFamily);
// As letras que o dono pode escolher (sem escolha: a do modelo)
const LETRAS = {
  marca: null,
  antiga: () => cinzel("normal", latino).fontFamily,
  classica: () => garamond("normal", latino).fontFamily,
  maquina: () => specialElite("normal", latino).fontFamily,
  moderna: () => bebas("normal", latino).fontFamily,
  elegante: () => cormorant("normal", latino).fontFamily,
  manuscrita: () => caveat("normal", latino).fontFamily,
  suave: () => lora("normal", latino).fontFamily,
} as const;
export type LetraDoNarrado = keyof typeof LETRAS;
export const LETRAS_DO_NARRADO = Object.keys(LETRAS) as LetraDoNarrado[];

export const estiloDoNarradoSchema = z
  .object({
    modelo: z.enum(MODELOS_DO_NARRADO).default("classico"),
    cor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional()
      .describe("Cor de destaque (#RRGGBB): a linha do capítulo, a palavra falada, o destaque da capa"),
    letra: z.enum(LETRAS_DO_NARRADO as [LetraDoNarrado, ...LetraDoNarrado[]]).optional(),
    fundo: z
      .enum(["escuro", "claro"])
      .optional()
      .describe("Só no Infográfico animado: fundo escuro (azul-petróleo, o padrão) ou claro (creme)"),
  })
  .optional()
  .describe("O modelo visual do Canal dark (o npm run renderizar põe o do canal)");
export type EstiloDoNarrado = z.infer<typeof estiloDoNarradoSchema>;

const fontesCarregadas = new Map<LetraDoNarrado, string>();
/** A família de uma letra do kit (carrega na primeira vez); null na "marca" */
export const fonteDoKit = (letra: LetraDoNarrado) => fonteDa(letra);
function fonteDa(letra: LetraDoNarrado): string | null {
  const carregar = LETRAS[letra];
  if (!carregar) return null;
  const ja = fontesCarregadas.get(letra);
  if (ja) return ja;
  const familia = carregar();
  fontesCarregadas.set(letra, familia);
  return familia;
}

// ---- Texturas por cima da imagem (desenhadas pelo kit, sem arquivo) ----

/** Grão de filme que muda a cada quadro */
/**
 * As texturas desenhadas UMA vez (npx remotion still TexturaDoNarrado, ver
 * public/texturas/LEIA.md): o papel velho e 6 quadros de granulado. Antes o
 * filtro de ruído do navegador redesenhava tudo a cada quadro e o Pergaminho
 * renderizava 2,1x mais devagar que o Clássico (medido em 22/11/2026).
 */
export const TexturaDoNarrado: React.FC<{ tipo: "papel" | "grao" | "jornal" | "cortica"; semente: number }> = ({ tipo, semente }) =>
  // O jornal velho da mesa da Colagem (public/texturas/jornal.jpg)
  tipo === "jornal" ? (
    <FundoDeJornal />
  ) : tipo === "cortica" ? (
    <Cortica />
  ) : (
  <svg width="100%" height="100%">
    {tipo === "papel" ? (
      <filter id="papel-velho">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="4" seed="7" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.86  0 0 0 0 0.72  0 0 0 0 0.48  0 0 0 0.9 0" />
      </filter>
    ) : (
      <filter id="grao">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={semente} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    )}
    <rect width="100%" height="100%" filter={`url(#${tipo === "papel" ? "papel-velho" : "grao"})`} />
  </svg>
  );

/**
 * A cortiça escura do Quadro de evidências (public/texturas/cortica.jpg, um
 * ladrilho de 1024x1024 que emenda sem costura): grânulos de cortiça em cinza,
 * sem cor (no quadro, só o vermelho tem cor).
 */
const Cortica: React.FC = () => (
  <svg width="100%" height="100%">
    <filter id="cortica-graos" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="3" seed="11" stitchTiles="stitch" result="manchas" />
      <feTurbulence type="fractalNoise" baseFrequency="0.38" numOctaves="3" seed="4" stitchTiles="stitch" result="graos" />
      <feComposite in="graos" in2="manchas" operator="arithmetic" k1="0" k2="0.7" k3="0.45" k4="-0.15" />
      <feColorMatrix type="matrix" values="0.15 0 0 0 0.02  0.147 0 0 0 0.019  0.144 0 0 0 0.018  0 0 0 0 1" />
    </filter>
    <rect width="100%" height="100%" filter="url(#cortica-graos)" />
  </svg>
);

// O granulado: 6 quadros prontos (public/texturas/grao-N.webp) que se revezam.
// Os 6 ficam montados e só o do quadro aparece: nenhum carrega no meio do vídeo
const Grao: React.FC<{ forca: number }> = ({ forca }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: forca, mixBlendMode: "overlay", pointerEvents: "none" }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Img
          key={i}
          src={staticFile(`texturas/grao-${i}.webp`)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: frame % 6 === i ? 1 : 0 }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Bordas escurecidas (a "vinheta" do cinema) */
const Vinheta: React.FC<{ cor: string; forca: number }> = ({ cor, forca }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, ${cor} 100%)`,
      opacity: forca,
      pointerEvents: "none",
    }}
  />
);

/** Papel velho: manchas e fibras em sépia, com as bordas como papel queimado */
const Papel: React.FC = () => (
  <>
    <AbsoluteFill style={{ opacity: 0.45, mixBlendMode: "multiply", pointerEvents: "none" }}>
      {/* O papel velho pronto (public/texturas/papel.webp): é o mesmo em todo quadro */}
      <Img src={staticFile("texturas/papel.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
    <Vinheta cor="rgba(48,26,8,0.95)" forca={0.9} />
  </>
);

/** Riscos e poeira de filme antigo, que aparecem e somem */
const Riscos: React.FC = () => {
  const frame = useCurrentFrame();
  const riscos = [0, 1, 2].filter((i) => random(`r-${frame}-${i}`) > 0.55);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {riscos.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${random(`x-${frame}-${i}`) * 100}%`,
            width: 2,
            backgroundColor: "rgba(255,255,255,0.35)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ---- A aparência de cada modelo ----

export interface Aparencia {
  modelo: ModeloDoNarrado;
  /** Filtro da imagem (CSS) */
  filtro: string;
  /** O que vai por cima da imagem (texturas, vinheta) */
  Camadas: React.FC;
  fonteTitulo: string;
  fonteTexto: string;
  /** Peso do título: letras antigas e de máquina ficam finas */
  pesoTitulo: number;
  destaque: string;
  textoNoDestaque: string;
  /** Cor das letras do capítulo e do encerramento */
  textoClaro: string;
  /** Fundo do cartão de capítulo e do encerramento */
  fundo: string;
  /** Quanto a câmera anda (1 = o de sempre; "Para dormir" anda devagar) */
  ritmo: number;
  /** Quadros da mistura entre uma imagem e outra */
  mistura: number;
  /** O texto treme de leve (mistério) */
  tremor: boolean;
  /** Legenda: tamanho e se a palavra falada ganha a etiqueta colorida */
  legenda: { tamanho: number; caixa: boolean; noite: boolean };
  /** Como a imagem aparece: em tela cheia, recortada em papel sobre jornal (Colagem), desenhada a giz (Lousa), presa num quadro de evidências ou num infográfico (os gráficos da cena) */
  apresentacao: "tela" | "recorte" | "giz" | "quadro" | "infografico";
}

const BASE = {
  pesoTitulo: 800,
  textoClaro: "#ffffff",
  fundo: "#0d0b10",
  ritmo: 1,
  mistura: 18,
  tremor: false,
  legenda: { tamanho: 44, caixa: true, noite: false },
  apresentacao: "tela" as const,
};

export function aparenciaDo(estilo?: EstiloDoNarrado): Aparencia {
  const modelo = estilo?.modelo ?? "classico";
  const doModelo = ((): Omit<Aparencia, "modelo"> => {
    switch (modelo) {
      case "pergaminho":
        return {
          ...BASE,
          filtro: "sepia(0.8) contrast(1.05) brightness(0.93) saturate(0.85)",
          Camadas: () => (
            <>
              <Papel />
              <Grao forca={0.18} />
            </>
          ),
          fonteTitulo: fonteDa("antiga") ?? fontes.titulo,
          fonteTexto: fonteDa("classica") ?? fontes.texto,
          pesoTitulo: 700,
          destaque: "#d4a64a",
          textoNoDestaque: "#1d1206",
          textoClaro: "#f6e7c8",
          fundo: "#1a1006",
          legenda: { tamanho: 46, caixa: false, noite: true },
        };
      case "misterio":
        return {
          ...BASE,
          filtro: "contrast(1.3) saturate(0.55) brightness(0.82) hue-rotate(-8deg)",
          Camadas: () => (
            <>
              <AbsoluteFill style={{ backgroundColor: "#12324f", mixBlendMode: "soft-light", opacity: 0.55, pointerEvents: "none" }} />
              <Vinheta cor="rgba(0,0,0,0.98)" forca={1} />
              <Grao forca={0.22} />
            </>
          ),
          fonteTitulo: fonteDa("maquina") ?? fontes.titulo,
          fonteTexto: fonteDa("maquina") ?? fontes.texto,
          pesoTitulo: 400,
          destaque: "#d62828",
          textoNoDestaque: "#ffffff",
          fundo: "#050608",
          tremor: true,
          legenda: { tamanho: 44, caixa: false, noite: true },
        };
      case "pb":
        return {
          ...BASE,
          filtro: "grayscale(1) contrast(1.18) brightness(0.95)",
          Camadas: () => (
            <>
              <Vinheta cor="rgba(0,0,0,0.85)" forca={0.9} />
              <Grao forca={0.3} />
              <Riscos />
            </>
          ),
          fonteTitulo: fonteDa("elegante") ?? fontes.titulo,
          fonteTexto: fonteDa("classica") ?? fontes.texto,
          pesoTitulo: 700,
          destaque: "#e8d6a8",
          textoNoDestaque: "#111111",
          fundo: "#000000",
          legenda: { tamanho: 44, caixa: false, noite: true },
        };
      case "dormir":
        return {
          ...BASE,
          filtro: "brightness(0.68) saturate(0.7) contrast(0.95)",
          Camadas: () => <Vinheta cor="rgba(6,10,24,0.95)" forca={0.85} />,
          fonteTitulo: fonteDa("suave") ?? fontes.titulo,
          fonteTexto: fonteDa("suave") ?? fontes.texto,
          pesoTitulo: 500,
          destaque: "#9fb4d9",
          textoNoDestaque: "#0b1020",
          textoClaro: "#dfe6f3",
          fundo: "#060a18",
          ritmo: 0.45,
          mistura: 54,
          legenda: { tamanho: 36, caixa: false, noite: true },
        };
      case "colagem":
        // Colagem de explicação: recortes de papel rasgado colados um por cima do outro numa
        // mesa de jornal, foto impressa (um pouco apagada, com retícula) e o vermelho só nos rabiscos
        return {
          ...BASE,
          filtro: "contrast(1.12) saturate(0.72) sepia(0.14) brightness(1.03)",
          Camadas: () => <Grao forca={0.1} />,
          fonteTitulo: fonteDa("moderna") ?? fontes.titulo,
          fonteTexto: fonteDa("maquina") ?? fontes.texto,
          pesoTitulo: 400,
          destaque: "#c8102e",
          textoNoDestaque: "#ffffff",
          textoClaro: "#fbf6ea",
          fundo: "#1c1712",
          legenda: { tamanho: 44, caixa: true, noite: false },
          apresentacao: "recorte",
        };
      case "lousa":
        // Quadro-negro: a imagem vira um desenho a giz, e as letras parecem escritas à mão
        return {
          ...BASE,
          filtro: "none",
          Camadas: () => <Grao forca={0.08} />,
          fonteTitulo: fonteDa("manuscrita") ?? fontes.titulo,
          fonteTexto: fonteDa("manuscrita") ?? fontes.texto,
          pesoTitulo: 700,
          destaque: "#f2e394",
          textoNoDestaque: "#1f2b25",
          textoClaro: "#f4f1e6",
          fundo: "#1f2b25",
          legenda: { tamanho: 52, caixa: false, noite: true },
          apresentacao: "giz",
        };
      case "evidencias":
        // Quadro de evidências (série investigativa): um quadro de cortiça só, com fotos em preto
        // e branco presas com alfinete; o vermelho só no que importa (barbante, círculo, carimbo)
        return {
          ...BASE,
          filtro: "grayscale(1) contrast(1.16) brightness(0.97)",
          Camadas: () => (
            <>
              <Vinheta cor="rgba(0,0,0,0.9)" forca={0.8} />
              <Grao forca={0.26} />
            </>
          ),
          fonteTitulo: fonteDa("moderna") ?? fontes.titulo,
          fonteTexto: fonteDa("maquina") ?? fontes.texto,
          pesoTitulo: 400,
          destaque: "#d0312d",
          textoNoDestaque: "#ffffff",
          textoClaro: "#f1eee8",
          fundo: "#141312",
          legenda: { tamanho: 44, caixa: false, noite: true },
          apresentacao: "quadro",
        };
      case "infografico":
        // Infográfico animado: gráficos, números e contas que se montam no tempo da fala,
        // num fundo limpo com grade; a cor de destaque só no dado que importa
        return {
          ...BASE,
          filtro: "none",
          Camadas: () => null,
          fonteTitulo: interDoInfografico(),
          fonteTexto: interDoInfografico(),
          pesoTitulo: 800,
          destaque: "#f5b841",
          textoNoDestaque: "#111111",
          textoClaro: "#eef3f4",
          fundo: "#0d1b21",
          mistura: 22,
          legenda: { tamanho: 44, caixa: false, noite: true },
          apresentacao: "infografico",
        };
      default:
        return {
          ...BASE,
          filtro: "none",
          Camadas: () => null,
          fonteTitulo: fontes.titulo,
          fonteTexto: fontes.texto,
          destaque: cores.destaque,
          textoNoDestaque: cores.textoNoDestaque,
        };
    }
  })();
  // A letra e a cor que o dono escolheu valem mais que as do modelo
  const letra = estilo?.letra ? fonteDa(estilo.letra) : null;
  return {
    modelo,
    ...doModelo,
    ...(letra ? { fonteTitulo: letra, fonteTexto: letra } : {}),
    ...(estilo?.letra === "marca" ? { fonteTitulo: fontes.titulo, fonteTexto: fontes.texto } : {}),
    ...(estilo?.cor ? { destaque: estilo.cor, textoNoDestaque: textoSobre(estilo.cor) } : {}),
  };
}

/** Preto ou branco, o que ler melhor sobre a cor */
function textoSobre(cor: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111111" : "#ffffff";
}
