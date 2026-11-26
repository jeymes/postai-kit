import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { estadoAgora, FALANDO, formaDoRhubarb, pecasDoRosto, Svg, type Desenho, type FormaDaBoca, type Momento, type Palavra } from "./Boneco";

// Personagem do tipo "criatura": só desenho, sem pele, cabelo, roupa nem os
// braços do kit. Sem desenho próprio, é a "Sombra" do kit: mancha preta
// rabiscada como fumaça, contorno roxo, olhos e sorriso amarelos. Com desenho
// próprio, desenha as peças dele (atrás, corpo, cabeça, olhos, boca).
// Nos dois casos: sai de um objeto (celular, garrafa ou espelho), cresce,
// cresce mais quando a pessoa cede, sussurra num balão e é empurrada e some
// quando a luz do aviso acende. Serve para qualquer estilo.
// Mesmo espaço do Boneco (viewBox -100 0 600 1000, pés em y 940).

export const OBJETOS_DA_SOMBRA = ["celular", "garrafa", "espelho"] as const;
export type ObjetoDaSombra = (typeof OBJETOS_DA_SOMBRA)[number];

export const ROXO_DA_SOMBRA = "#7B6BB0";
export const AMARELO_DA_SOMBRA = "#F2C14E";
const PRETO = "#0B0910";

// Contorno de fumaça: uma elipse com a borda ondulando devagar
function contorno(frame: number, semente: number) {
  const pontos: string[] = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const onda = 1 + 0.06 * Math.sin(a * 5 + frame / 9 + semente) + 0.04 * Math.sin(a * 9 - frame / 6);
    const rx = 150 * onda;
    const ry = 300 * onda;
    pontos.push(`${(200 + Math.sin(a) * rx).toFixed(1)},${(610 - Math.cos(a) * ry).toFixed(1)}`);
  }
  return `M${pontos.join(" L")} Z`;
}

const Objeto: React.FC<{ objeto: ObjetoDaSombra }> = ({ objeto }) => {
  if (objeto === "garrafa")
    return (
      <g>
        <rect x={176} y={850} width={48} height={90} rx={12} fill="#2E6B4F" stroke={PRETO} strokeWidth={5} />
        <rect x={190} y={826} width={20} height={30} rx={5} fill="#2E6B4F" stroke={PRETO} strokeWidth={5} />
      </g>
    );
  if (objeto === "espelho")
    return (
      <g>
        <ellipse cx={200} cy={880} rx={70} ry={56} fill="#BFD7EA" stroke={PRETO} strokeWidth={6} />
        <rect x={192} y={934} width={16} height={10} fill={PRETO} />
      </g>
    );
  return (
    <g>
      <rect x={160} y={884} width={80} height={56} rx={10} fill="#1E1A24" />
      <rect x={168} y={890} width={64} height={44} rx={6} fill="#CFE6FF" />
    </g>
  );
};

/** A Sombra do kit: o corpo de fumaça com os olhos e o sorriso */
const CorpoDaSombra: React.FC<{ frame: number; semente: number; brava: boolean; aberta: boolean }> = ({ frame, semente, brava, aberta }) => (
  <>
    <path d={contorno(frame, semente)} fill={PRETO} stroke={ROXO_DA_SOMBRA} strokeWidth={10} strokeLinejoin="round" />
    {[0, 1, 2].map((i) => (
      <path
        key={i}
        d={`M${130 + i * 40} ${520 + i * 70} q30 ${-40 + Math.sin(frame / 12 + i) * 12} 60 0 t60 0`}
        fill="none"
        stroke={ROXO_DA_SOMBRA}
        strokeOpacity={0.45}
        strokeWidth={5}
        strokeLinecap="round"
      />
    ))}
    {[160, 240].map((x) => (
      <g key={x}>
        <ellipse cx={x} cy={420} rx={22} ry={brava ? 10 : 18} fill={AMARELO_DA_SOMBRA} />
        <circle cx={x + 4} cy={420} r={6} fill={PRETO} />
      </g>
    ))}
    {aberta ? (
      <ellipse cx={200} cy={490} rx={34} ry={16} fill={AMARELO_DA_SOMBRA} />
    ) : (
      <path d="M150 478 Q200 520 250 478" fill="none" stroke={AMARELO_DA_SOMBRA} strokeWidth={9} strokeLinecap="round" />
    )}
  </>
);

/**
 * O sussurro no balão: quebra em linhas e, se não couber, diminui um pouco a
 * letra (até 4 linhas). Só uma fala enorme ganha "…" no fim da 4ª linha. As
 * letras por linha são as que cabem na largura do balão (Arial: ~0,5 da altura).
 */
export function quebrarSussurro(texto: string) {
  const palavras = texto.split(/\s+/).filter(Boolean);
  // [letra, letras por linha, até quantas linhas]: a letra não desce de 28 (lê no celular)
  const tamanhos: Array<[number, number, number]> = [
    [36, 22, 3],
    [32, 25, 3],
    [30, 27, 4],
    [28, 29, 4],
  ];
  let ultimo = { linhas: [] as string[], fonte: 36 };
  for (const [fonte, maximo, maxLinhas] of tamanhos) {
    const linhas: string[] = [];
    for (const palavra of palavras) {
      const ultima = linhas[linhas.length - 1];
      if (ultima !== undefined && `${ultima} ${palavra}`.length <= maximo) linhas[linhas.length - 1] = `${ultima} ${palavra}`;
      else linhas.push(palavra);
    }
    ultimo = { linhas, fonte };
    if (linhas.length <= maxLinhas) return ultimo;
  }
  const linhas = ultimo.linhas.slice(0, 4);
  linhas[3] = `${linhas[3].slice(0, 28)}…`;
  return { linhas, fonte: ultimo.fonte };
}

/**
 * O alto do desenho próprio (o menor y das peças, no espaço de 1000 de altura): o balão
 * do sussurro fica acima dele. 26/11/2026: o balão ficava na altura da cabeça da Sombra do
 * kit, e numa criatura de cabeça maior (o novelo da Dúvida) cobria os olhos e a boca.
 * Conta círculos, elipses, retângulos, linhas, polígonos e caminhos (com os pontos de
 * controle, o que só deixa a conta mais folgada).
 */
export function topoDoDesenho(pecas: Array<string | undefined>): number | null {
  let topo = Infinity;
  const num = (texto: string | undefined) => (texto === undefined ? NaN : parseFloat(texto));
  const atributo = (tag: string, nome: string) => num(new RegExp(`\\s${nome}\\s*=\\s*["']([-\\d.eE+]+)`).exec(tag)?.[1]);
  const anotar = (y: number) => {
    if (Number.isFinite(y)) topo = Math.min(topo, y);
  };
  for (const svg of pecas) {
    if (!svg) continue;
    for (const tag of svg.match(/<(circle|ellipse|rect|line|polygon|polyline|path)\b[^>]*>/g) ?? []) {
      const tipo = /^<(\w+)/.exec(tag)?.[1];
      if (tipo === "circle") anotar(atributo(tag, "cy") - atributo(tag, "r"));
      else if (tipo === "ellipse") anotar(atributo(tag, "cy") - atributo(tag, "ry"));
      else if (tipo === "rect") anotar(atributo(tag, "y") || 0);
      else if (tipo === "line") anotar(Math.min(atributo(tag, "y1"), atributo(tag, "y2")));
      else if (tipo === "polygon" || tipo === "polyline") {
        const nums = (/\spoints\s*=\s*["']([^"']*)/.exec(tag)?.[1] ?? "").match(/-?[\d.]+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
        for (let i = 1; i < nums.length; i += 2) anotar(nums[i]);
      } else if (tipo === "path") {
        const d = /\sd\s*=\s*["']([^"']*)/.exec(tag)?.[1] ?? "";
        let x = 0;
        let y = 0;
        let comecoX = 0;
        let comecoY = 0;
        for (const [, letra, resto] of d.matchAll(/([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g)) {
          const n = resto.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
          const relativo = letra === letra.toLowerCase();
          const L = letra.toUpperCase();
          const passo = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 }[L] ?? 2;
          if (L === "Z") {
            x = comecoX;
            y = comecoY;
            continue;
          }
          for (let i = 0; i + passo <= n.length; i += passo) {
            const g = n.slice(i, i + passo);
            const bx = x;
            const by = y;
            if (L === "H") x = relativo ? x + g[0] : g[0];
            else if (L === "V") {
              y = relativo ? y + g[0] : g[0];
              anotar(y);
            } else if (L === "A") {
              x = relativo ? bx + g[5] : g[5];
              y = relativo ? by + g[6] : g[6];
              // O arco pode subir até o raio acima do ponto
              anotar(Math.min(by, y) - Math.abs(g[1]));
            } else {
              for (let k = 0; k < passo; k += 2) anotar(relativo ? by + g[k + 1] : g[k + 1]);
              x = relativo ? bx + g[passo - 2] : g[passo - 2];
              y = relativo ? by + g[passo - 1] : g[passo - 1];
            }
            if (L === "M" && i === 0) {
              comecoX = x;
              comecoY = y;
            }
          }
        }
      }
    }
  }
  return Number.isFinite(topo) ? topo : null;
}

export const Sombra: React.FC<{
  momentos: Momento[];
  palavras: Palavra[];
  boca?: FormaDaBoca[];
  altura: number;
  espelhar?: boolean;
  semente?: number;
  /** Desenho próprio da criatura (sem ele: a Sombra do kit) */
  desenho?: Desenho;
  /** Quadro em que sai do objeto (cresce) */
  aparece?: number;
  /** Quadro em que a luz acende: é empurrada e encolhe até sumir */
  some?: number;
  /** Tamanho agora (1 = normal; mais, quando a pessoa cede) */
  escala?: number;
  objeto?: ObjetoDaSombra;
  /** De onde ela sai, no espaço do desenho (o celular na mão de alguém, o espelho do cenário). Sem isso: do objeto no chão, aos pés dela */
  de?: { x: number; y: number };
  /** O que ela sussurra, num balão, enquanto fala */
  sussurro?: string;
  style?: React.CSSProperties;
}> = ({ momentos, palavras, boca, altura, espelhar = false, semente = 0, desenho, aparece = 0, some, escala: tamanho = 1, objeto = "celular", de, sussurro, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const estado = estadoAgora(momentos, frame, fps);
  const falando = palavras.some((p) => p.inicio <= frame && frame < p.fim);
  const forma = boca?.length ? formaDoRhubarb(boca, frame) : falando ? FALANDO[Math.floor(frame / 3) % FALANDO.length] : null;
  const cresce = aparece <= 0 ? 1 : spring({ frame: frame - aparece, fps, config: { damping: 12, stiffness: 90 } });
  const encolhe = some === undefined ? 0 : spring({ frame: frame - some, fps, config: { damping: 18 } });
  const escala = Math.max(0, cresce * (1 - encolhe) * tamanho);
  // A luz empurra um pouco a criatura enquanto ela encolhe até virar uma manchinha
  const empurrao = encolhe * 40;
  // Saindo de um objeto que não é o dela (o celular na mão de alguém): começa
  // pequena ali e vem crescendo até o lugar dela
  const vindo = de ? { x: (de.x - 200) * (1 - cresce), y: (de.y - 930) * (1 - cresce) } : { x: 0, y: 0 };
  const flutua = Math.sin(frame / 18 + semente) * 8;
  const brava = estado.expressao === "brava" || estado.expressao === "preocupada";
  const aberta = forma ? ["C", "D", "E", "H"].includes(forma) : estado.expressao === "surpresa";
  const piscando = (frame + semente * 37 + 50) % 97 < 4;
  const rosto = desenho ? pecasDoRosto(desenho, estado.expressao, forma, piscando) : null;
  // O sussurro quebra em linhas e a letra diminui para caber (antes cortava com "…" depois de ~35 letras)
  const { linhas, fonte } = quebrarSussurro(sussurro ?? "");
  const alturaDaLinha = Math.round(fonte * 1.22);
  const folga = 30;
  const alturaDoBalao = folga * 2 + linhas.length * alturaDaLinha;
  const largura = altura * 0.6;
  // O balão termina acima da cabeça de quem fala, no tamanho de agora (cresce quando a
  // pessoa cede). A Sombra do kit vai até ~310; o desenho próprio, até o alto dele
  const topo = desenho ? (topoDoDesenho([desenho.atras, desenho.corpo, desenho.cabeca]) ?? 310) : 310;
  const folgaDoBalao = desenho ? 36 : 70;
  const altoDaCabeca = 930 - (930 - topo) * escala + vindo.y + flutua * cresce;
  // Não sobe além de -400 (na tela, embaixo do título); lá em cima, cobre no máximo o alto da cabeça
  const yDoBalao = Math.max(-400, altoDaCabeca - folgaDoBalao - alturaDoBalao + 70);
  return (
    <svg viewBox="-100 0 600 1000" width={largura} height={altura} style={{ overflow: "visible", ...style }}>
      <g transform={espelhar ? "translate(400 0) scale(-1 1)" : undefined}>
        {/* O objeto aos pés dela (quando não sai da mão de ninguém nem do cenário) some junto quando a luz acende */}
        {!de && (
          <g opacity={1 - encolhe}>
            <Objeto objeto={objeto} />
          </g>
        )}
        {escala > 0.01 && (
          <g transform={`translate(${vindo.x - empurrao} ${vindo.y}) translate(200 930) scale(${escala}) translate(-200 -930) translate(0 ${flutua * cresce})`}>
            {desenho && rosto ? (
              <>
                <Svg html={desenho.atras} />
                <Svg html={desenho.corpo} />
                <Svg html={desenho.cabeca} />
                <Svg html={rosto.olhos} />
                <Svg html={rosto.boca} />
              </>
            ) : (
              <CorpoDaSombra frame={frame} semente={semente} brava={brava} aberta={aberta} />
            )}
          </g>
        )}
      </g>
      {/* O balão do sussurro fica sempre de pé (fora do espelho), em cima dela */}
      {/* O Conversa só manda o sussurro enquanto é a fala dela (o balão não pisca entre as palavras) */}
      {sussurro && escala > 0.5 && (
        <g transform={`translate(${espelhar ? 230 : 170} ${yDoBalao})`}>
          <rect x={-230} y={-70} width={460} height={alturaDoBalao} rx={34} fill="#FFFFFF" stroke="#1E1A24" strokeWidth={4} />
          <text x={0} y={-70 + folga + alturaDaLinha / 2} textAnchor="middle" dominantBaseline="middle" fill="#1E1A24" fontSize={fonte} fontFamily="Arial, sans-serif">
            {linhas.map((linha, i) => (
              <tspan key={i} x={0} dy={i === 0 ? 0 : alturaDaLinha}>
                {linha}
              </tspan>
            ))}
          </text>
        </g>
      )}
    </svg>
  );
};
