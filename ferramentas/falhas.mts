// Quando um comando do kit termina com erro, ele mesmo anota no Postaí (a fila
// da tela Saúde do kit), com o fim da saída de erro: assim o Postaí sabe o que
// quebrou sem depender da coordenadora lembrar de avisar.
//
// Carregado antes de cada comando pelo package.json (node --import). Só anota
// com o passe da rotina (~/.postai-passe) ou a POSTAI_CHAVE: no computador sem
// chave, não faz nada. Nunca muda o resultado do comando.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const URL_DO_POSTAI = process.env.POSTAI_URL || "https://postaiwebapp.online/mcp";
const PASTA = dirname(fileURLToPath(import.meta.url));

// O nome do comando: o arquivo dentro de ferramentas/ (voz/instalar vira voz-instalar)
const comando = relative(PASTA, process.argv[1] ?? "")
  .replace(/\.m?[jt]s$/, "")
  .replace(/[\\/]+/g, "-")
  .toLowerCase();

// Estes já avisam por outro caminho ou terminam com erro de propósito:
// checar (a rotina anota), conferir (lista o que a equipe deve arrumar),
// limite (é o próprio anotar), andamento e vigia (falam com o Postaí o tempo todo)
// esperar: quem falhou (o comando em segundo plano) já anota sozinho
const IGNORAR = new Set(["checar", "conferir", "limite", "andamento", "vigia", "diagnostico", "falhas", "esperar"]);

// Guarda o fim do que saiu como erro
const saida: string[] = [];
function guardar(texto: string) {
  saida.push(texto);
  while (saida.length > 30) saida.shift();
}
const erroOriginal = console.error.bind(console);
console.error = (...partes: unknown[]) => {
  guardar(partes.map((p) => (p instanceof Error ? (p.stack ?? p.message) : String(p))).join(" "));
  erroOriginal(...partes);
};
// Erro não tratado: o Node mostra e sai com 1; aqui só guarda a mensagem
process.on("uncaughtExceptionMonitor", (erro) => guardar(erro instanceof Error ? (erro.stack ?? erro.message) : String(erro)));

function acesso() {
  const passe = join(homedir(), ".postai-passe");
  if (existsSync(passe)) {
    const valor = readFileSync(passe, "utf8").trim();
    if (/^pta\.[A-Za-z0-9]+\.[A-Za-z0-9_-]+$/.test(valor)) return valor;
  }
  return process.env.POSTAI_CHAVE || null;
}

function canal() {
  const valor = process.env.POSTAI_CANAL || (existsSync(".postai-canal") ? readFileSync(".postai-canal", "utf8") : "");
  return valor.trim() === "dark" ? "dark" : null;
}

/** O que interessa do erro: as linhas de cima de cada pilha, sem os "at ..." de baixo. */
function resumo() {
  return saida
    .join("\n")
    .split("\n")
    .filter((linha) => !/^\s+at /.test(linha))
    .join(" | ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(-1500);
}

// No "exit" só dá para fazer coisa síncrona: um node filho manda e o comando espera (até 5 s)
process.on("exit", (codigo) => {
  if (codigo === 0 || IGNORAR.has(comando) || !comando || comando.startsWith("..")) return;
  const chave = acesso();
  const mensagem = resumo();
  if (!chave || !mensagem) return;
  const qual = canal();
  const corpo = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "anotar_falha_do_kit", arguments: { comando, mensagem, ...(qual ? { canal: qual } : {}) } },
  });
  const enviar =
    'fetch(process.env.POSTAI_FALHA_URL,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/event-stream",Authorization:"Bearer "+process.env.POSTAI_FALHA_CHAVE},body:process.env.POSTAI_FALHA_CORPO}).catch(()=>{}).finally(()=>process.exit(0))';
  try {
    spawnSync(process.execPath, ["-e", enviar], {
      env: { ...process.env, NODE_OPTIONS: "", POSTAI_FALHA_URL: URL_DO_POSTAI, POSTAI_FALHA_CHAVE: chave, POSTAI_FALHA_CORPO: corpo },
      timeout: 5000,
      stdio: "ignore",
    });
  } catch {
    // Anotar é extra: nunca atrapalha o comando
  }
});
