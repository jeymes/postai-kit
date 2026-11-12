// Baixa do Postaí o canal animado que o dono montou na tela Animação (o que
// divulga, o que faz e não faz, tom, tipos de vídeo, referências e
// aprendizados) e grava em canais/<canal>/canal-postai.md, que a equipe de
// agentes lê antes de cada episódio. Rode no começo de cada episódio: o dono
// pode ter anotado um aprendizado novo.
//
// Uso: POSTAI_CHAVE=postai.xxx.yyy npm run canal -- canais/<canal>
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { exigirChave, ferramenta } from "./postai.ts";

const pasta = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!pasta || !existsSync(pasta)) {
  console.error("Uso: npm run canal -- canais/<canal>   (a pasta precisa existir)");
  process.exit(1);
}
exigirChave();

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
    const { logoUrl, ...marca } = JSON.parse(await ferramenta("ver_marca")) ?? {};
    if (marca.nome) {
      const atual = JSON.parse(readFileSync("marca/marca.json", "utf8"));
      writeFileSync("marca/marca.json", `${JSON.stringify({ ...atual, ...marca, cores: { ...atual.cores, ...marca.cores } }, null, 2)}\n`);
      console.log(`Marca do canal: ${marca.nome}.`);
    }
    // O logo que a pessoa enviou no Postaí (curl: na nuvem passa pelo proxy)
    if (logoUrl) {
      const baixou = spawnSync("curl", ["-sSfL", "-o", join(pasta, "logo.png"), logoUrl], { stdio: "inherit" });
      console.log(baixou.status === 0 ? "Logo do canal baixado do Postaí." : "Não consegui baixar o logo: sigo sem ele.");
    }
  } catch (erro) {
    console.log(`Registro ou marca não baixados: ${erro instanceof Error ? erro.message : String(erro)}`);
  }
  try {
    const elenco = JSON.parse(await ferramenta("ver_elenco")) as { personagens: unknown[] };
    writeFileSync(join(pasta, "elenco.json"), `${JSON.stringify(elenco.personagens, null, 2)}\n`);
    console.log(`Elenco: ${elenco.personagens.length} personagem(ns) em ${join(pasta, "elenco.json")}.`);
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
