// Molde Silhueta: o formato do roteiro (sem React: o molde, o conferir e a
// capa usam o mesmo schema). Vídeo curto vertical contado por um narrador
// sobre paisagens em silhueta de 2 a 3 cores, com câmera lenta, clima por
// cena, título serifado com uma palavra dourada e mini-diagramas na palavra
// dita. A última fala devolve a pergunta do título (o loop).

import { z } from "zod";

export const CENARIOS_DA_SILHUETA = ["calvario", "estrada", "mar", "monte", "deserto", "cidade-antiga", "jardim"] as const;
export const CLIMAS_DA_SILHUETA = ["amanhecer", "entardecer", "noite", "tempestade", "nevoa", "luz"] as const;
export const FIGURAS_DA_SILHUETA = ["de-pe", "ajoelhada", "bracos-abertos", "caminhando", "sentada", "prostrada", "nenhuma"] as const;
/** As poses que a figura toma na palavra (gestos) */
export const POSES_DA_FIGURA = ["de-pe", "ajoelhada", "bracos-abertos", "caminhando", "sentada", "prostrada"] as const;
export type PoseDaFigura = (typeof POSES_DA_FIGURA)[number];
export const CAMERAS_DA_SILHUETA = ["zoom-in", "zoom-out", "pan-esquerda", "pan-direita", "parada"] as const;
export const PALETAS_DA_SILHUETA = ["sepia", "noite-azul", "verde-dourado", "marca"] as const;

export type CenarioDaSilhueta = (typeof CENARIOS_DA_SILHUETA)[number];
export type ClimaDaSilhueta = (typeof CLIMAS_DA_SILHUETA)[number];
export type FiguraDaSilhueta = (typeof FIGURAS_DA_SILHUETA)[number];
export type CameraDaSilhueta = (typeof CAMERAS_DA_SILHUETA)[number];
export type PaletaDaSilhueta = (typeof PALETAS_DA_SILHUETA)[number];

/** Limites do formato (o conferir usa os mesmos) */
export const LIMITES_DA_SILHUETA = {
  cenasMin: 6,
  cenasMax: 10,
  palavrasPorFala: 24,
  segundosMin: 35,
  segundosMax: 60,
  titulo: 60,
  sobretitulo: 32,
  textoDoDiagrama: 22,
  itemDaLista: 28,
} as const;

const palavra = z.string().trim().min(1).max(40);

export const diagramaSchema = z
  .object({
    rotulo: z.string().max(LIMITES_DA_SILHUETA.sobretitulo).optional().describe('Linha pequena em versal acima do diagrama (ex.: "Marcos 10:50", "antes e depois")'),
    em: palavra.optional().describe("A palavra da fala em que o diagrama aparece (sem ela, no começo da fala)"),
    ate: palavra.optional().describe("A palavra da fala em que ele sai (sem ela, no fim da cena)"),
    seta: z
      .object({
        de: z.string().min(1).max(LIMITES_DA_SILHUETA.textoDoDiagrama),
        para: z.string().min(1).max(LIMITES_DA_SILHUETA.textoDoDiagrama).describe("Sai em dourado; aparece quando a fala diz a primeira palavra dele"),
      })
      .optional()
      .describe("A → B: uma virada (à beira do caminho → no caminho, medo → paz)"),
    lista: z
      .array(z.string().min(1).max(LIMITES_DA_SILHUETA.itemDaLista))
      .min(2)
      .max(3)
      .optional()
      .describe("01 / 02 / 03: cada item aparece quando a fala diz a primeira palavra dele"),
    versus: z
      .object({
        isto: z.string().min(1).max(LIMITES_DA_SILHUETA.textoDoDiagrama),
        aquilo: z.string().min(1).max(LIMITES_DA_SILHUETA.textoDoDiagrama).describe("Sai em dourado"),
      })
      .optional()
      .describe('"isto | aquilo": o que pediu | o que recebeu'),
  })
  .refine((d) => [d.seta, d.lista, d.versus].filter(Boolean).length === 1, { message: "o diagrama tem exatamente um de: seta, lista ou versus" });

export type DiagramaDaSilhueta = z.infer<typeof diagramaSchema>;

const narracaoSchema = z
  .object({
    audio: z.string(),
    duracaoSeg: z.number(),
    legendas: z.array(z.object({ texto: z.string(), inicioMs: z.number(), fimMs: z.number(), fimDeFrase: z.boolean().optional() })),
    chave: z.string().optional(),
  })
  .passthrough()
  .describe("Preenchido pelo npm run narrar (não editar à mão)");

export const cenaDaSilhuetaSchema = z.object({
  fala: z.string().min(1).describe("O que o narrador diz nesta cena (até 24 palavras)"),
  cenario: z.enum(CENARIOS_DA_SILHUETA).describe("A paisagem em silhueta"),
  clima: z.enum(CLIMAS_DA_SILHUETA).optional().describe("O céu desta cena (sem isso, o da paleta): muda devagar de uma cena para a outra"),
  figura: z
    .enum(FIGURAS_DA_SILHUETA)
    .optional()
    .describe('Uma pessoa pequena em silhueta, parte da paisagem (sem isso, nenhuma). "prostrada": de joelhos, curvada, com as mãos no chão'),
  gestos: z
    .array(z.object({ em: palavra.describe("A palavra da fala em que a pessoa muda de pose"), pose: z.enum(POSES_DA_FIGURA) }))
    .max(3)
    .optional()
    .describe('A figura muda de pose na palavra dita, com transição suave (ex.: { "em": "ajoelhou", "pose": "ajoelhada" }). Começa na pose de "figura"'),
  variacao: z.number().int().min(1).max(3).optional().describe("Qual das composições do cenário (1 a 3); sem isso, cada vez que o cenário volta sai outra"),
  camera: z.enum(CAMERAS_DA_SILHUETA).optional().describe("O movimento lento da câmera (sem isso, alterna zoom e pan sozinho)"),
  diagrama: diagramaSchema.optional(),
  destaque: z.array(z.string()).default([]).describe("Palavras que saem sempre douradas na legenda (além da palavra falada)"),
  narracao: narracaoSchema.optional(),
});

export type CenaDaSilhueta = z.infer<typeof cenaDaSilhuetaSchema>;

export const silhuetaSchema = z.object({
  titulo: z.string().min(1).max(LIMITES_DA_SILHUETA.titulo).describe("A pergunta do vídeo (a mesma da primeira fala e da última)"),
  sobretitulo: z.string().max(LIMITES_DA_SILHUETA.sobretitulo).optional().describe('Linha pequena em versal acima do título (ex.: "Marcos 10", "Salmo 23")'),
  destaqueDoTitulo: z.string().optional().describe("A palavra (ou as duas) do título em itálico dourado, sublinhada"),
  paleta: z.enum(PALETAS_DA_SILHUETA).default("sepia").describe('"marca" usa a cor de destaque da marca'),
  cenas: z.array(cenaDaSilhuetaSchema).min(1).max(12),
  tituloNoFim: z.boolean().default(true).describe("O título volta grande na última cena (o loop)"),
  voz: z.string().default("masculina-12").describe("A voz do narrador (id de src/componentes/personagens/vozes.ts): grave, de contador de histórias"),
  velocidade: z.number().min(0.7).max(1.4).default(1),
  pronuncia: z.record(z.string(), z.string()).optional(),
  musica: z.string().optional().describe("musica/calma-reflexao.mp3, calma-esperanca.mp3 ou calma-drama.mp3"),
  volumeMusica: z.number().min(0).max(0.5).default(0.1),
  ctaInicial: z.string().max(36).optional().describe("Chamada curta embaixo do título nos primeiros segundos"),
  final: z
    .object({
      frase: z.string().max(180),
      linha: z.string().max(60).optional(),
      botao: z.string().max(30).optional(),
    })
    .optional()
    .describe("Frase na luz (só se o dono escolheu terminar na luz)"),
  ctaFinal: z.string().max(80).optional().describe("A chamada do cartão do fim (sem @ e sem link na bio)"),
  botaoFinal: z.string().max(24).optional(),
  capa: z
    .object({
      titulo: z.string().optional(),
      destaque: z.string().optional(),
      sobretitulo: z.string().optional(),
      cena: z.number().int().min(1).optional().describe("De qual cena sai a paisagem da capa (1 = a primeira)"),
    })
    .optional(),
  post: z.object({ titulo: z.string().optional(), legenda: z.string().optional() }).passthrough().optional(),
  idioma: z.enum(["pt", "en", "es"]).optional(),
});

export type SilhuetaProps = z.infer<typeof silhuetaSchema>;

/** A câmera de cada cena: a pedida ou, sem ela, alterna sozinha (nunca duas iguais seguidas) */
export function cameraDaCena(cenas: ReadonlyArray<Pick<CenaDaSilhueta, "camera">>, indice: number): CameraDaSilhueta {
  const pedida = cenas[indice]?.camera;
  if (pedida) return pedida;
  const ciclo: CameraDaSilhueta[] = ["zoom-in", "pan-direita", "zoom-out", "pan-esquerda"];
  return ciclo[indice % ciclo.length];
}
