// As páginas da legenda (sem React: o teste e a conferência usam direto).

export type Legenda = {
  texto: string;
  inicioMs: number;
  fimMs: number;
  /** Começa uma página nova aqui (a primeira palavra de cada cena): nunca junta falas de cenas diferentes */
  nova?: boolean;
};

type Pagina = { startMs: number; tokens: Array<{ text: string; fromMs: number; toMs: number }> };

/**
 * Junta as palavras em páginas de uma linha só: palavras próximas no tempo (até
 * 1,1 s do começo da página), sem passar de `maxLetras` e sem misturar cenas.
 * Se a última página ficaria com uma palavra sozinha, ela passa para a anterior
 * (quando cabe) para não sobrar "painel" sozinho na tela.
 */
export function paginar(legendas: Legenda[], maxLetras: number, juntarMs = 1100): Pagina[] {
  const paginas: Pagina[] = [];
  const letras = (p: Pagina) => p.tokens.reduce((soma, t) => soma + t.text.length, 0) + Math.max(0, p.tokens.length - 1);
  for (const l of legendas) {
    const texto = l.texto.trim();
    if (!texto) continue;
    const atual = paginas[paginas.length - 1];
    const token = { text: texto, fromMs: l.inicioMs, toMs: l.fimMs };
    if (!atual || l.nova || l.inicioMs - atual.startMs > juntarMs || letras(atual) + 1 + texto.length > maxLetras) {
      paginas.push({ startMs: l.inicioMs, tokens: [token] });
    } else {
      atual.tokens.push(token);
    }
  }
  // Nada de palavra sozinha numa página quando a anterior (da mesma fala e perto no tempo) pode dividir melhor
  for (let i = 1; i < paginas.length; i++) {
    const antes = paginas[i - 1];
    const agora = paginas[i];
    const mesmaFala = agora.startMs - antes.tokens[antes.tokens.length - 1].toMs < 400;
    const cabe = antes.tokens[antes.tokens.length - 1].text.length + 1 + agora.tokens[0].text.length <= maxLetras;
    if (agora.tokens.length === 1 && antes.tokens.length >= 3 && mesmaFala && cabe) {
      const passa = antes.tokens.pop()!;
      agora.tokens.unshift(passa);
      agora.startMs = passa.fromMs;
    }
  }
  return paginas;
}
