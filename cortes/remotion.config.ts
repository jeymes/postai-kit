import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Navegador já instalado na máquina (na nuvem, o ferramentas/nuvem.sh aponta
// o Chromium dela). Sem isso, o Remotion baixa o dele, como sempre.
if (process.env.KIT_NAVEGADOR) Config.setBrowserExecutable(process.env.KIT_NAVEGADOR);
