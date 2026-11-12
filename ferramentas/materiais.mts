// Baixa o site e os materiais que o dono mandou na tela Animação do Postaí
// ("Montar meu canal"), para a criadora-de-canal olhar. As fotos vão como
// estão; de cada vídeo saem 4 quadros em JPG (o Claude lê imagens, não vídeo).
// Tudo em canais/<canal>/materiais/, com um materiais.json de índice.
//
// Uso: POSTAI_CHAVE=postai.xxx.yyy npm run materiais -- canais/<canal>
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exigirChave, ferramenta } from "./postai.ts";
import { rodar } from "./instalacao.ts";

const pasta = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!pasta || !existsSync(pasta)) {
  console.error("Uso: npm run materiais -- canais/<canal>   (a pasta precisa existir)");
  process.exit(1);
}
exigirChave();

type Material = { id: string; nome: string; tipo: string; papel: string; nota: string; url: string | null };

const destino = join(pasta, "materiais");
rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });

try {
  const dados = JSON.parse(await ferramenta("ver_materiais_do_canal")) as {
    site: string;
    montagem: { status: string } | null;
    materiais: Material[];
  };
  const indice = [];
  for (const m of dados.materiais) {
    if (!m.url) continue;
    const extensao = m.nome.split(".").pop()?.toLowerCase() || "bin";
    const arquivo = join(destino, `${m.id}.${extensao}`);
    rodar("curl", ["-fsSL", "--retry", "3", "-o", arquivo, m.url]);
    const quadros: string[] = [];
    if (m.tipo.startsWith("video/")) {
      for (const [i, seg] of [1, 4, 8, 15].entries()) {
        const quadro = join(destino, `${m.id}-quadro-${i + 1}.jpg`);
        const r = spawnSync("npx", ["remotion", "ffmpeg", "-v", "error", "-y", "-ss", String(seg), "-i", arquivo, "-frames:v", "1", "-vf", "scale=720:-1", quadro], {
          stdio: "inherit",
          shell: process.platform === "win32",
        });
        if (r.status === 0 && existsSync(quadro)) quadros.push(quadro);
      }
    }
    indice.push({ ...m, url: undefined, arquivo, quadros });
    console.log(`  ${m.papel}: ${m.nome}${quadros.length ? ` (${quadros.length} quadros)` : ""}`);
  }
  writeFileSync(join(destino, "materiais.json"), `${JSON.stringify({ site: dados.site, montagem: dados.montagem, materiais: indice }, null, 2)}\n`);
  console.log(`\n${indice.length} arquivo(s) em ${destino}. Site: ${dados.site || "(nenhum)"}`);
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
}
