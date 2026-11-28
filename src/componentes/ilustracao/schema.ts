// Ilustração da fala: o formato do campo `ilustra` de uma cena (Conversa,
// Mundo3D e o que mais vier). Cada item aparece na tela na palavra `em` que o
// narrador ou o personagem fala e sai na palavra `ate` (ou no fim da fala).
// Sem React: o ferramentas/conferir.mts pode usar este mesmo schema para
// conferir o roteiro antes do render. A roteirista escreve à mão, então os
// nomes são curtos e em português simples (exemplos em
// .claude/agents/roteirista.md, seção "Ilustração da fala").

import { z } from "zod";
import { graficoSchema, ICONES } from "../../moldes/documentario/infografico/schema.ts";

/** Os ícones a mais da ilustração (iconesExtras.tsx), além dos 39 do infográfico */
export const ICONES_EXTRAS = [
  "coroa",
  "pomba",
  "pao",
  "peixe",
  "estrela",
  "fogo",
  "chave",
  "pergaminho",
  "sol",
  "lua",
  "montanha",
  "anel",
  "taca",
  "presente",
  "envelope",
  "certo",
  "errado",
  "pergunta",
  "alerta",
] as const;

/** Todos os ícones que a ilustração aceita */
export const ICONES_DA_FALA = [...ICONES, ...ICONES_EXTRAS] as const;
export type IconeDaFala = (typeof ICONES_DA_FALA)[number];

/**
 * Os objetos de apoio desenhados em 2D (src/componentes/objetos/ObjetosDeApoio.tsx).
 * Copiados aqui para o schema não puxar React; o tipos.tsx confere, na
 * compilação, que a lista é a mesma do APOIOS.
 */
export const OBJETOS_DA_FALA = ["alianca", "caixinha-de-alianca", "terno", "vestido-de-noiva", "buque", "bolo", "presente", "convite", "tacas"] as const;

/** Onde o item fica. Sem `lugar`: o padrão do tipo (no alto, longe dos rostos e da legenda) */
export const LUGARES = ["alto", "meio", "baixo", "esquerda", "direita"] as const;
export type Lugar = (typeof LUGARES)[number];

/** No máximo tantos itens numa fala (mais que isso vira bagunça na tela) */
export const MAX_POR_FALA = 6;

const palavra = z.string().trim().min(1).max(40);
const icone = z.enum(ICONES_DA_FALA);
const numero = z.number().finite();
/** Um ponto da tela, em % (x 0 = esquerda, y 0 = topo) */
const ponto = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) });

const base = {
  em: palavra.optional().describe("A palavra da fala em que o item aparece (sem ela, no começo da fala). Pode ser duas: \"três mil\""),
  ate: palavra.optional().describe("A palavra em que o item sai (sem ela, fica até o fim da fala)"),
  lugar: z.enum(LUGARES).optional().describe("alto, meio, baixo, esquerda ou direita (sem ele, o padrão do tipo, que não cobre rosto nem legenda)"),
};

const tipoIcone = z
  .object({
    tipo: z.literal("icone"),
    icone: icone.optional().describe("Um ícone só"),
    rotulo: z.string().trim().min(1).max(22).optional().describe("Texto curto embaixo do ícone (até 22 letras)"),
    icones: z
      .array(z.object({ icone, rotulo: z.string().trim().min(1).max(14).optional(), em: palavra.optional() }))
      .min(2)
      .max(4)
      .optional()
      .describe("De 2 a 4 ícones em fila, um por um (cada um na sua palavra `em`, ou um atrás do outro)"),
    ...base,
  })
  .refine((v) => Boolean(v.icone) !== Boolean(v.icones), { message: 'use "icone" (um) ou "icones" (2 a 4), um dos dois' });

const tipoNumero = z.object({
  tipo: z.literal("numero"),
  valor: numero,
  de: numero.optional().describe("De onde a contagem começa (padrão 0)"),
  prefixo: z.string().max(6).optional().describe('Antes do número: "R$", "US$"'),
  sufixo: z.string().max(14).optional().describe('Depois do número: "%", " mil", " por mês"'),
  casas: z.number().int().min(0).max(2).optional(),
  rotulo: z.string().trim().min(1).max(40).optional().describe("O que o número é (até 40 letras)"),
  icone: icone.optional(),
  ...base,
});

const tipoGrafico = z
  .object({
    tipo: z.literal("grafico"),
    grafico: graficoSchema.describe("Os mesmos 9 gráficos do infográfico (numero, linha, barras, pizza, unidades, comparacao, linhaDoTempo, escala, conta), num cartão em pé"),
    ...base,
  })
  .superRefine((v, ctx) => {
    // O cartão em pé é menor que a tela deitada do infográfico: menos coisa em cada gráfico
    const g = v.grafico;
    const limite = (quantos: number, max: number, campo: string) => {
      if (quantos > max) ctx.addIssue({ code: "custom", path: ["grafico", campo], message: `no celular cabem até ${max} (tem ${quantos})` });
    };
    if (g.tipo === "barras") limite(g.itens.length, 6, "itens");
    if (g.tipo === "pizza") limite(g.partes.length, 5, "partes");
    if (g.tipo === "linhaDoTempo") limite(g.marcos.length, 4, "marcos");
    if (g.tipo === "escala") limite(g.itens.length, 4, "itens");
    if (g.tipo === "unidades") limite(g.total, 50, "total");
    if (g.tipo === "conta") limite(g.passos.length, 4, "passos");
    if (g.tipo === "linha") limite(g.pontos.length, 24, "pontos");
    if (g.tipo === "unidades" && g.marcados > g.total) ctx.addIssue({ code: "custom", path: ["grafico", "marcados"], message: "marcados passa do total" });
  });

const passoDaConta = z.union([z.string().trim().min(1).max(30), z.object({ texto: z.string().trim().min(1).max(30), em: palavra.optional() })]);

const tipoConta = z.object({
  tipo: z.literal("conta"),
  passos: z
    .array(passoDaConta)
    .min(1)
    .max(5)
    .describe('Cada linha da conta (até 30 letras), uma por vez; a última é o resultado, em destaque. "^" vira expoente. Uma linha pode ser { "texto", "em" }'),
  ...base,
});

const tipoTexto = z.object({
  tipo: z.literal("texto"),
  texto: z.string().trim().min(1).max(28).describe("Palavra ou frase curta (até 28 letras)"),
  destaque: z.string().trim().min(1).max(28).optional().describe("O pedaço do texto que sai na cor de destaque"),
  forma: z.enum(["sticker", "carimbo", "marcador"]).optional().describe("sticker (padrão), carimbo (ERRO!, PAGO) ou marcador (grifado)"),
  ...base,
});

const tipoSeta = z.object({
  tipo: z.literal("seta"),
  ponto: ponto.describe("Para onde a seta aponta, em % da tela"),
  de: z.enum(["esquerda", "direita", "cima", "baixo"]).optional().describe("De que lado a seta vem (sem ele, do lado com mais espaço)"),
  rotulo: z.string().trim().min(1).max(18).optional(),
  ...base,
});

const tipoCirculo = z.object({
  tipo: z.literal("circulo"),
  ponto: ponto.describe("O meio do círculo, em % da tela"),
  raio: z.number().min(4).max(40).optional().describe("O raio, em % da largura (padrão 12)"),
  rotulo: z.string().trim().min(1).max(18).optional(),
  ...base,
});

const tipoPensamento = z
  .object({
    tipo: z.literal("pensamento"),
    quem: z.string().trim().min(1).max(30).describe("O id do personagem que pensa"),
    icone: icone.optional(),
    texto: z.string().trim().min(1).max(24).optional().describe("Até 24 letras"),
    ...base,
  })
  .refine((v) => Boolean(v.icone || v.texto), { message: 'o pensamento precisa de "icone" ou "texto"' });

const tipoObjeto = z.object({
  tipo: z.literal("objeto"),
  objeto: z.enum(OBJETOS_DA_FALA),
  rotulo: z.string().trim().min(1).max(22).optional(),
  ...base,
});

export const ilustracaoSchema = z.discriminatedUnion("tipo", [tipoIcone, tipoNumero, tipoGrafico, tipoConta, tipoTexto, tipoSeta, tipoCirculo, tipoPensamento, tipoObjeto]);
export type Ilustracao = z.infer<typeof ilustracaoSchema>;
export type TipoDeIlustracao = Ilustracao["tipo"];
export const TIPOS_DE_ILUSTRACAO = ["icone", "numero", "grafico", "conta", "texto", "seta", "circulo", "pensamento", "objeto"] as const;

/** O campo `ilustra` de uma cena: a lista, com no máximo MAX_POR_FALA itens */
export const ilustraSchema = z
  .array(ilustracaoSchema)
  .max(MAX_POR_FALA, `no máximo ${MAX_POR_FALA} ilustrações por fala`)
  .optional()
  .describe("O que aparece na tela junto com a fala, na palavra exata (ver roteirista.md, Ilustração da fala)");

/** O texto de um passo da conta (o passo pode ser só o texto ou { texto, em }) */
export const textoDoPasso = (p: z.infer<typeof passoDaConta>) => (typeof p === "string" ? p : p.texto);
export const emDoPasso = (p: z.infer<typeof passoDaConta>) => (typeof p === "string" ? undefined : p.em);
