// Onde a voz fica instalada: em .voz/, dentro do kit (fora do .zip, então as
// atualizações do kit não mexem).
import { join } from "node:path";

const windows = process.platform === "win32";

export const PASTA_DA_VOZ = join(process.cwd(), ".voz");
export const MODELOS = join(PASTA_DA_VOZ, "modelos");
export const PYTHON = join(PASTA_DA_VOZ, "python", windows ? "Scripts" : "bin", windows ? "python.exe" : "python");
export const RHUBARB = join(PASTA_DA_VOZ, "rhubarb", windows ? "rhubarb.exe" : "rhubarb");
