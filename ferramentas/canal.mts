// Baixa do Postaí o canal animado que o dono montou na tela Animação (o que
// divulga, o que faz e não faz, tom, tipos de vídeo, referências e
// aprendizados) e grava em canais/<canal>/canal-postai.md, que a equipe de
// agentes lê antes de cada episódio. Rode no começo de cada episódio: o dono
// pode ter anotado um aprendizado novo.
//
// Uso: POSTAI_CHAVE=postai.xxx.yyy npm run canal -- canais/<canal>
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { exigirChave, ferramenta } from "./postai.ts";

const pasta = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!pasta || !existsSync(pasta)) {
  console.error("Uso: npm run canal -- canais/<canal>   (a pasta precisa existir)");
  process.exit(1);
}
exigirChave();

// A marca começa do zero a cada canal: a mesma pasta do kit pode servir a
// mais de uma conta (no PC, ou numa máquina da nuvem que guarda os arquivos),
// e o que sobrava da conta anterior (o logo, o @, o site) saía no vídeo de
// outra conta. Só fica o modelo do kit; o resto vem do Postaí desta conta.
const MARCA_DO_KIT = {
  nome: "Sua Marca",
  site: "",
  instagram: "",
  cores: {
    fundo: "#FFF8F0",
    superficie: "#FFFFFF",
    texto: "#1F1A17",
    textoSuave: "#6B625B",
    destaque: "#E8572A",
    textoNoDestaque: "#FFFFFF",
  },
  fontes: { titulo: "Bricolage Grotesque", texto: "Inter" },
  logo: null,
  tom: "próximo e animado, frases curtas, sem gíria pesada",
  publico: "",
  chamada: "Siga para ver mais",
};
mkdirSync("marca", { recursive: true });
writeFileSync("marca/marca.json", `${JSON.stringify(MARCA_DO_KIT, null, 2)}\n`);
for (const velho of [join(pasta, "logo.png"), "public/marca/logo-canal.png"]) rmSync(velho, { force: true });

try {
  const texto = await ferramenta("ver_canal_animado");
  const destino = join(pasta, "canal-postai.md");
  writeFileSync(destino, `${texto}\n`);
  console.log(`Canal do Postaí gravado em ${destino}.`);
  // Os personagens com o desenho próprio (o texto do canal não leva o desenho)
  // O registro de episódios e a marca ficam no Postaí (a rotina não grava no GitHub)
  try {
    writeFileSync(join(pasta, "episodios.md"), `${await ferramenta("ver_episodios")}\n`);
    console.log(`Registro de episódios em ${join(pasta, "episodios.md")}.`);
    const { logoUrl, vinhetaUrl, fimDoVideo, ...marca } = JSON.parse(await ferramenta("ver_marca")) ?? {};
    // A marca completa (nome e cores) ou só a cor de destaque escolhida na tela
    if (marca.nome || marca.cores) {
      writeFileSync(
        "marca/marca.json",
        `${JSON.stringify({ ...MARCA_DO_KIT, ...marca, cores: { ...MARCA_DO_KIT.cores, ...marca.cores } }, null, 2)}\n`,
      );
      console.log(`Marca do canal: ${marca.nome ?? MARCA_DO_KIT.nome}${marca.cores?.destaque ? `, destaque ${marca.cores.destaque}` : ""}.`);
    }
    // O logo que a pessoa enviou no Postaí (curl: na nuvem passa pelo proxy)
    if (logoUrl) {
      const baixou = spawnSync("curl", ["-sSfL", "-o", join(pasta, "logo.png"), logoUrl], { stdio: "inherit" });
      if (baixou.status !== 0) rmSync(join(pasta, "logo.png"), { force: true });
      console.log(baixou.status === 0 ? "Logo do canal baixado do Postaí." : "Não consegui baixar o logo: sigo sem logo (nunca o de outra conta).");
    }
    // A vinheta do fim (o motion do app ou do site): o npm run renderizar cola
    // no fim de cada vídeo. Sem ela no Postaí (o dono apagou), sai daqui também.
    mkdirSync("public/marca", { recursive: true });
    // Como o vídeo termina (chamada, vinheta ou ambos): o renderizar segue
    writeFileSync("public/marca/fim.json", `${JSON.stringify({ fim: fimDoVideo ?? "ambos" })}\n`);
    for (const antiga of readdirSync("public/marca").filter((nome) => nome.startsWith("vinheta."))) rmSync(join("public/marca", antiga));
    if (vinhetaUrl) {
      const extensao = new URL(vinhetaUrl).pathname.match(/\.(mp4|mov|webm)$/i)?.[1]?.toLowerCase() ?? "mp4";
      const baixou = spawnSync("curl", ["-sSfL", "-o", `public/marca/vinheta.${extensao}`, vinhetaUrl], { stdio: "inherit" });
      console.log(baixou.status === 0 ? "Vinheta do fim baixada do Postaí: entra no fim de cada vídeo." : "Não consegui baixar a vinheta: os vídeos saem sem ela.");
      if (baixou.status !== 0) rmSync(`public/marca/vinheta.${extensao}`, { force: true });
    }
  } catch (erro) {
    console.log(`Registro ou marca não baixados: ${erro instanceof Error ? erro.message : String(erro)}`);
  }
  try {
    const dark = pasta.replace(/\/+$/, "").endsWith("dark");
    const elenco = JSON.parse(await ferramenta("ver_elenco", dark ? { canal: "dark" } : {})) as {
      personagens: unknown[];
      estiloVisual?: { modelo: string; fundo: string };
      cenarios?: unknown[];
      // Canal dark: o modelo visual, a cor, a letra e o que o dono pediu com as palavras dele
      estiloDoNarrado?: { modelo: string; cor?: string | null; letra?: string | null; pedido?: string };
    };
    if (dark) {
      const { pedido: _pedido, ...estilo } = elenco.estiloDoNarrado ?? { modelo: "classico" };
      const limpo = Object.fromEntries(Object.entries(estilo).filter(([, valor]) => valor));
      writeFileSync(join(pasta, "estilo-narrado.json"), `${JSON.stringify(limpo, null, 2)}\n`);
      console.log(`Estilo visual do Canal dark: ${limpo.modelo ?? "classico"}${limpo.letra ? `, letra ${limpo.letra}` : ""}${limpo.cor ? `, cor ${limpo.cor}` : ""}.`);
    }
    // Os cenários que a equipe já criou para o canal: o npm run cenarios põe no roteiro
    writeFileSync(join(pasta, "cenarios.json"), `${JSON.stringify(elenco.cenarios ?? [], null, 2)}\n`);
    if (elenco.cenarios?.length) console.log(`Cenários criados pela equipe: ${elenco.cenarios.length} em ${join(pasta, "cenarios.json")}.`);
    writeFileSync(join(pasta, "elenco.json"), `${JSON.stringify(elenco.personagens, null, 2)}\n`);
    console.log(`Elenco: ${elenco.personagens.length} personagem(ns) em ${join(pasta, "elenco.json")}.`);
    // O estilo visual que o dono escolheu (sem ele: chapado, claro). O npm run elenco põe no roteiro.
    const estilo = elenco.estiloVisual ?? { modelo: "chapado", fundo: "claro" };
    writeFileSync(join(pasta, "estilo.json"), `${JSON.stringify(estilo, null, 2)}\n`);
    console.log(`Estilo visual do canal: ${estilo.modelo}, fundo ${estilo.fundo}.`);
  } catch (erro) {
    // Postaí sem o ver_elenco ainda: segue sem o elenco.json (a cena usa o visual)
    console.log(`Elenco não baixado: ${erro instanceof Error ? erro.message : String(erro)}`);
  }
  // O logo do canal (canais/<canal>/logo.png) vai para os CTAs e a capa
  const logo = join(pasta, "logo.png");
  if (existsSync(logo)) {
    mkdirSync("public/marca", { recursive: true });
    copyFileSync(logo, "public/marca/logo-canal.png");
    const atual = JSON.parse(readFileSync("marca/marca.json", "utf8"));
    writeFileSync("marca/marca.json", `${JSON.stringify({ ...atual, logo: "marca/logo-canal.png" }, null, 2)}\n`);
    console.log("Logo do canal copiado para public/marca/logo-canal.png.");
  }
  if (/ainda não montou/.test(texto)) console.log("Atenção: o dono ainda não preencheu a tela Animação.");
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
}
