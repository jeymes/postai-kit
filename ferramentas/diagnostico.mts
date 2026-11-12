// Diz o que este computador aguenta: olha o sistema, a memória, o disco e a
// placa de vídeo, e mede de verdade quanto tempo leva um vídeo comum e um em
// 3D. Grava o jeito de usar a placa de vídeo que funcionou em .estudio.json
// (o renderizar usa nos moldes 3D). Leva 1 ou 2 minutos.
//
// Uso: npm run diagnostico
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statfsSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { PYTHON_DO_AVATAR } from "./avatar/caminhos.ts";
import { PYTHON, RHUBARB } from "./voz/caminhos.ts";

const GB = 1024 ** 3;
const windows = process.platform === "win32";
const QUADROS_DE_UM_VIDEO = 450; // 15 s

function rodar(comando: string, args: string[]) {
  const r = spawnSync(comando, args, { encoding: "utf8" });
  return r.status === 0 ? r.stdout : null;
}

type Placa = { nome: string; memoriaGb?: number; nvidia?: boolean };

function placasDeVideo(): Placa[] {
  // NVIDIA primeiro: é o que IA e avatar usam
  const nvidia = rodar("nvidia-smi", ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"]);
  if (nvidia)
    return nvidia
      .trim()
      .split("\n")
      .map((linha) => {
        const [nome, mb] = linha.split(",");
        return { nome: nome.trim(), memoriaGb: Number(mb) / 1024, nvidia: true };
      });
  if (process.platform === "darwin") {
    const saida = rodar("system_profiler", ["SPDisplaysDataType", "-json"]);
    const placas = saida ? (JSON.parse(saida).SPDisplaysDataType as Array<Record<string, string>>) : [];
    return placas.map((p) => ({ nome: p.sppci_model ?? p._name, memoriaGb: parseFloat(p.spdisplays_vram ?? p.spdisplays_vram_shared ?? "") || undefined }));
  }
  if (windows) {
    const saida = rodar("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | Select-Object Name | ConvertTo-Json"]);
    if (!saida) return [];
    const lista = [JSON.parse(saida)].flat() as Array<{ Name: string }>;
    return lista.map((p) => ({ nome: p.Name }));
  }
  const lspci = rodar("lspci", []);
  return (lspci ?? "")
    .split("\n")
    .filter((l) => /vga|3d controller/i.test(l))
    .map((l) => ({ nome: l.split(": ").pop() ?? l }));
}

const temporaria = mkdtempSync(join(os.tmpdir(), "postai-diagnostico-"));

function cronometrar(args: string[]) {
  const inicio = performance.now();
  const r = spawnSync("npx", ["remotion", ...args, "--log=error"], { encoding: "utf8", shell: windows });
  return { ok: r.status === 0, segundos: (performance.now() - inicio) / 1000 };
}

/** Tempo de um vídeo de 15 s: preparo (medido com 1 quadro) + quadros (medidos com 60) */
function medir(composicao: string, extra: string[] = []) {
  const um = cronometrar(["still", composicao, join(temporaria, `${composicao}.jpg`), "--frame=30", ...extra]);
  if (!um.ok) return null;
  const sessenta = cronometrar(["render", composicao, join(temporaria, `${composicao}.mp4`), "--frames=0-59", ...extra]);
  if (!sessenta.ok) return null;
  const porQuadro = Math.max(0.005, (sessenta.segundos - um.segundos) / 59);
  return { porQuadro, video: um.segundos + porQuadro * QUADROS_DE_UM_VIDEO };
}

const tempo = (s: number) => (s < 90 ? `uns ${Math.ceil(s / 5) * 5} s` : `uns ${Math.round(s / 60)} min`);

const cpus = os.cpus();
const memoria = os.totalmem() / GB;
const disco = (() => {
  const s = statfsSync(process.cwd());
  return (s.bavail * s.bsize) / GB;
})();
const appleSilicon = process.platform === "darwin" && /apple m\d/i.test(cpus[0]?.model ?? "");
const placas = placasDeVideo();

console.log("Diagnóstico do computador (leva 1 ou 2 minutos)\n");
console.log(`  Sistema: ${os.type()} ${os.release()} (${process.arch}), Node ${process.version}`);
console.log(`  Processador: ${cpus[0]?.model ?? "?"}, ${cpus.length} núcleos`);
console.log(`  Memória: ${memoria.toFixed(0)} GB    Disco livre: ${disco.toFixed(0)} GB`);
console.log(
  `  Placa de vídeo: ${placas.map((p) => `${p.nome}${p.memoriaGb ? ` (${p.memoriaGb.toFixed(0)} GB)` : ""}`).join(", ") || "não identificada"}${appleSilicon ? " (memória compartilhada)" : ""}`,
);

console.log("\nMedindo um vídeo comum...");
const comum = medir("Lista");
console.log("Medindo um vídeo em 3D...");
let gl: string | null = null;
let em3d: ReturnType<typeof medir> = null;
for (const opcao of ["angle", "swangle"]) {
  em3d = medir("Teste3D", [`--gl=${opcao}`]);
  if (em3d) {
    gl = opcao;
    break;
  }
}
rmSync(temporaria, { recursive: true, force: true });

const linhas: string[] = [];
const sim = (texto: string) => linhas.push(`  ✔ ${texto}`);
const talvez = (texto: string) => linhas.push(`  ~ ${texto}`);
const nao = (texto: string) => linhas.push(`  ✖ ${texto}`);

if (comum) sim(`Vídeos e carrosséis: sim. Um vídeo de 15 s leva ${tempo(comum.video)}.`);
else nao("Vídeos: o teste falhou. Rode npm install e tente de novo.");

const vozInstalada = existsSync(PYTHON);
if (memoria >= 8)
  sim(`Narração: sim${vozInstalada ? " (instalada)" : ". Para instalar: npm run voz:instalar (uns 1,2 GB)"}.`);
else if (memoria >= 4) talvez(`Narração: funciona, mas devagar (${memoria.toFixed(0)} GB de memória; o ideal é 8).`);
else nao("Narração: pouca memória para a voz (precisa de 4 GB, o ideal é 8).");
if (!vozInstalada && disco < 2) nao(`Narração: falta espaço (${disco.toFixed(1)} GB livres; precisa de 2).`);
if (existsSync(RHUBARB)) sim("Mascote com a boca exata (Rhubarb): instalado.");

if (em3d && em3d.porQuadro <= 0.4) sim(`3D: sim. Um vídeo 3D de 15 s leva ${tempo(em3d.video)}.`);
else if (em3d) talvez(`3D: funciona, mas demora: um vídeo 3D de 15 s leva ${tempo(em3d.video)}. Prefira vídeos 3D curtos.`);
else nao("3D: este computador não conseguiu desenhar em 3D (sem WebGL). Use os outros moldes.");

// Avatar falante (MuseTalk): só com placa NVIDIA de 4 GB ou mais
const nvidia = placas.find((p) => p.nvidia);
const avatarInstalado = existsSync(PYTHON_DO_AVATAR);
const memoriaDaPlaca = nvidia?.memoriaGb ?? 0;
if (nvidia && memoriaDaPlaca >= 8)
  sim(`Avatar falante: sim (${nvidia.nome})${avatarInstalado ? ", instalado" : ". Para instalar: npm run avatar:instalar (uns 7 GB)"}.`);
else if (nvidia && memoriaDaPlaca >= 4)
  talvez(`Avatar falante: funciona, mas devagar (${nvidia.nome}, ${memoriaDaPlaca.toFixed(0)} GB): uns 5 min para 8 s de vídeo.`);
else if (process.platform === "darwin") nao("Avatar falante: ainda não roda no Mac (precisa de placa NVIDIA). O mascote da narração funciona.");
else nao("Avatar falante: precisa de placa de vídeo NVIDIA com 4 GB ou mais.");

console.log("\nO que dá para fazer aqui:");
console.log(linhas.join("\n"));

writeFileSync(
  ".estudio.json",
  `${JSON.stringify(
    {
      data: new Date().toLocaleDateString("sv"),
      gl,
      memoriaGb: Math.round(memoria),
      placas,
      segundosPorVideo: comum ? Math.round(comum.video) : null,
      segundosPorVideo3d: em3d ? Math.round(em3d.video) : null,
    },
    null,
    2,
  )}\n`,
);
console.log("\nResultado guardado em .estudio.json (o renderizar usa para o 3D).");
