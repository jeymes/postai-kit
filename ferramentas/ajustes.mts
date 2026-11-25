// Os ajustes que o dono pediu na tela Animação do Postaí ("Pedir ajuste" num
// vídeo que espera aprovação). Para cada um, grava o roteiro guardado em
// conteudo/ajuste-<corteId>.json, avisa o Postaí que a equipe está fazendo e
// mostra o pedido. A equipe refaz e manda com:
//   npm run aprovar -- conteudo/ajuste-<corteId>.json --substitui <corteId>
//
// Uso: npm run ajustes                          (baixa os pedidos)
//      npm run ajustes -- --erro <corteId> "<o problema em palavras simples>"
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exigirChave, ferramenta } from "./postai.ts";

/**
 * Traz de volta o pacote do vídeo (o roteiro narrado, as fotos e a voz que o
 * aprovar guardou). A voz vai para public/narracao/ajuste-<corteId> e o roteiro
 * aponta para ela: o narrar só refaz as cenas que mudaram e as fotos já estão
 * aqui (antes a refação começava do zero e parava quando o Wikimedia bloqueava).
 * Devolve o roteiro do pacote, ou null se não deu (aí vale o roteiro guardado).
 */
async function restaurarPacote(url: string, corteId: string): Promise<unknown | null> {
  const arquivo = join(tmpdir(), `pacote-${corteId}.tar.gz`);
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`o pacote não baixou (${r.status})`);
    writeFileSync(arquivo, Buffer.from(await r.arrayBuffer()));
    const tar = spawnSync("tar", ["-xzf", arquivo], { encoding: "utf8" });
    if (tar.status !== 0) throw new Error(`o pacote não abriu: ${(tar.stderr || "").trim().slice(-200)}`);
    const manifesto = JSON.parse(readFileSync(".postai-pacote.json", "utf8")) as { roteiro: string; nome: string };
    rmSync(".postai-pacote.json", { force: true });
    let texto = readFileSync(manifesto.roteiro, "utf8");
    const novo = `ajuste-${corteId}`;
    const vozAntiga = join("public", "narracao", manifesto.nome);
    const vozNova = join("public", "narracao", novo);
    if (existsSync(vozAntiga) && manifesto.nome !== novo) {
      rmSync(vozNova, { recursive: true, force: true });
      renameSync(vozAntiga, vozNova);
      texto = texto.split(`narracao/${manifesto.nome}/`).join(`narracao/${novo}/`);
    }
    return JSON.parse(texto) as unknown;
  } catch (erro) {
    console.log(`  (o pacote não voltou: ${erro instanceof Error ? erro.message : String(erro)}; a refação começa do roteiro guardado)`);
    return null;
  } finally {
    rmSync(arquivo, { force: true });
  }
}

exigirChave();
const args = process.argv.slice(2);

try {
  if (args[0] === "--erro") {
    const [, corteId, mensagem = ""] = args;
    if (!corteId) throw new Error('Uso: npm run ajustes -- --erro <corteId> "<o problema>"');
    await ferramenta("mudar_ajuste", { corteId, status: "erro", mensagem });
    console.log("O dono vê no cartão do vídeo que o ajuste não deu certo.");
    process.exit(0);
  }

  const { ajustes } = JSON.parse(await ferramenta("ver_ajustes")) as {
    ajustes: Array<{ corteId: string; titulo: string; pedido: string; roteiro: unknown; pacote?: string | null }>;
  };
  if (ajustes.length === 0) {
    console.log("Nenhum ajuste pedido.");
    process.exit(0);
  }
  for (const a of ajustes) {
    if (!a.roteiro) {
      await ferramenta("mudar_ajuste", { corteId: a.corteId, status: "erro", mensagem: "O roteiro deste vídeo não ficou guardado. Apague e peça um novo." });
      console.log(`- ${a.corteId}: sem roteiro guardado (avisei o dono).`);
      continue;
    }
    const arquivo = `conteudo/ajuste-${a.corteId}.json`;
    // Com o pacote, o roteiro já narrado e as fotos voltam para esta máquina
    const doPacote = a.pacote ? await restaurarPacote(a.pacote, a.corteId) : null;
    writeFileSync(arquivo, `${JSON.stringify(doPacote ?? a.roteiro, null, 2)}\n`);
    if (doPacote) console.log(`  pacote de volta: as fotos e a voz do vídeo já estão aqui (o narrar só refaz as cenas que mudarem)`);
    await ferramenta("mudar_ajuste", { corteId: a.corteId, status: "fazendo" });
    // Carrossel (24/11/2026): não é vídeo; a equipe segue a parte do ajuste de rotinas/carrossel.md
    const molde = (doPacote ?? (typeof a.roteiro === "string" ? JSON.parse(a.roteiro) : a.roteiro)) as { molde?: string };
    if (molde?.molde === "Carrossel") {
      console.log(`\nAJUSTE DE CARROSSEL ${a.corteId}\n  carrossel: ${a.titulo}\n  o dono pediu: ${a.pedido}\n  roteiro: ${arquivo}\n  É UM CARROSSEL (não é vídeo): siga a parte "Ajuste de um carrossel" de rotinas/carrossel.md (sem narrar nem prévia de vídeo).\n  ao terminar: npm run aprovar -- ${arquivo} --substitui ${a.corteId}`);
      continue;
    }
    console.log(`\nAJUSTE ${a.corteId}\n  vídeo: ${a.titulo}\n  o dono pediu: ${a.pedido}\n  roteiro: ${arquivo}\n  ao terminar: npm run aprovar -- ${arquivo} --substitui ${a.corteId}`);
  }
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
}
