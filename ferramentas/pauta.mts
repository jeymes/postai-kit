// A pauta: os próximos vídeos que o dono vê (e muda) no Postaí antes de a
// equipe fazer. O vídeo de hoje sai do topo dela.
//
// Uso:
//   npm run pauta
//       pega o próximo vídeo da pauta (fica "em produção" no Postaí) e grava
//       em canais/<canal>/pauta-de-hoje.md. Se a pauta estiver vazia, avisa.
//   npm run pauta -- --propor <arquivo.json>
//       grava os próximos vídeos propostos: [{ "titulo": "...", "resumo": "..." }]
//       (até 10, na ordem em que devem sair), depois dos que já estão na pauta.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { exigirChave, ferramenta } from "./postai.ts";

exigirChave();
const args = process.argv.slice(2);
const canal = (existsSync(".postai-canal") ? readFileSync(".postai-canal", "utf8").trim() : "") || "canal";
const pasta = `canais/${canal === "dark" ? "dark" : "canal"}`;

function json(resposta: unknown) {
  return JSON.parse(typeof resposta === "string" ? resposta : JSON.stringify(resposta));
}

const indice = args.indexOf("--propor");
if (indice !== -1) {
  const arquivo = args[indice + 1];
  if (!arquivo || !existsSync(arquivo)) {
    console.error("Uso: npm run pauta -- --propor <arquivo.json>");
    process.exit(1);
  }
  const propostos = JSON.parse(readFileSync(arquivo, "utf8")) as Array<{ titulo: string; resumo?: string }>;
  const atuais = (json(await ferramenta("ver_pauta", {})) as { itens: Array<{ id: string; titulo: string; resumo: string }> }).itens;
  const itens = [...atuais.map(({ id, titulo, resumo }) => ({ id, titulo, resumo })), ...propostos].slice(0, 10);
  console.log(await ferramenta("salvar_pauta", { itens }));
  process.exit(0);
}

const { item } = json(await ferramenta("pegar_da_pauta", {})) as { item: { titulo: string; resumo: string } | null };
if (!item) {
  console.log(
    "PAUTA VAZIA. Peça à roteirista 5 próximos vídeos que sigam o canal (título até 120 caracteres e um resumo de uma ou duas frases), " +
      "grave em conteudo/pauta.json como [{\"titulo\", \"resumo\"}] e rode npm run pauta -- --propor conteudo/pauta.json; depois rode npm run pauta de novo.",
  );
  process.exit(0);
}
mkdirSync(pasta, { recursive: true });
writeFileSync(
  `${pasta}/pauta-de-hoje.md`,
  `# O vídeo de hoje (da pauta que o dono vê no Postaí)\n\n**${item.titulo}**\n\n${item.resumo}\n\nFaça exatamente este vídeo: o título pode melhorar, mas o assunto é este.\n`,
);
console.log(`VÍDEO DE HOJE (da pauta): ${item.titulo}\n${item.resumo}\nGravado em ${pasta}/pauta-de-hoje.md.`);
