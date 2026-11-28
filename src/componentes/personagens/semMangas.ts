// O desenho próprio não pode ter braço nem manga no corpo: os braços são do kit
// (eles mexem nas poses). Quando a designer desenhava as mangas no `corpo`, elas
// ficavam paradas no ombro e os braços do kit saíam por cima: o "boneco com quatro
// braços" (27/11/2026, o noivo do Laços: mangas curtas em x 92-138 e 262-308).
//
// Aqui o kit tira do `corpo` cada pedaço que fica todo do lado de fora do tronco, na
// altura dos braços (manga, punho, ombro bufante). O tronco, as pernas, o cinto e o
// que cruza o meio do corpo ficam. A ficha e o conferir avisam a designer.

/** Os limites de um pedaço do desenho: [x mínimo, y mínimo, x máximo, y máximo] */
type Caixa = [number, number, number, number];

const numeros = (texto: string) => (texto.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
const atributo = (tag: string, nome: string) => {
  const m = tag.match(new RegExp(`\\s${nome}="([^"]*)"`));
  return m ? m[1] : undefined;
};

/** Os pedaços (subcaminhos) de um path com comandos absolutos; null se tiver relativo ou arco (não dá para medir sem risco) */
function subcaminhos(d: string): Array<{ texto: string; caixa: Caixa }> | null {
  if (/[a-ya-y]/.test(d.replace(/e-?\d/gi, "")) || /[A]/.test(d)) return null;
  const partes = d.split(/(?=M)/).filter((p) => p.trim());
  return partes.map((texto) => {
    const n = numeros(texto.replace(/[HV]\s*-?\d*\.?\d+/g, ""));
    const xs = n.filter((_, i) => i % 2 === 0);
    const ys = n.filter((_, i) => i % 2 === 1);
    return { texto, caixa: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as Caixa };
  });
}

function caixaDoElemento(tag: string): Caixa | null {
  const nome = tag.match(/^<(\w+)/)?.[1];
  const num = (n: string) => Number(atributo(tag, n) ?? NaN);
  if (atributo(tag, "transform")) return null;
  switch (nome) {
    case "rect":
      return [num("x"), num("y"), num("x") + num("width"), num("y") + num("height")];
    case "circle":
      return [num("cx") - num("r"), num("cy") - num("r"), num("cx") + num("r"), num("cy") + num("r")];
    case "ellipse":
      return [num("cx") - num("rx"), num("cy") - num("ry"), num("cx") + num("rx"), num("cy") + num("ry")];
    case "line":
      return [Math.min(num("x1"), num("x2")), Math.min(num("y1"), num("y2")), Math.max(num("x1"), num("x2")), Math.max(num("y1"), num("y2"))];
    case "polygon":
    case "polyline": {
      const n = numeros(atributo(tag, "points") ?? "");
      const xs = n.filter((_, i) => i % 2 === 0);
      const ys = n.filter((_, i) => i % 2 === 1);
      return xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : null;
    }
    default:
      return null;
  }
}

/** Fica todo de um lado, fora do tronco, na altura dos braços (do ombro até a cintura)? */
function ehDeBraco([x0, y0, x1, y1]: Caixa) {
  if (![x0, y0, x1, y1].every(Number.isFinite)) return false;
  const naAltura = y0 >= 372 && y1 <= 650 && y0 < 560;
  const doLado = x1 <= 158 || x0 >= 242;
  // Grande (manga) ou saindo para fora da linha do tronco (punho, ombro bufante)
  const passaDoTronco = x0 < 112 || x1 > 288;
  return naAltura && doLado && (y1 - y0 >= 30 || passaDoTronco);
}

/** O `corpo` sem as mangas e os braços desenhados (o resto fica igual) */
export function corpoSemBracos(corpo: string): { corpo: string; tirados: number } {
  let tirados = 0;
  const limpo = corpo.replace(/<(path|rect|circle|ellipse|line|polygon|polyline)\b[^>]*?\/>/g, (tag) => {
    if (tag.startsWith("<path")) {
      const d = atributo(tag, "d");
      const partes = d ? subcaminhos(d) : null;
      if (!partes) return tag;
      const ficam = partes.filter((p) => !ehDeBraco(p.caixa));
      if (ficam.length === partes.length) return tag;
      tirados += partes.length - ficam.length;
      if (!ficam.length) return "";
      return tag.replace(` d="${d}"`, ` d="${ficam.map((p) => p.texto.trim()).join(" ")}"`);
    }
    const caixa = caixaDoElemento(tag);
    if (caixa && ehDeBraco(caixa)) {
      tirados++;
      return "";
    }
    return tag;
  });
  return { corpo: limpo, tirados };
}
