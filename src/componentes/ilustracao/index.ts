// Ilustração da fala: o que os moldes usam. Ver CamadaDaFala.tsx (o desenho),
// schema.ts (o campo `ilustra`) e tempo.ts (as contas, sem React).

export { CamadaDaFala, FAIXAS_DO_MOLDE, type Faixas, type PropsDaCamada } from "./CamadaDaFala";
export { ilustraSchema, ilustracaoSchema, ICONES_DA_FALA, LUGARES, MAX_POR_FALA, TIPOS_DE_ILUSTRACAO, type Ilustracao, type IconeDaFala } from "./schema";
export {
  acharPalavra,
  conferirIlustra,
  medirRitmo,
  mudancasDoPlano,
  palavrasDaNarracao,
  palavrasEstimadas,
  planejarIlustracoes,
  quadroDaPalavra,
  ritmoDoRoteiro,
  type FalaParaRitmo,
  type PalavraNoTempo,
  type Ritmo,
} from "./tempo";
export { temaDaIlustracao, familiaDo, type TemaDaIlustracao } from "./tema";
