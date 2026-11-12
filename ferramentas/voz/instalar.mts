// Instala a narração neste computador, em .voz/ (cerca de 1 GB, uma vez só):
//   - Python 3.12 só para o kit, pelo uv (não mexe no Python do computador)
//   - Kokoro (voz, Apache 2.0) e faster-whisper (conferência e legendas, MIT)
//   - com --mascote: o Rhubarb (boca do mascote, MIT)
// Nada disso vai no .zip do kit: cada computador baixa o seu.
//
// Uso: npm run voz:instalar [-- --mascote]
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { baixar, descompactar, exigirUv, rodar, windows } from "../instalacao.ts";
import { MODELOS, PASTA_DA_VOZ, PYTHON, RHUBARB } from "./caminhos.ts";

const comMascote = process.argv.includes("--mascote");

const PACOTES = ["kokoro-onnx==0.6.1", "soundfile==0.14.0", "faster-whisper==1.2.1"];
const KOKORO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0";
const MODELOS_DA_VOZ = [
  { url: `${KOKORO}/kokoro-v1.0.onnx`, arquivo: "kokoro.onnx", bytes: 325532387 },
  { url: `${KOKORO}/voices-v1.0.bin`, arquivo: "vozes.bin", bytes: 28214398 },
];
const RHUBARB_VERSAO = "1.14.0";
const RHUBARB_SISTEMA = windows ? "Windows" : process.platform === "darwin" ? "macOS" : "Linux";

const uv = exigirUv("npm run voz:instalar");

console.log("1/4 Python do kit");
if (!existsSync(PYTHON)) rodar(uv, ["venv", "--python", "3.12", join(PASTA_DA_VOZ, "python")]);

console.log("2/4 Voz e conferência (Kokoro e faster-whisper)");
rodar(uv, ["pip", "install", "--python", PYTHON, ...PACOTES]);

console.log("3/4 Modelos (uns 820 MB, só desta vez)");
mkdirSync(MODELOS, { recursive: true });
for (const m of MODELOS_DA_VOZ) await baixar(m.url, join(MODELOS, m.arquivo), m.bytes);
const whisper = spawnSync(
  PYTHON,
  ["-c", `from faster_whisper import WhisperModel; WhisperModel("small", device="cpu", compute_type="int8", download_root=r"${join(MODELOS, "whisper")}")`],
  { stdio: "inherit" },
);
if (whisper.status !== 0) {
  console.error("\nNão consegui baixar o Whisper (vem do Hugging Face).");
  if (process.env.HTTPS_PROXY || process.env.https_proxy)
    console.error("Atrás de proxy, libere na rede: huggingface.co e *.hf.co (os arquivos vêm de cas-bridge.xethub.hf.co e cdn-lfs-us-1.hf.co).");
  process.exit(whisper.status ?? 1);
}

if (comMascote && !existsSync(RHUBARB)) {
  console.log("Mascote: Rhubarb Lip Sync");
  const temporaria = mkdtempSync(join(tmpdir(), "rhubarb-"));
  const zip = join(temporaria, "rhubarb.zip");
  await baixar(
    `https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSAO}/Rhubarb-Lip-Sync-${RHUBARB_VERSAO}-${RHUBARB_SISTEMA}.zip`,
    zip,
  );
  descompactar(zip, temporaria);
  const pasta = readdirSync(temporaria).find((p) => p.startsWith("Rhubarb-Lip-Sync"));
  if (!pasta) throw new Error("O zip do Rhubarb veio diferente do esperado.");
  rmSync(join(PASTA_DA_VOZ, "rhubarb"), { recursive: true, force: true });
  renameSync(join(temporaria, pasta), join(PASTA_DA_VOZ, "rhubarb"));
  rmSync(temporaria, { recursive: true, force: true });
  if (!windows) chmodSync(RHUBARB, 0o755);
}

console.log("4/4 Teste");
const teste = spawnSync(PYTHON, [join("ferramentas", "voz", "voz.py"), "--testar"], { encoding: "utf8" });
if (teste.status !== 0 || !/pronto/i.test(teste.stdout)) {
  console.error(teste.stderr || teste.stdout);
  console.error("A voz foi instalada, mas o teste não passou.");
  process.exit(1);
}
if (comMascote && spawnSync(RHUBARB, ["--version"]).status !== 0) {
  console.error("O Rhubarb foi baixado, mas não abriu neste computador. O mascote mexe a boca pelo tempo das palavras.");
}
console.log(`\nNarração instalada. A voz disse e o Whisper ouviu: "${teste.stdout.trim()}"`);
console.log("Agora: npm run narrar -- conteudo/<peça>.json");
