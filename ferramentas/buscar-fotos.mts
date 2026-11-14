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
  const resp = await fetch(url, { headers: { "User-Agent": AGENTE } });
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
  const resp = await fetch(url, { headers: { "User-Agent": "postai-estudio/1.0" } });
  if (!resp.ok) throw new Error(`Openverse respondeu ${resp.status} para "${termo}"`);
  const { results } = (await resp.json()) as { results: Foto[] };
  // Grandes o bastante e não muito compridas
  return results.filter(filtroDeTamanho);
}

/** Baixa e grava em JPEG, com o lado menor em 1080 px */
async function baixar(foto: Foto, saida: string) {
  const resp = await fetch(foto.url, { headers: { "User-Agent": AGENTE } });
  if (!resp.ok) throw new Error(`Não baixou ${foto.url} (${resp.status})`);
  // O ffmpeg reconhece a imagem pela extensão (o Commons tem PNG e TIFF também)
  const extensao = new URL(foto.url).pathname.match(/\.(jpe?g|png|webp|tiff?|gif)$/i)?.[1].toLowerCase() ?? "jpg";
  const bruto = saida.replace(/\.jpg$/, `.bruto.${extensao}`);
  writeFileSync(bruto, Buffer.from(await resp.arrayBuffer()));
  const escala = deitadas ? "scale='min(1920,iw)':-2" : foto.width > foto.height ? "scale=-2:1080" : "scale=1080:-2";
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", bruto, "-vf", escala, "-q:v", "3", saida], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  rmSync(bruto, { force: true });
  if (r.status !== 0) throw new Error(`Não converteu ${foto.url}`);
}

const creditos: { arquivo: string; foto: Foto }[] = [];
for (const item of itens) {
  const fotos = await buscar(item.termo);
  if (fotos.length === 0) {
    console.error(`✗ ${item.arquivo}: nada em CC0 para "${item.termo}" (tente outro termo em inglês)`);
    process.exitCode = 1;
    continue;
  }
  if (candidatos) {
    const opcoes = fotos.slice(0, 4);
    for (const [i, foto] of opcoes.entries()) await baixar(foto, join(pastaCandidatos, `${item.arquivo}-${i + 1}.jpg`));
    console.log(`• ${item.arquivo}: ${opcoes.length} opções em ${pastaCandidatos}/${item.arquivo}-N.jpg`);
  } else {
    const foto = fotos[item.escolha - 1];
    if (!foto) throw new Error(`${item.arquivo}: só há ${fotos.length} opções para "${item.termo}"`);
    await baixar(foto, join(destino, `${item.arquivo}.jpg`));
    creditos.push({ arquivo: `${item.arquivo}.jpg`, foto });
    console.log(`✓ ${destino}/${item.arquivo}.jpg (${foto.source}, ${foto.foreign_landing_url})`);
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
