# Texturas do Canal dark

Feitas uma vez (22/11/2026) para o render não redesenhar o ruído a cada quadro
(o Pergaminho renderizava 2,1x mais devagar). Para refazer:

    npx remotion still TexturaDoNarrado public/texturas/papel.png --props='{"tipo":"papel","semente":7}' --image-format=png
    npx remotion still TexturaDoNarrado public/texturas/grao-N.png --props='{"tipo":"grao","semente":N}' --image-format=png   (N de 0 a 5)

e converta para WebP 960x540 (qualidade 70), apagando os PNG.

O jornal velho da mesa da Colagem (26/11/2026; antes o ruído dele era redesenhado
a cada quadro e a Colagem renderizava 3,3x mais devagar que o Clássico) fica em
JPEG 1920x1080, para as fibras não borrarem:

    npx remotion still TexturaDoNarrado out/jornal.png --props='{"tipo":"jornal","semente":0}' --image-format=png
    npx remotion ffmpeg -i out/jornal.png -q:v 3 public/texturas/jornal.jpg
