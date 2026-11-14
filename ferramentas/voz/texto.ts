// Texto da narração, sem nada de runtime (o narrar.mts usa):
//   1. falar(): o roteiro vira o texto que a voz lê, com preço, hora,
//      porcentagem, @ e site por extenso ("R$ 12,90" a voz leria "real dólar").
//   2. alinhar(): o que o Whisper ouviu × o roteiro. Dá o tempo de cada palavra
//      da legenda (que mostra o roteiro como foi escrito) e aponta o que a voz
//      pronunciou errado.

const UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 100) return "cem";
  const partes: string[] = [];
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  if (centena) partes.push(CENTENAS[centena]);
  if (resto) {
    const dezena = Math.floor(resto / 10);
    partes.push(resto < 20 ? UNIDADES[resto] : DEZENAS[dezena] + (resto % 10 ? ` e ${UNIDADES[resto % 10]}` : ""));
  }
  return partes.join(" e ") || "zero";
}

/** 0 a 999.999 por extenso ("mil duzentos e cinquenta") */
export function porExtenso(n: number, feminino = false): string {
  let texto: string;
  if (n < 1000) texto = ate999(n);
  else {
    const milhar = Math.floor(n / 1000);
    const resto = n % 1000;
    const mil = milhar === 1 ? "mil" : `${ate999(milhar)} mil`;
    texto = !resto ? mil : `${mil}${resto < 100 || resto % 100 === 0 ? " e " : " "}${ate999(resto)}`;
  }
  return feminino ? texto.replace(/\bum$/, "uma").replace(/\bdois$/, "duas") : texto;
}

const PALAVRAS_DE_NUMERO = new Set(
  [...UNIDADES, ...DEZENAS, ...CENTENAS, "cem", "mil", "e", "reais", "real", "centavos", "centavo", "uma", "duas", "hora", "horas", "por", "cento"]
    .filter(Boolean)
    .map((p) => normalizar(p)),
);

const inteiro = (texto: string) => Number(texto.replace(/\./g, ""));

/** Uma palavra do roteiro como a voz deve ler (pode virar várias) */
function falarPalavra(palavra: string, pronuncia: Record<string, string>): string {
  const [, antes, miolo, depois] = palavra.match(/^([("“'«]*)(.*?)([)"”'».,;:!?…]*)$/) ?? ["", "", palavra, ""];
  let falado = miolo;
  const trocar = Object.entries(pronuncia).find(([de]) => de.toLowerCase() === miolo.toLowerCase());
  let m: RegExpMatchArray | null;
  if (trocar) falado = trocar[1];
  else if ((m = miolo.match(/^R\$\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/))) {
    const reais = inteiro(m[1]);
    const centavos = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
    const partes = [];
    if (reais || !centavos) partes.push(`${porExtenso(reais)} ${reais === 1 ? "real" : "reais"}`);
    if (centavos) partes.push(`${porExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
    falado = partes.join(" e ");
  } else if ((m = miolo.match(/^(\d{1,2})h(\d{2})?$/i))) {
    const hora = Number(m[1]);
    falado = `${porExtenso(hora, true)} ${hora === 1 ? "hora" : "horas"}${m[2] && Number(m[2]) ? ` e ${porExtenso(Number(m[2]))}` : ""}`;
  } else if ((m = miolo.match(/^(\d+)%$/))) falado = `${porExtenso(Number(m[1]))} por cento`;
  else if ((m = miolo.match(/^@([\w.]+)$/)))
    falado = `arroba ${m[1].split(".").filter(Boolean).join(" ponto ").replace(/_/g, " ")}`;
  else if ((m = miolo.match(/^(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/\S*)?$/i)))
    falado = m[1].split(".").join(" ponto ").replace(/-/g, " ");
  return `${antes}${falado}${depois}`;
}

export type Palavra = { original: string; falado: string };

/** O roteiro em palavras, cada uma com o que a voz lê */
export function falar(roteiro: string, pronuncia: Record<string, string> = {}): Palavra[] {
  // Nome composto ("Millar Burrows": "Mílar Bárrous"): a voz lê palavra por
  // palavra, então cada palavra ganha a sua pronúncia (quando os dois lados têm
  // o mesmo número de palavras)
  const porPalavra: Record<string, string> = {};
  for (const [escrito, falado] of Object.entries(pronuncia)) {
    const de = escrito.trim().split(/\s+/);
    const para = falado.trim().split(/\s+/);
    if (de.length > 1 && de.length === para.length) de.forEach((palavra, i) => (porPalavra[palavra] = para[i]));
    else porPalavra[escrito] = falado;
  }
  pronuncia = porPalavra;
  // "R$ 12,90" é uma palavra só
  const palavras = roteiro.replace(/R\$\s+(?=\d)/g, "R$").split(/\s+/).filter(Boolean);
  return palavras.map((original) => ({ original, falado: falarPalavra(original, pronuncia) }));
}

/** Para comparar: minúsculas, sem acento e sem pontuação */
export function normalizar(palavra: string) {
  return palavra.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const pedacos = (texto: string) => texto.split(/[\s-]+/).map(normalizar).filter(Boolean);

function distancia(a: string, b: string) {
  const linha = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const acima = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = acima;
    }
  }
  return linha[b.length];
}

const ehNumero = (p: string) => /\d/.test(p) || PALAVRAS_DE_NUMERO.has(p);

function custo(a: string, b: string) {
  if (a === b) return 0;
  // O Whisper escreve número em algarismo ("quinze" volta "15")
  if (ehNumero(a) && ehNumero(b)) return 0.3;
  return Math.min(1, (distancia(a, b) / Math.max(a.length, b.length)) * 1.3);
}

export type Ouvida = { palavra: string; inicio: number; fim: number };
export type Legenda = { texto: string; inicioMs: number; fimMs: number };

/**
 * Casa o que foi ouvido com o roteiro. Devolve a legenda (palavras do roteiro,
 * com o tempo de cada uma) e as diferenças que valem conferir.
 */
export function alinhar(roteiro: Palavra[], ouvidas: Ouvida[], duracao: number) {
  // Cada palavra falada sabe de qual palavra do roteiro veio
  const faladas: Array<{ p: string; origem: number }> = [];
  roteiro.forEach((palavra, origem) => pedacos(palavra.falado).forEach((p) => faladas.push({ p, origem })));
  const escutadas: Array<{ p: string; inicio: number; fim: number; bruta: string }> = [];
  for (const o of ouvidas)
    for (const p of pedacos(o.palavra)) escutadas.push({ p, inicio: o.inicio, fim: o.fim, bruta: o.palavra });

  // Programação dinâmica (como a distância de edição), com junção de duas
  // palavras numa ("arroba lacos" ouvido como "arrobalacos")
  const PULO = 0.7;
  const n = faladas.length;
  const m = escutadas.length;
  const tabela = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(Infinity));
  const veio = Array.from({ length: n + 1 }, () => new Array<string>(m + 1).fill(""));
  tabela[0][0] = 0;
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= m; j++) {
      const atual = tabela[i][j];
      if (atual === Infinity) continue;
      const tentar = (ii: number, jj: number, c: number, passo: string) => {
        if (ii <= n && jj <= m && atual + c < tabela[ii][jj]) {
          tabela[ii][jj] = atual + c;
          veio[ii][jj] = passo;
        }
      };
      if (i < n && j < m) tentar(i + 1, j + 1, custo(faladas[i].p, escutadas[j].p), "casa");
      if (i < n) tentar(i + 1, j, PULO, "faltou");
      if (j < m) tentar(i, j + 1, PULO, "sobrou");
      if (i + 1 < n && j < m && faladas[i].p + faladas[i + 1].p === escutadas[j].p) tentar(i + 2, j + 1, 0, "junta2");
      if (i < n && j + 1 < m && escutadas[j].p + escutadas[j + 1].p === faladas[i].p) tentar(i + 1, j + 2, 0, "separa2");
    }

  const tempos = roteiro.map(() => ({ inicio: Infinity, fim: -Infinity }));
  const marcar = (origem: number, e: { inicio: number; fim: number }) => {
    tempos[origem].inicio = Math.min(tempos[origem].inicio, e.inicio);
    tempos[origem].fim = Math.max(tempos[origem].fim, e.fim);
  };
  const diferencas: string[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const passo = veio[i][j];
    if (passo === "casa") {
      const f = faladas[i - 1];
      const e = escutadas[j - 1];
      marcar(f.origem, e);
      if (custo(f.p, e.p) >= 0.5 && !ehNumero(f.p))
        diferencas.unshift(`ouvi "${e.bruta}" onde o roteiro diz "${roteiro[f.origem].original}"`);
      i--;
      j--;
    } else if (passo === "junta2") {
      marcar(faladas[i - 1].origem, escutadas[j - 1]);
      marcar(faladas[i - 2].origem, escutadas[j - 1]);
      i -= 2;
      j--;
    } else if (passo === "separa2") {
      marcar(faladas[i - 1].origem, escutadas[j - 1]);
      marcar(faladas[i - 1].origem, escutadas[j - 2]);
      i--;
      j -= 2;
    } else if (passo === "faltou") {
      const f = faladas[i - 1];
      if (!ehNumero(f.p)) diferencas.unshift(`não ouvi "${roteiro[f.origem].original}"`);
      i--;
    } else {
      const e = escutadas[j - 1];
      if (!ehNumero(e.p)) diferencas.unshift(`ouvi "${e.bruta}" a mais`);
      j--;
    }
  }

  // Palavra sem tempo: reparte o buraco entre as vizinhas, pelo tamanho
  let k = 0;
  while (k < roteiro.length) {
    if (tempos[k].inicio !== Infinity) {
      k++;
      continue;
    }
    let fimDoBuraco = k;
    while (fimDoBuraco < roteiro.length && tempos[fimDoBuraco].inicio === Infinity) fimDoBuraco++;
    const de = k > 0 ? tempos[k - 1].fim : 0;
    const ate = fimDoBuraco < roteiro.length ? tempos[fimDoBuraco].inicio : duracao;
    const tamanhos = roteiro.slice(k, fimDoBuraco).map((p) => p.original.length);
    const total = tamanhos.reduce((a, b) => a + b, 0);
    let t = de;
    tamanhos.forEach((tam, d) => {
      const passo = ((ate - de) * tam) / total;
      tempos[k + d] = { inicio: t, fim: t + passo };
      t += passo;
    });
    k = fimDoBuraco;
  }

  const legendas: Legenda[] = roteiro.map((p, indice) => ({
    texto: p.original.replace(/[.,;:]+$/, "").replace(/^R\$(?=\d)/, "R$ "),
    inicioMs: Math.round(tempos[indice].inicio * 1000),
    fimMs: Math.round(Math.max(tempos[indice].fim, tempos[indice].inicio + 0.05) * 1000),
  }));
  return { legendas, diferencas };
}
