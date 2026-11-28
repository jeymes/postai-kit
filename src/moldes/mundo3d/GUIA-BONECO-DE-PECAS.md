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
| `serra`   | estrada de asfalto com a curva, mureta, placas de curva, o vale e o carro que desce | roupa de hoje                    |
| `sertao`  | terra rachada, mandacaru, galho seco, casinha de taipa, serras baixas | roupa de hoje, às vezes chapéu    |
| `europa`  | praça de pedra, sobrados com veneziana, torre com relógio, chafariz, postes | roupa de hoje                 |

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

## Animação (27/11/2026)

O boneco ganhou cotovelo, joelho, tronco e pescoço. A animação fica em `animacao.ts` (posturas, mistura,
passo, vida), `atuacao.ts` (o roteiro vira a trilha de cada um) e `filmagem.ts`/`camera.ts` (os planos).
Formato e exemplo completo: `conteudo/exemplo-acoes-3d.json` (ações na palavra, entregar, abraçar, lugar por
cena, personagem só em algumas cenas, figurino).

- **Postura**: os ângulos de todas as juntas. As que encostam a mão em algum lugar (quadril, queixo, rosto, a
  outra mão) são feitas por alvo (`bracoAte`, IK de dois ossos), uma vez ao carregar. O braço alcança uns 0,55 m
  a partir do ombro: a cabeça é grande, então a mão no rosto pede a cabeça um pouco baixa.
- **Por cima da postura** (28/11/2026): `olhar-cima` e `olhar-baixo` mexem só a cabeça e o tronco, e os gestos
  de braço na palavra (`orar`, `levantar-bracos`, `chorar`, `acenar`, `apontar`...) mantêm as pernas: quem está
  ajoelhado ou sentado continua assim. Para levantar, `levantar` (ou um estado da cena com outra pose).
- **Mistura**: toda troca leva de 10 a 18 quadros (o ombro mistura por quatérnio, pelo caminho mais curto), com
  uma pontinha de passagem no fim. Nada pula: quem não tem estado numa cena continua como estava, e a
  antecipação do gesto nunca passa para a cena anterior.
- **Vida**: respira, pisca (cada um no seu tempo), troca o peso de perna, a cabeça vira para quem fala (até 28
  graus, para o rosto não sumir), a mão livre marca as palavras de quem fala e quem ouve acena com a cabeça.
- **Passo**: a fase do passo vem da distância andada (o pé não escorrega) e o quadril se ajusta para a perna de
  apoio tocar o chão (`alturaDoQuadril`): nada afunda nem flutua, também ajoelhado e sentado. Correndo, os
  braços descem.
- **Câmera**: sempre do lado da frente (regra dos 180 graus), o rosto do foco sempre no mesmo lugar da tela,
  movimento suave por plano, um plano novo a cada pausa da frase (nada de corte com o título na tela), plano
  aberto com o grupo inteiro, ninguém do elenco na frente do rosto nem colado na lente, multidão encostada em
  alguém do elenco sai do plano, nada (árvore, casa, pedra, grama) no caminho da lente; `detalhe` mostra as mãos.
  O ângulo de cada tomada é escolhido para o rosto do foco não ficar coberto do começo ao fim dela (também o
  ajoelhado ao lado de quem está de pé): de lado e, se precisar, um pouco de cima. Se nenhum ângulo livra o rosto,
  o `npm run conferir` avisa (`mundo3d/plano.ts` faz a mesma conta do molde).
- **Luz**: sol com sombra (acompanha onde a cena acontece; só bonecos e objetos fazem sombra), luz do céu,
  contraluz, reflexo macio, céu em degradê e névoa de longe; `cenario.hora` muda tudo (dia, tarde, noite). No
  render por software (nuvem, 28/11/2026): o sol não faz sombra (custava 12% do tempo), ficam as sombras de
  contato (o círculo macio, mais escuro, sob os pés e sob os objetos), o cenário fosco (chão, grama,
  montanhas, árvores, casas) usa material simples (`software.tsx`) e não há o reflexo macio: 150 quadros
  saíram 19% a 25% mais rápidos. Na placa de vídeo fica tudo ligado, igual a antes.
- **Roupa**: 5 variações por personagem (`figurino`), a mesma pessoa.
- **Rua viva** (`figurantes.tsx`, `cenario.figurantes`): na cidade, no moderno, na aldeia e no mar, gente passa
  andando no fundo, um veículo atravessa de vez em quando (carro no moderno, carroça com burro nos antigos) e
  um gato fica sentado num canto. Longe do elenco; com multidão na história, só o gato.

## Lugares novos e texto na cena (28/11/2026)

- `serra`, `sertao` e `europa` ficam em `lugaresNovos.tsx` (a geometria da estrada, conta pura, em `estrada.ts`). Na serra o
  elenco fica no acostamento, na frente da estrada (z de 1 a 4); a estrada corre atrás (z -4), faz a curva à esquerda e some no
  fundo, e atrás da mureta o chão acaba no vale (nada de planta, grama ou pedra no asfalto nem no vale). Leves para o render
  por software: material fosco, o cenário não faz sombra, as árvores do vale numa malha só.
- O texto na cena (`rotulos` da cena): a placa é 3D (`placa.tsx`, o texto num canvas); a etiqueta de lugar e data, o nome e o
  bilhete são 2D, por cima (`src/componentes/rotulos/`).

## O fim do vídeo (28/11/2026)

- Sem o cartão branco do kit: o fim é dentro da cena, em 4 s (`MUNDO3D.cartao`), de quatro jeitos (`fim.ts`): `grua` (a câmera
  sobe e recua, o elenco acena e a chamada aparece no céu), `placa` (o `LetreiroDoFim3D` de `placa.tsx` brota do chão atrás do
  elenco: madeira, pedra, placa verde de estrada ou azul de rua, pelo lugar, com o logo, a chamada e o @), `cinema` (o
  `Freeze` congela o último quadro, que desfoca e escurece; faixas pretas e o letreiro) e `pose` (o elenco em fila, de frente,
  comemorando e acenando, com confete e a chamada embaixo). Na grua, placa e pose quem está na última cena fica em fila no
  meio, vira para a câmera e faz o gesto; a câmera do fim é própria, num corte, e abre para caber o grupo.
- A escolha: `fimDoVideo3d` no roteiro; sem ele, o renderizar usa o número do episódio (`episodios.md` do canal), e sem
  registro o molde usa o título. Com `qr`, a placa vira cinema. O texto 2D fica em `FimDoVideo.tsx` (tudo acima de 1540 px).
- A regra do fim do kit continua: sem `ctaFinal` (só a vinheta ou a frase na luz), não há fim.

## O que ainda falta

- Dedos (a mão é uma luva) e cabelo com fios (o cabelo é bloco e só balança).
- Profundidade de campo (o fundo desfocado): o three não tem isso pronto sem um passo a mais de render.
- Acontecimentos físicos na palavra (algo cair, afundar, rachar, a tela tremer) e o objeto que a fala cita aparecendo sozinho (ex.: bolo com 11 velas).
