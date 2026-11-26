// Infográfico: os números do jeito de cada língua (pt: 1.234,56; en: 1,234.56;
// es: 1234,56), a unidade no lugar certo (R$ antes, % depois), a escala dos
// eixos com números redondos e o "mil", "mi", "bi" dos eixos. Sem React.

export type IdiomaDoNumero = "pt" | "en" | "es";

const LOCAL: Record<IdiomaDoNumero, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };
const localDo = (idioma?: string) => LOCAL[(idioma as IdiomaDoNumero) in LOCAL ? (idioma as IdiomaDoNumero) : "pt"];

const formatos = new Map<string, Intl.NumberFormat>();
function formato(idioma: string | undefined, opcoes: Intl.NumberFormatOptions) {
  const chave = `${localDo(idioma)}|${JSON.stringify(opcoes)}`;
  let f = formatos.get(chave);
  if (!f) {
    f = new Intl.NumberFormat(localDo(idioma), opcoes);
    formatos.set(chave, f);
  }
  return f;
}

/** O número com as casas pedidas (sempre as mesmas casas: a largura não pula durante a contagem) */
export function formatar(valor: number, casas: number, idioma?: string) {
  return formato(idioma, { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor);
}

/** Curto, para eixo e valor grande: 15 mil, 1,5 mi, 2 bi (en: 15K, 1.5M) */
export function compacto(valor: number, idioma?: string, casas = 1) {
  return formato(idioma, { notation: "compact", maximumFractionDigits: casas }).format(valor);
}

/** As casas dos próprios valores (35949.64 tem 2), até 2 */
export function casasDe(valores: number[]) {
  let maior = 0;
  for (const v of valores) {
    const texto = String(Math.abs(v));
    const ponto = texto.indexOf(".");
    if (ponto >= 0 && !texto.includes("e")) maior = Math.max(maior, texto.length - ponto - 1);
  }
  return Math.min(2, maior);
}

const MOEDA = /^(R\$|US\$|U\$|€|\$|£|¥)\s*(.*)$/;

/** Onde a unidade entra: "R$ bi" vira { antes: "R$ ", depois: " bi" }; "%" fica colado; "anos" com espaço */
export function partesDaUnidade(unidade?: string): { antes: string; depois: string } {
  const u = (unidade ?? "").trim();
  if (!u) return { antes: "", depois: "" };
  const m = MOEDA.exec(u);
  if (m) return { antes: `${m[1]}${["$", "€", "£", "¥"].includes(m[1]) ? "" : "\u00a0"}`, depois: m[2] ? `\u00a0${m[2]}` : "" };
  if (/^[%‰×x°]/.test(u)) return { antes: "", depois: u.replace(/\s+/g, "\u00a0") };
  return { antes: "", depois: `\u00a0${u.replace(/\s+/g, "\u00a0")}` };
}

/** O valor com a unidade; de 1 milhão para cima, curto (1,5 mi) */
export function comUnidade(valor: number, unidade: string | undefined, casas: number, idioma?: string, curto = Math.abs(valor) >= 1e6) {
  const { antes, depois } = partesDaUnidade(unidade);
  const sinal = valor < 0 ? "−" : "";
  const corpo = curto ? compacto(Math.abs(valor), idioma) : formatar(Math.abs(valor), casas, idioma);
  return `${sinal}${antes}${corpo}${depois}`;
}

/** Um passo "bonito" (1, 2, 2,5, 5 vezes 10^n) perto de `bruto` */
function passoBonito(bruto: number) {
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / potencia;
  const bonito = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return bonito * potencia;
}

/**
 * A escala do eixo: de `min` a `max` com uns `n` intervalos redondos. Com tudo
 * positivo, o eixo começa no zero (a barra e a área não mentem o tamanho), a não
 * ser na linha com os valores longe do zero (`podeCortar`).
 */
export function escalaBonita(min: number, max: number, n = 4, podeCortar = false) {
  let baixo = Math.min(min, max);
  let alto = Math.max(min, max);
  if (baixo >= 0 && (!podeCortar || baixo < alto * 0.45)) baixo = 0;
  if (alto <= 0 && (!podeCortar || alto > baixo * 0.45)) alto = 0;
  if (alto === baixo) alto = baixo + (baixo === 0 ? 1 : Math.abs(baixo) * 0.5);
  const passo = passoBonito((alto - baixo) / n);
  const inicio = Math.floor(baixo / passo) * passo;
  const fim = Math.ceil(alto / passo) * passo;
  const ticks: number[] = [];
  for (let v = inicio; v <= fim + passo / 1000; v += passo) ticks.push(Math.abs(v) < passo / 1e6 ? 0 : Number(v.toPrecision(12)));
  return { min: inicio, max: fim, ticks, passo };
}

/** As casas que o eixo precisa para os seus números redondos (passo 2,5 → 1 casa) */
export const casasDoPasso = (passo: number) => (passo >= 1 ? (Number.isInteger(passo) ? 0 : 1) : Math.min(3, Math.ceil(-Math.log10(passo))));

/** Palavras curtas do gráfico em cada língua */
export const PALAVRAS = {
  pt: { fonte: "Fonte", emCada: "em cada", capitulo: "Capítulo", mais: "mais", vs: "VS" },
  en: { fonte: "Source", emCada: "in every", capitulo: "Chapter", mais: "more", vs: "VS" },
  es: { fonte: "Fuente", emCada: "de cada", capitulo: "Capítulo", mais: "más", vs: "VS" },
} as const;
export const palavrasDo = (idioma?: string) => PALAVRAS[(idioma as IdiomaDoNumero) in PALAVRAS ? (idioma as IdiomaDoNumero) : "pt"];

/** "IBGE, 2025" vira "Fonte: IBGE, 2025" (se a roteirista já escreveu "Fonte:" ou "Exemplo de cálculo", fica como está) */
export function textoDaFonte(fonte: string, idioma?: string) {
  const f = fonte.trim();
  if (/^(fontes?|source|sources|fuentes?|dados|data|datos)\s*:/i.test(f)) return f;
  if (/^(exemplo|c[aá]lculo|simula|estimativa|example|calculation|simulation|estimate|ejemplo|c[aá]lculo|simulaci)/i.test(f)) return f;
  return `${palavrasDo(idioma).fonte}: ${f}`;
}

/** Para achar a palavra da fala: minúsculas, sem acento e sem pontuação */
export const normalizarPalavra = (p: string) =>
  p
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
