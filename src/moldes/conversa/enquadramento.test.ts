// Testes do enquadramento do 2D: node --test src/moldes/conversa/enquadramento.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { enquadrar, MEIO_CORPO, planosDasFalas, semCortarNinguem, type Camera } from "./enquadramento.ts";

/** O que o quadro mostra (x na tela, sem câmera) */
const quadro = (c: Camera) => [c.x - 540 / c.z, c.x + 540 / c.z];
/** O corpo de quem está em x fica inteiro dentro ou inteiro fora do quadro? */
const inteiro = (c: Camera, x: number) => {
  const [v0, v1] = quadro(c);
  const dentro = x - MEIO_CORPO >= v0 - 0.5 && x + MEIO_CORPO <= v1 + 0.5;
  const fora = x + MEIO_CORPO <= v0 + 0.5 || x - MEIO_CORPO >= v1 - 0.5;
  return dentro || fora;
};

// Os lugares da conversa de dois: o meio de cada um em 320 e 760; o rosto de pé em y 999
const ESQUERDA = { x: 320, y: 999 };
const DIREITA = { x: 760, y: 999 };

test("no close de dois, o outro fica inteiro (dentro ou fora), dos dois lados", () => {
  for (const [rosto, outro] of [
    [ESQUERDA, DIREITA.x],
    [DIREITA, ESQUERDA.x],
  ] as const) {
    const antes = enquadrar("close", rosto);
    assert.equal(inteiro(antes, outro), false, "o close de antes cortava o outro (o caso da crítica)");
    const c = semCortarNinguem(antes, rosto, [outro]);
    assert.ok(inteiro(c, outro), `o outro (${outro}) ficou cortado: quadro ${quadro(c).map(Math.round)}`);
    // O rosto em foco continua no quadro
    const [v0, v1] = quadro(c);
    assert.ok(rosto.x > v0 + 100 && rosto.x < v1 - 100);
    // O close de verdade continua close: fecha mais, com o outro inteiro de fora
    assert.ok(c.z >= 1.4, `o close abriu demais (${c.z.toFixed(2)})`);
    assert.ok(quadro(c)[1] <= outro - MEIO_CORPO + 0.5 || quadro(c)[0] >= outro + MEIO_CORPO - 0.5);
  }
});

test("o zoom leve do roteiro também não corta o outro (e prefere os dois inteiros dentro)", () => {
  const c = semCortarNinguem(enquadrar("close", ESQUERDA, 0.25), ESQUERDA, [DIREITA.x]);
  assert.ok(inteiro(c, DIREITA.x));
  assert.ok(inteiro(c, ESQUERDA.x));
  assert.ok(c.z < 1.4);
});

test("sozinho, ou com o outro longe, o close não muda", () => {
  const c = enquadrar("close", { x: 540, y: 999 });
  assert.deepEqual(semCortarNinguem(c, { x: 540, y: 999 }, []), c);
  const longe = enquadrar("close", ESQUERDA);
  assert.deepEqual(semCortarNinguem(longe, ESQUERDA, [5000]), longe);
});

const fala = (extra: Partial<Parameters<typeof planosDasFalas>[0]["falas"][number]> = {}) => ({
  quem: "bia",
  expressoes: { bia: "surpresa" },
  poses: [],
  cheia: false,
  ...extra,
});

test("quem anda na fala tem o quadro aberto, mesmo com close pedido ou zoom", () => {
  const planos = planosDasFalas({
    falas: [fala(), fala(), fala({ andando: true }), fala({ andando: true, camera: "close" }), fala({ andando: true })],
    ids: ["bia", "caio"],
    viva: true,
    zoom: { em: "bia", de: 4, ate: 4 },
  });
  // A 2ª fala, com emoção forte e sem andar, pode fechar
  assert.equal(planos[1].plano, "close");
  assert.equal(planos[2].plano, "aberto");
  assert.equal(planos[3].plano, "aberto");
  assert.equal(planos[4].plano, "aberto");
});
