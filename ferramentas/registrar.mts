// Grava no Postaí o episódio que acabou de ir para aprovação: a linha do
// registro e o "Próximo" atualizado (formato seguinte, próximo capítulo e o que
// já aconteceu na série). O registro fica no Postaí, não no GitHub.
//
// Uso: POSTAI_CHAVE=postai.xxx.yyy npm run registrar -- canais/<canal>/registro.json [conteudo/<arquivo>.json]
//      registro.json = { "linha": { "data", "formato", "titulo", "tema", "cenarios"? }, "proximo": "<markdown>" }
// Com o roteiro, os cenários do vídeo entram sozinhos na linha (coluna Cenários do
// episodios.md), para o próximo vídeo não repetir o lugar (28/11/2026).
import { readFileSync } from "node:fs";
import { exigirChave, ferramenta } from "./postai.ts";

const soltos = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const caminho = soltos.find((arg) => !arg.startsWith("conteudo/")) ?? soltos[0];
const roteiro = soltos.find((arg) => arg !== caminho && arg.endsWith(".json"));
/** Os lugares do roteiro: o cenario do topo (texto ou { id }), o de cada cena e o lugar do 3D */
function cenariosDo(arquivo: string): string[] {
  const peca = JSON.parse(readFileSync(arquivo, "utf8")) as { cenario?: unknown; cenas?: Array<{ cenario?: unknown; lugar?: unknown }> };
  const id = (c: unknown) => (typeof c === "string" ? c : c && typeof c === "object" && "id" in c ? String((c as { id: unknown }).id) : "");
  return [...new Set([id(peca.cenario), ...(peca.cenas ?? []).flatMap((c) => [id(c.cenario), id(c.lugar)])].filter(Boolean))];
}
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
    if (roteiro && !registro.linha.cenarios) registro.linha.cenarios = cenariosDo(roteiro);
  }
  console.log(await ferramenta("registrar_episodio", registro));
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
}
