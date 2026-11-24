// Shorts do vídeo longo do Canal dark (23/11/2026): monta um short em pé
// (molde CorteVertical) com cenas seguidas de um Documentario já narrado. A voz
// das cenas é reaproveitada (o npm run narrar só faz a do gancho, se houver).
//
// Sem --cenas: lista as cenas com o tempo, para escolher o trecho.
// Uso: npm run corte-vertical -- conteudo/<longo>.json
//      npm run corte-vertical -- conteudo/<longo>.json --cenas 12-16 --titulo "texto no alto" [--gancho "frase falada antes"] [--nome parte-1]
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

type Cena = { fala?: string; capitulo?: string; foto?: string; narracao?: { duracaoSeg?: number } } & Record<string, unknown>;

const args = process.argv.slice(2);
const valor = (nome: string) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const caminho = args.find((a) => a.endsWith(".json"));
if (!caminho) {
  console.error('Uso: npm run corte-vertical -- conteudo/<longo>.json [--cenas 12-16 --titulo "..." --gancho "..."]');
  process.exit(1);
}
const longo = JSON.parse(readFileSync(caminho, "utf8")) as { molde: string; cenas: Cena[]; post?: { titulo?: string } } & Record<string, unknown>;
if (longo.molde !== "Documentario") {
  console.error("O short sai de um vídeo longo do Canal dark (molde Documentario).");
  process.exit(1);
}
const seg = (c: Cena) => Number(c.narracao?.duracaoSeg ?? (c.fala ?? "").split(/\s+/).length / 3) + 0.6;

const pedidas = valor("cenas");
if (!pedidas) {
  console.log(`${longo.cenas.length} cenas em ${caminho}. Escolha um trecho seguido de 20 a 55 s que comece com uma ideia inteira, tenha uma virada e feche numa frase completa:\n`);
  let t = 0;
  longo.cenas.forEach((c, i) => {
    console.log(`${String(i + 1).padStart(3)}  ${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}  (${seg(c).toFixed(1)} s)${c.capitulo ? `  [${c.capitulo}]` : ""}  ${(c.fala ?? "").slice(0, 110)}`);
    t += seg(c);
  });
  process.exit(0);
}
const [de, ate] = pedidas.split("-").map(Number);
if (!(de >= 1 && ate >= de && ate <= longo.cenas.length)) {
  console.error(`--cenas precisa ser um trecho como 12-16 (de 1 a ${longo.cenas.length}).`);
  process.exit(1);
}
const titulo = valor("titulo")?.trim();
if (!titulo) {
  console.error('Falta --titulo "o gancho escrito no alto" (até ~50 letras).');
  process.exit(1);
}
const trecho = longo.cenas.slice(de - 1, ate).map((c) => ({ ...c, capitulo: undefined, texto: undefined }));
if (trecho.some((c) => !c.narracao)) {
  console.error(`Alguma cena do trecho está sem voz: rode antes npm run narrar -- ${caminho}`);
  process.exit(1);
}
const gancho = valor("gancho")?.trim();
// O gancho falado vira a primeira cena, com a imagem da primeira do trecho (o narrar faz só essa voz)
const cenas = gancho ? [{ fala: gancho, foto: trecho.find((c) => c.foto)?.foto }, ...trecho] : trecho;
const total = cenas.reduce((s, c) => s + seg(c as Cena), 0);
if (total < 15 || total > 75) console.log(`Aviso: o short fica com uns ${Math.round(total)} s (o bom é de 20 a 55 s).`);

const { molde: _molde, cenas: _cenas, capa: _capa, post: _post, encerramento: _enc, ...resto } = longo;
void [_molde, _cenas, _capa, _post, _enc];
const nome = valor("nome") ?? `corte-${de}-${ate}`;
const saida = caminho.replace(/\.json$/, `-${nome}.json`);
writeFileSync(
  saida,
  JSON.stringify(
    {
      molde: "CorteVertical",
      ...resto,
      cenas,
      titulo,
      fim: valor("fim") ?? "Vídeo completo no canal",
      post: { titulo: titulo.slice(0, 90), legenda: `${titulo}\n\nVídeo completo no canal: ${longo.post?.titulo ?? basename(caminho, ".json")}` },
    },
    null,
    2,
  ),
);
console.log(`Short salvo em ${saida} (${cenas.length} cenas, uns ${Math.round(total)} s).`);
console.log(gancho ? `Próximo: npm run narrar -- ${saida} (só a voz do gancho) e depois npm run renderizar -- ${saida}` : `Próximo: npm run renderizar -- ${saida}`);
