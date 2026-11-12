// Avisa na tela Animação do Postaí o que a equipe está fazendo agora ("Sua
// equipe", ao vivo). Nunca derruba a rotina: se o aviso falhar, só avisa aqui.
//
// Uso: npm run andamento -- <agente> <trabalhando|feito|erro> "mensagem curta" [--nova]
//      --nova: a coordenadora começando o dia (a tela limpa a execução anterior)
import { ferramenta } from "./postai.ts";

const args = process.argv.slice(2);
const soltos = args.filter((arg) => !arg.startsWith("--"));
const [agente, status, ...resto] = soltos;
if (!agente || !status) {
  console.error('Uso: npm run andamento -- <agente> <trabalhando|feito|erro> "mensagem"');
  process.exit(0);
}
if (!process.env.POSTAI_CHAVE) {
  console.log("(sem POSTAI_CHAVE: o andamento não vai para a tela)");
  process.exit(0);
}
try {
  await ferramenta("contar_andamento", { agente, status, mensagem: resto.join(" ").slice(0, 200), nova: args.includes("--nova") });
  console.log(`Andamento: ${agente} ${status}.`);
} catch (erro) {
  console.log(`(andamento não registrado: ${erro instanceof Error ? erro.message : String(erro)})`);
}
