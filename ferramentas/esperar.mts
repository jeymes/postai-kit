// Espera um comando que roda em segundo plano (npm run fundo) por até 9
// minutos e diz como ficou: PRONTO, FALHOU ou AINDA RODANDO (aí é só rodar
// o mesmo npm run esperar de novo). Rode com o tempo máximo do comando (10 min).
// Na narração pela voz do Google, também ESPERAR_COTA (sai com 75): a cota
// acabou, a rotina para e conta ao dono (ver o topo do ferramentas/narrar.mts).
//
// Uso: npm run esperar -- <comando> [argumentos]   (os mesmos do npm run fundo)
//      --minutos N: espera até N minutos (padrão 9)

import { existsSync, readFileSync } from "node:fs";
import { caminhoDoRegistro, rodando } from "./fundo-comum.ts";

const entrada = process.argv.slice(2);
const i = entrada.indexOf("--minutos");
const minutos = i >= 0 ? Math.max(1, Math.min(9, Number(entrada[i + 1]) || 9)) : 9;
const [comando, ...args] = i >= 0 ? [...entrada.slice(0, i), ...entrada.slice(i + 2)] : entrada;
if (!comando) {
  console.error("Uso: npm run esperar -- <comando> [argumentos] (os mesmos do npm run fundo)");
  process.exit(1);
}

const registro = caminhoDoRegistro(comando, args);
if (!existsSync(registro)) {
  console.error(`Nada rodando para isso. Comece com: npm run fundo -- ${[comando, ...args].join(" ")}`);
  process.exit(1);
}

const fim = (texto: string) =>
  texto
    .split("\n")
    .filter((linha) => linha.trim() && !/UNDICI|trace-warnings/.test(linha))
    .slice(-8)
    .join("\n");
const pronto = (texto: string) => /^Pronto:/m.test(texto);

const limite = Date.now() + minutos * 60 * 1000;
for (;;) {
  const texto = readFileSync(registro, "utf8");
  if (pronto(texto)) {
    console.log(`${fim(texto)}\nPRONTO`);
    process.exit(0);
  }
  // A narração parou porque a cota da voz do Google acabou (código 75 do narrar):
  // não é falha para corrigir, a rotina para e tenta outro dia
  if (/^ESPERAR_COTA:/m.test(texto) && !rodando(registro)) {
    console.log(`${fim(texto)}\nESPERAR_COTA: o vídeo espera a cota da voz. Pare a rotina e conte ao dono; não troque para o Kokoro.`);
    process.exit(75);
  }
  // Terminou sem "Pronto:": falhou (a mensagem está nas últimas linhas)
  if (!rodando(registro) || /^Falhou/m.test(texto)) {
    console.log(`${fim(texto)}\nFALHOU: veja as linhas acima. Corrija e rode de novo npm run fundo -- ${[comando, ...args].join(" ")}`);
    process.exit(1);
  }
  if (Date.now() >= limite) {
    console.log(`${fim(texto)}\nAINDA RODANDO: rode de novo npm run esperar -- ${[comando, ...args].join(" ")}`);
    process.exit(0);
  }
  await new Promise((resolver) => setTimeout(resolver, 15_000));
}
