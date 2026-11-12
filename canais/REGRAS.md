# Regras de forma de todo episódio (molde Conversa)

Valem para todos os canais. O que é de cada canal (produto, tom, personagens, CTAs, o que nunca dizer) vem do `canal-postai.md`, que o `npm run canal` baixa do Postaí. Quando se chocarem, vale o canal.

O roteiro é um `conteudo/<data>-<assunto>.json` no molde **Conversa**. O formato está em `conteudo/exemplo-conversa.json` e os campos válidos no `conversaSchema` de `src/moldes/Conversa.tsx`.

## Roteiro

- **Título:** até 50 caracteres, para caber em 2 linhas. Na série, use `"parte": "PARTE N"`; fora da série, não use `parte`.
- **Cenário** (`"cenario"`): `atelie`, `escritorio` ou `cafe`. Combine com a história e não repita o mesmo cenário 3 vezes seguidas.
- **Falas:** de 4 a 7 cenas, cada uma com **até 12 palavras**, e de 12 a 25 segundos de fala no total.
- **Gancho:** a primeira fala prende em 2 segundos. Nada de "Oi, gente".
- **Final:** a última fala é a virada, a piada ou o gancho, e leva ao CTA final. Nunca termine com "segue a gente".

## Cena

- **Poses:** `normal`, `cintura`, `celular`, `cabeca`, `explicando`, `comemorando`, `pensando`.
- **Expressões:** `neutra`, `feliz`, `radiante`, `preocupada`, `surpresa`, `brava`, `sem-graca`.
- Em toda cena, os dois personagens têm pose e expressão em `estados`, e cada um muda pelo menos uma das duas de uma cena para a outra. Quem escuta também reage.
- **Cartão:** use quando alguém mostra algo do produto, com no máximo 3 itens e nomes comuns inventados.
- **Zoom:** opcional, em quem revela a solução.
- **Sons:** no máximo 2 por vídeo (`notificacao` quando o celular aparece, `sucesso` na virada, `alerta` no pânico).

## Fechamento

- **Pronúncia:** inclua `"pronuncia"` para o nome do produto, se ele puder ser lido errado.
- **CTAs:** `ctaInicial` (até 28 caracteres, uma linha), `ctaFinal` (até 60, frase completa, sem @ nem "link na bio") e `botaoFinal` (até 24, ex.: "Link na bio 👆"), feitos para o episódio. O @ nunca aparece no vídeo.
- **Capa:** `"capa"` com o `titulo` (até 6 palavras), o `destaque` e a pose e a expressão mais fortes de cada personagem, pelo id. Sem foto.
- **Post:**
  - **título:** até 70 caracteres, com no máximo 1 emoji;
  - **legenda:** 1 ou 2 frases e **até 5 hashtags**, incluindo as do canal.

## Conferência automática

`npm run conferir -- conteudo/<arquivo>.json` confere as regras com número desta página (tamanhos, CTAs, @, movimento, capa e post) e diz quem corrige cada erro. Rode antes de renderizar.

## Nunca

- Inventar função, preço, promoção, desconto ou depoimento.
- Dar número real de clientes.
- Citar outras marcas, apps ou famosos.
- Música famosa.
- Copiar personagens ou roteiros de outros criadores.
- Repetir um tema dos últimos 15 episódios do registro.
