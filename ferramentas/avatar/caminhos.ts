// Onde o avatar fica instalado: em .avatar/, dentro do kit (fora do .zip, então
// as atualizações do kit não mexem). O vídeo base da pessoa fica em
// public/avatar/ (do dono).
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const windows = process.platform === "win32";

export const PASTA_DO_AVATAR = join(process.cwd(), ".avatar");
export const MUSETALK = join(PASTA_DO_AVATAR, "MuseTalk");
export const PYTHON_DO_AVATAR = join(PASTA_DO_AVATAR, "python", windows ? "Scripts" : "bin", windows ? "python.exe" : "python");
export const VIDEO_BASE_PADRAO = "avatar/base.mp4";

/** O ffmpeg que vem com o Remotion (o MuseTalk precisa de um no PATH) */
export function pastaDoFfmpeg() {
  const raiz = join(process.cwd(), "node_modules", "@remotion");
  const pasta = readdirSync(raiz).find(
    (nome) => nome.startsWith("compositor-") && existsSync(join(raiz, nome, windows ? "ffmpeg.exe" : "ffmpeg")),
  );
  if (!pasta) throw new Error("Não achei o ffmpeg do Remotion. Rode: npm install");
  return join(raiz, pasta);
}
