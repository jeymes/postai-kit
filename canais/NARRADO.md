# Canal dark: como sai cada vídeo (molde Documentario)

Vale para a rotina do **Canal dark** (tela Canal dark do Postaí, pasta `canais/dark`). O arquivo `.postai-canal`
com `dark`, que a rotina grava no começo, faz todas as chamadas ao Postaí irem para o Canal dark, separado da Animação.
O `canal-postai.md` diz **ESTILO: NARRADO**. O vídeo é longo (8 a 15 minutos), deitado
(1920×1080) e sai **só no YouTube**: uma voz conta uma história sobre pinturas, mapas e fotos que se movem devagar,
com capítulos, legenda e um cartão no fim. O formato está no `documentarioSchema` de `src/moldes/Documentario.tsx`
e um exemplo em `conteudo/exemplo-documentario.json`.

## Idioma

O `canal-postai.md` diz o **idioma dos vídeos** (português, inglês ou espanhol) e o `npm run canal` grava em `.postai-idioma`. Escreva **tudo** nesse idioma: as falas, o título, a capa, os capítulos, o texto na tela, o cartão do fim e o post (título, legenda e hashtags). Ponha `"idioma": "pt" | "en" | "es"` no roteiro. A voz, a legenda e o botão do fim saem nele sozinhos (o `npm run narrar` usa o idioma). Em inglês e em espanhol, escreva os números como se fala na língua (a voz lê os algarismos) e nada de português no vídeo. Todas as vozes do catálogo falam as três línguas: nunca pare o vídeo por causa do idioma ou da voz.

## Por que tanto cuidado

O YouTube não monetiza conteúdo "produzido em massa, genérico ou repetitivo", nem vídeo de IA "feito com modelos
genéricos". Monetiza quando **cada vídeo tem história, foco e conceito próprios**. Então:

- cada roteiro é **pesquisado** (fatos, datas, nomes, números) e conta uma história que o público não sabe inteira;
- a estrutura varia de um vídeo para o outro: nada de abrir sempre igual ou repetir as mesmas frases;
- nada inventado: o que não tem fonte sai do roteiro, e o que é lenda ou relato aparece como "conta-se", "segundo os
  relatos".

## A equipe (em `.claude/agents/`)

| Quem | O que faz |
| --- | --- |
| `roteirista-narrado` | pesquisa na web e escreve o roteiro, com capítulos, as fontes e a busca de imagem de cada cena |
| `checadora` | confere cada fato com as fontes e a forma do roteiro; devolve APROVADO ou CORRIGIR |
| `pesquisadora-de-imagens` | baixa as imagens livres (Wikimedia Commons e Openverse), **olha cada uma** e põe no roteiro |
| `producao` | narra e renderiza (o mesmo de sempre) |
| `critica-narrado` | olha a prévia antes do render (imagens, legendas, capa) e depois confere o vídeo pronto |
| `publicacao` | manda para aprovação e registra o episódio (o mesmo de sempre) |

## Passo a passo da coordenadora

Conte o andamento de cada agente como sempre (`npm run andamento`). Antes de cada comando npm, `source ferramentas/nuvem.sh`.

1. **roteirista-narrado:** escrever o vídeo de hoje. Ela responde com o caminho do arquivo e o resumo.
2. **checadora:** conferir (ela começa pelo `npm run conferir`, que confere a forma por código, e cuida dos fatos).
   Se vier CORRIGIR, volte para a roteirista com a lista (no máximo 3 voltas). Só siga com APROVADO.
3. **Ao mesmo tempo** (a narração não depende das imagens; assim o vídeo sai uns 10 minutos antes):
   - **producao:** comece a narrar (`npm run narrar`) **em segundo plano** (ver `producao.md`: o vídeo longo passa
     dos 10 minutos que um comando pode durar);
   - **pesquisadora-de-imagens:** logo em seguida, sem esperar a narração, imagens de todas as cenas.

   O `narrar` grava só a voz de cada cena, sem apagar as imagens que a pesquisadora põe no meio do caminho. **Ninguém
   muda a fala, a ordem ou a quantidade de cenas** enquanto as duas trabalham.
4. **Quando as duas terminarem** (as duas, nunca antes):
   - rode `npm run conferir -- conteudo/<arquivo>.json --com-voz`: os erros de imagem (cena sem foto, imagem em mais
     de 3 cenas) voltam para a pesquisadora, e cena sem voz volta para a produção (narrar de novo, só as que faltam);
   - se o `narrar` avisou que alguma fala mudou, narre de novo;
   - confira a duração total: se ficou mais de 20% longe da duração do canal, a roteirista corta ou acrescenta cenas
     (ela mantém as fontes), a pesquisadora põe imagem só nas cenas novas e a produção narra de novo.
5. **producao:** só com o `npm run conferir -- conteudo/<arquivo>.json --com-voz` limpo, a prévia: `npm run previa`
   (um quadro de CADA cena, uns 30 segundos num vídeo de 80 cenas) e `npm run renderizar -- conteudo/<arquivo>.json --capa`
   (só a capa).
6. **critica-narrado, na prévia (antes do render):** olha cada quadro da prévia, a capa e as falas. Se vier CORRIGIR,
   mande cada item para quem ela disse, refaça a prévia (o `npm run previa` só refaz as cenas que mudaram e lista
   quais em `previaMudou` no info.json) e chame a crítica de novo dizendo que é a 2ª (ou 3ª) volta (no máximo 3
   voltas: a prévia é barata). **Só renderize com a prévia APROVADA.** Antes, um erro de imagem só aparecia no vídeo pronto e custava um
   render inteiro de novo (até 1 hora num vídeo de 10 minutos).
7. **producao:** renderizar (`npm run renderizar`) em segundo plano, uma vez. O vídeo longo demora: uns 4 a 5 minutos
   de narração e render por minuto de vídeo. Não pare no meio.
8. **critica-narrado, no vídeo pronto:** a conferência rápida (voz, música, duração, quadro quebrado). Se vier
   CORRIGIR, mande cada item para quem ela disse e renderize de novo (no máximo 1 volta). Se ainda ficar algo, a
   publicação usa `--duvida`.
9. **publicacao:** mandar para aprovação (o `npm run aprovar` já manda como vídeo longo, só para o YouTube, com os
   capítulos na descrição) e registrar o episódio.
10. **Shorts do vídeo longo:** não é com a equipe. Desde 24/11/2026, se o dono ligou a chave, o Postaí manda o vídeo
   longo para o menu Cortes sozinho, e a fábrica de cortes faz os shorts. Não rode `npm run corte-vertical` numa
   rotina, mesmo que um aprendizado antigo peça.

Num **ajuste** (pedido pelo dono ou a refação que a crítica pediu), o roteiro vem em `conteudo/ajuste-<corteId>.json`.
Se o `npm run ajustes` disser **"o dono anexou"**, abra cada anexo (imagem, ou quadros do vídeo) antes de mexer e mostre à pesquisadora, à roteirista e à crítica: é o que ele quer ver no vídeo.
Se o `npm run ajustes` disser **"pacote de volta"**, as fotos e a voz do vídeo já estão nesta máquina: mude só o que foi
pedido (texto com a roteirista e a checadora, imagem com a pesquisadora), NÃO busque de novo as fotos que não mudaram
e rode o `narrar` normal (ele só refaz a voz das cenas que mudaram). Sem o pacote (vídeo antigo), busque as imagens e
narre tudo. Depois prévia, crítica na prévia, renderize, crítica no vídeo pronto e `npm run aprovar -- ... --substitui <corteId>`.

## Regras de forma

- **Duração:** a do canal (8, 10 ou 15 minutos), com uns 185 palavras por minuto de fala (a voz fala rápido: medido em 22/11/2026). Um vídeo de 10
  minutos tem umas 1.850 palavras em 80 a 110 cenas. Com 140 por minuto, o roteiro saía 30% curto e voltava. O vídeo
  sai mais longo que a soma das falas (cada cena ganha uns 0,7 s de respiro, e há o cartão final): o `conferir` e a
  prévia avisam quando o vídeo passa de 120% da duração do canal; aí corte ou junte cenas antes do render.
- **Cenas:** cada `fala` com 1 a 3 frases (uns 8 a 20 segundos). Frases faladas, curtas, do jeito que se conta uma
  história em voz alta. Números e datas como se fala ("mil oitocentos e oito" pode ficar "1808": a voz lê certo).
- **Capítulos:** de 4 a 8, o primeiro na cena 1 (vira o "00:00" da descrição do YouTube). Título de capítulo com até
  40 caracteres. O cartão do 1º capítulo entra uns 3 s depois do começo (o vídeo abre com a imagem e o gancho); os
  outros entram no começo da cena. A legenda fica por cima do cartão, sempre legível.
- **Gancho:** os primeiros 30 segundos dizem do que é o vídeo e por que ficar até o fim, com uma pergunta ou uma
  promessa que só se resolve no final. Nada de "Olá, pessoal" nem "Neste vídeo".
- **Texto na tela** (`texto`): só data, lugar ou número, até 40 caracteres, e no máximo 1 a cada 5 cenas.
- **Imagens:** o ideal é toda cena ter `foto`. Uma imagem pode voltar em cenas seguidas com `movimento` diferente, mas não mais
  que 3 vezes no vídeo. Retrato em pé ou mapa: `"inteira": true`. Quando o rosto ou a figura não está no meio da
  imagem (pintura deitada com os rostos no alto), `"foco": [x, y]` (em % da imagem) ou `"foco": "topo"`: o corte e o
  zoom ficam em volta dele. A borda lisa e a faixa de legenda de museu o `buscar-fotos` corta sozinho; margem de papel
  velho, com `npm run recortar-bordas -- <imagem> --corte e,c,d,b`.
- **Imagem errada não entra:** se os acervos só trazem imagens que não mostram o que a fala diz (outra pessoa, outra época, outro modelo), gere a cena com IA (`--fonte ia` com a descrição em inglês) em vez de usar a errada.
- **Faltou imagem (o acervo bloqueou, não achou):** o `buscar-fotos` gera com IA sozinho (ou `--fonte ia` com a cena descrita em inglês; até 40 por dia; o vídeo sai marcado como sintético no YouTube). NUNCA pare o vídeo por isso. Deixe a cena sem `foto`: ela continua a
  imagem da cena anterior, que fica mais tempo na tela com outro movimento. Só a cena 1 precisa de imagem, e o `conferir`
  só barra com mais de 2/3 das cenas sem imagem. Espalhe as imagens que achou pelo vídeo (uma a cada 2 ou 3 cenas) para
  nenhuma ficar mais de uns 30 s parada.
- **Vídeo de fundo:** uma cena pode ter `video` (paisagem do Pixabay: céu, deserto, mar, fogo) no lugar da `foto`, no
  máximo 1 a cada 6 cenas e sem nada moderno na tela. A pesquisadora busca com `npm run buscar-videos`.
- **Movimento:** sem `movimento`, a câmera alterna sozinha entre aproximar, esquerda, afastar, direita, subir, diagonal
  e descer. Escolha à mão quando ajuda a história: `aproximar` num rosto ou num detalhe importante, `subir` numa
  figura alta (um gigante, uma torre), `descer` do céu para a cena, `afastar` para revelar o lugar. Dentro do capítulo, a
  foto nova se mistura com a anterior; no começo de capítulo, entra do escuro com o título.
- **Música:** ponha sempre `musica` com uma das calmas do kit, pelo tom da história, e `volumeMusica` 0.15:
  `musica/calma-esperanca.mp3` (fé, milagre, final feliz), `musica/calma-reflexao.mp3` (ensino, parábola, oração,
  perdão) ou `musica/calma-drama.mp3` (batalha, perigo, provação, mistério). Se a crítica disser que a música atrapalha
  a voz, baixe para 0.1.
- **Fim:** a última cena fecha a pergunta do começo e puxa o próximo vídeo. `encerramento` com até 50 caracteres
  (ex.: "Inscreva-se para a parte 2") e `chamadaFinal` com a chamada do canal do `canal-postai.md` (até 90 caracteres,
  ex.: "Está lutando? Comente que a gente ora por você"): ela aparece no cartão final, acima do botão.
- **Modelo Colagem (Colagem Viva):** quando o `estilo.modelo` é `colagem`, o vídeo vira uma colagem de papel: cada
  cena cola a imagem num recorte rasgado (foto um pouco apagada, com retícula de impressão) **por cima** do recorte da
  cena anterior, numa mesa de jornal velho com retalhos; o novo entra deslizando e assenta (1 a cada 3 cenas, chega em
  tiras que se juntam), o anterior fica por baixo na sombra e o mais velho é arrancado da mesa. Nada se mistura:
  só cena de vídeo ou de mapa (`rota`) entra misturando, como nos outros modelos. O capítulo é uma tira de papel preto
  com o risco vermelho, e o `texto` vira uma etiqueta batida à máquina. O tempo de cada cena continua vindo da
  narração (a voz é gravada antes). Peças opcionais (sem campo novo):
  em umas 1 a cada 3 cenas, a roteirista põe `palavra` (a palavra-chave da fala, até 24 letras, ex.: "FUGA",
  "TRAIÇÃO"), que entra colada em letras recortadas de jornal, sublinhada a caneta, no alto (do lado contrário ao do
  `texto`); e a pesquisadora, ao escolher a imagem, marca `detalhe` ([x, y] em % da imagem) no ponto que a fala cita
  (um rosto, um objeto, uma inscrição): ele sai ampliado num recorte redondo, com o círculo de marca-texto e a seta.
  Não use `detalhe` em retrato `inteira`. As peças saem sozinhas no fim da cena, antes do próximo recorte.
- **Modelo Quadro de evidências (`evidencias`):** o vídeo inteiro acontece sobre UM quadro de cortiça escura, como
  nas séries investigativas: cada cena prende uma peça (a foto em preto e branco com alfinete e o número da
  evidência; o `texto` vira uma etiqueta batida à máquina) e a câmera viaja de peça em peça, sem corte. Cada capítulo
  é uma ficha com o número romano, e as peças dele crescem em volta dela; no fim de cada capítulo (se a cena tiver
  tempo) a câmera se afasta e mostra a rede, e no fim do vídeo mostra o quadro inteiro com o encerramento em glitch.
  A mesma imagem no mesmo capítulo não é presa de novo: a câmera volta a ela e chega mais perto de outro pedaço.
  O vermelho é só para o que importa. Campos opcionais (os outros modelos ignoram):
  - `tese` (no topo do roteiro, até 90 caracteres): a pergunta central do vídeo, num cartão no meio do quadro; a
    ficha de cada capítulo se liga a ela com barbante. Ponha sempre.
  - `ligar` (na cena): o número da cena anterior (ou uma lista de até 4) cuja peça se liga a esta com barbante
    vermelho, ex.: `"ligar": 5`. Só quando há ligação de verdade (a mesma pessoa, causa e efeito, o mesmo lugar),
    umas 1 a cada 6 cenas. A mesma imagem em dois capítulos já se liga sozinha.
  - `carimbo` (até 16 letras): carimbo vermelho batido na foto, com a tela tremendo: "ULTRASSECRETO", "INVESTIGADO",
    "CONDENADO", "ARQUIVADO", "CONFISCADO"... Só quando a fala diz isso e é verdade; 1 a cada 8 ou 10 cenas.
  - `ano` (até 12 caracteres, ex.: "1807", "30 d.C."): um cartão grande com o ano ao lado da foto. Cena que abre
    capítulo com um ano no `texto` já ganha o cartão.
  - `palavra` (até 24 letras): batida à máquina numa tira de papel na foto e sublinhada em vermelho (1 a cada 4 cenas).
  - `detalhe` ([x, y] em % da imagem): um círculo vermelho tremido se desenha nele e a câmera chega bem perto.
  - `insert`: a cena vira um trecho de cinema mudo (a tela fecha em íris, entra um filme sépia com grão, riscos e
    o projetor tremendo, e a íris abre de volta no quadro): `"mapa"` (com a `rota`; com a foto de um mapa, a rota
    se desenha nele; sem foto, num mapa desenhado), `"intertitulo"` (o `texto` da cena, curto, numa moldura dupla de
    filme mudo) ou `"acao"` com `silhuetas` (até 4 de: pessoa, soldado, cavalo, navio, carro, canhao), figuras
    chapadas em preto atravessando a tela, desenhadas a 12 quadros por segundo; o canhão dá um tiro (clarão e
    fumaça, nada de violência). Cena com `rota` já vira o mapa sozinha. No máximo 1 insert a cada 8 cenas.
  Sons baixinhos acompanham (máquina de escrever, carimbo, caneta, câmera, projetor). Imagens: fotos de arquivo,
  pinturas, gravuras, documentos e mapas; nada de rosto gerado por IA nas peças.
- **Modelo Infográfico animado (`infografico`):** para nichos que vivem de dados (finanças, economia,
  investimentos, ciência explicada, "quanto custa/quanto ganha", saúde em números, países comparados, esporte,
  curiosidades com números). Cada cena mostra um **gráfico que se monta no tempo da fala**, num fundo limpo
  (azul-petróleo escuro; `"estilo": { "modelo": "infografico", "fundo": "claro" }` deixa creme) com grade discreta;
  o dado que importa sai na cor de destaque (`estilo.cor`, ou âmbar), o resto em tons neutros. A câmera chega perto
  devagar, o gráfico anterior sai para a esquerda e o novo entra deslizando. A legenda fica numa faixa própria no pé,
  sem cobrir nada; o título do gráfico fica no alto e a `fonte` embaixo à esquerda. O capítulo é um cartão com o
  número grande. O `texto` da cena vira um "chapéu" pequeno acima do título (ex.: "Brasil, IPCA ao ano").
  A cena ganha o campo **`grafico`** (o resto continua igual: `fala`, `capitulo`, `texto`). Em todo gráfico:
  - `tipo` (um dos 9 abaixo); `titulo` (até 70 letras, o que o gráfico mostra);
  - **`fonte` (obrigatória quando o número é real):** a instituição e o ano, ex.: `"IBGE, 2025"`, `"Banco Central"`,
    `"Tesouro Nacional"`, `"B3"`, `"OMS, 2024"`, `"NASA"`. Numa simulação, `"Exemplo de cálculo"` (sai como está;
    o resto ganha "Fonte:" na frente). Todo número vem de fonte oficial ou confiável, a que a roteirista leu;
  - `em` (opcional): a palavra da fala em que a animação começa (antes dela, só o "esqueleto": eixo e rótulos). Sem
    `em`, começa junto com a cena. Use quando o número é dito no meio da fala;
  - **números sem aspas e com ponto decimal** (`35949.64`, nunca `"35.949,64"`): o kit escreve no formato da língua
    (pt: 35.949,64; en: 35,949.64; es: 35.949,64), com "mil", "mi", "bi" nos eixos;
  - `unidade` (nos que têm): `"R$"`, `"US$"`, `"%"`, `"R$ bi"`, `"anos"`, `"kg"`. A moeda vai antes do número
    (R$ 1.000), o resto depois (12%, 3 anos, R$ 4,2 bi). `casas`: as casas depois da vírgula (padrão: as dos valores).
  Os tipos, quando usar cada um e um exemplo (os números dos exemplos mostram só o formato: nunca copie um número
  sem ler a fonte):
  - `numero`: UM número que importa, grande, contando até o valor (o gancho, o resultado). `de` = onde a conta começa.
    `{ "tipo": "numero", "valor": 35949.64, "prefixo": "R$", "casas": 2, "rotulo": "é quanto R$ 1.000 vira em 30 anos", "icone": "moeda", "fonte": "Exemplo de cálculo" }`
  - `linha`: algo que muda com o tempo (inflação ano a ano, preço, população); de 2 a 40 pontos em ordem, x em número
    (ano) ou texto curto ("jan"). `destaque` põe um balão num ponto; o último ponto sempre ganha o valor.
    `{ "tipo": "linha", "unidade": "%", "pontos": [{ "x": 2020, "y": 4.52 }, { "x": 2021, "y": 10.06 }, { "x": 2022, "y": 5.79 }], "destaque": { "x": 2021, "rotulo": "maior alta" }, "fonte": "IBGE (IPCA)" }`
  - `barras`: comparar poucos valores (até 10). Em pé para períodos ("10 anos", "20 anos"); `"horizontal": true`
    para ranking (sai do maior para o menor). `"destaque": true` no item que importa (sem nenhum, o maior).
    `{ "tipo": "barras", "horizontal": true, "unidade": "R$", "itens": [{ "rotulo": "Poupança", "valor": 18193 }, { "rotulo": "1% ao mês", "valor": 33003, "destaque": true }], "fonte": "Exemplo de cálculo" }`
  - `pizza`: partes de um todo (2 a 6). Sai como rosca, com a % de cada parte calculada e a legenda ao lado.
    `{ "tipo": "pizza", "unidade": "%", "partes": [{ "rotulo": "Impostos", "valor": 33, "destaque": true }, { "rotulo": "O resto", "valor": 67 }], "fonte": "IBPT, 2024" }`
  - `unidades`: "1 em cada 4" (grade de ícones que acendem). `total` 10, 20, 50 ou 100; `marcados` inteiro.
    `{ "tipo": "unidades", "total": 10, "marcados": 4, "icone": "pessoa", "rotulo": "brasileiros com dívida atrasada", "fonte": "Serasa, 2025" }`
  - `comparacao`: dois valores lado a lado, com VS (poupança x inflação, Brasil x Chile, antes x depois). O maior
    sai na cor de destaque e aparece quantas vezes ele é maior.
    `{ "tipo": "comparacao", "unidade": "%", "a": { "rotulo": "Poupança", "valor": 2.99, "icone": "cofre" }, "b": { "rotulo": "Inflação", "valor": 10.06, "icone": "carrinho" }, "fonte": "Banco Central e IBGE" }`
  - `linhaDoTempo`: datas que contam uma história (2 a 7 marcos); a linha anda e cada marco acende quando ela chega.
    `{ "tipo": "linhaDoTempo", "marcos": [{ "quando": "1994", "rotulo": "Plano Real", "icone": "nota" }, { "quando": "2020", "rotulo": "Pix" }], "fonte": "Banco Central" }`
  - `escala`: tamanhos muito diferentes (2 a 5), em círculos com a área do tamanho do valor (o dobro do valor, o
    dobro da área). Bom para "do tamanho de" e para mostrar o efeito do tempo.
    `{ "tipo": "escala", "unidade": "R$", "casas": 0, "itens": [{ "rotulo": "No colchão", "valor": 1000 }, { "rotulo": "1% ao mês", "valor": 35949.64, "icone": "sobe" }], "fonte": "Exemplo de cálculo" }`
  - `conta`: a conta aparecendo passo a passo (até 5 linhas, até 48 letras cada); a última é o resultado, em destaque.
    `^` vira expoente; `=` e `≈` no começo da linha saem mais claros.
    `{ "tipo": "conta", "passos": ["R$ 1.000 × (1 + 0,01)^360", "≈ R$ 1.000 × 35,9496", "= R$ 35.949,64"], "fonte": "Exemplo de cálculo" }`
  **Ícones** (`icone` no `numero`, `unidades`, `comparacao`, `linhaDoTempo`, `escala` e na cena sem gráfico): moeda,
  nota, saco-de-dinheiro, cofre, casa, carro, pessoa, familia, carrinho, cartao, grafico, sobe, desce, porcentagem,
  relogio, ampulheta, calendario, planeta, globo, atomo, coracao, saude, raio, combustivel, comida, celular, banco,
  imposto, alvo, maleta, livro, fabrica, gota, arvore, lampada, trofeu, bola, cadeado, escudo.
  **Cena sem gráfico:** com `foto`, a foto num cartão limpo; sem foto, um ícone grande (`"icone": "ampulheta"`) com a
  `palavra` embaixo (ex.: "TEMPO"). Ponha gráfico em pelo menos metade das cenas (o `conferir` avisa) e varie os
  tipos; não repita o mesmo tipo em mais de 2 cenas seguidas. Na `fala`, diga o número como se lê ("dez por cento",
  "trinta e seis mil"): o gráfico mostra o número exato. Um número por gráfico: o gráfico mostra o que a fala diz,
  nada a mais. O `npm run conferir` confere o formato, a fonte, o `em` e o que cada tipo precisa; os números em si a
  checadora confere (refazendo cada conta).
- **Pronúncia:** nomes estrangeiros e siglas em `pronuncia`. Termos comuns do grego e do hebraico já têm pronúncia no kit (`ferramentas/voz/pronuncias.ts`); o `npm run conferir` e o `npm run narrar` avisam palavra com cara de estrangeira sem pronúncia.
- **Capa:** `capa.titulo` com **até 4 palavras** (saem grandes, em maiúsculas e com contorno), que dão curiosidade sem
  repetir o título do vídeo e sem mentir (ex.: "SÓ UMA PEDRA"); `destaque` na palavra mais forte (sai na cor de destaque
do modelo ou em amarelo, quando a cor da marca não lê bem no fundo escuro; sem `destaque`, a palavra mais longa);
  `lado`: `esquerda` ou `direita`, o oposto ao rosto ou à figura principal da foto (o texto fica no alto desse lado);
  `foto` a imagem mais marcante. **Modelo da capa** (`capa.modelo`), um dos que a seção "Capa dos vídeos" do
  `canal-postai.md` permite (sem a seção, qualquer um): `classico` (só o título), `circulo` (círculo vermelho no
  detalhe), `seta` (seta do título até o detalhe), `zoom` (lupa com o detalhe ampliado), `dois-lados` (`foto` e
  `foto2` lado a lado com VS e `rotulos`, ex.: antes e depois), `selo` (carimbo inclinado com `selo`, ex.:
  "PROIBIDO") ou `cinema` (só se a seção "Capa dos vídeos" permitir: ele gasta 1 imagem de IA). **Cinema:** o
  personagem principal em close, feito com IA para a capa, e o título dourado de filme (2 a 4 palavras, o `destaque`
  sai maior). Gere o retrato com `npm run buscar-fotos -- --pasta <a pasta do vídeo> --capa --rosto direita
  capa="<descrição em inglês>"` e use `capa.foto` = essa imagem e `capa.lado` = o lado oposto ao rosto
  (`--rosto direita` → `lado: esquerda`). A descrição diz quem é **sem nome** (idade, rosto, barba, roupa da época),
  a **emoção do título** (lágrimas, medo, espanto, fé) e o que aparece atrás, ligado à história (ex.: "old bearded
  prophet in rough ancient robes, tears in his eyes, looking up in awe, a chariot of fire and horses in a desert
  storm behind him"). Nada de pessoa real, marca, texto ou símbolo de outro canal. Uma tentativa, no máximo duas.
  **Ordem de prioridade:** se a seção "Capa dos vídeos" disser EM ORDEM DE PRIORIDADE, use sempre o 1º modelo. Passe
  para o próximo da lista só se o de cima não der certo neste vídeo (o `--capa` falhou ou acabou a cota de imagens de
  IA do dia, ou a crítica recusou a capa duas vezes) e conte no fim qual usou e por quê. Nunca pare o vídeo por causa
  da capa. Os que marcam um detalhe pedem `capa.marca` ({ x, y, raio } em % da CAPA): rode
  `npm run renderizar -- conteudo/<arquivo>.json --capa` (só a capa, em segundos, sem voz), abra
  `out/<arquivo>/capa.jpg` e ajuste a marca até cair no detalhe que dá curiosidade (um rosto, um objeto, uma
  inscrição). Escolha o modelo que mais combina com a história deste vídeo.
- **Post:** `post.titulo` com até 70 caracteres (o título do YouTube: a palavra-chave e o mais curioso nas
  primeiras palavras, porque a busca e a tela inicial cortam o resto) e
  `post.legenda` com 2 ou 3 parágrafos sobre o vídeo, as fontes principais e, por último, a linha
  "Imagens: obras em domínio público (Wikimedia Commons e Openverse)." Até 1.800 caracteres: o `aprovar` acrescenta
  os capítulos.
