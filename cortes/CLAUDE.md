# Fábrica de cortes do Postaí

Transforma vídeos longos em cortes verticais com gancho e legenda e manda para o **menu Cortes** do Postaí, onde a pessoa aprova; o aprovado entra na fila do piloto, que posta sozinho todo dia.

Os vídeos chegam de dois jeitos:
- **Link no menu Cortes** (Google Drive, Dropbox, download direto): o `npm run buscar` baixa.
- **Arquivo no computador:** a pessoa põe o vídeo em `entrada/` (solto ou numa subpasta).

Converse e escreva em **português do Brasil**. **Rodando como rotina na nuvem, nunca pergunte nem espere resposta:** decida sozinho e, se um vídeo travar, marque o erro dele e siga (detalhes na skill `fazer-cortes`). Quando a pessoa pedir "faz os cortes", "processa os vídeos" ou parecido, siga a skill `fazer-cortes` do começo ao fim.

## Regras fixas

- **Você nunca baixa vídeos do YouTube, TikTok, Instagram ou outra rede** (yt-dlp, gravação de tela...), nem ensina como. O `buscar` só baixa links de arquivo e recusa link de rede social; não contornar. O que a pessoa põe em `entrada/` é responsabilidade dela.
- **Só os comandos `npm run` desta pasta** falam com o Postaí (pela chave do `.env`). As ferramentas `mcp__postai*` do Claude podem estar ligadas a outra conta do Postaí: não use aqui, exceto `instalar_cortes` (instalar ou atualizar).

## Como funciona

```
menu Cortes (link)  → npm run buscar   entrada/<pedidoId>.mp4
ou o arquivo posto em entrada/
  → npm run transcrever        trabalho/<id>/transcricao.txt
  → (Claude) cortes.json       os trechos escolhidos
  → npm run previa -- <id>     uma imagem de cada corte, para conferir
  → npm run cortar -- <id>     trabalho/<id>/cortes/NN/video.mp4 + capa.jpg
  → npm run enviar -- <id>     menu Cortes, esperando aprovação
```

`npm run estado -- --fila` mostra o que falta em cada vídeo, os pedidos esperando e até quando a fila do piloto tem posts. Para avisar um erro de um pedido no app: `npm run marcar -- <pedidoId> erro "mensagem"`.

Primeira vez neste computador: `npm install`, `npm run instalar` (precisa do uv) e o `.env` com a `POSTAI_CHAVE`. A ferramenta `instalar_cortes` do conector do Postaí faz tudo isso e cria a chave.
