// Os poucos textos que o vídeo escreve sozinho (o resto vem do roteiro, que o
// Claude escreve no idioma do canal). O narrar.mts grava "idioma" no roteiro.
export type IdiomaDoVideo = "pt" | "en" | "es";

const TEXTOS: Record<IdiomaDoVideo, { inscrevase: string; linkNaBio: string }> = {
  pt: { inscrevase: "Inscreva-se", linkNaBio: "Link na bio 👆" },
  en: { inscrevase: "Subscribe", linkNaBio: "Link in bio 👆" },
  es: { inscrevase: "Suscríbete", linkNaBio: "Link en la bio 👆" },
};

export const textosDoIdioma = (idioma?: string) => TEXTOS[(idioma as IdiomaDoVideo) in TEXTOS ? (idioma as IdiomaDoVideo) : "pt"];
