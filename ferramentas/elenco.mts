// Põe no roteiro de um episódio os 2 personagens que vão aparecer, copiados do
// elenco do canal (canais/<canal>/elenco.json, gravado pelo npm run canal),
// com o desenho próprio de cada um. A roteirista escolhe os ids; o desenho não
// passa pela mão dela.
//
// Uso: npm run elenco -- conteudo/<arquivo>.json <id-da-esquerda> <id-da-direita> [--canal canais/<canal>]
// No Mundo 3D (molde Mundo3D), sem ids: npm run elenco -- conteudo/<arquivo>.json --canal canais/<canal>
// põe as cores (visual) e a voz de cada personagem do roteiro que está no elenco.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { porCenariosNoRoteiro } from "./cenarios-do-roteiro.ts";
import { VOZES } from "../src/componentes/personagens/vozes.ts";

const args = process.argv.slice(2);
const indiceDoCanal = args.indexOf("--canal");
const pastaDoCanal = indiceDoCanal >= 0 ? args[indiceDoCanal + 1] : null;
const soltos = args.filter((arg, i) => !arg.startsWith("--") && i !== indiceDoCanal + 1);
const [caminho, ...ids] = soltos;

const peca3d = caminho && existsSync(caminho) ? JSON.parse(readFileSync(caminho, "utf8")) : null;
const ehMundo3D = peca3d?.molde === "Mundo3D";
if (!caminho || (!ehMundo3D && ids.length !== 2)) {
  console.error("Uso: npm run elenco -- conteudo/<arquivo>.json <id> <id> [--canal canais/<canal>]");
  process.exit(1);
}

const arquivoDoElenco = pastaDoCanal ? join(pastaDoCanal, "elenco.json") : null;
if (!arquivoDoElenco || !existsSync(arquivoDoElenco)) {
  console.error("Diga de qual canal: --canal canais/<canal> (e rode antes o npm run canal).");
  process.exit(1);
}

type Personagem = { id: string; nome: string; voz?: string; tipo?: string; criatura?: string; objeto?: string; visual: unknown; desenho?: unknown };
const elenco: Personagem[] = JSON.parse(readFileSync(arquivoDoElenco, "utf8"));
// Convidados do episódio (desenhados só para ele): canais/<canal>/convidados/<id>.json
const doConvidado = (id: string): Personagem | undefined => {
  const arquivo = join(pastaDoCanal ?? "", "convidados", `${id}.json`);
  return existsSync(arquivo) ? (JSON.parse(readFileSync(arquivo, "utf8")) as Personagem) : undefined;
};

// Mundo 3D: os bonecos de peças usam as cores do elenco (o desenho 2D não entra) e a voz de cada um
if (ehMundo3D) {
  type No3D = { id: string; visual?: unknown };
  const personagens: No3D[] = peca3d.personagens ?? [];
  const achados: string[] = [];
  const figurantes: string[] = [];
  peca3d.vozes = peca3d.vozes ?? {};
  for (const p of personagens) {
    const doElenco = elenco.find((e) => e.id === p.id) ?? doConvidado(p.id);
    if (!doElenco) {
      figurantes.push(p.id);
      continue;
    }
    p.visual = doElenco.visual;
    if (doElenco.voz && !peca3d.vozes[p.id]) peca3d.vozes[p.id] = VOZES[doElenco.voz] ?? { voz: doElenco.voz };
    achados.push(doElenco.nome);
  }
  writeFileSync(caminho, `${JSON.stringify(peca3d, null, 2)}\n`);
  console.log(`Mundo 3D: ${achados.length ? `${achados.join(", ")} com as cores do elenco` : "ninguém do elenco"}.`);
  if (figurantes.length) console.log(`Fora do elenco (saem com cores variadas; use veste para a cor da roupa): ${figurantes.join(", ")}. Ids do elenco: ${elenco.map((e) => e.id).join(", ")}`);
  process.exit(0);
}
const escolhidos = ids.map((id) => {
  const p = elenco.find((e) => e.id === id) ?? doConvidado(id);
  if (!p) {
    console.error(`Não achei "${id}" no elenco nem em convidados/. Ids do elenco: ${elenco.map((e) => e.id).join(", ")}`);
    process.exit(1);
  }
  const { id: pid, nome, voz, tipo, criatura, objeto, visual, desenho } = p;
  return {
    id: pid,
    nome,
    ...(voz ? { voz } : {}),
    ...(tipo === "criatura" ? { tipo, ...(criatura ? { criatura } : {}), ...(objeto ? { objeto } : {}) } : {}),
    visual,
    ...(desenho ? { desenho } : {}),
  };
});

const peca = JSON.parse(readFileSync(caminho, "utf8"));
peca.elenco = escolhidos;
// O estilo visual do canal (npm run canal grava em estilo.json): o render segue ele
const arquivoDoEstilo = join(pastaDoCanal ?? "", "estilo.json");
if (existsSync(arquivoDoEstilo)) peca.estilo = JSON.parse(readFileSync(arquivoDoEstilo, "utf8"));
// Os cenários criados pela equipe que o roteiro usa (os que faltarem, a coordenadora manda desenhar)
const arquivoDeCenarios = join(pastaDoCanal ?? "", "cenarios.json");
const cenariosFaltando = porCenariosNoRoteiro(peca, existsSync(arquivoDeCenarios) ? JSON.parse(readFileSync(arquivoDeCenarios, "utf8")) : []);
writeFileSync(caminho, `${JSON.stringify(peca, null, 2)}\n`);
console.log(
  `Elenco do episódio: ${escolhidos.map((p) => `${p.nome}${p.desenho ? " (desenho próprio)" : p.tipo === "criatura" ? " (criatura do kit)" : ""}`).join(" e ")}.${peca.estilo ? ` Estilo: ${peca.estilo.modelo}, fundo ${peca.estilo.fundo}.` : ""}`,
);
if (cenariosFaltando.length) console.log(`Cenários ainda não desenhados: ${cenariosFaltando.join(", ")} (a designer cria; depois npm run cenarios).`);
