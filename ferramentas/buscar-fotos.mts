// Busca fotos de domínio público (CC0: uso comercial sem crédito obrigatório)
// no Openverse, para quando o cliente não tem foto própria. Copiado e
// adaptado do buscar-presentes do Laços; o redimensionamento usa o ffmpeg do
// Remotion, então funciona no Mac e no Windows.
//
// Uso, um item por argumento (termo em inglês e específico):
//   npm run buscar-fotos -- --candidatos cafe="coffee cup on wooden table" pao="bread loaf bakery"
//       → 4 opções de cada em public/fotos/_candidatos/ (cafe-1.jpg ... cafe-4.jpg) para olhar
//   npm run buscar-fotos -- cafe="coffee cup on wooden table"#3 pao="bread loaf bakery"#1
//       → grava public/fotos/cafe.jpg (3ª opção) e pao.jpg (1ª), anota em public/fotos/CREDITOS.md
// Opções: --pasta outra (dentro de public/), --fonte stocksnap (fotos de produto mais limpas),
//   --deitadas (só fotos deitadas, gravadas com 1920 px de largura: para o Documentario),
//   --fonte commons (Wikimedia Commons: pinturas, mapas e fotos antigas; só domínio público e CC0;
//   melhor para história e com termos gerais, ex. "Rio de Janeiro 19th century painting")
// Limite da API sem chave: 20 buscas por minuto, 200 por dia.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ferramenta } from "./postai.ts";

type Foto = { id: string; url: string; source: string; foreign_landing_url: string; width: number; height: number };

const args = process.argv.slice(2);
const opcao = (nome: string) => {
  const i = args.indexOf(`--${nome}`);
  if (i < 0) return undefined;
  const valor = args[i + 1];
  args.splice(i, 2);
  return valor;
};
const flag = (nome: string) => {
  const i = args.indexOf(`--${nome}`);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
};

const pasta = opcao("pasta") ?? "fotos";
const fonte = opcao("fonte");
const candidatos = flag("candidatos");
const deitadas = flag("deitadas");
if (args.length === 0) {
  console.error('Uso: npm run buscar-fotos -- [--candidatos] arquivo="termo em inglês"[#n] ...');
  process.exit(1);
}
const itens = args.map((a) => {
  const m = a.match(/^([\w-]+)=(.+?)(?:#(\d+))?$/);
  if (!m) throw new Error(`Item inválido: ${a} (use arquivo="termo"#n)`);
  return { arquivo: m[1], termo: m[2], escolha: Number(m[3] ?? 1) };
});

const destino = join("public", pasta);
const pastaCandidatos = join(destino, "_candidatos");
mkdirSync(candidatos ? pastaCandidatos : destino, { recursive: true });

const AGENTE = "postai-estudio/1.0 (https://github.com/jeymes/postai-kit)";

const espera = (ms: number) => new Promise((pronto) => setTimeout(pronto, ms));

/**
 * fetch que espera e tenta de novo quando o site pede calma (429, comum no
 * Wikimedia vindo da nuvem) ou cai (5xx), em vez de desistir na primeira.
 */
async function pedir(url: string | URL, tentativas = 5): Promise<Response> {
  for (let vez = 1; ; vez++) {
    const resp = await fetch(url, { headers: { "User-Agent": AGENTE } });
    if ((resp.status !== 429 && resp.status < 500) || vez >= tentativas) return resp;
    const pedido = Number(resp.headers.get("retry-after"));
    const ms = Math.min(60_000, (pedido > 0 ? pedido : 5 * 2 ** (vez - 1)) * 1000);
    console.log(`  (${new URL(String(url)).host} pediu para esperar: tento de novo em ${Math.round(ms / 1000)} s)`);
    await espera(ms);
  }
}

// Na rotina do Canal dark, conta na tela do Postaí quantos itens já foram:
// a busca leva minutos e, sem isso, o dono só vê "trabalhando".
const NA_ROTINA_DARK = existsSync(".postai-canal") && readFileSync(".postai-canal", "utf8").trim() === "dark";
async function contarNaTela(feitos: number) {
  if (!NA_ROTINA_DARK || !process.env.POSTAI_CHAVE) return;
  try {
    await ferramenta("contar_andamento", {
      agente: "pesquisadora-de-imagens",
      status: "trabalhando",
      mensagem: `${candidatos ? "Procurando opções de imagem" : "Baixando as imagens"}: ${feitos} de ${itens.length}`,
      progresso: true,
    });
  } catch {
    // a tela é só um aviso: a busca segue
  }
}

/** Wikimedia Commons: só domínio público e CC0 (sem crédito obrigatório nem "compartilha igual") */
async function buscarNoCommons(termo: string): Promise<Foto[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  for (const [k, v] of Object.entries({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "50",
    gsrsearch: `${termo} filetype:bitmap`,
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "1920",
    iiextmetadatafilter: "LicenseShortName",
  }))
    url.searchParams.set(k, v);
  const resp = await pedir(url);
  if (!resp.ok) throw new Error(`O Commons respondeu ${resp.status} para "${termo}"`);
  type Pagina = {
    pageid: number;
    index: number;
    imageinfo?: Array<{ width: number; height: number; thumburl?: string; url: string; descriptionurl: string; extmetadata?: { LicenseShortName?: { value?: string } } }>;
  };
  const dados = (await resp.json()) as { query?: { pages?: Record<string, Pagina> } };
  return Object.values(dados.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .flatMap((p) => {
      const info = p.imageinfo?.[0];
      const licenca = info?.extmetadata?.LicenseShortName?.value ?? "";
      if (!info || !/^(public domain|pd|cc0)/i.test(licenca)) return [];
      return [{ id: String(p.pageid), url: info.thumburl ?? info.url, source: "wikimedia", foreign_landing_url: info.descriptionurl, width: info.width, height: info.height }];
    })
    .filter(filtroDeTamanho);
}

const filtroDeTamanho = (f: Foto) =>
  deitadas
    ? f.width >= 1280 && f.width / f.height >= 1.25 && f.width / f.height <= 2.2
    : Math.min(f.width, f.height) >= 800 && Math.max(f.width, f.height) / Math.min(f.width, f.height) <= 1.8;

async function buscar(termo: string): Promise<Foto[]> {
  if (fonte === "commons") return buscarNoCommons(termo);
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", termo);
  url.searchParams.set("license", deitadas ? "cc0,pdm" : "cc0");
  url.searchParams.set("category", "photograph");
  url.searchParams.set("page_size", "20");
  if (fonte) url.searchParams.set("source", fonte);
  const resp = await pedir(url);
  if (!resp.ok) throw new Error(`Openverse respondeu ${resp.status} para "${termo}"`);
  const { results } = (await resp.json()) as { results: Foto[] };
  // Grandes o bastante e não muito compridas
  return results.filter(filtroDeTamanho);
}

/** Baixa e grava em JPEG, com o lado menor em 1080 px (candidata: 480 px de largura, só para olhar) */
async function baixar(foto: Foto, saida: string, pequena = false) {
  // A prévia do Commons vem na miniatura de 500 px (tamanho padrão do Wikimedia):
  // sai rápido e não gasta o limite, que a de 1920 px esgotava.
  const url = pequena && foto.source === "wikimedia" ? foto.url.replace(/\/\d+px-([^/]+)$/, "/500px-$1") : foto.url;
  const resp = await pedir(url);
  if (!resp.ok) throw new Error(`Não baixou ${url} (${resp.status})`);
  // O ffmpeg reconhece a imagem pela extensão (o Commons tem PNG e TIFF também)
  const extensao = new URL(url).pathname.match(/\.(jpe?g|png|webp|tiff?|gif)$/i)?.[1].toLowerCase() ?? "jpg";
  const bruto = saida.replace(/\.jpg$/, `.bruto.${extensao}`);
  writeFileSync(bruto, Buffer.from(await resp.arrayBuffer()));
  // Candidata pequena: o Claude olha cada uma, e imagem grande custa uns 5 vezes mais
  const escala = pequena
    ? "scale='min(480,iw)':-2"
    : deitadas
      ? "scale='min(1920,iw)':-2"
      : foto.width > foto.height
        ? "scale=-2:1080"
        : "scale=1080:-2";
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", bruto, "-vf", escala, "-q:v", "3", saida], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  rmSync(bruto, { force: true });
  if (r.status !== 0) throw new Error(`Não converteu ${foto.url}`);
}

const creditos: { arquivo: string; foto: Foto }[] = [];
// Um item que falha não derruba os outros: ele sai com ✗ e o resto segue.
for (const [n, item] of itens.entries()) {
  try {
    const fotos = await buscar(item.termo);
    if (fotos.length === 0) {
      console.error(`✗ ${item.arquivo}: nada em CC0 para "${item.termo}" (tente outro termo em inglês)`);
      process.exitCode = 1;
      continue;
    }
    if (candidatos) {
      // Cada opção que não baixar é só pulada (as outras servem)
      const opcoes: Foto[] = [];
      for (const foto of fotos.slice(0, 4)) {
        try {
          await baixar(foto, join(pastaCandidatos, `${item.arquivo}-${opcoes.length + 1}.jpg`), true);
          opcoes.push(foto);
        } catch (erro) {
          console.log(`  (pulei uma opção de ${item.arquivo}: ${erro instanceof Error ? erro.message : String(erro)})`);
        }
        await espera(500);
      }
      if (opcoes.length === 0) throw new Error(`nenhuma opção baixou para "${item.termo}"`);
      // O nome do arquivo no Commons ajuda a saber quem é (ex.: Napoleon_I_of_France_by_...)
      const nomes = opcoes.map((foto, i) => `${i + 1}: ${decodeURIComponent(foto.foreign_landing_url.split("/").pop() ?? "").replace(/^File:/, "").slice(0, 70)}`);
      console.log(`• ${item.arquivo}: ${opcoes.length} opções em ${pastaCandidatos}/${item.arquivo}-N.jpg (480 px)\n    ${nomes.join("\n    ")}`);
    } else {
      const foto = fotos[item.escolha - 1];
      if (!foto) throw new Error(`só há ${fotos.length} opções para "${item.termo}"`);
      await baixar(foto, join(destino, `${item.arquivo}.jpg`));
      creditos.push({ arquivo: `${item.arquivo}.jpg`, foto });
      console.log(`✓ ${destino}/${item.arquivo}.jpg (${foto.source}, ${foto.foreign_landing_url})`);
    }
  } catch (erro) {
    console.error(`✗ ${item.arquivo}: ${erro instanceof Error ? erro.message : String(erro)}`);
    process.exitCode = 1;
  } finally {
    await contarNaTela(n + 1);
  }
}

if (!candidatos && creditos.length > 0) {
  const caminho = join(destino, "CREDITOS.md");
  const antigas = existsSync(caminho)
    ? readFileSync(caminho, "utf8")
        .split("\n")
        .filter((l) => /^\| \S+\.jpg \|/.test(l) && !creditos.some((c) => l.startsWith(`| ${c.arquivo} |`)))
    : [];
  const novas = creditos.map(({ arquivo, foto }) => `| ${arquivo} | ${foto.source} | ${foto.foreign_landing_url} | ${foto.id} |`);
  writeFileSync(
    caminho,
    [
      `# Fotos de domínio público (${pasta})`,
      "",
      "Licença CC0 ou domínio público (uso comercial sem crédito obrigatório), baixadas pelo Openverse ou pelo Wikimedia Commons com o ferramentas/buscar-fotos.mts.",
      "",
      "| Arquivo | Fonte | Original | Id |",
      "| --- | --- | --- | --- |",
      ...antigas,
      ...novas,
      "",
    ].join("\n"),
  );
  if (existsSync(pastaCandidatos)) rmSync(pastaCandidatos, { recursive: true });
}
