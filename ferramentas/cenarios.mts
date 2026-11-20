// Põe no roteiro (molde Conversa) o desenho dos cenários criados pela equipe que
// ele usa (o "cenario" do começo e as trocas nas falas), copiados do
// canais/<canal>/cenarios.json (gravado pelo npm run canal e pelo npm run
// cenario --gravar). Os do kit não precisam.
//
// Uso: npm run cenarios -- conteudo/<arquivo>.json --canal canais/<canal>
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { porCenariosNoRoteiro, type CenarioProprio } from "./cenarios-do-roteiro.ts";

const args = process.argv.slice(2);
const indice = args.indexOf("--canal");
// Sem --canal, usa a única pasta de canais/ (o caso normal: um canal por conta).
const unico = existsSync("canais") ? readdirSync("canais", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join("canais", d.name)) : [];
const pasta = indice >= 0 ? args[indice + 1] : unico.length === 1 ? unico[0] : null;
const caminho = args.find((arg, i) => !arg.startsWith("--") && i !== indice + 1);
if (!caminho || !existsSync(caminho) || !pasta) {
  if (!caminho || !existsSync(caminho)) console.error(`Arquivo do roteiro não encontrado${caminho ? `: ${caminho}` : ""}.`);
  if (!pasta) console.error("Falta o canal (--canal canais/<canal>).");
  console.error("Uso: npm run cenarios -- conteudo/<arquivo>.json --canal canais/<canal>");
  process.exit(1);
}
const doCanal = join(pasta, "cenarios.json");
const lista: CenarioProprio[] = existsSync(doCanal) ? JSON.parse(readFileSync(doCanal, "utf8")) : [];
const peca = JSON.parse(readFileSync(caminho, "utf8"));
const faltando = porCenariosNoRoteiro(peca, lista);
writeFileSync(caminho, `${JSON.stringify(peca, null, 2)}\n`);
const postos = (peca.cenariosProprios ?? []).map((c: CenarioProprio) => c.nome);
console.log(postos.length ? `Cenários da equipe no roteiro: ${postos.join(", ")}.` : "O roteiro só usa cenários do kit.");
if (faltando.length) {
  console.error(
    `Ainda não desenhados: ${faltando.join(", ")}. Peça à designer-de-personagens (npm run cenario ... --gravar) e rode este comando de novo.`,
  );
  process.exit(1);
}
