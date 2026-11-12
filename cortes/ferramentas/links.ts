// Links de onde o vídeo pode vir: o arquivo que o criador mandou.

const REDES = ["youtube.com", "youtu.be", "tiktok.com", "instagram.com", "facebook.com", "fb.watch", "x.com", "twitter.com", "kwai.com", "twitch.tv"];

/** Troca o link de compartilhar pelo de baixar o arquivo. */
export function linkDeDownload(link: string) {
  const url = new URL(link);
  const host = url.hostname.toLowerCase();
  if (REDES.some((r) => host === r || host.endsWith(`.${r}`))) {
    throw new Error("link de rede social: o Postaí não baixa vídeos das redes. Peça o arquivo ao criador.");
  }
  if (host === "drive.google.com" || host === "docs.google.com") {
    const id = /\/d\/([\w-]+)/.exec(url.pathname)?.[1] ?? url.searchParams.get("id");
    if (!id) throw new Error("não achei o id do arquivo no link do Google Drive.");
    return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
  }
  if (host.endsWith("dropbox.com")) {
    url.searchParams.set("dl", "1");
    return url.toString();
  }
  return url.toString();
}
