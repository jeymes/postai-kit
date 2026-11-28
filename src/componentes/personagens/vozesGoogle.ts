// Vozes do Google (sem import de runtime: o ferramentas/narrar.mts também lê
// daqui). O Gemini TTS e o Chirp 3 HD (Google Cloud) têm as MESMAS 30 vozes,
// pelo nome: a reserva de um canal usa a mesma voz no outro motor (decisão do
// dono, 27/11/2026). Todas falam português, inglês e espanhol.
//
// O canal escolhe a voz de cada personagem no Postaí (vozGoogle no elenco) e a
// do narrador (vozes.narrador, em canais/<canal>/vozes.json). Quando faltar, o
// narrar recomenda pela voz antiga do Kokoro (feminina-N, masculina-N), do
// mesmo gênero e do mesmo jeito (RECOMENDADA_DO_KOKORO, aqui embaixo).

import { VOZES, VOZES_DO_ELENCO } from "./vozes.ts";

export type GeneroDaVoz = "feminina" | "masculina";
export type MotorGoogle = "gemini" | "chirp";
export type MotorDeVoz = MotorGoogle | "kokoro";

// O jeito de cada voz, em português (a descrição curta do próprio Google)
export const VOZES_GOOGLE: Record<string, { genero: GeneroDaVoz; descricao: string }> = {
  Zephyr: { genero: "feminina", descricao: "clara e animada" },
  Kore: { genero: "feminina", descricao: "firme, de apresentadora" },
  Leda: { genero: "feminina", descricao: "jovem" },
  Aoede: { genero: "feminina", descricao: "leve, arejada" },
  Callirrhoe: { genero: "feminina", descricao: "tranquila, sem pressa" },
  Autonoe: { genero: "feminina", descricao: "clara, de conversa" },
  Despina: { genero: "feminina", descricao: "macia, serena" },
  Erinome: { genero: "feminina", descricao: "bem articulada" },
  Laomedeia: { genero: "feminina", descricao: "alegre, para cima" },
  Achernar: { genero: "feminina", descricao: "suave, baixinha" },
  Gacrux: { genero: "feminina", descricao: "madura" },
  Pulcherrima: { genero: "feminina", descricao: "decidida, direta" },
  Vindemiatrix: { genero: "feminina", descricao: "doce, delicada" },
  Sulafat: { genero: "feminina", descricao: "calorosa, acolhedora" },
  Puck: { genero: "masculina", descricao: "animado, para cima" },
  Charon: { genero: "masculina", descricao: "grave, de documentário" },
  Fenrir: { genero: "masculina", descricao: "intenso, empolgado" },
  Orus: { genero: "masculina", descricao: "firme" },
  Enceladus: { genero: "masculina", descricao: "macio, com fôlego" },
  Iapetus: { genero: "masculina", descricao: "claro" },
  Umbriel: { genero: "masculina", descricao: "tranquilo, de conversa" },
  Algieba: { genero: "masculina", descricao: "macio, grave suave" },
  Algenib: { genero: "masculina", descricao: "grave, rouco" },
  Rasalgethi: { genero: "masculina", descricao: "contador de histórias" },
  Alnilam: { genero: "masculina", descricao: "firme, sério" },
  Schedar: { genero: "masculina", descricao: "calmo, sem altos e baixos" },
  Achird: { genero: "masculina", descricao: "simpático, do dia a dia" },
  Zubenelgenubi: { genero: "masculina", descricao: "descontraído, rapaz" },
  Sadachbia: { genero: "masculina", descricao: "brincalhão, animado" },
  Sadaltager: { genero: "masculina", descricao: "sábio, experiente" },
};

// A voz do Google mais parecida com cada voz do Kokoro do catálogo (o nicho de
// cada uma está em vozes.ts): mesmo gênero e mesmo jeito.
export const RECOMENDADA_DO_KOKORO: Record<string, string> = {
  "feminina-1": "Laomedeia",
  "feminina-2": "Callirrhoe",
  "feminina-3": "Vindemiatrix",
  "feminina-4": "Sulafat",
  "feminina-5": "Erinome",
  "feminina-6": "Achernar",
  "feminina-7": "Aoede",
  "feminina-8": "Leda",
  "feminina-9": "Gacrux",
  "feminina-10": "Zephyr",
  "feminina-11": "Kore",
  "feminina-12": "Pulcherrima",
  "feminina-13": "Autonoe",
  "feminina-14": "Despina",
  "feminina-15": "Achernar",
  "masculina-1": "Achird",
  "masculina-2": "Algenib",
  "masculina-3": "Puck",
  "masculina-4": "Charon",
  "masculina-5": "Sadaltager",
  "masculina-6": "Umbriel",
  "masculina-7": "Algieba",
  "masculina-8": "Sadachbia",
  "masculina-9": "Enceladus",
  "masculina-10": "Fenrir",
  "masculina-11": "Schedar",
  "masculina-12": "Rasalgethi",
  "masculina-13": "Orus",
  "masculina-14": "Zubenelgenubi",
  "masculina-15": "Iapetus",
};

// Sem nenhuma pista do gênero: a voz padrão de cada lado
export const PADRAO_FEMININA = "Kore";
export const PADRAO_MASCULINA = "Charon";

/** O nome certo da voz do Google ("charon" → "Charon"), ou undefined se não for uma delas. */
export function vozGoogleValida(nome?: string | null): string | undefined {
  if (!nome) return undefined;
  const limpo = nome.trim().toLowerCase();
  return Object.keys(VOZES_GOOGLE).find((v) => v.toLowerCase() === limpo);
}

/**
 * A voz do Google para uma voz pedida: um nome do Google vale como está; um id
 * do catálogo do Kokoro (feminina-4) ou uma voz crua do Kokoro (pm_santa, ou a
 * mistura de uma do catálogo) vira a recomendada do mesmo gênero e jeito.
 * Sem pista nenhuma, a `padrao`.
 */
export function recomendarVozGoogle(voz: string | undefined | null, padrao: string = PADRAO_FEMININA): string {
  const google = vozGoogleValida(voz);
  if (google) return google;
  if (voz && RECOMENDADA_DO_KOKORO[voz]) return RECOMENDADA_DO_KOKORO[voz];
  if (voz) {
    const doCatalogo = Object.entries(VOZES).find(([, v]) => v.voz === voz)?.[0];
    if (doCatalogo) return RECOMENDADA_DO_KOKORO[doCatalogo];
    // A primeira voz da mistura diz o gênero: pf_ / af_ (feminina), pm_ / am_ (masculina)
    const primeira = voz.split("+")[0].trim();
    if (/^[a-z]f_/.test(primeira)) return PADRAO_FEMININA;
    if (/^[a-z]m_/.test(primeira)) return PADRAO_MASCULINA;
  }
  return vozGoogleValida(padrao) ?? PADRAO_FEMININA;
}

// A Bia e a Lu (episódios sem "elenco"): a recomendada das vozes delas no Kokoro
export const VOZES_GOOGLE_DO_ELENCO: Record<string, string> = Object.fromEntries(
  Object.entries(VOZES_DO_ELENCO).map(([id, v]) => [id, recomendarVozGoogle(v.voz)]),
);

/** O outro motor do Google (a reserva usa a mesma voz nele). */
export const outroMotor = (motor: MotorGoogle): MotorGoogle => (motor === "gemini" ? "chirp" : "gemini");
