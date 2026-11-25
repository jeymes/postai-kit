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
// No canal de carrosséis (.postai-canal = carrossel, 24/11/2026), a pauta é a
// dos próximos carrosséis e as mensagens falam de carrossel.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { exigirChave, ferramenta } from "./postai.ts";

exigirChave();
const args = process.argv.slice(2);
const canal = (existsSync(".postai-canal") ? readFileSync(".postai-canal", "utf8").trim() : "") || "canal";
const pasta = `canais/${canal === "dark" ? "dark" : canal === "carrossel" ? "carrossel" : "canal"}`;
const carrossel = canal === "carrossel";

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
  // O que está em alta no nicho (aba Nicho do Postaí), para a roteirista propor
  // a partir do que funciona no YouTube. Se falhar, segue sem.
  let nicho = "";
  try {
    // O canal de carrosséis não tem a aba Nicho
    if (carrossel) throw new Error("sem nicho");
    const { texto, temVideos } = json(await ferramenta("ver_nicho", { canal: canal === "dark" ? "dark" : "animacao" })) as {
      texto: string;
      temVideos: boolean;
    };
    if (temVideos) {
      mkdirSync(pasta, { recursive: true });
      writeFileSync(`${pasta}/nicho.md`, `${texto}\n`);
      nicho = ` Antes, a roteirista lê ${pasta}/nicho.md (o que está em alta no nicho no YouTube e as ideias que o dono viu): prefira assuntos e ganchos que funcionam lá, sem copiar título, capa ou roteiro de ninguém.`;
    }
  } catch {
    // sem o nicho, a pauta sai só da bíblia do canal
  }
  if (carrossel) {
    console.log(
      "PAUTA VAZIA (carrosséis). Peça à redatora-de-carrossel 5 próximos carrosséis que sigam o canal e os modelos ligados (canal-postai.md, parte Modelos de carrossel): " +
        "título até 120 caracteres e um resumo de uma ou duas frases que diga o modelo (ex.: \"dicas: os 6 passos de...\"). " +
        "Grave em conteudo/pauta-carrossel.json como [{\"titulo\", \"resumo\"}] e rode npm run pauta -- --propor conteudo/pauta-carrossel.json; depois rode npm run pauta de novo." +
        nicho,
    );
    process.exit(0);
  }
  console.log(
    "PAUTA VAZIA. Peça à roteirista 5 próximos vídeos que sigam o canal (título até 120 caracteres e um resumo de uma ou duas frases), " +
      "grave em conteudo/pauta.json como [{\"titulo\", \"resumo\"}] e rode npm run pauta -- --propor conteudo/pauta.json; depois rode npm run pauta de novo." +
      nicho,
  );
  process.exit(0);
}
mkdirSync(pasta, { recursive: true });
if (carrossel) {
  writeFileSync(
    `${pasta}/pauta-de-hoje.md`,
    `# O carrossel de hoje (da pauta que o dono vê no Postaí)\n\n**${item.titulo}**\n\n${item.resumo}\n\nFaça exatamente este carrossel: o título pode melhorar, mas o tema é este.\n`,
  );
  console.log(`CARROSSEL DE HOJE (da pauta): ${item.titulo}\n${item.resumo}\nGravado em ${pasta}/pauta-de-hoje.md.`);
  process.exit(0);
}
writeFileSync(
  `${pasta}/pauta-de-hoje.md`,
  `# O vídeo de hoje (da pauta que o dono vê no Postaí)\n\n**${item.titulo}**\n\n${item.resumo}\n\nFaça exatamente este vídeo: o título pode melhorar, mas o assunto é este.\n`,
);
console.log(`VÍDEO DE HOJE (da pauta): ${item.titulo}\n${item.resumo}\nGravado em ${pasta}/pauta-de-hoje.md.`);
