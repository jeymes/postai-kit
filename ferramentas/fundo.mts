// Roda um comando do kit em segundo plano: o render e a narração do vídeo
// longo passam de 10 minutos, o máximo de um comando da sessão. É um comando
// simples e claro no lugar de "nohup ... &": a permissão do Claude na nuvem às
// vezes barrava aquela linha como ação indesejada (18/11/2026, um vídeo pronto
// parou no render).
//
// Uso: npm run fundo -- <renderizar | previa | narrar | vigiar> [argumentos]
//      ex.: npm run fundo -- renderizar conteudo/2026-11-18-elias.json
// Depois: npm run esperar -- <o mesmo comando e argumentos>

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { caminhoDoRegistro, COMANDOS_DE_FUNDO, rodando } from "./fundo-comum.ts";

const [comando, ...args] = process.argv.slice(2);
if (!comando || !(COMANDOS_DE_FUNDO as readonly string[]).includes(comando)) {
  console.error(`Uso: npm run fundo -- <${COMANDOS_DE_FUNDO.join(" | ")}> [argumentos]`);
  process.exit(1);
}

const registro = caminhoDoRegistro(comando, args);
const espera = `npm run esperar -- ${[comando, ...args].join(" ")}`;
mkdirSync("out", { recursive: true });

// Um processo velho que travou (sem escrever no registro) ou que já terminou ("Pronto:") mas não
// saiu não pode barrar o pedido novo: o esperar leria o registro antigo e daria PRONTO sem refazer
// (26/11/2026, prévia velha mostrada à crítica). Nesses casos, encerra o velho e começa de novo.
function velhoParado() {
  if (!existsSync(registro)) return false;
  const parado = (Date.now() - statSync(registro).mtimeMs) / 1000;
  const terminou = /^Pronto:/m.test(readFileSync(registro, "utf8"));
  return (terminou && parado > 20) || parado > 8 * 60;
}
if (rodando(registro) && velhoParado()) {
  try {
    const pid = Number(readFileSync(`${registro}.pid`, "utf8").trim());
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      process.kill(pid, "SIGKILL");
    }
  } catch {
    // já saiu
  }
  try {
    unlinkSync(`${registro}.pid`);
  } catch {
    // sem arquivo
  }
  console.log(`O ${comando} anterior estava parado: encerrado, começando de novo.`);
}

// Já está rodando: não começa outro (dois renders juntos estragam os arquivos)
if (rodando(registro)) {
  console.log(`Já está rodando: ${comando}. Acompanhe com: ${espera}`);
  process.exit(0);
}

const saida = openSync(registro, "w");
const filho = spawn("npm", ["run", comando, ...(args.length ? ["--", ...args] : [])], {
  detached: true,
  stdio: ["ignore", saida, saida],
  env: process.env,
});
writeFileSync(`${registro}.pid`, String(filho.pid));
filho.unref();
console.log(`Começou em segundo plano: ${comando} (registro em ${registro}).`);
if (comando !== "vigiar") console.log(`Acompanhe com: ${espera}`);
