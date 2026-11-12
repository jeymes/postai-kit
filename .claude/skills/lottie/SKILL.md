---
name: lottie
description: Cria ou ajusta animações Lottie do Kit Estúdio por código (ícones, selos, números, brilhos, confete), nas cores da marca, com as peças de ferramentas/lottie/lottie.mjs. Usar quando o dono pedir uma animação, um ícone que se mexe, um selo animado, ou quando as cores da marca mudarem.
---

# Animações Lottie

As animações são desenhadas por código em `ferramentas/lottie/gerar.mjs`, com as peças de
`ferramentas/lottie/lottie.mjs`, e gravadas em `src/componentes/lottie/gerados/`. Vetores puros,
fundo transparente, 30 quadros por segundo: o quadro do Lottie é o quadro do Remotion.

## Cores da marca mudaram

```bash
npm run lottie
```

## Animação nova

1. Em `gerar.mjs`, crie a animação no mesmo jeito das que já existem (`sucesso`, `confete`,
   `estrelas`, `curtida`, `seta`):
   - formas: `elipse`, `retangulo`, `linha`, `curva` (cúbicas, como o "C" do SVG), `estrela5`,
     `brilho4`, `coracao`, dentro de `grupo` com `preenche` ou `contorno`;
   - movimento: `anim([[quadro, valor, EASE.x], ...])` em `p` (posição), `s` (escala), `r` (rotação)
     ou `o` (opacidade) do `transform`; `desenha(...)` para um traço que se desenha;
   - curvas: `EASE.pop` para entrar com pulo, `EASE.assenta` para parar suave, `EASE.saida` para sair;
   - a **primeira camada fica por cima**;
   - cores: use `C.destaque`, `C.texto`, `C.noDestaque` (vêm do `marca.json`), não hex fixo, para
     acompanhar a marca.
2. `npm run lottie`.
3. Registre em `ANIMACOES` (`src/componentes/lottie/Animacao.tsx`) com o import do JSON.
4. Use com `<Animacao nome="..." em={quadro} largura={px} />`. Quando acaba, ela fica parada no último
   quadro (ou repete, com `repetir`).
5. Confira com um `npx remotion still` no meio e no fim da animação, e olhe a imagem.

Movimento com propósito: entra, faz uma coisa, assenta. Sem balançar para sempre nem brilho em tudo.
