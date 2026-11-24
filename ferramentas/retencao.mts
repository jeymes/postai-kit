// A retenção dos vídeos do YouTube do canal (23/11/2026), pelo Postaí (YouTube
// Analytics API): quanto saiu no gancho, onde metade saiu, quantos chegaram ao
// fim e as maiores quedas com o segundo. A equipe cruza cada queda com a fala do
// roteiro naquele segundo e anota o que se repete (npm run aprendizado).
//
// Uso: npm run retencao -- [--ultimos 5] [--video <id do YouTube>] [--conta <contaId>]
import { exigirChave, ferramenta } from "./postai.ts";

const args = process.argv.slice(2);
const valor = (nome: string) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : undefined;
};
exigirChave();
const pedido: Record<string, unknown> = {};
if (valor("ultimos")) pedido.ultimos = Number(valor("ultimos"));
if (valor("video")) pedido.videoId = valor("video");
if (valor("conta")) pedido.contaId = valor("conta");
try {
  console.log(await ferramenta("ver_retencao", pedido));
} catch (erro) {
  console.log(`(sem a retenção agora: ${erro instanceof Error ? erro.message : String(erro)})`);
}
