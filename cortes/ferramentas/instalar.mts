// Instala a transcrição neste computador, em .cortes/ (uma vez só, ~600 MB):
//   - Python 3.12 só para esta pasta, pelo uv (não mexe no Python do computador)
//   - faster-whisper (MIT), que transcreve com o tempo de cada palavra
//
// Uso: npm run instalar [-- --modelo medium]
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { MODELOS, PASTA_PYTHON, PYTHON, rodar } from "./comum.ts";

const indice = process.argv.indexOf("--modelo");
const modelo = indice > 0 ? process.argv[indice + 1] : "small";

if (spawnSync("uv", ["--version"], { shell: process.platform === "win32" }).status !== 0) {
  console.error(
    "Falta o uv. Mac ou Linux: curl -LsSf https://astral.sh/uv/install.sh | sh (ou brew install uv). " +
      'Windows (PowerShell): powershell -c "irm https://astral.sh/uv/install.ps1 | iex". Depois abra um terminal novo.',
  );
  process.exit(1);
}

console.log("1/3 Python desta pasta");
if (!existsSync(PYTHON)) rodar("uv", ["venv", "--python", "3.12", join(PASTA_PYTHON, "python")], { mostrar: true });

console.log("2/3 faster-whisper");
rodar("uv", ["pip", "install", "--python", PYTHON, "faster-whisper==1.2.1"], { mostrar: true });

console.log(`3/3 Modelo de transcrição "${modelo}" (só desta vez)`);
mkdirSync(MODELOS, { recursive: true });
rodar(
  PYTHON,
  ["-c", `from faster_whisper import WhisperModel; WhisperModel("${modelo}", device="cpu", compute_type="int8", download_root=r"${join(MODELOS, "whisper")}")`],
  { mostrar: true },
);

console.log("\nPronto. Agora: npm run buscar (vídeos pedidos no menu Cortes) ou npm run transcrever");
