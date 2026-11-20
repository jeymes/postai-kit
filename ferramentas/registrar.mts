// Grava no Postaí o episódio que acabou de ir para aprovação: a linha do
// registro e o "Próximo" atualizado (formato seguinte, próximo capítulo e o que
// já aconteceu na série). O registro fica no Postaí, não no GitHub.
//
// Uso: POSTAI_CHAVE=postai.xxx.yyy npm run registrar -- canais/<canal>/registro.json
//      registro.json = { "linha": { "data", "formato", "titulo", "tema" }, "proximo": "<markdown>" }
import { readFileSync } from "node:fs";
import { exigirChave, ferramenta } from "./postai.ts";

const caminho = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!caminho) {
  console.error("Uso: npm run registrar -- canais/<canal>/registro.json");
  process.exit(1);
}
exigirChave();
// O Postaí limita alguns campos da linha (tema 200, formato 60): corta com "…" em vez de falhar.
const cortar = (texto: unknown, max: number) =>
  typeof texto === "string" && texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto;
try {
  const registro = JSON.parse(readFileSync(caminho, "utf8"));
  if (registro.linha) {
    registro.linha.tema = cortar(registro.linha.tema, 200);
    registro.linha.formato = cortar(registro.linha.formato, 60);
  }
  console.log(await ferramenta("registrar_episodio", registro));
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
}
