# Guia do desenho próprio de personagem

Um personagem com desenho próprio é o mesmo JSON do elenco (`id`, `nome`, `voz`, `visual`) com um campo `desenho` a mais: pedaços de SVG que o `Boneco` anima. O exemplo completo é o [exemplo-tio-ze.json](exemplo-tio-ze.json).

## O espaço do desenho

Tudo fica no mesmo espaço do Boneco: `viewBox="-100 0 600 1000"`, de frente, com o meio do corpo em x = 200.

| Parte | Onde fica | Por quê |
| --- | --- | --- |
| Cabeça | centro perto de (200, 235), uns 240 de largura | gira em torno de (200, 360) quando fala |
| Olhos | perto de y 225, em x 158 e 242 | as sobrancelhas do kit ficam em y 185 a 210 |
| Boca | perto de (200, 320) | |
| Pescoço | y 320 a 380 | liga a cabeça ao corpo |
| Ombros | (128, 392) e (272, 392) | os braços do kit saem daqui |
| Quadril | y 620 a 650 | |
| Pés | y 930 a 945 | a sombra fica em y 958 |

Os **braços são do kit** (para as 7 poses funcionarem), com as cores do `visual`: `roupa` é a manga, `pele` é a mão e o antebraço, e `mangaLonga` deixa a manga até o pulso. Escolha essas cores para combinar com o desenho.

## As peças

- **`atras`** (opcional): o que fica atrás do corpo, como cabelo comprido, capa ou rabo.
- **`corpo`**: pernas, sapatos, pescoço, tronco e roupa, **sem braços**.
- **`cabeca`**: o rosto **sem olhos e sem boca**, com orelhas, bochechas, nariz, cabelo da frente, chapéu, óculos, bigode e barba.
- **`olhos.abertos`** e **`olhos.fechados`**: o fechado é usado para piscar e na expressão radiante.
- **Bocas**:
  - `bocas.fechada`: em repouso, e também na fala;
  - `bocas.aberta`: na fala e na surpresa;
  - `bocas.sorriso`: feliz;
  - `bocas.triste` (opcional): preocupada.
- **`sobrancelhas: false`**: só se o desenho já tiver sobrancelhas (ou um estilo sem elas). Senão, o kit desenha as dele, que mudam com a expressão.

## Regras do SVG

- **Elementos permitidos:** `g`, `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`, `defs`, `linearGradient`, `radialGradient`, `stop`, `clipPath`.
- **Atributos permitidos:** de forma e de cor (`d`, `cx`, `fill`, `stroke`, `stroke-width`, `transform`, `opacity`…). Gradiente só por `url(#id)`.
- **Nada de** `script`, `style`, `image`, `text`, `foreignObject`, `href`, eventos (`onclick`…) ou links para fora. O Postaí recusa.
- Aspas duplas nos atributos. Até 20 mil caracteres por peça.
- Contorno grosso (6 a 8) na cor do traço, para combinar com o resto do kit (`#2B2340`, ou a cor de traço do estilo do dono).

## Conferir

Grave o personagem em `{ "personagem": { ... } }` e gere a ficha:

```console
npx remotion still FichaDoPersonagem out/ficha.png --props=<arquivo>.json
```

A ficha mostra 4 jeitos: normal, falando, comemorando e preocupado. Abra a imagem e confira:

- a cabeça encaixa no pescoço;
- os braços saem dos ombros da roupa;
- os pés estão no chão;
- os olhos e a boca ficam no rosto;
- as expressões aparecem.
