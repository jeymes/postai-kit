// Conversa com o conector do Postaí (/mcp), com a chave do .env.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ } from "./comum.ts";

function lerEnv() {
  const arquivo = join(RAIZ, ".env");
  const env: Record<string, string> = {};
  if (existsSync(arquivo)) {
    for (const linha of readFileSync(arquivo, "utf8").split("\n")) {
      const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(linha);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { ...env, ...process.env } as Record<string, string | undefined>;
}

const env = lerEnv();
const URL_MCP = env.POSTAI_MCP_URL || "https://postaiwebapp.online/mcp";

let id = 0;
// Estas criam algo no Postaí: se a resposta se perder, repetir duplicaria.
const NAO_REPETIR = new Set(["por_para_aprovacao"]);
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Chama o Postaí. Se ele falhar por um instante (5xx ou queda de rede), tenta de novo até 3 vezes. */
async function chamar(nome: string, corpo: string) {
  const tentativas = NAO_REPETIR.has(nome) ? 1 : 4;
  for (let n = 1; ; n++) {
    try {
      const resposta = await fetch(URL_MCP, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.POSTAI_CHAVE}` },
        body: corpo,
      });
      if (resposta.status < 500 || n >= tentativas) return resposta;
    } catch (erro) {
      if (n >= tentativas) throw erro;
    }
    await espera(2000 * n);
  }
}

export async function ferramenta<T = string>(nome: string, argumentos: Record<string, unknown> = {}): Promise<T> {
  if (!env.POSTAI_CHAVE) {
    throw new Error("Falta a POSTAI_CHAVE no .env. Peça ao Claude para usar a ferramenta instalar_cortes do Postaí (ou crie em Postaí > Criar com o Claude > Conectar).");
  }
  const resposta = await chamar(
    nome,
    JSON.stringify({ jsonrpc: "2.0", id: ++id, method: "tools/call", params: { name: nome, arguments: argumentos } }),
  );
  if (resposta.status === 401) throw new Error("A chave do Postaí não vale mais. Crie outra e troque no .env.");
  if (!resposta.ok) throw new Error(`O Postaí respondeu ${resposta.status} em ${nome}.`);
  const dados = (await resposta.json()) as {
    error?: { message: string };
    result?: { isError?: boolean; content?: Array<{ text?: string }> };
  };
  if (dados.error) throw new Error(`${nome}: ${dados.error.message}`);
  const texto = dados.result?.content?.map((c) => c.text ?? "").join("\n") ?? "";
  if (dados.result?.isError) throw new Error(`${nome}: ${texto}`);
  try {
    return JSON.parse(texto) as T;
  } catch {
    return texto as T;
  }
}

/**
 * Escreve uma linha no diário do pedido (a pessoa vê na tela Cortes, com a hora).
 * Nunca para o trabalho: se o aviso não chegar, só mostra no terminal.
 */
export async function avisar(pedidoId: string | undefined, mensagem: string) {
  if (!pedidoId) return;
  try {
    await ferramenta("mudar_pedido_de_corte", { pedidoId, status: "processando", mensagem });
  } catch (erro) {
    console.error(`  (não deu para avisar o Postaí: ${(erro as Error).message}; seguindo)`);
  }
}
