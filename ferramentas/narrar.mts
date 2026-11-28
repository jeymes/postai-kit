// Narra uma peça: cada cena com "fala" ganha a voz (do Google pelo Postaí, ou
// o Kokoro local), a legenda com o tempo de cada palavra e a conferência do que
// a voz disse (Whisper). Com
// "mascote": true (ou no molde Conversa) e o Rhubarb instalado, também a boca.
// No Conversa, cada cena é a fala de um personagem ("quem"), com a voz dele em
// "vozes" (ou a do elenco), ou do NARRADOR (sem "quem", ou quem "narrador"), com a
// voz do topo ("voz"); a fala do narrador não ganha boca (ninguém mexe a boca).
//
// O áudio vai para public/narracao/<peça>/ e o resto volta para o próprio
// conteudo/<peça>.json, em "narracao" de cada cena. Só refaz a cena cujo
// texto, voz ou velocidade mudou.
//
// Uso: npm run narrar -- conteudo/<peça>.json [--refazer] [--canal canais/<canal>]
// Antes, uma vez: npm run voz:instalar (o Whisper e o Rhubarb servem às duas vozes)
//
// QUAL VOZ (decisão do dono, 27/11/2026): o npm run canal grava em
// canais/<canal>/vozes.json o que o canal escolheu no Postaí:
//   { "motor": "gemini" | "chirp" | "kokoro", "semCota": "esperar" | "reserva", "narrador"?: "Charon" }
// A pasta do canal: --canal, ou canais/dark na rotina do Canal dark (.postai-canal),
// ou canais/canal, ou a única pasta de canais/ com vozes.json. Sem vozes.json (ou
// motor "kokoro"), tudo como antes: o Kokoro local.
// Com gemini ou chirp (Google, pelo gerar_voz do Postaí; Gemini e Chirp têm as
// mesmas 30 vozes pelo nome, em src/componentes/personagens/vozesGoogle.ts):
//   - a voz de quem fala é a "vozGoogle" do personagem (o npm run elenco copia do
//     elenco.json); a do narrador, "narrador" do vozes.json; faltando, a recomendada
//     pela voz antiga do Kokoro (feminina-N/masculina-N, mesmo gênero e jeito);
//   - ANTES de narrar, conta o que falta (pedidos no Gemini, letras no Chirp), vê a
//     cota (ver_cota_de_voz) e escolhe UM motor para o vídeo inteiro: o do canal, se
//     couber; senão, com "reserva", o outro (a mesma voz); senão para com
//     ESPERAR_COTA e o código de saída 75, sem gerar nada. Nunca troca para o Kokoro;
//   - se o gerar_voz responder COTA_ACABOU ou VOZ_FALHOU no meio, nada desta rodada
//     entra no vídeo: com "reserva", refaz tudo no outro motor; senão ESPERAR_COTA (75);
//   - cada trecho que o Google devolveu fica guardado em out/.vozes-google/ (pelo
//     motor, voz, idioma, jeito e texto): narrar de novo, ou com --refazer, não gasta
//     a cota com a fala que não mudou;
//   - a velocidade: só a "velocidade" do topo do roteiro, aplicada com o atempo do
//     ffmpeg (as velocidades do catálogo do Kokoro não valem para o Google);
//   - no Gemini vai um "jeito" curto pelo molde (documentário calmo no Documentario;
//     natural e expressivo no Conversa e no Mundo3D).
// ESPERAR_COTA não é defeito do kit: a rotina para, conta ao dono e tenta outro dia.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, join, resolve } from "node:path";
import { alinhar, falar, type Ouvida } from "./voz/texto.ts";
import { palavrasDificeis, pronunciasDoVideo } from "./voz/pronuncias.ts";
import { PYTHON, RHUBARB } from "./voz/caminhos.ts";
import { falaDoNarrador } from "../src/moldes/tempos.ts";
import { IDIOMAS_DA_VOZ, VOZES, VOZES_DO_ELENCO, vozNoIdioma, type IdiomaDaVoz, type Voz } from "../src/componentes/personagens/vozes.ts";
import {
  PADRAO_FEMININA,
  PADRAO_MASCULINA,
  outroMotor,
  recomendarVozGoogle,
  vozGoogleValida,
  VOZES_GOOGLE_DO_ELENCO,
  type MotorGoogle,
} from "../src/componentes/personagens/vozesGoogle.ts";
import {
  dividirTexto,
  erroDeCota,
  escolherMotor,
  jeitoDaFala,
  lerVozesDoCanal,
  nomeDoMotor,
  SAIDA_ESPERAR_COTA,
  type CotaDeVoz,
  type Gasto,
  type VozesDoCanal,
} from "./voz/motor.ts";
import { gerarTrecho, verCota, vozFalsa } from "./voz/google.ts";
import { pastaDoFfmpeg } from "./avatar/caminhos.ts";

const args = process.argv.slice(2);
const indiceDoCanal = args.indexOf("--canal");
const caminho = args.find((arg, i) => !arg.startsWith("--") && !(indiceDoCanal >= 0 && i === indiceDoCanal + 1));
const refazer = args.includes("--refazer");
if (!caminho) {
  console.error("Uso: npm run narrar -- conteudo/<peça>.json");
  process.exit(1);
}
if (!existsSync(PYTHON)) {
  console.error("A narração ainda não está instalada neste computador. Rode antes: npm run voz:instalar");
  process.exit(1);
}

type Cena = { fala?: string; quem?: string; narracao?: { chave?: string; audio?: string } & Record<string, unknown> };
const peca = JSON.parse(readFileSync(caminho, "utf8"));
const cenas: Cena[] = peca.cenas ?? [];
if (!cenas.some((cena) => cena.fala)) {
  console.error('Nenhuma cena com "fala". A narração é do molde Narrado (ou de um molde seu com cenas[].fala).');
  process.exit(1);
}

const nome = basename(caminho, ".json");
// O idioma: o do roteiro ou o do canal (o npm run canal grava em .postai-idioma);
// sem nenhum, português. A voz fala nele e o Whisper escuta nele.
const doCanal = existsSync(".postai-idioma") ? readFileSync(".postai-idioma", "utf8").trim() : "";
const idioma: IdiomaDaVoz = IDIOMAS_DA_VOZ.includes(peca.idioma) ? peca.idioma : IDIOMAS_DA_VOZ.includes(doCanal as IdiomaDaVoz) ? (doCanal as IdiomaDaVoz) : "pt";
// O narrador ("voz" no topo) aceita o id do catálogo ("masculina-4") ou o nome do Kokoro
const doCatalogo: Voz | undefined = peca.voz ? VOZES[peca.voz as string] : undefined;
const voz: string = vozNoIdioma(doCatalogo?.voz ?? peca.voz ?? "pf_dora", idioma);
const velocidade: number = peca.velocidade ?? doCatalogo?.velocidade ?? 1;
// As pronúncias do kit (grego e hebraico da Bíblia...) com as do roteiro por cima
const pronuncia: Record<string, string> = pronunciasDoVideo(peca.pronuncia, idioma);
{
  const dificeis = palavrasDificeis(
    cenas.map((c) => c.fala ?? "").filter(Boolean),
    pronuncia,
    idioma,
  );
  if (dificeis.length)
    console.log(
      `Palavras que a voz pode ler errado: ${dificeis.join(", ")}. Se alguma for estrangeira ou difícil, ponha em "pronuncia" como se lê (ex.: "splagchnizomai": "splanknízomai") ou troque por uma palavra em português.`,
    );
}
const comMascote = peca.mascote === true || peca.molde === "Conversa";
// Voz de cada personagem: a do elenco do roteiro (o nome de uma das VOZES ou
// uma voz do Kokoro), senão a da Bia e da Lu, e por cima o que vier em "vozes".
const doElenco: Record<string, Voz> = Object.fromEntries(
  ((peca.elenco ?? []) as Array<{ id: string; voz?: string }>)
    .filter((p) => p.voz)
    .map((p) => [p.id, VOZES[p.voz as string] ?? { voz: p.voz as string }]),
);
// "vozes" também aceita o id do catálogo (24/11/2026: { voz: "masculina-5" } ia
// cru para o Kokoro e a voz falhava): troca pela voz dele, e a velocidade
// escrita no roteiro vale mais que a do catálogo.
const doRoteiro: Record<string, Voz> = Object.fromEntries(
  Object.entries((peca.vozes ?? {}) as Record<string, Voz | string>).map(([quem, v]) => {
    const pedida = typeof v === "string" ? { voz: v } : v;
    const catalogo = VOZES[pedida.voz];
    return [quem, catalogo ? { ...catalogo, ...pedida, voz: catalogo.voz, velocidade: pedida.velocidade ?? catalogo.velocidade } : pedida];
  }),
);
const vozes: Record<string, Voz> = { ...VOZES_DO_ELENCO, ...doElenco, ...doRoteiro };
// O narrador ("narrador" em "vozes" vale, se o roteiro puser; senão, a "voz" do topo)
const vozDa = (cena: Cena) => (cena.quem && vozes[cena.quem]?.voz ? vozNoIdioma(vozes[cena.quem].voz, idioma) : voz);
const velocidadeDa = (cena: Cena) => (cena.quem && vozes[cena.quem]?.velocidade) || velocidade;
if (comMascote && !existsSync(RHUBARB))
  console.log("O Rhubarb não está instalado: o mascote mexe a boca pelo tempo das palavras. Para a boca exata: npm run voz:instalar -- --mascote");

const idsDoElenco = ((peca.elenco ?? []) as Array<{ id: string }>).map((p) => p.id);

type Pendente = { indice: number; roteiro: ReturnType<typeof falar>; textoDaVoz: string; chave: string; audio: string; voz: string; velocidade: number };
type Resultado = { duracao: number; palavras: Ouvida[] };
let pendentes: Pendente[] = [];
let resultados: Resultado[] = [];

// ---- Qual voz: a do canal (canais/<canal>/vozes.json) ----
const pastaDoCanal = (() => {
  if (indiceDoCanal >= 0 && args[indiceDoCanal + 1]) return args[indiceDoCanal + 1];
  const daRotina = existsSync(".postai-canal") ? readFileSync(".postai-canal", "utf8").trim() : "";
  if (daRotina === "dark" && existsSync("canais/dark")) return "canais/dark";
  if (existsSync("canais/canal/vozes.json")) return "canais/canal";
  if (!existsSync("canais")) return "";
  const comVozes = readdirSync("canais").filter((p) => existsSync(join("canais", p, "vozes.json")));
  return comVozes.length === 1 ? join("canais", comVozes[0]) : "";
})();
const vozesDoCanal: VozesDoCanal | undefined = (() => {
  const arquivo = pastaDoCanal ? join(pastaDoCanal, "vozes.json") : "";
  if (!arquivo || !existsSync(arquivo)) return undefined;
  try {
    return lerVozesDoCanal(JSON.parse(readFileSync(arquivo, "utf8")));
  } catch {
    console.log(`(${arquivo} ilegível: sigo com a voz local)`);
    return undefined;
  }
})();
const google = vozesDoCanal && vozesDoCanal.motor !== "kokoro" ? (vozesDoCanal as VozesDoCanal & { motor: MotorGoogle }) : undefined;

/** Para o vídeo sem gerar nada: falta cota (a rotina para e tenta outro dia; nunca o Kokoro). */
function esperarCota(motivo: string): never {
  console.log(`\nESPERAR_COTA: ${motivo}`);
  console.log(
    "O vídeo espera a cota da voz: pare a rotina aqui e conte ao dono (npm run andamento -- producao erro \"Sem cota de voz: <motivo>\"). Não troque para a voz Kokoro nem mude o motor: o dono escolhe isso no Postaí.",
  );
  process.exit(SAIDA_ESPERAR_COTA);
}

if (google) {
  if (!vozFalsa && !process.env.POSTAI_CHAVE && !existsSync(join(process.env.HOME ?? "", ".postai-passe"))) {
    console.error(`O canal usa a voz do Google (${nomeDoMotor(google.motor)}), que vem pelo Postaí: falta o acesso (o passe em ~/.postai-passe ou a POSTAI_CHAVE).`);
    process.exit(1);
  }
  const molde: string | undefined = peca.molde;
  const elencoDoRoteiro = (peca.elenco ?? []) as Array<{ id: string; voz?: string; vozGoogle?: string }>;
  // O elenco do canal (npm run canal) também diz a vozGoogle (o Mundo 3D não leva o elenco no roteiro)
  const elencoDoCanal = (() => {
    const arquivo = join(pastaDoCanal, "elenco.json");
    try {
      return existsSync(arquivo) ? (JSON.parse(readFileSync(arquivo, "utf8")) as Array<{ id: string; voz?: string; vozGoogle?: string }>) : [];
    } catch {
      return [];
    }
  })();
  const vozesDoRoteiro = (peca.vozes ?? {}) as Record<string, { voz?: string; vozGoogle?: string } | string>;
  const padraoDoNarrador = molde === "Documentario" || molde === "Mundo3D" ? PADRAO_MASCULINA : PADRAO_FEMININA;
  const vozDoNarrador = vozGoogleValida(google.narrador) ?? recomendarVozGoogle(peca.voz, padraoDoNarrador);
  const doNarrador = (cena: Cena) => falaDoNarrador(cena.quem, idsDoElenco);
  const vozGoogleDa = (cena: Cena): string => {
    if (doNarrador(cena) || !cena.quem) return vozDoNarrador;
    const noRoteiro = vozesDoRoteiro[cena.quem];
    const r = typeof noRoteiro === "string" ? { voz: noRoteiro } : noRoteiro;
    const e = elencoDoRoteiro.find((p) => p.id === cena.quem);
    const c = elencoDoCanal.find((p) => p.id === cena.quem);
    const pedida = vozGoogleValida(r?.vozGoogle) ?? vozGoogleValida(e?.vozGoogle) ?? vozGoogleValida(c?.vozGoogle);
    if (pedida) return pedida;
    const antiga = r?.voz ?? e?.voz ?? c?.voz;
    if (antiga) return recomendarVozGoogle(antiga, padraoDoNarrador);
    // A Bia e a Lu (sem elenco) e quem não tem voz: como no Kokoro, a do narrador
    return VOZES_GOOGLE_DO_ELENCO[cena.quem] ?? vozDoNarrador;
  };
  // Só a velocidade do topo do roteiro (as do catálogo são do Kokoro)
  const velocidadeGoogle = Math.min(1.4, Math.max(0.7, Number(peca.velocidade ?? 1) || 1));
  const rhubarbNaChave = comMascote && existsSync(RHUBARB);

  type Fala = { indice: number; roteiro: ReturnType<typeof falar>; textoDaVoz: string; voz: string; jeito: string; trechos: string[] };
  const falas: Fala[] = cenas.flatMap((cena, indice) => {
    if (!cena.fala) return [];
    const roteiro = falar(cena.fala, pronuncia, idioma);
    const textoDaVoz = roteiro.map((p) => p.falado).join(" ");
    return [{ indice, roteiro, textoDaVoz, voz: vozGoogleDa(cena), jeito: jeitoDaFala(molde, doNarrador(cena), idioma), trechos: dividirTexto(textoDaVoz) }];
  });
  const jeitoNo = (motor: MotorGoogle, f: Fala) => (motor === "gemini" ? f.jeito : "");
  const chaveDe = (motor: MotorGoogle, f: Fala) => JSON.stringify([f.textoDaVoz, motor, f.voz, jeitoNo(motor, f), velocidadeGoogle, rhubarbNaChave]);
  const audioDe = (f: Fala, chave: string) =>
    `narracao/${nome}/cena-${String(f.indice + 1).padStart(2, "0")}-${createHash("sha1").update(chave).digest("hex").slice(0, 8)}.wav`;
  const pronta = (motor: MotorGoogle, f: Fala) => {
    const n = cenas[f.indice].narracao;
    return n?.chave === chaveDe(motor, f) && typeof n.audio === "string" && existsSync(join("public", n.audio));
  };
  // Os trechos que o Google já devolveu ficam guardados (não gastam a cota de novo)
  const GUARDADOS = join("out", ".vozes-google");
  const guardado = (motor: MotorGoogle, f: Fala, trecho: string) =>
    join(GUARDADOS, `${createHash("sha1").update(JSON.stringify([motor, f.voz, idioma, jeitoNo(motor, f), trecho])).digest("hex")}.wav`);
  const faltamNo = (motor: MotorGoogle) => falas.filter((f) => refazer || !pronta(motor, f));
  const gastoNo = (motor: MotorGoogle): Gasto => {
    const novos = faltamNo(motor).flatMap((f) => f.trechos.filter((t) => !existsSync(guardado(motor, f, t))));
    return { pedidos: novos.length, letras: novos.reduce((soma, t) => soma + t.length, 0) };
  };

  // O vídeo já está inteiro num motor permitido (o do canal, ou a reserva que saiu ontem)? Fica.
  const permitidos: MotorGoogle[] = google.semCota === "reserva" ? [google.motor, outroMotor(google.motor)] : [google.motor];
  const emDia = !refazer && permitidos.find((m) => faltamNo(m).length === 0);
  if (emDia) {
    console.log(`A narração já está em dia com o texto (voz do Google, ${nomeDoMotor(emDia)}). Para gerar de novo: --refazer`);
    process.exit(0);
  }

  const cota: CotaDeVoz | null = await verCota();
  const jaFalhou: MotorGoogle[] = [];
  let motor: MotorGoogle | undefined;
  for (;;) {
    const escolha = escolherMotor(google, { gemini: gastoNo("gemini"), chirp: gastoNo("chirp") }, cota, jaFalhou);
    if ("esperar" in escolha) esperarCota(escolha.esperar);
    motor = escolha.motor;
    if (escolha.aviso) console.log(escolha.aviso);
    const faltam = faltamNo(motor);
    const gasto = gastoNo(motor);
    console.log(
      `Narrando ${faltam.length} cena(s) em ${{ pt: "português", en: "inglês", es: "espanhol" }[idioma]} no ${nomeDoMotor(motor)} com a voz ${[...new Set(faltam.map((f) => f.voz))].join(", ")}` +
        ` (${gasto.pedidos} trecho(s) novo(s), ${gasto.letras} letras${gasto.pedidos < faltam.reduce((s, f) => s + f.trechos.length, 0) ? "; o resto já estava guardado" : ""})...`,
    );
    try {
      for (const f of faltam)
        for (const trecho of f.trechos) {
          const destino = guardado(motor, f, trecho);
          if (!existsSync(destino)) await gerarTrecho({ texto: trecho, voz: f.voz, motor, idioma, jeito: jeitoNo(motor, f), peca: nome }, destino);
        }
      break;
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      const tipo = erroDeCota(mensagem);
      if (!tipo) {
        console.error(`A voz do Google falhou: ${mensagem}`);
        process.exit(1);
      }
      // Nada desta rodada entra no vídeo (nunca dois motores no mesmo vídeo): a escolha de novo,
      // sem este motor (os trechos que vieram ficam guardados para a próxima vez)
      console.log(`O ${nomeDoMotor(motor)} parou no meio (${tipo}): ${mensagem.replace(/^gerar_voz:\s*/, "").slice(0, 200)}`);
      jaFalhou.push(motor);
    }
  }

  // Junta os trechos e aplica a velocidade (ffmpeg do Remotion), quando precisa
  const temporaria = mkdtempSync(join(tmpdir(), "narrar-google-"));
  const ffmpeg = (() => {
    let pasta = "";
    return () => (pasta ||= pastaDoFfmpeg());
  })();
  const motorFinal = motor as MotorGoogle;
  const entradaDa = (f: Fala, i: number) => {
    const partes = f.trechos.map((t) => guardado(motorFinal, f, t));
    if (partes.length === 1 && velocidadeGoogle === 1) return partes[0];
    const saida = join(temporaria, `fala-${i}.wav`);
    const filtro = `${partes.map((_, j) => `[${j}:a]`).join("")}concat=n=${partes.length}:v=0:a=1[junta]${velocidadeGoogle !== 1 ? `;[junta]atempo=${velocidadeGoogle}[fim]` : ""}`;
    const pasta = ffmpeg();
    const r = spawnSync(
      join(pasta, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
      ["-y", "-loglevel", "error", ...partes.flatMap((p) => ["-i", p]), "-filter_complex", filtro, "-map", velocidadeGoogle !== 1 ? "[fim]" : "[junta]", saida],
      { encoding: "utf8", env: { ...process.env, PATH: `${pasta}${delimiter}${process.env.PATH}`, LD_LIBRARY_PATH: pasta, DYLD_LIBRARY_PATH: pasta } },
    );
    if (r.status !== 0) {
      console.error(`Não consegui juntar a fala da cena ${f.indice + 1}: ${r.stderr.slice(-300)}`);
      process.exit(1);
    }
    return saida;
  };
  const faltam = faltamNo(motorFinal);
  pendentes = faltam.map((f) => {
    const chave = chaveDe(motorFinal, f);
    return { indice: f.indice, roteiro: f.roteiro, textoDaVoz: f.textoDaVoz, chave, audio: audioDe(f, chave), voz: f.voz, velocidade: velocidadeGoogle };
  });
  // O volume no nível da narração e a conferência do Whisper (o Kokoro nem carrega)
  const pedido = join(temporaria, "pedido.json");
  writeFileSync(
    pedido,
    JSON.stringify({ idioma, falas: faltam.map((f, i) => ({ entrada: resolve(entradaDa(f, i)), saida: resolve("public", pendentes[i].audio) })) }),
  );
  const resposta = spawnSync(PYTHON, [join("ferramentas", "voz", "voz.py"), "--escutar", pedido], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  rmSync(temporaria, { recursive: true, force: true });
  if (resposta.status !== 0) {
    console.error(resposta.stderr);
    console.error("A conferência da voz (Whisper) falhou. Se for a primeira vez, rode de novo: npm run voz:instalar");
    process.exit(1);
  }
  resultados = JSON.parse(resposta.stdout);
  console.log(`Voz do Google: ${nomeDoMotor(motorFinal)} no vídeo inteiro.`);
} else {
  pendentes = cenas
    .map((cena, indice) => {
      if (!cena.fala) return null;
      const roteiro = falar(cena.fala, pronuncia, idioma);
      const textoDaVoz = roteiro.map((p) => p.falado).join(" ");
      const chave = JSON.stringify([textoDaVoz, vozDa(cena), velocidadeDa(cena), comMascote && existsSync(RHUBARB)]);
      // O nome do áudio leva uma marca da fala (22/11/2026): com só o número da cena,
      // cenas novas no meio do roteiro gravavam por cima do áudio das que mudaram de
      // número, e o vídeo saía com a fala de uma cena na outra.
      const audio = `narracao/${nome}/cena-${String(indice + 1).padStart(2, "0")}-${createHash("sha1").update(chave).digest("hex").slice(0, 8)}.wav`;
      const anterior = cena.narracao?.audio;
      const pronta = cena.narracao?.chave === chave && typeof anterior === "string" && existsSync(join("public", anterior));
      return pronta && !refazer ? null : { indice, roteiro, textoDaVoz, chave, audio, voz: vozDa(cena), velocidade: velocidadeDa(cena) };
    })
    .filter((p) => p !== null);

  if (pendentes.length === 0) {
    console.log("A narração já está em dia com o texto. Para gerar de novo: --refazer");
    process.exit(0);
  }

  console.log(`Narrando ${pendentes.length} cena(s) em ${{ pt: "português", en: "inglês", es: "espanhol" }[idioma]} com a voz ${[...new Set(pendentes.map((p) => p.voz))].join(", ")}...`);
  const temporaria = mkdtempSync(join(tmpdir(), "narrar-"));
  const pedido = join(temporaria, "pedido.json");
  writeFileSync(
    pedido,
    JSON.stringify({
      voz,
      velocidade,
      idioma,
      falas: pendentes.map((p) => ({ texto: p.textoDaVoz, saida: join(process.cwd(), "public", p.audio), voz: p.voz, velocidade: p.velocidade })),
    }),
  );
  const resposta = spawnSync(PYTHON, [join("ferramentas", "voz", "voz.py"), pedido], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  rmSync(temporaria, { recursive: true, force: true });
  if (resposta.status !== 0) {
    console.error(resposta.stderr);
    console.error("A voz falhou. Se for a primeira vez, rode de novo: npm run voz:instalar");
    process.exit(1);
  }
  resultados = JSON.parse(resposta.stdout);
}

/** Formas da boca (A a H e X, do Rhubarb), com o segundo em que cada uma começa */
function boca(audio: string) {
  const r = spawnSync(RHUBARB, ["-r", "phonetic", "-f", "json", "-q", join("public", audio)], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`O Rhubarb falhou em ${audio}: o mascote mexe a boca pelo tempo das palavras.`);
    return undefined;
  }
  const { mouthCues } = JSON.parse(r.stdout) as { mouthCues: Array<{ start: number; value: string }> };
  return mouthCues.map((c) => ({ inicio: c.start, forma: c.value }));
}

const avisos: string[] = [];
pendentes.forEach((p, i) => {
  const { duracao, palavras } = resultados[i];
  const { legendas, diferencas } = alinhar(p.roteiro, palavras, duracao);
  cenas[p.indice].narracao = {
    audio: p.audio,
    duracaoSeg: duracao,
    legendas,
    // Na Conversa, a fala do narrador não mexe a boca de ninguém: sem Rhubarb nela
    ...(comMascote && existsSync(RHUBARB) && !(peca.molde === "Conversa" && falaDoNarrador(cenas[p.indice].quem, idsDoElenco)) ? { boca: boca(p.audio) } : {}),
    chave: p.chave,
  };
  const doNarrador = peca.molde === "Conversa" && falaDoNarrador(cenas[p.indice].quem, idsDoElenco);
  console.log(`  cena ${p.indice + 1}${doNarrador ? " (narrador)" : ""}: ${duracao.toFixed(1)} s`);
  for (const d of diferencas) avisos.push(`  cena ${p.indice + 1}: ${d}`);
});

// Grava só a narração, no roteiro como ele está AGORA: no Canal dark a
// pesquisadora põe as imagens enquanto a narração roda, e gravar o arquivo
// lido no começo apagaria o que ela fez. Cena cuja fala mudou no meio do
// caminho fica sem esta narração (narre de novo).
const atual = JSON.parse(readFileSync(caminho, "utf8"));
const cenasAtuais: Cena[] = atual.cenas ?? [];
const mudaram: number[] = [];
cenas.forEach((cena, i) => {
  if (!cena.narracao) return;
  if (!cenasAtuais[i] || cenasAtuais[i].fala !== cena.fala) {
    mudaram.push(i + 1);
    return;
  }
  cenasAtuais[i].narracao = cena.narracao;
});
// O vídeo usa o idioma nos textos fixos (o botão do fim, o "Inscreva-se")
atual.idioma = idioma;
writeFileSync(caminho, `${JSON.stringify(atual, null, 2)}\n`);
if (mudaram.length) console.log(`\nAtenção: a fala das cenas ${mudaram.join(", ")} mudou enquanto a narração rodava. Rode o narrar de novo.`);
const total = cenasAtuais.reduce((soma, c) => soma + Number(c.narracao?.duracaoSeg ?? 0), 0);
console.log(`\nPronto: ${total.toFixed(1)} s de fala, gravados em ${caminho}.`);
if (avisos.length) {
  console.log("\nConfira (pode ser pronúncia errada). Se for, ajuste em \"pronuncia\" e narre de novo:");
  console.log(avisos.join("\n"));
  if (idioma !== "pt")
    console.log(`\nA voz fala ${{ en: "inglês", es: "espanhol" }[idioma]} de verdade (voz nativa da língua): estes avisos são só diferenças do que o Whisper escreveu (nome próprio, número, sigla). Nunca pare o vídeo por eles; corrija só a palavra que estiver errada.`);
} else console.log("A conferência não achou diferença entre o roteiro e o que a voz disse.");

// Na rotina da nuvem (com o passe do Postaí), o ponto do vídeo é guardado aqui,
// sozinho: o roteiro já está aprovado (a narração vem depois da checadora) e a
// voz acabou de ficar pronta. Antes dependia da agente rodar o npm run ponto, e
// em 21/11 ela pulou: o vídeo parou nas imagens e o "Continuar de onde parou"
// não apareceu. O ponto de antes do render, se a equipe guardar depois, substitui este.
if (process.env.POSTAI_CHAVE && !mudaram.length && /(^|\/)conteudo\//.test(caminho)) {
  const ponto = spawnSync("npm", ["run", "--silent", "ponto", "--", "guardar", caminho, "roteiro"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  console.log(
    ponto.status === 0
      ? "\nPonto guardado no Postaí (roteiro e voz): se a execução parar, o dono continua daqui."
      : `\n(O ponto não foi guardado: ${(ponto.stderr || ponto.stdout || "").trim().slice(-200)}. Rode npm run ponto -- guardar ${caminho} roteiro)`,
  );
}
