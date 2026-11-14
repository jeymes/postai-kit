# Canal dark: como sai cada vídeo (molde Documentario)

Vale para a rotina do **Canal dark** (tela Canal dark do Postaí, pasta `canais/dark`). O arquivo `.postai-canal`
com `dark`, que a rotina grava no começo, faz todas as chamadas ao Postaí irem para o Canal dark, separado da Animação.
O `canal-postai.md` diz **ESTILO: NARRADO**. O vídeo é longo (8 a 15 minutos), deitado
(1920×1080) e sai **só no YouTube**: uma voz conta uma história sobre pinturas, mapas e fotos que se movem devagar,
com capítulos, legenda e um cartão no fim. O formato está no `documentarioSchema` de `src/moldes/Documentario.tsx`
e um exemplo em `conteudo/exemplo-documentario.json`.

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
| `critica-narrado` | assiste por amostras, ouve o começo e decide se está bom para o dono |
| `publicacao` | manda para aprovação e registra o episódio (o mesmo de sempre) |

## Passo a passo da coordenadora

Conte o andamento de cada agente como sempre (`npm run andamento`). Antes de cada comando npm, `source ferramentas/nuvem.sh`.

1. **roteirista-narrado:** escrever o vídeo de hoje. Ela responde com o caminho do arquivo e o resumo.
2. **checadora:** conferir. Se vier CORRIGIR, volte para a roteirista com a lista (no máximo 3 voltas). Só siga com APROVADO.
3. **pesquisadora-de-imagens:** imagens de todas as cenas.
4. **producao:** narrar (`npm run narrar`). Confira a duração total: se ficou mais de 20% longe da duração do canal,
   volte para a roteirista cortar ou acrescentar cenas (ela mantém as fontes) e narre de novo.
5. **producao:** `npm run previa` e depois renderizar (`npm run renderizar`). O vídeo longo demora: uns 4 a 5 minutos de
   narração e render por minuto de vídeo (num Mac M1, 6 minutos levaram 26). Não pare no meio.
6. **critica-narrado:** assistir. Se vier CORRIGIR, mande cada item para quem ela disse e renderize de novo (no máximo
   2 voltas). Se ainda ficar algo, a publicação usa `--duvida`.
7. **publicacao:** mandar para aprovação (o `npm run aprovar` já manda como vídeo longo, só para o YouTube, com os
   capítulos na descrição) e registrar o episódio.

Num **ajuste** pedido pelo dono, o roteiro guardado vem em `conteudo/ajuste-<corteId>.json`: mude só o que ele pediu
(texto com a roteirista e a checadora, imagem com a pesquisadora), narre de novo, renderize, crítica e
`npm run aprovar -- ... --substitui <corteId>`.

## Regras de forma

- **Duração:** a do canal (8, 10 ou 15 minutos), com uns 140 palavras por minuto de fala. Um vídeo de 10 minutos tem
  umas 1.400 palavras em 60 a 90 cenas.
- **Cenas:** cada `fala` com 1 a 3 frases (uns 8 a 20 segundos). Frases faladas, curtas, do jeito que se conta uma
  história em voz alta. Números e datas como se fala ("mil oitocentos e oito" pode ficar "1808": a voz lê certo).
- **Capítulos:** de 4 a 8, o primeiro na cena 1 (vira o "00:00" da descrição do YouTube). Título de capítulo com até
  40 caracteres.
- **Gancho:** os primeiros 30 segundos dizem do que é o vídeo e por que ficar até o fim, com uma pergunta ou uma
  promessa que só se resolve no final. Nada de "Olá, pessoal" nem "Neste vídeo".
- **Texto na tela** (`texto`): só data, lugar ou número, até 40 caracteres, e no máximo 1 a cada 5 cenas.
- **Imagens:** toda cena tem `foto`. Uma imagem pode voltar em cenas seguidas com `movimento` diferente, mas não mais
  que 3 vezes no vídeo. Retrato em pé ou mapa: `"inteira": true`.
- **Fim:** a última cena fecha a pergunta do começo e puxa o próximo vídeo. `encerramento` com até 50 caracteres
  (ex.: "Inscreva-se para a parte 2").
- **Pronúncia:** nomes estrangeiros e siglas em `pronuncia`.
- **Capa:** `capa.titulo` com até 8 palavras, que dá vontade de clicar sem mentir; `destaque` numa palavra forte;
  `foto` a imagem mais marcante.
- **Post:** `post.titulo` com até 100 caracteres (o título do YouTube, com a palavra-chave no começo) e
  `post.legenda` com 2 ou 3 parágrafos sobre o vídeo, as fontes principais e, por último, a linha
  "Imagens: obras em domínio público (Wikimedia Commons e Openverse)." Até 1.800 caracteres: o `aprovar` acrescenta
  os capítulos.
