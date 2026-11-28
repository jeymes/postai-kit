// Ilustração da fala: as medidas de desenho, sem React (o render e os testes usam).
//   - a fila de ícones com rótulo: cada ícone ganha a sua vaga na largura toda,
//     e o rótulo cabe nela (letra menor ou duas linhas), sem encostar no vizinho;
//   - a conta: o cartão só tem a altura das linhas que já entraram.
// Testes: node --test src/componentes/ilustracao/layout.test.ts

/** A largura de uma letra da fonte dos rótulos (negrito), em fração do tamanho: a conta é por cima, para sobrar folga */
const LETRA = 0.6;
/** O vão entre um ícone e o outro da fila (px) */
export const VAO_DA_FILA = 28;
/** O espaço entre o ícone e o rótulo, e o respiro em cima da fila (px) */
const ENTRE = 14;
const RESPIRO = 10;

/** A largura da pílula de um rótulo (o texto mais o padding do lado, 0,55 do tamanho de cada lado) */
export const larguraDaPilula = (texto: string, fonte: number) => Math.ceil(fonte * (LETRA * texto.length + 1.1)) + 8;
/** A altura da pílula com `linhas` linhas (linha de 1,1, padding de 0,16 em cima e embaixo, contorno) */
export const alturaDaPilula = (linhas: number, fonte: number) => Math.ceil(fonte * (1.1 * linhas + 0.32)) + 8;

/** Quebra o rótulo em duas linhas no espaço mais perto do meio (sem espaço: uma linha só) */
export function emDuasLinhas(texto: string): string[] {
  const t = texto.trim();
  const meio = t.length / 2;
  let melhor = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === " " && (melhor < 0 || Math.abs(i - meio) < Math.abs(melhor - meio))) melhor = i;
  return melhor < 0 ? [t] : [t.slice(0, melhor), t.slice(melhor + 1)];
}

export interface FilaDeIcones {
  /** A largura da vaga de cada ícone (o rótulo cabe nela; não passa da parte da fila que é dele) e o vão entre as vagas */
  vaga: number;
  vao: number;
  /** O tamanho do círculo do ícone */
  diametro: number;
  /** O tamanho da letra dos rótulos (o mesmo na fila toda) */
  fonte: number;
  /** As linhas de cada rótulo (vazio = sem rótulo) */
  linhas: string[][];
}

/**
 * As medidas da fila de ícones (1 a 4) dentro da caixa `largura` x `altura`. Cada ícone tem
 * uma vaga igual; o rótulo tenta, nesta ordem: uma linha com letra de 36 a 30; duas linhas de
 * 36 a 24; uma linha de 28 a 20; senão, duas linhas com a letra que couber. A letra é a
 * mesma na fila toda. O círculo encolhe se o rótulo de duas linhas não deixar altura para ele.
 */
export function filaDeIcones(rotulos: ReadonlyArray<string | undefined>, largura: number, altura: number, maior = 36): FilaDeIcones {
  const n = Math.max(1, rotulos.length);
  const vao = n > 1 ? VAO_DA_FILA : 0;
  const vaga = Math.floor((largura - vao * (n - 1)) / n);
  const textos = rotulos.map((r) => (r ?? "").trim());
  const cabe = (fonte: number, duas: boolean) => textos.every((t) => !t || (duas ? emDuasLinhas(t) : [t]).every((l) => larguraDaPilula(l, fonte) <= vaga));
  const tentativas: Array<[number, boolean]> = [];
  for (let f = maior; f >= 30; f -= 2) tentativas.push([f, false]);
  for (let f = maior; f >= 24; f -= 2) tentativas.push([f, true]);
  for (let f = 28; f >= 20; f -= 2) tentativas.push([f, false]);
  // Nada coube (vaga estreita demais: 4 ícones na metade da tela): duas linhas, com a letra
  // do tamanho que a linha mais comprida pede (no mínimo 12)
  const maisComprida = Math.max(1, ...textos.flatMap((t) => (t ? emDuasLinhas(t) : [])).map((l) => l.length));
  const [fonte, duas] = tentativas.find(([f, d]) => cabe(f, d)) ?? [Math.max(12, Math.min(20, Math.floor((vaga - 8) / (LETRA * maisComprida + 1.1)))), true];
  const linhas = textos.map((t) => (!t ? [] : duas && larguraDaPilula(t, fonte) > vaga ? emDuasLinhas(t) : [t]));
  const maisLinhas = Math.max(0, ...linhas.map((l) => l.length));
  const pilula = maisLinhas ? alturaDaPilula(maisLinhas, fonte) + ENTRE : 0;
  const diametro = Math.max(80, Math.min(170, vaga, altura - RESPIRO - pilula));
  // A vaga só do tamanho que precisa (o círculo ou o rótulo mais largo): a fila fica junta no meio
  const precisa = Math.max(diametro, ...linhas.flatMap((l) => l.map((t) => larguraDaPilula(t, fonte))));
  return { vaga: Math.min(vaga, precisa), vao, diametro, fonte, linhas };
}

// ---- A conta ----

/** A altura de cada linha da conta e o que sobra (padding de cima e de baixo do cartão, mais a folga) */
export const LINHA_DA_CONTA = 80;
export const BORDA_DA_CONTA = 80;

/** A altura do cartão da conta com `linhas` linhas na tela (fração: a linha que está entrando) */
export const alturaDaConta = (linhas: number) => BORDA_DA_CONTA + LINHA_DA_CONTA * Math.max(0, linhas);
