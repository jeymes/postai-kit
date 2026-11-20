# Boneco de peças (personagens 3D do Mundo 3D)

Estilo **Bonecos 3D** (18/11/2026): molde Mundo3D com `"bonecos": "pecas"` (sem isso, o molde desenha os palitos do estilo Mundo 3D). Tudo é 3D: cada personagem do elenco vira um boneco feito de blocos
arredondados (`BonecoDePecas.tsx`), e a multidão e os figurantes também (com cores variadas). Ele não imita o
desenho 2D do canal: usa as cores do elenco (pele, cabelo, roupa, calça, sapato), o tipo de cabelo, a tiara e
os óculos.

## O boneco segue o lugar

A equipe escolhe só o lugar da história em `cenario.ambiente`, e o mundo e a roupa combinam sozinhos
(`ambientes.ts`):

| Lugar     | O mundo                                                    | A roupa (se a equipe não escolher)                  |
| --------- | ---------------------------------------------------------- | --------------------------------------------------- |
| `campo`   | grama, rio, árvores, montanhas verdes, tendas              | a do elenco (vestido comprido ou túnica curta)      |
| `deserto` | areia, dunas, palmeiras, pedras, tendas                    | túnica comprida; véu (cabelo comprido) ou turbante  |
| `cidade`  | chão de terra, casas de barro, muralha com torres, palmeiras | túnica comprida; véu ou turbante                  |
| `aldeia`  | grama, rio, casas de palha, árvores, pedras                | túnica curta (às vezes chapéu de palha) ou vestido  |
| `moderno` | grama, casas coloridas de telhado vermelho                 | camiseta, calça e tênis (as cores do elenco)        |
| `reino`   | grama, árvores e um castelo de pedra com torres no fundo   | túnica curta ou comprida                            |
| `mar`     | praia de areia, o mar no fundo, barcos a vela, palmeiras   | túnica curta, às vezes turbante                     |
| `salao`   | salão do trono: chão de pedra, tapete, colunas, o trono    | roupa comprida e capa; véu (cabelo comprido)        |

Gestos (em `estados` de cada cena): `apontando` (o braço esticado), `caido` (tomba de lado e fica deitado; a
câmera mira o corpo) e `ate` [x, z] (a pessoa anda até lá durante a cena e continua de lá nas próximas).

- `cenario.ponte`, `cenario.rio` e `cenario.tendas` ligam ou desligam cada coisa. A ponte só aparece no campo,
  a não ser que a equipe peça.
- Para mudar a roupa de alguém, use `detalhes3d`:
  - `figurino`: `tunica-curta`, `tunica-longa`, `manto` (com capa), `armadura` ou `moderno`;
  - `acessorio`: `veu`, `turbante`, `coroa`, `capacete`, `chapeu` ou `nenhum`;
  - `pano`: a cor do véu, do turbante ou da capa.
  Um rei: `{"figurino": "manto", "acessorio": "coroa", "pano": "#B5352E"}`.
- Multidão: `chapeu: "capacete"` vira soldados de armadura; `coroa` vira manto e coroa. Com `marchando: true`,
  as pernas e os braços balançam.

## Por que este estilo funciona em 3D

- **Formas simples de propósito.** Um personagem 3D detalhado só fica bom feito à mão por um artista. Feito por
  código, o que fica bem é o que já nasce simples: blocos, como brinquedo de encaixar.
- **Peças rígidas que giram nas juntas.** O braço gira no ombro, a perna no quadril e a cabeça no pescoço. Não
  tem cotovelo nem joelho, então nada "quebra" ou entorta.
- **A cabeça tem a frente reta.** O rosto é desenhado numa placa plana na frente, então não distorce (numa
  esfera, o rosto estica nas bordas).
- **Cabeção.** A cabeça tem um terço da altura, para o rosto aparecer até no plano aberto.
- **Contorno igual em tudo.** É uma cópia da peça por dentro, empurrada para fora pela normal (a "casca
  invertida"), com a mesma espessura em todas as peças. Os blocos são arredondados para o contorno não abrir
  nos cantos.
- **Luz em 3 tons, sem degradê** (cel shading com rampa de 3 cores), como desenho animado.

## Dicas para a roteirista e a diretora de arte

- **Poses que leem bem:** `pensando` (mão no queixo), `explicando` (braço para a frente), `comemorando`
  (braços para cima), `cabeca` (mãos na cabeça, desespero), `cintura` e `normal`. Troque a pose a cada cena:
  o corpo conta a emoção tanto quanto o rosto.
- **Expressões:** `feliz`, `radiante` e `aliviada` fecham os olhos sorrindo; `surpresa` e `medo` abrem os
  olhos grandes; `preocupada` e `brava` mexem as sobrancelhas. O pulinho na troca de expressão é automático.
- **Close** para a frase forte (o rosto enche a tela) e **aberto** para mostrar onde estão. Não repita o
  mesmo plano mais de 2 vezes seguidas.
- **Até 4 personagens** em cena e afastados pelo menos 1,5 no chão (`onde`), para os braços não se cruzarem.
- **Quem fala** (`quem`) mexe a boca com a voz; os outros só piscam e respiram.
- **Barba:** `detalhes3d.barba: true` (na cor do cabelo).
- **Cabelo:** `ondulado` = longo (com mechas dos lados), `curto`, `chanel` (com franja) e `coque`.

## O que ainda falta

- Andar de um ponto a outro na cena (o balanço das pernas já existe; falta o caminho).
- Mãos que seguram objetos (cajado, pão, pergaminho).
- Mais lugares: mar e barco, monte, dentro do palácio e da casa.
