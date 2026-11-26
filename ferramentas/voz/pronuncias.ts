// Pronúncias do kit (26/11/2026): termos que a voz em português lê errado e que
// aparecem muito nos canais (grego e hebraico da Bíblia, sobretudo). Valem em todo
// vídeo em português; o "pronuncia" do roteiro vale por cima destas. Antes cada
// roteiro tinha de lembrar, e "splagchnizomai" saiu entrecortado num vídeo postado.
// A escrita da direita é como a voz deve ler (acento na sílaba forte).

export const PRONUNCIAS_DO_KIT: Record<string, string> = {
  // Grego do Novo Testamento
  splagchnizomai: "splanknízomai",
  splanchnizomai: "splanknízomai",
  splagchna: "splánkna",
  agape: "ágape",
  philia: "filía",
  storge: "storguê",
  eros: "éros",
  koinonia: "coinonía",
  metanoia: "metanóia",
  logos: "lógos",
  kairos: "cáiros",
  chronos: "crônos",
  pneuma: "pinêuma",
  charis: "cáris",
  ekklesia: "eclesía",
  euangelion: "euanguélion",
  dynamis: "dínamis",
  parakletos: "paráclêtos",
  // Hebraico
  YHWH: "Iavé",
  Yahweh: "Iavé",
  Elohim: "Elorrím",
  Adonai: "Adonái",
  ruach: "rúarr",
  shalom: "shalôm",
  hesed: "réssed",
  chesed: "réssed",
  shekinah: "shequiná",
  Yeshua: "Ieshúa",
  Torah: "Torá",
  Tanakh: "Tanák",
  Talmud: "Talmúd",
  Hallelujah: "Aleluia",
  Selah: "Selá",
};

/**
 * As do kit (só em português) com as do roteiro por cima. A comparação de
 * palavra é sem diferença de maiúscula (falarPalavra).
 */
export function pronunciasDoVideo(doRoteiro: Record<string, string> | undefined, idioma: string): Record<string, string> {
  return { ...(idioma === "pt" ? PRONUNCIAS_DO_KIT : {}), ...(doRoteiro ?? {}) };
}

/**
 * Palavras com cara de estrangeira que a voz em português pode ler errado:
 * começa com s + consoante ("splagch…", "Stalin"), tem k, w, y ou grupos que o
 * português não usa (gch, chn, kh, th, ph, zh, sch, tz, letra dobrada). Só avisa:
 * quem escreve decide se põe em "pronuncia" ou troca a palavra.
 */
// Palavras com k, w ou y que já são do dia a dia e a voz lê bem: não avisam
const DO_DIA_A_DIA = new Set(
  "youtube tiktok whatsapp facebook instagram wifi kit ok okay show shows link links online playlist story stories emoji like likes hashtag hashtags marketing feedback delivery yoga karaokê karaoke kiwi ketchup sushi wi-fi uber pizza".split(" "),
);

export function palavrasDificeis(falas: string[], pronuncia: Record<string, string>, idioma: string): string[] {
  if (idioma !== "pt") return [];
  const conhecidas = new Set([...DO_DIA_A_DIA, ...Object.keys(pronuncia).flatMap((p) => p.split(/\s+/)).map((p) => p.toLowerCase())]);
  const achadas = new Set<string>();
  for (const fala of falas) {
    for (const bruta of fala.split(/\s+/)) {
      const palavra = bruta.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
      if (palavra.length < 3 || conhecidas.has(palavra.toLowerCase())) continue;
      // Sigla toda em maiúscula (ONU, PIX): a voz soletra ou lê bem; não avisa
      if (palavra === palavra.toUpperCase()) continue;
      if (/^s[bcdfgjklmnpqrtvxz]/i.test(palavra) || /[kwy]|gch|chn|kh|th|ph|zh|rh|sch|tz|([bcdfgjklmnpqtvxz])\1|aa|ee|ii|oo|uu/i.test(palavra))
        achadas.add(palavra);
    }
  }
  return [...achadas];
}
