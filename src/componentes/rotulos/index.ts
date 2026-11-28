// Texto na cena: o que os moldes usam. Ver schema.ts (o campo `rotulos`),
// tempo.ts (as contas, sem React) e CamadaDosRotulos.tsx (o desenho).

export { CamadaDosRotulos, type PropsDosRotulos } from "./CamadaDosRotulos";
export { ESTILOS_DE_PLACA, MAX_ROTULOS, rotuloSchema, rotulosSchema, TIPOS_DE_ROTULO, type Placa, type Rotulo, type RotuloNaTela } from "./schema";
export { conferirRotulos, mudancasDosRotulos, planejarRotulos, presencaDoRotulo, TEMPO_DO_ROTULO, type RotuloPlanejado } from "./tempo";
