// Vozes do kit (sem import de runtime: o ferramentas/narrar.mts também lê
// daqui). O Kokoro tem uma voz feminina (pf_dora) e duas masculinas (pm_alex,
// pm_santa) em português; as outras saem da mistura com vozes de outras
// línguas, que continuam falando português com outro timbre.
//
// No criador de personagens do Postaí a pessoa escolhe uma destas (o nome).

export type Voz = { voz: string; velocidade?: number };

export const VOZES: Record<string, Voz & { nome: string }> = {
  "feminina-1": { nome: "Feminina 1 (animada)", voz: "pf_dora", velocidade: 1.05 },
  "feminina-2": { nome: "Feminina 2 (calma)", voz: "pf_dora*0.5+if_sara*0.5", velocidade: 0.98 },
  "feminina-3": { nome: "Feminina 3 (doce)", voz: "pf_dora*0.6+ef_dora*0.4", velocidade: 1 },
  "masculina-1": { nome: "Masculina 1", voz: "pm_alex", velocidade: 1 },
  "masculina-2": { nome: "Masculina 2 (grave)", voz: "pm_santa", velocidade: 0.97 },
  "masculina-3": { nome: "Masculina 3 (jovem)", voz: "pm_alex*0.6+im_nicola*0.4", velocidade: 1.04 },
};

// A Bia e a Lu (episódios sem "elenco"). Uma peça pode trocar em
// "vozes": {"organizadora": {"voz": "..."}}.
export const VOZES_DO_ELENCO: Record<string, Voz> = {
  noiva: VOZES["feminina-1"],
  organizadora: VOZES["feminina-2"],
};
