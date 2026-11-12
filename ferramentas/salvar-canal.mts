// Grava no Postaí o canal que a criadora-de-canal montou (bíblia, CTAs e
// elenco), a partir de um JSON, e marca a montagem como pronta. As
// referências e os aprendizados do dono ficam como estão.
//
// Uso: POSTAI_CHAVE=postai.xxx.yyy npm run salvar-canal -- canais/<canal>/canal-montado.json
//      --montando          avisa na tela Animação que a montagem começou
//      --erro "mensagem"   marca a montagem com erro, sem gravar nada
import { readFileSync } from "node:fs";
import { exigirChave, ferramenta } from "./postai.ts";

const args = process.argv.slice(2);
exigirChave();

try {
  if (args.includes("--montando")) {
    await ferramenta("mudar_montagem", { status: "montando", mensagem: "" });
    console.log("Montagem marcada como em andamento.");
    process.exit(0);
  }
  const erro = args.indexOf("--erro");
  if (erro >= 0) {
    await ferramenta("mudar_montagem", { status: "erro", mensagem: args[erro + 1] ?? "" });
    console.log("Montagem marcada com erro.");
    process.exit(0);
  }
  const caminho = args.find((arg) => !arg.startsWith("--"));
  if (!caminho) throw new Error("Uso: npm run salvar-canal -- canais/<canal>/canal-montado.json");
  const canal = JSON.parse(readFileSync(caminho, "utf8"));
  console.log(await ferramenta("salvar_canal_animado", canal));
  await ferramenta("mudar_montagem", { status: "pronta", mensagem: "Confira a bíblia e os personagens e ajuste o que quiser." });
  console.log("Montagem marcada como pronta.");
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
}
