// Testes das contas da ilustração da fala: node --test src/componentes/ilustracao/tempo.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { ilustraSchema, type Ilustracao } from "./schema.ts";
import {
  acharPalavra,
  alturaDaPilha,
  conferirIlustra,
  medirRitmo,
  palavrasDaNarracao,
  palavrasEstimadas,
  planejarIlustracoes,
  presencaLinear,
  quadroDaPalavra,
  ritmoDoRoteiro,
  TEMPO,
  type PalavraNoTempo,
} from "./tempo.ts";

const fala = (texto: string, passo = 10): PalavraNoTempo[] => texto.split(" ").map((t, i) => ({ texto: t, inicio: i * passo, fim: i * passo + passo - 2 }));

test("acha a palavra sem ligar para acento, caixa e pontuação", () => {
  const p = fala("Eu ganho Três mil reais, por MÊS.");
  assert.equal(acharPalavra(p, "tres"), 2);
  assert.equal(acharPalavra(p, "mês"), 6);
  assert.equal(acharPalavra(p, "reais"), 4);
  assert.equal(acharPalavra(p, "Por mes"), 5);
  assert.equal(acharPalavra(p, "carro"), -1);
});

test("aceita plural, palavra cortada no fim e um erro de letra do Whisper", () => {
  const p = fala("os juros compostos do cartao de credito");
  assert.equal(acharPalavra(p, "juro"), 1);
  assert.equal(acharPalavra(p, "compost"), 2);
  assert.equal(acharPalavra(p, "cartão"), 4);
  assert.equal(acharPalavra(p, "crédto"), 6);
  // Curta demais para aproximar: "de" não vira "do"
  assert.equal(acharPalavra(p, "da"), -1);
});

test("a mesma palavra duas vezes: procura a partir de onde parou", () => {
  const p = fala("um real hoje vira dois real amanhã");
  assert.equal(acharPalavra(p, "real"), 1);
  assert.equal(acharPalavra(p, "real", 2), 5);
  // Não achou depois: volta ao começo
  assert.equal(acharPalavra(p, "hoje", 4), 2);
});

test("quadro da palavra: sem palavra ou sem achar, o começo da fala", () => {
  const p = fala("a conta chegou", 12).map((w) => ({ ...w, inicio: w.inicio + 30, fim: w.fim + 30 }));
  assert.deepEqual(quadroDaPalavra(p, "chegou"), { quadro: 54, indice: 2, achou: true });
  assert.deepEqual(quadroDaPalavra(p, undefined), { quadro: 30, indice: 0, achou: true });
  assert.deepEqual(quadroDaPalavra(p, "boleto"), { quadro: 30, indice: 0, achou: false });
});

test("palavras da narração e estimadas, em quadros", () => {
  const n = palavrasDaNarracao([{ texto: "Oi", inicioMs: 0, fimMs: 200 }, { texto: "gente", inicioMs: 500, fimMs: 900 }], 8, 30);
  assert.deepEqual(n, [
    { texto: "Oi", inicio: 8, fim: 14 },
    { texto: "gente", inicio: 23, fim: 35 },
  ]);
  const e = palavrasEstimadas("Oi gente.", 10);
  assert.equal(e[0].inicio, 10);
  assert.ok(e[1].inicio > e[0].inicio);
});

test("plano: entra antes da palavra, sai no ate ou antes do fim, fica no mínimo 1,2 s", () => {
  const p = fala("eu ganho tres mil por mes e gasto tudo no cartao", 15);
  const ilustra: Ilustracao[] = [
    { tipo: "numero", valor: 3000, prefixo: "R$", em: "três mil", ate: "gasto" },
    { tipo: "texto", texto: "Tudo!", em: "tudo" },
    { tipo: "icone", icone: "cartao", em: "cartão", ate: "cartão" },
  ];
  const [n, t, c] = planejarIlustracoes(ilustra, p, { fim: 200 });
  assert.equal(n.entra, 30 - TEMPO.antecipa);
  assert.equal(n.sai, 7 * 15 - TEMPO.antecipa);
  assert.equal(t.entra, 8 * 15 - TEMPO.antecipa);
  assert.equal(t.sai, 200 - TEMPO.saida);
  // "ate" igual ao "em": não achou depois, fica até o fim (e no mínimo o tempo mínimo)
  assert.equal(c.achouAte, false);
  assert.ok(c.sai - c.entra >= TEMPO.minimoNaTela);
});

test("plano: a faixa cheia tira o item mais antigo antes do novo entrar", () => {
  const p = fala("olha o grafico e agora a conta toda", 20);
  const ilustra: Ilustracao[] = [
    { tipo: "grafico", grafico: { tipo: "numero", valor: 10 }, em: "grafico" },
    { tipo: "conta", passos: ["1 + 1", "= 2"], em: "conta" },
  ];
  const [g, c] = planejarIlustracoes(ilustra, p, { fim: 300 });
  assert.ok(g.sai <= c.entra - TEMPO.folgaDaTroca + 1, `o gráfico sai (${g.sai}) antes da conta entrar (${c.entra})`);
  // Dois pequenos cabem juntos
  const [a, b] = planejarIlustracoes(
    [
      { tipo: "texto", texto: "Oi", em: "olha" },
      { tipo: "texto", texto: "Tchau", em: "agora" },
    ],
    p,
    { fim: 300 },
  );
  assert.ok(a.sai > b.entra);
});

test("plano: pedaços na palavra de cada um, em ordem e com respiro", () => {
  const p = fala("casa carro e celular pesam demais no mes", 12);
  const [i] = planejarIlustracoes(
    [{ tipo: "icone", icones: [{ icone: "casa", em: "casa" }, { icone: "carro", em: "carro" }, { icone: "celular", em: "celular" }], em: "casa" }],
    p,
    { fim: 150 },
  );
  assert.deepEqual(i.pedacos, [0 - 0, 12 - TEMPO.antecipa, 36 - TEMPO.antecipa]);
  const [c] = planejarIlustracoes([{ tipo: "conta", passos: ["a", "b", "c"] }], p, { fim: 150 });
  assert.equal(c.pedacos.length, 3);
  assert.ok(c.pedacos[1] - c.pedacos[0] >= 8 && c.pedacos[2] - c.pedacos[1] >= 8);
});

test("pensamento de quem não está na tela vira item do alto; seta fica livre", () => {
  const p = fala("ela pensou numa viagem", 10);
  const [a, b, s] = planejarIlustracoes(
    [
      { tipo: "pensamento", quem: "bia", icone: "planeta" },
      { tipo: "pensamento", quem: "lu", texto: "Será?" },
      { tipo: "seta", ponto: { x: 50, y: 50 } },
    ],
    p,
    { fim: 100, personagens: ["bia"] },
  );
  assert.deepEqual(a.destino, { preso: "bia" });
  assert.deepEqual(b.destino, { faixa: "topo", coluna: "cheia" });
  assert.deepEqual(s.destino, { livre: true });
});

test("presença: 0 antes, sobe, fica 1, desce e some", () => {
  const p = { entra: 10, sai: 60 };
  assert.equal(presencaLinear(p, 9), 0);
  assert.equal(presencaLinear(p, 10), 0);
  assert.equal(presencaLinear(p, 10 + TEMPO.entrada), 1);
  assert.equal(presencaLinear(p, 59), 1);
  assert.ok(presencaLinear(p, 63) < 1 && presencaLinear(p, 63) > 0);
  assert.equal(presencaLinear(p, 60 + TEMPO.saida), 0);
});

test("pilha: as colunas esquerda e direita ficam lado a lado", () => {
  const cheia = { destino: { faixa: "topo", coluna: "cheia" } as const, altura: 100 };
  const esq = { destino: { faixa: "topo", coluna: "esquerda" } as const, altura: 200 };
  const dir = { destino: { faixa: "topo", coluna: "direita" } as const, altura: 150 };
  assert.equal(alturaDaPilha([cheia, esq, dir], 20), 100 + 20 + 200);
});

test("ritmo: acha o maior trecho parado e os acima de 3 s", () => {
  const r = medirRitmo([30, 90, 300], 0, 330, { fps: 30 });
  assert.equal(r.maiorSemMudanca, 7);
  assert.equal(r.de, 90);
  assert.equal(r.ate, 300);
  assert.deepEqual(
    r.trechosLongos.map((t) => t.segundos),
    [7],
  );
});

test("ritmo do roteiro: a ilustração quebra o trecho parado", () => {
  const p = fala("uma fala bem comprida sem nada na tela por muito tempo seguido mesmo", 15).map((w) => ({ ...w, inicio: w.inicio + 20, fim: w.fim + 20 }));
  const sem = ritmoDoRoteiro([{ inicio: 20, duracao: 200, palavras: p }]);
  assert.ok(sem.maiorSemMudanca > 6);
  const com = ritmoDoRoteiro([
    {
      inicio: 20,
      duracao: 200,
      palavras: p,
      ilustra: [
        { tipo: "texto", texto: "Comprida", em: "comprida", ate: "nada" },
        { tipo: "icone", icone: "relogio", em: "tempo" },
      ],
    },
  ]);
  assert.ok(com.maiorSemMudanca < sem.maiorSemMudanca);
  assert.ok(com.maiorSemMudanca <= 3, `maior parado: ${com.maiorSemMudanca}s`);
});

test("schema: aceita os 9 tipos e recusa o que não cabe", () => {
  const ok = ilustraSchema.safeParse([
    { tipo: "icone", icone: "casa", rotulo: "Aluguel" },
    { tipo: "numero", valor: 3500, prefixo: "R$" },
    { tipo: "grafico", grafico: { tipo: "pizza", partes: [{ rotulo: "a", valor: 1 }, { rotulo: "b", valor: 2 }] } },
    { tipo: "conta", passos: ["3.500 × 10%", { texto: "= R$ 350", em: "trezentos" }] },
    { tipo: "texto", texto: "ERRO!", forma: "carimbo" },
    { tipo: "seta", ponto: { x: 30, y: 60 } },
  ]);
  assert.equal(ok.success, true, JSON.stringify(ok.error?.issues));
  const ok2 = ilustraSchema.safeParse([
    { tipo: "circulo", ponto: { x: 30, y: 60 }, raio: 10 },
    { tipo: "pensamento", quem: "bia", texto: "Será?" },
    { tipo: "objeto", objeto: "bolo" },
  ]);
  assert.equal(ok2.success, true, JSON.stringify(ok2.error?.issues));
  const ruins = [
    [{ tipo: "icone" }],
    [{ tipo: "icone", icone: "casa", icones: [{ icone: "casa" }, { icone: "carro" }] }],
    [{ tipo: "numero", valor: Infinity }],
    [{ tipo: "texto", texto: "um texto comprido demais para um sticker" }],
    [{ tipo: "pensamento", quem: "bia" }],
    [{ tipo: "grafico", grafico: { tipo: "barras", itens: Array.from({ length: 8 }, (_, i) => ({ rotulo: `x${i}`, valor: i })) } }],
    [{ tipo: "seta", ponto: { x: 120, y: 50 } }],
    Array.from({ length: 7 }, () => ({ tipo: "texto", texto: "oi" })),
  ];
  for (const r of ruins) assert.equal(ilustraSchema.safeParse(r).success, false, JSON.stringify(r).slice(0, 80));
});

test("conferir: avisa a palavra que não está na fala", () => {
  const avisos = conferirIlustra(
    [
      { tipo: "texto", texto: "Oi", em: "boleto" },
      { tipo: "texto", texto: "Oi", em: "conta", ate: "conta" },
    ],
    "a conta chegou hoje",
  );
  assert.equal(avisos.length, 2);
  assert.match(avisos[0], /boleto/);
});

test("a mesma palavra no item seguinte pega a próxima vez que ela é dita", () => {
  const palavras = palavrasEstimadas("quatrocentos agora e quatrocentos depois");
  const [a, b] = planejarIlustracoes(
    [
      { tipo: "texto", texto: "Um", em: "quatrocentos" },
      { tipo: "texto", texto: "Dois", em: "quatrocentos" },
    ] as never,
    palavras,
    { inicio: 0, fim: 400 } as never,
  );
  assert.ok(b.entra > a.entra, `o segundo (${b.entra}) devia entrar depois do primeiro (${a.entra})`);
});
