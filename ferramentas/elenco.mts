// Põe no roteiro de um episódio os 2 personagens que vão aparecer, copiados do
// elenco do canal (canais/<canal>/elenco.json, gravado pelo npm run canal),
// com o desenho próprio de cada um. A roteirista escolhe os ids; o desenho não
// passa pela mão dela.
//
// Uso: npm run elenco -- conteudo/<arquivo>.json <id-da-esquerda> <id-da-direita> [--canal canais/<canal>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const indiceDoCanal = args.indexOf("--canal");
const pastaDoCanal = indiceDoCanal >= 0 ? args[indiceDoCanal + 1] : null;
const soltos = args.filter((arg, i) => !arg.startsWith("--") && i !== indiceDoCanal + 1);
const [caminho, ...ids] = soltos;

if (!caminho || ids.length !== 2) {
  console.error("Uso: npm run elenco -- conteudo/<arquivo>.json <id> <id> [--canal canais/<canal>]");
  process.exit(1);
}

const arquivoDoElenco = pastaDoCanal ? join(pastaDoCanal, "elenco.json") : null;
if (!arquivoDoElenco || !existsSync(arquivoDoElenco)) {
  console.error("Diga de qual canal: --canal canais/<canal> (e rode antes o npm run canal).");
  process.exit(1);
}

type Personagem = { id: string; nome: string; voz?: string; visual: unknown; desenho?: unknown };
const elenco: Personagem[] = JSON.parse(readFileSync(arquivoDoElenco, "utf8"));
// Convidados do episódio (desenhados só para ele): canais/<canal>/convidados/<id>.json
const doConvidado = (id: string): Personagem | undefined => {
  const arquivo = join(pastaDoCanal ?? "", "convidados", `${id}.json`);
  return existsSync(arquivo) ? (JSON.parse(readFileSync(arquivo, "utf8")) as Personagem) : undefined;
};
const escolhidos = ids.map((id) => {
  const p = elenco.find((e) => e.id === id) ?? doConvidado(id);
  if (!p) {
    console.error(`Não achei "${id}" no elenco nem em convidados/. Ids do elenco: ${elenco.map((e) => e.id).join(", ")}`);
    process.exit(1);
  }
  const { id: pid, nome, voz, visual, desenho } = p;
  return { id: pid, nome, ...(voz ? { voz } : {}), visual, ...(desenho ? { desenho } : {}) };
});

const peca = JSON.parse(readFileSync(caminho, "utf8"));
peca.elenco = escolhidos;
writeFileSync(caminho, `${JSON.stringify(peca, null, 2)}\n`);
console.log(`Elenco do episódio: ${escolhidos.map((p) => `${p.nome}${p.desenho ? " (desenho próprio)" : ""}`).join(" e ")}.`);
