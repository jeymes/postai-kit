// Infográfico animado (modelo "infografico" do Canal dark): o formato do campo
// `grafico` de cada cena. Sem React: o ferramentas/conferir.mts usa este mesmo
// schema para conferir o roteiro antes do render. Cada gráfico é escrito à mão
// pela roteirista, então os campos são poucos e com nome em português simples.

import { z } from "zod";

/** Os ícones desenhados pelo kit (icones.tsx): traço uniforme, na cor do tema */
export const ICONES = [
  "moeda",
  "nota",
  "saco-de-dinheiro",
  "cofre",
  "casa",
  "carro",
  "pessoa",
  "familia",
  "carrinho",
  "cartao",
  "grafico",
  "sobe",
  "desce",
  "porcentagem",
  "relogio",
  "ampulheta",
  "calendario",
  "planeta",
  "globo",
  "atomo",
  "coracao",
  "saude",
  "raio",
  "combustivel",
  "comida",
  "celular",
  "banco",
  "imposto",
  "alvo",
  "maleta",
  "livro",
  "fabrica",
  "gota",
  "arvore",
  "lampada",
  "trofeu",
  "bola",
  "cadeado",
  "escudo",
] as const;
export type NomeDoIcone = (typeof ICONES)[number];

const icone = z.enum(ICONES);
const numero = z.number().finite();
const rotulo = z.string().min(1).max(40);

/** O que todo gráfico aceita */
const comum = {
  titulo: z.string().max(70).optional().describe("O título do gráfico, no alto (até 70 letras)"),
  fonte: z
    .string()
    .max(90)
    .optional()
    .describe('De onde veio o dado: "IBGE, 2025", "Banco Central". Obrigatória quando o número é real; numa simulação, "Exemplo de cálculo"'),
  em: z
    .string()
    .max(40)
    .optional()
    .describe("A palavra da fala em que a animação começa (sem ela, começa junto com a cena)"),
};

/** A unidade dos valores: "R$", "%", "R$ bi", "mil pessoas", "anos". Moeda vai antes do número, o resto depois */
const unidade = z.string().max(16).optional().describe('A unidade dos valores: "R$", "%", "US$ bi", "anos", "kg". A moeda vai antes do número; o resto depois');
const casas = z.number().int().min(0).max(3).optional().describe("Casas depois da vírgula (padrão: as dos próprios valores, até 2)");

export const graficoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("numero"),
    valor: numero,
    de: numero.optional().describe("De onde a conta começa (padrão 0)"),
    prefixo: z.string().max(6).optional().describe('Antes do número: "R$", "US$"'),
    sufixo: z.string().max(14).optional().describe('Depois do número: "%", " mil", " bi", " anos"'),
    casas,
    rotulo: z.string().max(90).optional().describe("O que o número é, embaixo dele"),
    icone: icone.optional(),
    ...comum,
  }),
  z.object({
    tipo: z.literal("linha"),
    pontos: z
      .array(z.object({ x: z.union([z.string().max(12), numero]), y: numero }))
      .min(2)
      .max(40),
    unidade,
    casas,
    destaque: z
      .object({ x: z.union([z.string().max(12), numero]), rotulo: z.string().max(40) })
      .optional()
      .describe("Um ponto que ganha um balão (o x de um dos pontos)"),
    ...comum,
  }),
  z.object({
    tipo: z.literal("barras"),
    itens: z
      .array(z.object({ rotulo, valor: numero, destaque: z.boolean().optional() }))
      .min(1)
      .max(10),
    unidade,
    casas,
    horizontal: z.boolean().optional().describe("Barras deitadas, do maior para o menor (ranking)"),
    ordenar: z.boolean().optional().describe("Ordena do maior para o menor (padrão: sim nas deitadas, não nas em pé)"),
    ...comum,
  }),
  z.object({
    tipo: z.literal("pizza"),
    partes: z
      .array(z.object({ rotulo, valor: numero.nonnegative(), destaque: z.boolean().optional() }))
      .min(2)
      .max(6),
    unidade,
    casas,
    ...comum,
  }),
  z.object({
    tipo: z.literal("unidades"),
    total: z.number().int().min(2).max(100),
    marcados: z.number().int().min(0),
    icone: icone.optional(),
    rotulo: z.string().max(90).optional(),
    ...comum,
  }),
  z.object({
    tipo: z.literal("comparacao"),
    a: z.object({ rotulo, valor: numero, icone: icone.optional() }),
    b: z.object({ rotulo, valor: numero, icone: icone.optional() }),
    unidade,
    casas,
    ...comum,
  }),
  z.object({
    tipo: z.literal("linhaDoTempo"),
    marcos: z
      .array(z.object({ quando: z.string().min(1).max(14), rotulo: z.string().min(1).max(60), icone: icone.optional() }))
      .min(2)
      .max(7),
    ...comum,
  }),
  z.object({
    tipo: z.literal("escala"),
    itens: z
      .array(z.object({ rotulo, valor: numero.positive(), icone: icone.optional(), destaque: z.boolean().optional() }))
      .min(2)
      .max(5),
    unidade,
    casas,
    ...comum,
  }),
  z.object({
    tipo: z.literal("conta"),
    passos: z.array(z.string().min(1).max(48)).min(1).max(5).describe('Cada linha da conta; a última é o resultado. "^" vira expoente: "1,01^360"'),
    ...comum,
  }),
]);

export type Grafico = z.infer<typeof graficoSchema>;
export const TIPOS_DE_GRAFICO = ["numero", "linha", "barras", "pizza", "unidades", "comparacao", "linhaDoTempo", "escala", "conta"] as const;
