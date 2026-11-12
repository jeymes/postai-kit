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
export async function ferramenta<T = string>(nome: string, argumentos: Record<string, unknown> = {}): Promise<T> {
  if (!env.POSTAI_CHAVE) {
    throw new Error("Falta a POSTAI_CHAVE no .env. Peça ao Claude para usar a ferramenta instalar_cortes do Postaí (ou crie em Postaí > Criar com o Claude > Conectar).");
  }
  const resposta = await fetch(URL_MCP, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.POSTAI_CHAVE}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method: "tools/call", params: { name: nome, arguments: argumentos } }),
  });
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
