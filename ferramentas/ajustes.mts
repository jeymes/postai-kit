// Os ajustes que o dono pediu na tela Animação do Postaí ("Pedir ajuste" num
// vídeo que espera aprovação). Para cada um, grava o roteiro guardado em
// conteudo/ajuste-<corteId>.json, avisa o Postaí que a equipe está fazendo e
// mostra o pedido. A equipe refaz e manda com:
//   npm run aprovar -- conteudo/ajuste-<corteId>.json --substitui <corteId>
//
// Uso: npm run ajustes                          (baixa os pedidos)
//      npm run ajustes -- --erro <corteId> "<o problema em palavras simples>"
import { writeFileSync } from "node:fs";
import { exigirChave, ferramenta } from "./postai.ts";

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
    ajustes: Array<{ corteId: string; titulo: string; pedido: string; roteiro: unknown }>;
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
    writeFileSync(arquivo, `${JSON.stringify(a.roteiro, null, 2)}\n`);
    await ferramenta("mudar_ajuste", { corteId: a.corteId, status: "fazendo" });
    console.log(`\nAJUSTE ${a.corteId}\n  vídeo: ${a.titulo}\n  o dono pediu: ${a.pedido}\n  roteiro: ${arquivo}\n  ao terminar: npm run aprovar -- ${arquivo} --substitui ${a.corteId}`);
  }
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
}
