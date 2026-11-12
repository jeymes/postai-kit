// Acrescenta ao elenco fixo do canal, no Postaí, um personagem (ou troca o de
// mesmo id), sem mexer no resto do canal. A designer-de-personagens usa
// quando um aprendizado pede alguém novo ou um convidado virou fixo.
//
// Uso: POSTAI_CHAVE=postai.xxx.yyy npm run personagem -- canais/<canal>/convidados/<id>.json
import { readFileSync } from "node:fs";
import { exigirChave, ferramenta } from "./postai.ts";

const caminho = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!caminho) {
  console.error("Uso: npm run personagem -- <arquivo do personagem>.json");
  process.exit(1);
}
exigirChave();
try {
  const personagem = JSON.parse(readFileSync(caminho, "utf8"));
  console.log(await ferramenta("adicionar_personagem", { personagem }));
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
}
