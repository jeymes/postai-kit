// Manda um vídeo pronto (out/<peça>/) para a pessoa aprovar no Postaí, sem o
// conector instalado: fala direto com o /mcp do Postaí, com a chave em
// POSTAI_CHAVE. É o caminho da rotina na nuvem; no computador, o Claude usa o
// conector (pedir_envio + por_para_aprovacao), que faz o mesmo.
//
// Episódio animado: aparece na tela Animação ("Para aprovar"); vídeo comum, em
// Cortes. Só depois de
// aprovado entra na fila do piloto.
//
// Uso: POSTAI_CHAVE=postai.xxx.yyy npm run aprovar -- conteudo/<peça>.json
//      (POSTAI_URL troca o endereço; o padrão é o do Postaí)
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { exigirChave, ferramenta } from "./postai.ts";

const caminho = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

if (!caminho) {
  console.error("Uso: npm run aprovar -- conteudo/<peça>.json");
  process.exit(1);
}
exigirChave();

type Arquivo = { arquivo: string; tipo: string; tamanho: number };
type Info = { duracaoSeg: number | null; arquivos: Arquivo[]; post: { titulo?: string; legenda?: string } | null };

const pasta = join("out", basename(caminho, ".json"));
const arquivoDeInfo = join(pasta, "info.json");
if (!existsSync(arquivoDeInfo)) {
  console.error(`Não achei ${arquivoDeInfo}. Rode antes: npm run renderizar -- ${caminho}`);
  process.exit(1);
}
const info: Info = JSON.parse(readFileSync(arquivoDeInfo, "utf8"));
const peca = JSON.parse(readFileSync(caminho, "utf8"));
const video = info.arquivos.find((a) => a.tipo.startsWith("video/"));
const capa = info.arquivos.find((a) => a.tipo.startsWith("image/"));
if (!video) {
  console.error("O info.json não tem vídeo. O aprovar é só para vídeos.");
  process.exit(1);
}
const titulo = info.post?.titulo?.trim();
const legenda = info.post?.legenda?.trim();
if (!titulo || !legenda) {
  console.error('A peça precisa de "post": { "titulo", "legenda" }.');
  process.exit(1);
}

// O pedir_envio devolve um comando curl por arquivo; daqui só sai a URL assinada.
const urlDoComando = (comando: string) => /'(https:\/\/[^']+)'\s*$/.exec(comando)?.[1];

function subir(url: string, tipo: string, arquivo: string) {
  const r = spawnSync("curl", ["--fail", "-sS", "-X", "PUT", "-H", `Content-Type: ${tipo}`, "-T", arquivo, url], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`Não consegui subir ${arquivo}.`);
}

try {
  console.log("1/3 Pedindo o envio ao Postaí");
  const envio = JSON.parse(
    await ferramenta("pedir_envio", {
      formato: "video",
      video: { tamanho: video.tamanho, tipo: video.tipo },
      ...(capa ? { capa: { tamanho: capa.tamanho, tipo: capa.tipo } } : {}),
    }),
  ) as { envioId: string; arquivos: Array<{ arquivo: string; comando: string }> };

  console.log("2/3 Subindo o vídeo" + (capa ? " e a capa" : ""));
  for (const a of envio.arquivos) {
    const url = urlDoComando(a.comando);
    if (!url) throw new Error(`O Postaí devolveu um comando sem URL para ${a.arquivo}.`);
    const local = a.arquivo === "capa" ? capa : video;
    if (!local) continue;
    subir(url, local.tipo, local.arquivo);
  }

  console.log("3/3 Mandando para aprovação");
  const resposta = await ferramenta("por_para_aprovacao", {
    envioId: envio.envioId,
    titulo: titulo.slice(0, 100),
    legenda,
    duracaoSeg: info.duracaoSeg ?? 0,
    ...(typeof peca.titulo === "string" ? { gancho: peca.titulo } : {}),
    // Episódio do canal animado: o app pergunta "o que melhorar?" ao aprovar
    ...(peca.molde === "Conversa" ? { origem: "animacao" } : {}),
  });
  console.log(`\nPronto: ${resposta}`);
  console.log(peca.molde === "Conversa" ? "Abra o Postaí, na tela Animação, para aprovar ou recusar." : "Abra o Postaí, no menu Cortes, para aprovar ou recusar.");
} catch (erro) {
  console.error(`\n${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
}
