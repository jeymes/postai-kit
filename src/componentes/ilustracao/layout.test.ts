// Testes das medidas da ilustração da fala: node --test src/componentes/ilustracao/layout.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { alturaDaConta, alturaDaPilula, emDuasLinhas, filaDeIcones, larguraDaPilula } from "./layout.ts";
import { alturaDe, planejarIlustracoes, type PalavraNoTempo } from "./tempo.ts";

/** Cada rótulo cabe na vaga dele (então nunca encosta no do vizinho, que tem o vão no meio) */
const cabeNaVaga = (rotulos: string[], largura: number, altura = 270) => {
  const f = filaDeIcones(rotulos, largura, altura);
  for (const linhas of f.linhas) for (const l of linhas) assert.ok(larguraDaPilula(l, f.fonte) <= f.vaga, `"${l}" (${larguraDaPilula(l, f.fonte)} px) não cabe na vaga de ${f.vaga} px`);
  // A fila inteira cabe na caixa
  assert.ok(f.vaga * rotulos.length + f.vao * (rotulos.length - 1) <= largura);
  // O ícone e o rótulo cabem na altura do plano
  const linhas = Math.max(...f.linhas.map((l) => l.length));
  assert.ok(10 + f.diametro + 14 + alturaDaPilula(linhas, f.fonte) <= altura + 1, "a fila passa da altura da caixa");
  return f;
};

test("rótulos da fila de ícones nunca encostam (os casos da crítica)", () => {
  cabeNaVaga(["Ganhou pouco", "Quer de novo"], 960);
  cabeNaVaga(["Aula perdida", "Trabalho", "Sono"], 960);
  cabeNaVaga(["CAPS grátis", "Grupo de apoio"], 960);
  cabeNaVaga(["Marmita", "3x na semana"], 960);
  // Na metade da tela (lugar esquerda/direita) e com 4 ícones
  cabeNaVaga(["Ganhou pouco", "Quer de novo"], 470);
  cabeNaVaga(["Mercado", "Aluguel", "Confiança", "Grupo de apoio"], 960);
  cabeNaVaga(["Sono", "Aula", "Pix", "Casa"], 470);
  // O rótulo mais comprido que o schema aceita (22 letras), 3 na metade da tela
  cabeNaVaga(["Distúrbio de jogos ok!", "Distúrbio de jogos ok!", "Distúrbio de jogos ok!"], 470);
});

test("rótulo curto fica numa linha, com a letra grande; comprido demais quebra no espaço do meio", () => {
  const f = filaDeIcones(["Sono", "Trabalho"], 960, 270);
  assert.equal(f.fonte, 36);
  assert.deepEqual(f.linhas, [["Sono"], ["Trabalho"]]);
  assert.equal(f.diametro, 170);
  assert.deepEqual(emDuasLinhas("Grupo de apoio"), ["Grupo de", "apoio"]);
  assert.deepEqual(emDuasLinhas("Confiança"), ["Confiança"]);
  const apertada = filaDeIcones(["Grupo de apoio", "Psicólogo", "CAPS grátis", "Igreja"], 470, 270);
  assert.ok(apertada.linhas.some((l) => l.length === 2) || apertada.fonte < 30);
});

test("sem rótulo, o ícone usa a altura toda (até 170)", () => {
  const f = filaDeIcones([undefined, undefined], 960, 200);
  assert.equal(f.diametro, 170);
  assert.deepEqual(f.linhas, [[], []]);
});

test("a conta reserva só as linhas que já entraram", () => {
  assert.equal(alturaDaConta(0), 80);
  assert.equal(alturaDaConta(1), 160);
  assert.equal(alturaDaConta(1.5), 200);
  // A altura do plano (a conta inteira) é a mesma do cartão com todas as linhas
  assert.equal(alturaDe({ tipo: "conta", passos: ["15 x 30", "= 450"] }), alturaDaConta(2));
});

const fala = (texto: string, passo = 10): PalavraNoTempo[] => texto.split(" ").map((t, i) => ({ texto: t, inicio: i * passo, fim: i * passo + passo - 2 }));

test('sem a faixa de baixo (Conversa), o "baixo" sobe para o alto, na largura toda', () => {
  const p = fala("São cinco mil e quatrocentos reais no ano");
  const ilustra = [{ tipo: "texto" as const, texto: "R$ 5.400!", forma: "carimbo" as const, lugar: "baixo" as const, em: "quatrocentos" }];
  const [comBaixo] = planejarIlustracoes(ilustra, p, { fim: 120 });
  assert.deepEqual(comBaixo.destino, { faixa: "baixo", coluna: "cheia" });
  const [semBaixo] = planejarIlustracoes(ilustra, p, { fim: 120, semBaixo: true });
  assert.deepEqual(semBaixo.destino, { faixa: "topo", coluna: "cheia" });
});
