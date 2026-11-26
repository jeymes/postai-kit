// O alvo de duração do vídeo longo (Canal dark) e o aviso quando o vídeo passa
// dele. Usado pelo conferir e pela prévia (renderizar --previa), antes do render.
import { existsSync, readFileSync } from "node:fs";

/** Os minutos do canal, do canal-postai.md ("Uns N minutos de fala"), ou null sem o arquivo */
export function minutosDoCanal(outros: string[] = []): number | null {
  const md = ["canais/dark/canal-postai.md", ...outros.filter((a) => a.endsWith(".md"))].find(existsSync);
  if (!md) return null;
  const achado = /Uns (\d+) minutos/.exec(readFileSync(md, "utf8"))?.[1];
  return achado ? Number(achado) : null;
}

const minSeg = (seg: number) => `${Math.floor(seg / 60)} min ${String(Math.round(seg % 60)).padStart(2, "0")} s`;

/**
 * Aviso quando o vídeo (com os respiros entre as cenas e o cartão final) passa de
 * 120% do alvo do canal (26/11/2026: o vídeo saía uns 70 s mais longo que a soma
 * das falas, e ninguém avisava antes do render). Null quando está dentro.
 */
export function avisoDeDuracao(segundosDoVideo: number, segundosDeFala: number, minutos: number): string | null {
  const alvo = minutos * 60;
  if (segundosDoVideo <= alvo * 1.2) return null;
  return (
    `o vídeo sai com ${minSeg(segundosDoVideo)} (${Math.round((segundosDoVideo / alvo) * 100)}% dos ${minutos} min do canal; ` +
    `as falas somam ${minSeg(segundosDeFala)}, o resto são os respiros entre as cenas e o cartão final). ` +
    `Passa de 120%: corte ou junte cenas antes do render`
  );
}
