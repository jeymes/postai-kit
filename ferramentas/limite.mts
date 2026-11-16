// Anota no Postaí algo que a crítica achou e que só o código do kit resolve
// (a equipe não pode mudar o código). O dono junta os mais repetidos e manda
// corrigir o kit para todos. Nunca derruba a rotina.
//
// Uso: npm run limite -- <assunto> "o problema e onde apareceu"
//      assunto: legenda, pose, movimento, imagem, voz, musica, capa, texto-na-tela, cartao, tempo ou outro
import { ferramenta } from "./postai.ts";

const ASSUNTOS = ["legenda", "pose", "movimento", "imagem", "voz", "musica", "capa", "texto-na-tela", "cartao", "tempo", "outro"];
const [pedido, ...resto] = process.argv.slice(2);
// Assunto fora da lista vira "outro" (com o nome no texto): nenhuma anotação se perde
const conhecido = ASSUNTOS.includes((pedido ?? "").toLowerCase());
const assunto = conhecido ? pedido.toLowerCase() : "outro";
const texto = `${conhecido || !pedido ? "" : `[${pedido}] `}${resto.join(" ").trim()}`;
if (!pedido || !resto.join(" ").trim()) {
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
