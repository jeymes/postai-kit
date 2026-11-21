# Regras de forma de todo episódio (molde Conversa)

Valem para todos os canais. O que é de cada canal (produto, tom, personagens, CTAs, o que nunca dizer) vem do `canal-postai.md`, que o `npm run canal` baixa do Postaí. Quando se chocarem, vale o canal.

O roteiro é um `conteudo/<data>-<assunto>.json` no molde **Conversa**. O formato está em `conteudo/exemplo-conversa.json` e os campos válidos no `conversaSchema` de `src/moldes/Conversa.tsx`.

## Idioma

O `canal-postai.md` diz o **idioma dos vídeos** (português, inglês ou espanhol) e o `npm run canal` grava em `.postai-idioma`. Escreva **tudo** nesse idioma: as falas, o título, a capa, os capítulos, o texto na tela, o cartão do fim e o post (título, legenda e hashtags). Ponha `"idioma": "pt" | "en" | "es"` no roteiro. A voz, a legenda e o botão do fim saem nele sozinhos (o `npm run narrar` usa o idioma). Em inglês e em espanhol, escreva os números como se fala na língua (a voz lê os algarismos) e nada de português no vídeo. Todas as vozes do catálogo falam as três línguas: nunca pare o vídeo por causa do idioma ou da voz.

## Roteiro

- **Título:** até 50 caracteres, para caber em 2 linhas. Na série, use `"parte": "PARTE N"`; fora da série, não use `parte`.
- **Cenário** (`"cenario"`): `atelie`, `escritorio` ou `cafe`. Combine com a história e não repita o mesmo cenário 3 vezes seguidas.
- **Falas:** de 4 a 7 cenas, cada uma com **até 12 palavras**, e de 12 a 25 segundos de fala no total. Quando o canal pede vídeo mais longo (ex.: "45 a 60 s" no `canal-postai.md`), até **12 cenas** e o tempo que o canal pede (até uns 55 s de fala), sempre com falas de até 12 palavras.
- **Gancho:** a primeira fala prende em 2 segundos. Nada de "Oi, gente".
- **Final:** a última fala é a virada, a piada ou o gancho, e leva ao CTA final. Nunca termine com "segue a gente".

## Cena

- **Poses:** `normal`, `cintura`, `celular`, `cabeca`, `explicando`, `comemorando`, `pensando`.
- **Expressões:** `neutra`, `feliz`, `radiante`, `preocupada`, `surpresa`, `brava`, `sem-graca`.
- Em toda cena, cada personagem tem pose e expressão em `estados`, e cada um muda pelo menos uma das duas de uma cena para a outra. Com dois, quem escuta também reage. O vídeo pode ter **um personagem sozinho** (ele fica no meio da tela, falando com quem assiste) quando o dono pedir ou a história for de uma pessoa só.
- Fala com mais de 3 segundos (umas 9 palavras ou mais): ponha também `meio` (mesmo formato de `estados`), com a pose ou a expressão que muda na metade da fala, para ninguém ficar parado. Ex.: quem fala passa de `explicando` para `celular` quando mostra o app; quem ouve passa de `surpresa` para `feliz`.
- **Cartão:** use quando alguém mostra algo do produto, com no máximo 3 itens e nomes comuns inventados. O sinal dos itens bate com a história: `"marca": "confirmado"` (✓ verde; com `numero`, cada ✓ aparece junto com o contador; `marcados` diz quantos já confirmaram e os outros ficam ⏳), `"pendente"` (⏳ amarelo, ex.: "Ainda sem resposta") ou `"nenhuma"`. O `rotulo` comprido (mais de 12 letras) vai embaixo do número.
- **Zoom:** opcional, em quem revela a solução.
- **Sons:** no máximo 2 por vídeo (`notificacao` quando o celular aparece, `sucesso` na virada, `alerta` no pânico).

## Fechamento

- **Pronúncia:** inclua `"pronuncia"` para o nome do produto, se ele puder ser lido errado.
- **CTAs:** `ctaInicial` (até 28 caracteres com a letra cheia; até 36, e a letra diminui; sempre uma linha; se o dono escreveu a chamada, use a dele), `ctaFinal` (até 60, frase completa, sem @ nem "link na bio") e `botaoFinal` (até 24, ex.: "Link na bio 👆"), feitos para o episódio. O @ nunca aparece no vídeo.
- **Capa:** `"capa"` com o `titulo` (até 6 palavras), o `destaque` e a pose e a expressão mais fortes de cada personagem, pelo id. Sem foto.
- **Post:**
  - **título:** até 60 caracteres, com o mais forte nas **primeiras palavras** (o Shorts e o Reels mostram só o começo) e no máximo 1 emoji. Ex.: "Só Deus poderia curá-la. E Ele estava ali", e não "Somente Deus poderia curá-la. E aqui está o Senhor: a emoção de Nicodemos";
  - **legenda:** 1 ou 2 frases, terminando numa pergunta que se responde com uma palavra ("Você crê? Comente amém"), e **até 4 hashtags**: as obrigatórias do canal e pelo menos 1 do assunto deste vídeo (ex.: #listadeconvidados, #salomão), nunca só as gerais (#fé, #casamento).

## Conferência automática

`npm run conferir -- conteudo/<arquivo>.json` confere as regras com número desta página (tamanhos, CTAs, @, movimento, capa e post) e diz quem corrige cada erro. Rode antes de renderizar.

## Nunca

- Inventar função, preço, promoção, desconto ou depoimento.
- Dar número real de clientes.
- Citar outras marcas, apps ou famosos.
- Música famosa.
- Copiar personagens ou roteiros de outros criadores.
- Repetir um tema dos últimos 15 episódios do registro.
