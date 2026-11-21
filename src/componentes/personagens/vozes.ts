// Vozes do kit (sem import de runtime: o ferramentas/narrar.mts também lê
// daqui). O Kokoro tem uma voz feminina (pf_dora) e duas masculinas (pm_alex,
// pm_santa) em português; as outras saem da mistura com vozes de outras
// línguas, que continuam falando português com outro timbre (todas conferidas
// com o Whisper em 19/11/2026: o português sai claro).
//
// No criador de personagens do Postaí a pessoa escolhe uma destas (o nome).

export type Voz = { voz: string; velocidade?: number };

// "nicho" diz para que a voz combina: o Claude (criadora-de-canal ou a conversa
// com o dono) escolhe pela história do canal, e a mesma voz serve tanto para um
// personagem quanto para o narrador ("voz" no topo do roteiro aceita o id daqui).
export const VOZES: Record<string, Voz & { nome: string; nicho: string }> = {
  "feminina-1": { nome: "Feminina 1 (animada)", voz: "pf_dora", velocidade: 1.05, nicho: "animada, do dia a dia, dicas" },
  "feminina-2": { nome: "Feminina 2 (calma)", voz: "pf_dora*0.5+if_sara*0.5", velocidade: 0.98, nicho: "calma, explicação, organização" },
  "feminina-3": { nome: "Feminina 3 (doce)", voz: "pf_dora*0.6+ef_dora*0.4", velocidade: 1, nicho: "doce, família, histórias leves" },
  "feminina-4": { nome: "Feminina 4 (calorosa)", voz: "pf_dora*0.5+af_heart*0.5", nicho: "acolhedora: família, casamento, maternidade" },
  "feminina-5": { nome: "Feminina 5 (clara)", voz: "pf_dora*0.5+bf_emma*0.5", nicho: "bem articulada: educação, tutorial, explicação" },
  "feminina-6": { nome: "Feminina 6 (suave)", voz: "pf_dora*0.5+af_nicole*0.5", nicho: "baixinha: oração, relaxamento, reflexão" },
  "feminina-7": { nome: "Feminina 7 (leve)", voz: "pf_dora*0.55+ff_siwis*0.45", nicho: "leve: beleza, moda, bem-estar" },
  "feminina-8": { nome: "Feminina 8 (jovem)", voz: "pf_dora*0.5+af_bella*0.5", nicho: "jovem e animada: humor, perrengue, lifestyle" },
  "feminina-9": { nome: "Feminina 9 (madura)", voz: "pf_dora*0.5+bf_isabella*0.5", nicho: "elegante: finanças, negócios, mulher mais velha" },
  "feminina-10": { nome: "Feminina 10 (menina)", voz: "pf_dora*0.6+af_sky*0.4", nicho: "mais nova: personagem criança ou adolescente" },
  "feminina-11": { nome: "Feminina 11 (firme)", voz: "pf_dora*0.5+af_kore*0.5", nicho: "segura, de apresentadora: notícias, curiosidades" },
  "feminina-12": { nome: "Feminina 12 (séria)", voz: "pf_dora*0.5+bf_alice*0.5", nicho: "sóbria: história, mistério, casos reais" },
  "feminina-13": { nome: "Feminina 13 (neutra)", voz: "pf_dora*0.5+af_sarah*0.5", nicho: "natural, de conversa: qualquer nicho" },
  "feminina-14": { nome: "Feminina 14 (serena)", voz: "pf_dora*0.5+af_aoede*0.5", nicho: "calma para contar histórias: bíblia, fé, contos" },
  "feminina-15": { nome: "Feminina 15 (delicada)", voz: "pf_dora*0.5+bf_lily*0.5", nicho: "doce: infantil, contos, carinho" },
  "masculina-1": { nome: "Masculina 1", voz: "pm_alex", velocidade: 1, nicho: "padrão, do dia a dia" },
  "masculina-2": { nome: "Masculina 2 (grave)", voz: "pm_santa", velocidade: 0.97, nicho: "grave: narração, homem mais velho" },
  "masculina-3": { nome: "Masculina 3 (jovem)", voz: "pm_alex*0.6+im_nicola*0.4", velocidade: 1.04, nicho: "jovem: humor, rapaz" },
  "masculina-4": { nome: "Masculina 4 (muito grave)", voz: "pm_santa*0.5+am_onyx*0.5", nicho: "profunda: documentário, mistério, canal dark" },
  "masculina-5": { nome: "Masculina 5 (maduro)", voz: "pm_alex*0.5+bm_george*0.5", nicho: "senhor experiente: sábio, profeta, avô" },
  "masculina-6": { nome: "Masculina 6 (caloroso)", voz: "pm_alex*0.5+am_michael*0.5", nicho: "próximo, de conversa: dicas, família" },
  "masculina-7": { nome: "Masculina 7 (grave suave)", voz: "pm_santa*0.5+bm_lewis*0.5", nicho: "séria e calma: reflexão, história" },
  "masculina-8": { nome: "Masculina 8 (jovem animado)", voz: "pm_alex*0.5+am_puck*0.5", nicho: "brincalhão: humor, personagem engraçado" },
  "masculina-9": { nome: "Masculina 9 (macio)", voz: "pm_alex*0.5+em_alex*0.5", nicho: "parecida com a Masculina 1, mais macia: dia a dia" },
  "masculina-10": { nome: "Masculina 10 (forte)", voz: "pm_santa*0.5+am_fenrir*0.5", nicho: "intensa: motivação, esporte, vilão" },
  "masculina-11": { nome: "Masculina 11 (calmo)", voz: "pm_alex*0.5+bm_daniel*0.5", nicho: "tranquila: fé, meditação, conselho" },
  "masculina-12": { nome: "Masculina 12 (contador)", voz: "pm_santa*0.6+bm_fable*0.4", nicho: "contador de histórias: contos, bíblia, lendas" },
  "masculina-13": { nome: "Masculina 13 (firme)", voz: "pm_alex*0.5+am_eric*0.5", nicho: "decidida: negócios, notícias" },
  "masculina-14": { nome: "Masculina 14 (rapaz)", voz: "pm_alex*0.5+am_liam*0.5", nicho: "jovem e natural: noivo, estudante" },
  "masculina-15": { nome: "Masculina 15 (grave macio)", voz: "pm_santa*0.5+am_echo*0.5", nicho: "grave e acolhedora: narração de fé, história" },
};

// A Bia e a Lu (episódios sem "elenco"). Uma peça pode trocar em
// "vozes": {"organizadora": {"voz": "..."}}.
export const VOZES_DO_ELENCO: Record<string, Voz> = {
  noiva: VOZES["feminina-1"],
  organizadora: VOZES["feminina-2"],
};

// ---- Outras línguas ----
// Cada voz do catálogo é uma voz-base do português (pf_dora, pm_alex,
// pm_santa), às vezes misturada com outra para dar o timbre. Em inglês e em
// espanhol, a voz-base troca pela da língua e a mistura fica: o mesmo catálogo
// serve às três línguas (o narrar.mts manda o idioma para a voz falar nele).
export type IdiomaDaVoz = "pt" | "en" | "es";
export const IDIOMAS_DA_VOZ: IdiomaDaVoz[] = ["pt", "en", "es"];

const BASE_NO_IDIOMA: Record<Exclude<IdiomaDaVoz, "pt">, Record<string, string>> = {
  en: { pf_dora: "af_heart", pm_alex: "am_michael", pm_santa: "am_onyx" },
  es: { pf_dora: "ef_dora", pm_alex: "em_alex", pm_santa: "em_santa" },
};

/** A voz (um nome do Kokoro ou uma mistura "a*0.5+b*0.5") falando no idioma pedido. */
export function vozNoIdioma(voz: string, idioma: IdiomaDaVoz = "pt"): string {
  if (idioma === "pt") return voz;
  const trocas = BASE_NO_IDIOMA[idioma];
  return voz.replace(/\b(pf_dora|pm_alex|pm_santa)\b/g, (base) => trocas[base] ?? base);
}
