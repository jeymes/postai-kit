// Manda um vídeo pronto (out/<peça>/) para a pessoa aprovar no Postaí, sem o
// conector instalado: fala direto com o /mcp do Postaí, com a chave em
// POSTAI_CHAVE. É o caminho da rotina na nuvem; no computador, o Claude usa o
// conector (pedir_envio + por_para_aprovacao), que faz o mesmo.
//
// Episódio animado: aparece na tela Animação ("Para aprovar"); vídeo comum, em
// Cortes. Só depois de
// aprovado entra na fila do piloto.
//
// Episódio animado: o roteiro vai junto (sem a narração), para o dono poder
// pedir ajuste. Num ajuste, --substitui <corteId> troca o vídeo antigo pelo novo.
//
// Canal narrado (molde Documentario): vai como vídeo longo (só YouTube) para a
// tela Animação, com os capítulos no fim da descrição.
//
// Uso: POSTAI_CHAVE=postai.xxx.yyy npm run aprovar -- conteudo/<peça>.json [--substitui <corteId>]
//      (POSTAI_URL troca o endereço; o padrão é o do Postaí)
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { exigirChave, ferramenta } from "./postai.ts";
import { FPS, iniciosDasCenas, TEMPOS } from "../src/moldes/tempos.ts";

// O que é falado em cada segundo (23/11/2026): a retenção do YouTube mostra a
// fala de cada queda. Uma fala por cena, no segundo em que a voz começa.
function falasNoTempo(p: { molde?: string; cenas?: Array<{ fala?: string }> } & Record<string, unknown>) {
  const molde = String(p.molde ?? "");
  const cenas = p.cenas ?? [];
  if (!cenas.length || !["Conversa", "Documentario", "CorteVertical", "Narrado", "Mundo3D"].includes(molde)) return undefined;
  const inicios = iniciosDasCenas(molde, p as Parameters<typeof iniciosDasCenas>[1]);
  // Na Conversa o primeiro trecho é o respiro antes da primeira fala
  const desloca = molde === "Conversa" ? 1 : 0;
  const atraso = molde === "Conversa" || molde === "Mundo3D" ? 0 : TEMPOS.antesDaFala;
  const falas = cenas.flatMap((c, i) => {
    const quadro = inicios[i + desloca];
    const texto = (c.fala ?? "").trim();
    return quadro === undefined || !texto ? [] : [{ seg: Math.round(((quadro + atraso) / FPS) * 10) / 10, texto: texto.slice(0, 240) }];
  });
  return falas.length ? falas : undefined;
}

const args = process.argv.slice(2);
const posSubstitui = args.indexOf("--substitui");
const substitui = posSubstitui >= 0 ? args[posSubstitui + 1] : undefined;
// --duvida "<texto>": o que a crítica ainda pediu. O vídeo nunca é aprovado sozinho: espera o dono.
const posDuvida = args.indexOf("--duvida");
const duvida = posDuvida >= 0 ? args[posDuvida + 1] : undefined;
// O caminho é o que não é opção nem valor de opção (posição -1 = a opção não veio)
const valores = new Set([posSubstitui, posDuvida].filter((pos) => pos >= 0).map((pos) => pos + 1));
const caminho = args.find((arg, i) => !arg.startsWith("--") && !valores.has(i));

if (!caminho) {
  console.error("Uso: npm run aprovar -- conteudo/<peça>.json");
  process.exit(1);
}
exigirChave();

type Arquivo = { arquivo: string; tipo: string; tamanho: number };
type Info = { duracaoSeg: number | null; arquivos: Arquivo[]; post: { titulo?: string; legenda?: string } | null; capitulos?: string };

const pasta = join("out", basename(caminho, ".json"));
const arquivoDeInfo = join(pasta, "info.json");
if (!existsSync(arquivoDeInfo)) {
  console.error(`Não achei ${arquivoDeInfo}. Rode antes: npm run renderizar -- ${caminho}`);
  process.exit(1);
}
const info: Info = JSON.parse(readFileSync(arquivoDeInfo, "utf8"));
const peca = JSON.parse(readFileSync(caminho, "utf8"));

/**
 * O vídeo usa imagem gerada com IA? As fotos do roteiro (fotos/<pasta>/<nome>.jpg)
 * cuja linha no CREDITOS.md da pasta diz a fonte "ia". Com uma só, o vídeo sai no
 * YouTube marcado como conteúdo alterado ou sintético (exigência do YouTube).
 */
function usaImagemDeIa(valor: unknown): boolean {
  const fotos = new Set<string>();
  const juntar = (v: unknown) => {
    if (typeof v === "string" && /^fotos\/.+\.(jpe?g|png|webp)$/i.test(v)) fotos.add(v);
    else if (Array.isArray(v)) v.forEach(juntar);
    else if (v && typeof v === "object") Object.values(v).forEach(juntar);
  };
  juntar(valor);
  for (const foto of fotos) {
    const partes = foto.split("/");
    const nome = partes.pop() as string;
    const creditos = join("public", ...partes, "CREDITOS.md");
    if (!existsSync(creditos)) continue;
    if (readFileSync(creditos, "utf8").split("\n").some((linha) => linha.startsWith(`| ${nome} | ia |`) || linha.startsWith(`| ${nome} | banco-ia |`))) return true;
  }
  return false;
}
const sintetico = usaImagemDeIa(peca);

// Carrossel de um canal (24/11/2026): os slides (slide-01.jpg...) sobem como um
// post de fotos e vão para a tela do canal, com o "Pedir ajuste" como os vídeos.
if (peca.molde === "Carrossel") {
  const slides = info.arquivos.filter((a) => a.tipo === "image/jpeg" && /slide-\d+\.jpg$/.test(a.arquivo)).sort((x, y) => x.arquivo.localeCompare(y.arquivo));
  const tituloDoPost = info.post?.titulo?.trim();
  const legendaDoPost = info.post?.legenda?.trim();
  if (slides.length < 2 || slides.length > 10) {
    console.error(`O carrossel precisa de 2 a 10 slides (veio ${slides.length}). Rode antes: npm run renderizar -- ${caminho}`);
    process.exit(1);
  }
  if (!tituloDoPost || !legendaDoPost) {
    console.error('A peça precisa de "post": { "titulo", "legenda" }.');
    process.exit(1);
  }
  try {
    console.log(`1/3 Pedindo o envio ao Postaí (${slides.length} slides)`);
    const envio = JSON.parse(
      // O pedir_envio de fotos recebe só o tamanho de cada uma, em bytes, na ordem
      await ferramenta("pedir_envio", { formato: "fotos", fotos: slides.map((s) => s.tamanho) }),
    ) as { envioId: string; arquivos: Array<{ arquivo: string; comando: string }> };
    if (envio.arquivos.length !== slides.length) throw new Error(`O Postaí devolveu ${envio.arquivos.length} lugares para ${slides.length} slides.`);
    console.log("2/3 Subindo os slides");
    envio.arquivos.forEach((a, i) => {
      const url = urlDoComando(a.comando);
      if (!url) throw new Error(`O Postaí devolveu um comando sem URL para ${a.arquivo}.`);
      subir(url, slides[i].tipo, slides[i].arquivo);
    });
    // O pacote para a refação (o roteiro e as fotos): um ajuste não busca as imagens de novo
    const pacote = montarPacote();
    if (pacote) {
      try {
        const { url } = JSON.parse(await ferramenta("pedir_envio_do_pacote", { envioId: envio.envioId, tamanho: statSync(pacote).size })) as { url: string };
        subir(url, "application/gzip", pacote);
      } catch (erro) {
        console.log(`  (o pacote da refação não foi guardado: ${erro instanceof Error ? erro.message : String(erro)}; um ajuste começaria do roteiro)`);
      } finally {
        rmSync(pacote, { force: true });
      }
    }
    console.log("3/3 Mandando para aprovação");
    const resposta = await ferramenta("por_para_aprovacao", {
      envioId: envio.envioId,
      titulo: tituloDoPost.slice(0, 100),
      legenda: legendaDoPost,
      origem: "animacao",
      carrossel: true,
      // O roteiro fica guardado para o dono pedir ajuste
      roteiro: JSON.stringify(peca),
      ...(substitui ? { substitui } : {}),
      ...(duvida ? { duvida } : {}),
      ...(sintetico ? { sintetico: true } : {}),
    });
    console.log(`\nPronto: ${resposta}`);
    console.log("Abra o Postaí, em Para aprovar (grupo Carrosséis), para aprovar ou recusar.");
    process.exit(0);
  } catch (erro) {
    console.error(`\n${erro instanceof Error ? erro.message : String(erro)}`);
    process.exit(1);
  }
}

const video = info.arquivos.find((a) => a.tipo.startsWith("video/"));
const capa = info.arquivos.find((a) => a.tipo.startsWith("image/"));
if (!video) {
  console.error("O info.json não tem vídeo. O aprovar é só para vídeos.");
  process.exit(1);
}
const titulo = info.post?.titulo?.trim();
// Vídeo longo: os capítulos ("00:00 Título") no fim da descrição viram os capítulos do YouTube
const legenda = [info.post?.legenda?.trim(), info.capitulos].filter(Boolean).join("\n\n");
// Vídeo de um canal (Animação ou Canal dark): vai para a tela dele, com o "Pedir ajuste"
const doCanal = peca.molde === "Conversa" || peca.molde === "Documentario" || peca.molde === "CorteVertical" || peca.molde === "Mundo3D";
if (!titulo || !legenda) {
  console.error('A peça precisa de "post": { "titulo", "legenda" }.');
  process.exit(1);
}

// O roteiro guardado no Postaí não leva a narração (áudio e legendas): num
// ajuste, a produção narra de novo.
function semNarracao(p: { cenas?: Array<Record<string, unknown>> }) {
  return { ...p, cenas: p.cenas?.map(({ narracao: _narracao, ...cena }) => cena) };
}

// O pedir_envio devolve um comando curl por arquivo; daqui só sai a URL assinada.
// Função declarada (não const): o envio do carrossel, que vem antes no arquivo,
// também usa (25/11/2026: a const ainda não existia ali e o envio travava)
function urlDoComando(comando: string) {
  return /'(https:\/\/[^']+)'\s*$/.exec(comando)?.[1];
}

// Tenta 3 vezes (a rede da nuvem às vezes cai no meio de um vídeo grande) e,
// se não der, diz o motivo do curl (antes só dizia "não consegui subir")
function subir(url: string, tipo: string, arquivo: string) {
  let motivo = "";
  for (let vez = 1; vez <= 3; vez++) {
    const r = spawnSync("curl", ["--fail", "-sS", "--retry", "2", "-X", "PUT", "-H", `Content-Type: ${tipo}`, "-T", arquivo, url], {
      encoding: "utf8",
      stdio: ["ignore", "inherit", "pipe"],
    });
    if (r.status === 0) return;
    motivo = (r.stderr || `curl saiu com ${r.status}`).trim().slice(-300);
    console.log(`  (não subiu ${arquivo}, tentativa ${vez} de 3: ${motivo})`);
    if (vez < 3) spawnSync("sleep", [String(5 * vez)]);
  }
  throw new Error(`Não consegui subir ${arquivo}: ${motivo}`);
}

/**
 * O pacote do vídeo para a refação: o roteiro como está (com a narração), as
 * pastas das fotos e vídeos que ele usa e a voz (public/narracao/<peça>). Na
 * refação, o npm run ajustes traz tudo de volta e a equipe não busca nem narra
 * de novo o que não mudou. Só nos vídeos dos canais.
 */
function montarPacote(): string | null {
  // O caminho já foi conferido no começo (sem ele, o aprovar sai antes)
  const roteiro = caminho as string;
  const nome = basename(roteiro, ".json");
  const itens = new Set<string>([roteiro]);
  const juntar = (v: unknown) => {
    if (typeof v === "string" && /^(fotos|videos)\/.+\.[a-z0-9]{2,5}$/i.test(v)) itens.add(join("public", dirname(v)));
    else if (Array.isArray(v)) v.forEach(juntar);
    else if (v && typeof v === "object") Object.values(v).forEach(juntar);
  };
  juntar(peca);
  const voz = join("public", "narracao", nome);
  if (existsSync(voz)) itens.add(voz);
  const manifesto = ".postai-pacote.json";
  writeFileSync(manifesto, JSON.stringify({ roteiro, nome }));
  itens.add(manifesto);
  const arquivo = join(tmpdir(), `pacote-${nome}.tar.gz`);
  const r = spawnSync("tar", ["-czf", arquivo, ...[...itens].filter((i) => existsSync(i))], { encoding: "utf8" });
  rmSync(manifesto, { force: true });
  if (r.status !== 0) {
    console.log(`  (o pacote não foi montado: ${(r.stderr || "").trim().slice(-200)})`);
    return null;
  }
  return arquivo;
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

  // O pacote para a refação (não trava a aprovação se falhar)
  if (doCanal) {
    const pacote = montarPacote();
    if (pacote) {
      try {
        const { url } = JSON.parse(await ferramenta("pedir_envio_do_pacote", { envioId: envio.envioId, tamanho: statSync(pacote).size })) as { url: string };
        subir(url, "application/gzip", pacote);
        console.log(`  (pacote da refação guardado: ${(statSync(pacote).size / 1024 / 1024).toFixed(1)} MB)`);
      } catch (erro) {
        console.log(`  (o pacote da refação não foi guardado: ${erro instanceof Error ? erro.message : String(erro)}; uma refação começaria do roteiro)`);
      } finally {
        rmSync(pacote, { force: true });
      }
    }
  }

  console.log("3/3 Mandando para aprovação");
  const resposta = await ferramenta("por_para_aprovacao", {
    envioId: envio.envioId,
    titulo: titulo.slice(0, 100),
    legenda,
    duracaoSeg: info.duracaoSeg ?? 0,
    ...(typeof peca.titulo === "string" ? { gancho: peca.titulo } : {}),
    // Episódio do canal (animado ou narrado): aparece na tela Animação, com "Pedir ajuste"
    ...(doCanal ? { origem: "animacao", roteiro: JSON.stringify(semNarracao(peca)) } : {}),
    // O que é falado em cada segundo (a retenção mostra a fala de cada queda)
    ...(falasNoTempo(peca) ? { falas: falasNoTempo(peca) } : {}),
    // Narrado: vídeo longo e deitado, só no YouTube
    ...(peca.molde === "Documentario" ? { longo: true } : {}),
    ...(substitui ? { substitui } : {}),
    ...(duvida ? { duvida } : {}),
    // Imagem de IA no vídeo: o YouTube recebe a marcação de conteúdo sintético
    ...(sintetico ? { sintetico: true } : {}),
    // Quanto o render levou e em que máquina (para medir a troca das abas)
    ...((info as { render?: unknown }).render ? { render: (info as { render?: unknown }).render } : {}),
  });
  if (sintetico) console.log("(Este vídeo tem imagem gerada com IA: no YouTube ele sai marcado como conteúdo sintético.)");
  console.log(`\nPronto: ${resposta}`);
  console.log(doCanal ? "Abra o Postaí, na tela Animação, para aprovar ou recusar." : "Abra o Postaí, no menu Cortes, para aprovar ou recusar.");
} catch (erro) {
  console.error(`\n${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
}
