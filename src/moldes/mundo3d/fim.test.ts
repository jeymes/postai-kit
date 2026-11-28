// Testes do fim dos vídeos 3D: node --test src/moldes/mundo3d/fim.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { cameraDoFim, escolherFimDo3D, filaDoFim, FINS_DO_3D, proximoEpisodio } from "./fim.ts";

test("o roteiro manda; sem ele, episódios seguidos nunca terminam igual", () => {
  assert.equal(escolherFimDo3D({ pedido: "cinema", titulo: "x", episodio: 0 }), "cinema");
  for (let n = 0; n < 12; n++) {
    const a = escolherFimDo3D({ titulo: "a", episodio: n });
    const b = escolherFimDo3D({ titulo: "b", episodio: n + 1 });
    assert.notEqual(a, b);
  }
  // Sem registro, o mesmo título dá sempre o mesmo fim
  assert.equal(escolherFimDo3D({ titulo: "A placa que salvou a curva" }), escolherFimDo3D({ titulo: "A placa que salvou a curva" }));
  assert.ok(FINS_DO_3D.includes(escolherFimDo3D({ titulo: "qualquer" })));
});

test("com QR, a placa vira cinema (só quando o roteiro não pediu)", () => {
  const n = FINS_DO_3D.indexOf("placa");
  assert.equal(escolherFimDo3D({ titulo: "x", episodio: n, comQr: true }), "cinema");
  assert.equal(escolherFimDo3D({ pedido: "placa", titulo: "x", comQr: true }), "placa");
});

test("o número do episódio vem das linhas do registro", () => {
  const md = "# Episódios\n\n## Registro\n\n| Data | Título |\n| --- | --- |\n| 2026-11-18 | A |\n| 2026-11-19 | B |\n";
  assert.equal(proximoEpisodio(md), 2);
  assert.equal(proximoEpisodio("sem tabela"), null);
});

test("a fila do fim mantém a ordem e não deixa ninguém colado", () => {
  const fila = filaDoFim([
    { id: "b", x: 0.2, z: 2 },
    { id: "a", x: 0, z: 3 },
    { id: "c", x: 0.3, z: 2.5 },
  ]);
  assert.ok(fila.a[0] < fila.b[0] && fila.b[0] < fila.c[0]);
  assert.ok(fila.b[0] - fila.a[0] >= 1);
});

test("a câmera do fim fica na frente do grupo e abre para grupo largo", () => {
  for (const fim of ["grua", "placa", "pose"] as const) {
    const perto = cameraDoFim(fim, 1, [0, 2], 0).posicao;
    const largo = cameraDoFim(fim, 1, [0, 2], 3.9).posicao;
    assert.ok(perto[2] > 2 + 4, fim);
    assert.ok(largo[2] >= perto[2], fim);
  }
  // A grua sobe
  assert.ok(cameraDoFim("grua", 1, [0, 2], 1).posicao[1] > cameraDoFim("grua", 0, [0, 2], 1).posicao[1] + 2);
});
