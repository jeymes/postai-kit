// Anota no Postaí algo que a crítica achou e que só o código do kit resolve
// (a equipe não pode mudar o código). O dono junta os mais repetidos e manda
// corrigir o kit para todos. Nunca derruba a rotina.
//
// Uso: npm run limite -- <assunto> "o problema e onde apareceu"
//      assunto: legenda, pose, movimento, imagem, voz, musica, capa, texto-na-tela, cartao, tempo ou outro
import { ferramenta } from "./postai.ts";

const [assunto, ...resto] = process.argv.slice(2);
const texto = resto.join(" ").trim();
if (!assunto || !texto) {
  console.error('Uso: npm run limite -- <assunto> "o problema e onde apareceu"');
  process.exit(0);
}
if (!process.env.POSTAI_CHAVE) {
  console.log("(sem o passe do Postaí: o limite não foi anotado)");
  process.exit(0);
}
try {
  console.log(await ferramenta("anotar_limite_do_kit", { assunto, texto: texto.slice(0, 300) }));
} catch (erro) {
  console.log(`(limite não anotado: ${erro instanceof Error ? erro.message : String(erro)})`);
}
