// Os cenários de um roteiro (molde Conversa): quais ele usa, quais são do kit e
// quais a equipe criou. Sem import de React: as ferramentas usam direto.

/** Os cenários que o kit desenha (src/componentes/cenarios/Cenarios.tsx > CENARIOS) */
export const CENARIOS_DO_KIT = ["atelie", "escritorio", "cafe", "quarto", "sala", "cozinha", "banheiro", "garagem", "carro"];

export type CenarioProprio = { id: string; nome: string; fundo: string; frente?: string; origem?: { objeto: string; x: number; y: number } };
type Roteiro = { cenario?: string; cenas?: Array<{ cenario?: string }>; cenariosProprios?: CenarioProprio[] };

/** Os nomes de cenário que o roteiro usa (o do começo e as trocas nas falas) */
export function cenariosUsados(peca: Roteiro): string[] {
  return [...new Set([peca.cenario ?? "atelie", ...(peca.cenas ?? []).map((c) => c.cenario).filter((c): c is string => Boolean(c))])];
}

/** Os usados que não são do kit nem estão desenhados no roteiro */
export function cenariosFaltando(peca: Roteiro): string[] {
  const desenhados = new Set((peca.cenariosProprios ?? []).map((c) => c.id));
  return cenariosUsados(peca).filter((nome) => !CENARIOS_DO_KIT.includes(nome) && !desenhados.has(nome));
}

/**
 * Põe no roteiro (cenariosProprios) o desenho dos cenários da equipe que ele usa,
 * do canais/<canal>/cenarios.json. Devolve os que não achou.
 */
export function porCenariosNoRoteiro(peca: Roteiro, doCanal: CenarioProprio[]): string[] {
  const usados = cenariosUsados(peca).filter((nome) => !CENARIOS_DO_KIT.includes(nome));
  const achados = doCanal.filter((c) => usados.includes(c.id));
  if (achados.length) peca.cenariosProprios = achados;
  else delete peca.cenariosProprios;
  return usados.filter((nome) => !achados.some((c) => c.id === nome));
}

/** Conferência rápida do SVG da equipe (o Postaí confere de verdade ao gravar) */
export function problemaNoSvg(svg: string | undefined, campo: string): string | null {
  if (!svg?.trim()) return `falta ${campo}`;
  if (svg.length > (campo === "fundo" ? 60_000 : 20_000)) return `${campo} grande demais`;
  if (/<\s*(script|style|image|text|foreignObject|use|a)\b/i.test(svg)) return `${campo}: só formas (nada de script, style, image, text, use ou link)`;
  if (/\son\w+\s*=|href\s*=|javascript:|data:/i.test(svg)) return `${campo}: atributo não permitido (eventos, links ou data:)`;
  if (/<svg\b/i.test(svg)) return `${campo}: sem a tag <svg> (só o que vai dentro dela)`;
  return null;
}
