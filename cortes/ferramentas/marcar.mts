// Avisa no app (menu Cortes) o andamento de um pedido.
// Uso: npm run marcar -- <pedidoId> processando|pronto|erro "mensagem"
import { ferramenta } from "./postai.ts";

const [pedidoId, status, ...resto] = process.argv.slice(2);
if (!pedidoId || !["processando", "pronto", "erro"].includes(status)) {
  console.error('Uso: npm run marcar -- <pedidoId> processando|pronto|erro "mensagem"');
  process.exit(1);
}
console.log(await ferramenta("mudar_pedido_de_corte", { pedidoId, status, mensagem: resto.join(" ") }));
