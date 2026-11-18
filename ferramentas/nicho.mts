// O nicho do canal (aba Nicho do Postaí): os vídeos mais vistos do assunto no
// YouTube (título, canal, números do YouTube, capa, capítulos e link), as
// ideias já guardadas, os prints do dono e a bíblia do canal. Nunca baixa
// vídeo. A referência inspira, nunca copia.
//
// Uso: npm run nicho -- --canal <animacao|dark|cortes>
//        grava o nicho.md (canais/canal, canais/dark ou a raiz, nos Cortes)
//      npm run nicho -- --canal <animacao|dark|cortes> --achados conteudo/achados.json
//        a pesquisa feita na web: { termo, videos: [{ link, porque }], canais: [{ link, porque }] }
//        (o Postaí confere cada link no YouTube e mostra na aba Nicho)
//      npm run nicho -- --canal <animacao|dark|cortes> --reversa <id do vídeo>
//        engenharia reversa de um vídeo do nicho: o Gemini assiste pelo link
//        (sem baixar) e devolve a receita; o vídeo vira referência do canal
//      npm run nicho -- --canal <animacao|dark|cortes> --ideias conteudo/ideias.json
//        manda as ideias para o dono ver na aba Nicho:
//        { analise, sugestoes: [{ titulo, resumo, porque, videoId }],
//          formatos: [{ nome, como, videoIds, temMolde }],
//          jeitos: [{ link, jeito }], estiloDosPrints }
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { exigirChave, ferramenta } from "./postai.ts";

exigirChave();
const args = process.argv.slice(2);
const valor = (nome: string) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};
const doArquivo = existsSync(".postai-canal") ? readFileSync(".postai-canal", "utf8").trim() : "";
const canal = valor("--canal") ?? (doArquivo === "dark" ? "dark" : "animacao");
if (!["animacao", "dark", "cortes"].includes(canal)) {
  console.error("Uso: npm run nicho -- --canal <animacao|dark|cortes> [--achados <arquivo> | --reversa <id> | --ideias <arquivo>]");
  process.exit(1);
}
const arquivoDoNicho = canal === "dark" ? "canais/dark/nicho.md" : canal === "cortes" ? "nicho.md" : "canais/canal/nicho.md";

try {
  // Pesquisa com o Claude: os links que você achou na web vão para a aba Nicho
  const achados = valor("--achados");
  if (achados) {
    if (!existsSync(achados)) throw new Error(`Não achei ${achados}.`);
    const dados = JSON.parse(readFileSync(achados, "utf8")) as Record<string, unknown>;
    console.log(await ferramenta("salvar_achados_do_claude", { ...dados, canal }));
    process.exit(0);
  }
  // Engenharia reversa: o Gemini assiste o vídeo pelo link (sem baixar nada)
  const reversa = valor("--reversa");
  if (reversa) {
    console.log(await ferramenta("engenharia_reversa", { canal, videoId: reversa }));
    process.exit(0);
  }
  const ideias = valor("--ideias");
  if (ideias) {
    if (!existsSync(ideias)) throw new Error(`Não achei ${ideias}.`);
    const dados = JSON.parse(readFileSync(ideias, "utf8")) as Record<string, unknown>;
    console.log(await ferramenta("salvar_ideias_do_nicho", { ...dados, canal }));
    process.exit(0);
  }
  const { texto, temVideos } = JSON.parse(await ferramenta("ver_nicho", { canal })) as {
    texto: string;
    temVideos: boolean;
  };
  mkdirSync(dirname(arquivoDoNicho), { recursive: true });
  writeFileSync(arquivoDoNicho, `${texto}\n`);
  console.log(temVideos ? `NICHO gravado em ${arquivoDoNicho}.` : texto.split("\n")[0]);
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
}
