// Fala direto com o /mcp do Postaí, com a chave em POSTAI_CHAVE: o caminho da
// rotina na nuvem, que não tem o conector instalado (POSTAI_URL troca o
// endereço; o padrão é o do Postaí). Usado pelo aprovar e pelo canal.

import { existsSync, readFileSync } from "node:fs";

const URL_DO_POSTAI = process.env.POSTAI_URL || "https://postaiwebapp.online/mcp";

// De qual canal é esta rotina: a Animação (padrão) ou o Canal dark. A rotina do
// Canal dark grava "dark" no arquivo .postai-canal (ou POSTAI_CANAL=dark), e
// todas as ferramentas dos canais passam a falar com ele.
const CANAL = (process.env.POSTAI_CANAL || (existsSync(".postai-canal") ? readFileSync(".postai-canal", "utf8") : "")).trim();
const FERRAMENTAS_DOS_CANAIS = new Set([
  "ver_canal_animado",
  "ver_episodios",
  "registrar_episodio",
  "ver_marca",
  "contar_andamento",
  "salvar_canal_animado",
  "ver_ajustes",
  "por_para_aprovacao",
  "ver_pauta",
  "salvar_pauta",
  "pegar_da_pauta",
]);

export function exigirChave() {
  if (process.env.POSTAI_CHAVE) return;
  console.error("Falta a chave do Postaí em POSTAI_CHAVE (Postaí > Criar com o Claude > Conectar > Criar chave).");
  process.exit(1);
}

let id = 0;

/** Chama uma ferramenta do conector e devolve o texto da resposta. */
export async function ferramenta(nome: string, args: Record<string, unknown> = {}) {
  const resposta = await fetch(URL_DO_POSTAI, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${process.env.POSTAI_CHAVE}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++id,
      method: "tools/call",
      params: { name: nome, arguments: CANAL === "dark" && FERRAMENTAS_DOS_CANAIS.has(nome) ? { ...args, canal: "dark" } : args },
    }),
  });
  if (resposta.status === 401) throw new Error("O Postaí recusou a chave. Crie outra em Criar com o Claude > Conectar.");
  if (!resposta.ok) throw new Error(`O Postaí respondeu ${resposta.status} em ${nome}.`);
  const corpo = (await resposta.json()) as {
    result?: { content?: Array<{ text?: string }>; isError?: boolean };
    error?: { message: string };
  };
  if (corpo.error) throw new Error(`${nome}: ${corpo.error.message}`);
  const texto = corpo.result?.content?.[0]?.text ?? "";
  if (corpo.result?.isError) throw new Error(`${nome}: ${texto}`);
  return texto;
}
