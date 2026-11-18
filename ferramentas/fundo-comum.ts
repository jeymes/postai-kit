// O que o "npm run fundo" e o "npm run esperar" dividem: onde fica o registro
// de cada comando em segundo plano e se ele ainda está rodando.

import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

/** Os comandos que podem rodar em segundo plano (os que passam de 10 minutos, e o vigia). */
export const COMANDOS_DE_FUNDO = ["renderizar", "previa", "narrar", "vigiar"] as const;

/** out/<peça>.<comando>.log (sem peça, out/kit.<comando>.log). */
export function caminhoDoRegistro(comando: string, args: string[]) {
  const peca = args.find((arg) => arg.endsWith(".json"));
  return `out/${peca ? basename(peca, ".json") : "kit"}.${comando}.log`;
}

/** O processo do registro ainda está vivo? (o número dele fica em <registro>.pid) */
export function rodando(registro: string) {
  const arquivo = `${registro}.pid`;
  if (!existsSync(arquivo)) return false;
  const pid = Number(readFileSync(arquivo, "utf8").trim());
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
