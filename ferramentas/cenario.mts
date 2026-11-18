// Um cenário novo desenhado pela equipe (molde Conversa): confere o SVG, faz a
// ficha (o lugar com 2 pessoas, no estilo do canal) e, com --gravar, grava no
// canal do Postaí e no canais/<canal>/cenarios.json. Use quando a história
// pede um lugar que o kit não tem (igreja, praia, carro...).
//
// Uso:
//   npm run cenario -- canais/<canal> canais/<canal>/cenarios-novos/<id>.json            ficha (confira as imagens)
//   npm run cenario -- canais/<canal> canais/<canal>/cenarios-novos/<id>.json --gravar   grava no canal
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CENARIOS_DO_KIT, problemaNoSvg, type CenarioProprio } from "./cenarios-do-roteiro.ts";

const args = process.argv.slice(2);
const [pasta, arquivo] = args.filter((arg) => !arg.startsWith("--"));
if (!pasta || !arquivo || !existsSync(pasta) || !existsSync(arquivo)) {
  console.error("Uso: npm run cenario -- canais/<canal> <arquivo do cenário>.json [--gravar]");
  process.exit(1);
}
const lido = JSON.parse(readFileSync(arquivo, "utf8"));
const cenario: CenarioProprio = lido.cenario ?? lido;

const problemas = [
  /^[a-z0-9][a-z0-9-]{1,39}$/.test(cenario.id ?? "") ? null : 'id em minúsculas, sem acento, com hífen (ex.: "igreja")',
  CENARIOS_DO_KIT.includes(cenario.id) ? `"${cenario.id}" já é um cenário do kit: use outro id` : null,
  cenario.nome?.trim() ? null : "falta o nome",
  problemaNoSvg(cenario.fundo, "fundo"),
  cenario.frente ? problemaNoSvg(cenario.frente, "frente") : null,
].filter(Boolean);
if (problemas.length) {
  console.error(`Cenário com problema:\n- ${problemas.join("\n- ")}`);
  process.exit(1);
}

if (args.includes("--gravar")) {
  const { exigirChave, ferramenta } = await import("./postai.ts");
  exigirChave();
  try {
    console.log(await ferramenta("adicionar_cenario", { cenario }));
  } catch (falha) {
    console.error(falha instanceof Error ? falha.message : String(falha));
    process.exit(1);
  }
  // Já fica no cenarios.json do canal (sem precisar rodar o npm run canal de novo)
  const doCanal = join(pasta, "cenarios.json");
  const lista: CenarioProprio[] = existsSync(doCanal) ? JSON.parse(readFileSync(doCanal, "utf8")) : [];
  writeFileSync(doCanal, `${JSON.stringify([...lista.filter((c) => c.id !== cenario.id), cenario], null, 2)}\n`);
  console.log(`Gravado também em ${doCanal}. No roteiro: "cenario": "${cenario.id}" e depois npm run cenarios.`);
  process.exit(0);
}

// A ficha: o lugar com 2 pessoas do canal (ou a Bia e a Lu), no estilo do canal.
// Duas imagens: em pé e com a pessoa da esquerda sentada (se tiver frente).
const ler = <T,>(caminho: string): T | null => (existsSync(caminho) ? (JSON.parse(readFileSync(caminho, "utf8")) as T) : null);
const estilo = ler<unknown>(join(pasta, "estilo.json"));
const elenco = (ler<Array<{ id: string; tipo?: string }>>(join(pasta, "elenco.json")) ?? []).filter((p) => p.tipo !== "criatura").slice(0, 2);
const [esq, dir] = elenco.length === 2 ? elenco.map((p) => p.id) : ["noiva", "organizadora"];
const base = {
  titulo: cenario.nome,
  cenario: cenario.id,
  cenariosProprios: [cenario],
  ...(estilo ? { estilo } : {}),
  ...(elenco.length === 2 ? { elenco } : {}),
  cenas: [
    {
      quem: esq,
      fala: "Olha só este lugar.",
      estados: { [esq]: { pose: "explicando", expressao: "feliz" }, [dir]: { pose: "cintura", expressao: "surpresa" } },
    },
  ],
};
mkdirSync("out", { recursive: true });
const fichas: Array<{ nome: string; props: unknown }> = [{ nome: "em-pe", props: base }];
if (cenario.frente) {
  fichas.push({
    nome: "sentado",
    props: { ...base, cenas: [{ ...base.cenas[0], estados: { [esq]: { pose: "sentado", expressao: "neutra" }, [dir]: { pose: "normal", expressao: "feliz" } } }] },
  });
}
const saidas: string[] = [];
for (const ficha of fichas) {
  const props = join("out", `.ficha-cenario-${cenario.id}.json`);
  writeFileSync(props, JSON.stringify(ficha.props));
  const destino = join(pasta, `ficha-cenario-${cenario.id}-${ficha.nome}.png`);
  const r = spawnSync("npx", ["remotion", "still", "Conversa", destino, "--frame=40", `--props=${props}`, "--log=error"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  rmSync(props, { force: true });
  if (r.status !== 0) {
    console.error("Não consegui fazer a ficha (o SVG pode ter erro de sintaxe).");
    process.exit(1);
  }
  saidas.push(destino);
}
console.log(`Ficha pronta: ${saidas.join(", ")}`);
console.log("Abra as imagens e confira. Se estiver bom, rode de novo com --gravar.");
