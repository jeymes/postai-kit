// Texto na cena (28/11/2026): o formato do campo `rotulos` de uma cena (Mundo3D
// e Conversa). São os textos que fazem parte da cena, como nos shorts em alta
// que contam causos em 3D: a etiqueta de lugar e data ("Itália · 1944"), o nome
// de quem entra ("Seu Dito · borracheiro"), a placa do cenário ("CURVA
// PERIGOSA") e o bilhete em close ("Paga ou eu entro"). Diferente da
// ilustração da fala (`ilustra`), que mostra o que a voz diz em cartões, o
// rótulo é do mundo da história. Sem React: o conferir usa o mesmo schema.

import { z } from "zod";

const palavra = z.string().trim().min(1).max(40);
const base = {
  em: palavra.optional().describe("A palavra da fala em que aparece (sem ela, no começo da cena)"),
  ate: palavra.optional().describe("A palavra em que sai (sem ela, sai sozinho depois de uns 3 s, ou no fim da cena)"),
};

/** O papel do bilhete: folha de caderno (pautada), carta (papel amarelado) ou documento (branco, com cabeçalho) */
export const PAPEIS = ["caderno", "carta", "documento"] as const;
/** A letra do bilhete: à mão ou à máquina de escrever */
export const LETRAS = ["mao", "maquina"] as const;
/**
 * A placa do cenário (Mundo3D): "cidade" (verde, de estrada: nome da cidade e km),
 * "rua" (azul, nome de rua), "aviso" (amarela, "CURVA PERIGOSA"), "loja" (letreiro
 * colorido sobre dois postes) e "madeira" (tábua pintada à mão: fazenda, sítio)
 */
export const ESTILOS_DE_PLACA = ["cidade", "rua", "aviso", "loja", "madeira"] as const;

const tipoLugarEData = z.object({
  tipo: z.literal("lugarEData"),
  texto: z.string().trim().min(1).max(34).describe('Lugar e/ou data, curto: "Itália, 1944", "Sertão da Bahia · 1927", "3 dias depois"'),
  ...base,
});

const tipoNome = z.object({
  tipo: z.literal("nome"),
  quem: z.string().trim().min(1).max(30).describe("O id do personagem que entra"),
  nome: z.string().trim().min(1).max(24).describe('O nome dele: "Seu Dito"'),
  papel: z.string().trim().min(1).max(30).optional().describe('Quem ele é, curto: "borracheiro há 30 anos"'),
  lugar: z.enum(["cabeca", "embaixo"]).optional().describe('"cabeca" (padrão: em cima da cabeça dele, se couber) ou "embaixo" (a faixa de TV, acima da legenda)'),
  ...base,
});

const tipoPlaca = z.object({
  tipo: z.literal("placa"),
  texto: z.string().trim().min(1).max(24).describe("O que está escrito (até 24 letras)"),
  linha2: z.string().trim().min(1).max(24).optional().describe('Uma linha menor embaixo: "km 42", "desde 1952"'),
  estilo: z.enum(ESTILOS_DE_PLACA).optional().describe("cidade, rua, aviso, loja ou madeira (sem ele: o do lugar)"),
  onde: z.tuple([z.number(), z.number()]).optional().describe("[x, z] no chão (sem ele: atrás e ao lado do foco da cena, de frente para a câmera)"),
  lado: z.enum(["esquerda", "direita"]).optional().describe("Sem onde: de que lado do foco ela fica (padrão: esquerda)"),
});

const tipoBilhete = z.object({
  tipo: z.literal("bilhete"),
  texto: z.string().trim().min(1).max(110).describe("O que está escrito (até 110 letras; curto lê melhor: até 40)"),
  assinatura: z.string().trim().min(1).max(28).optional().describe('Quem assina: "Lampião" (sai "— Lampião")'),
  papel: z.enum(PAPEIS).optional().describe("caderno (padrão), carta ou documento"),
  letra: z.enum(LETRAS).optional().describe("mao (padrão no caderno e na carta) ou maquina (padrão no documento)"),
  carimbo: z.string().trim().min(1).max(14).optional().describe('Um carimbo vermelho que bate no papel: "URGENTE", "NEGADO", "PAGO"'),
  ...base,
});

export const rotuloSchema = z.discriminatedUnion("tipo", [tipoLugarEData, tipoNome, tipoPlaca, tipoBilhete]);
export type Rotulo = z.infer<typeof rotuloSchema>;
export type TipoDeRotulo = Rotulo["tipo"];
export const TIPOS_DE_ROTULO = ["lugarEData", "nome", "placa", "bilhete"] as const;
export type RotuloNaTela = Exclude<Rotulo, { tipo: "placa" }>;
export type Placa = Extract<Rotulo, { tipo: "placa" }>;

/** No máximo tantos rótulos numa cena */
export const MAX_ROTULOS = 4;

/** O campo `rotulos` de uma cena */
export const rotulosSchema = z
  .array(rotuloSchema)
  .max(MAX_ROTULOS, `no máximo ${MAX_ROTULOS} rótulos por cena`)
  .optional()
  .describe("Texto na cena: lugar e data, nome de quem entra, placa do cenário e bilhete em close (ver roteirista.md, Texto na cena)");
