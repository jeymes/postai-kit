// Anota um aprendizado no canal (o mesmo campo da tela do Postaí), para todos os
// próximos vídeos. Usado depois de ler a retenção (npm run retencao): só o que
// se repete em 2 vídeos ou mais, em até 300 letras.
//
// Uso: npm run aprendizado -- "o público sai quando uma cena passa de 8 s sem nada novo"
import { exigirChave, ferramenta } from "./postai.ts";

const texto = process.argv.slice(2).join(" ").trim();
if (!texto) {
  console.error('Uso: npm run aprendizado -- "o que aprendeu"');
  process.exit(0);
}
exigirChave();
try {
  console.log(await ferramenta("anotar_aprendizado", { texto: texto.slice(0, 300) }));
} catch (erro) {
  console.log(`(aprendizado não anotado: ${erro instanceof Error ? erro.message : String(erro)})`);
}
