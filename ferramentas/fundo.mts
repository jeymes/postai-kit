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
import { mkdirSync, openSync, writeFileSync } from "node:fs";
import { caminhoDoRegistro, COMANDOS_DE_FUNDO, rodando } from "./fundo-comum.ts";

const [comando, ...args] = process.argv.slice(2);
if (!comando || !(COMANDOS_DE_FUNDO as readonly string[]).includes(comando)) {
  console.error(`Uso: npm run fundo -- <${COMANDOS_DE_FUNDO.join(" | ")}> [argumentos]`);
  process.exit(1);
}

const registro = caminhoDoRegistro(comando, args);
const espera = `npm run esperar -- ${[comando, ...args].join(" ")}`;
mkdirSync("out", { recursive: true });

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
