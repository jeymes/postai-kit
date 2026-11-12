# Fala e confere a narração. Roda no Python do .voz/ (npm run voz:instalar);
# quem chama é o ferramentas/narrar.mts.
#
# Entrada: um JSON com {"voz", "velocidade", "falas": [{"texto", "saida", "voz"?}]}.
# A voz pode ser uma só ("pf_dora") ou a mistura de várias, com o peso de cada
# uma ("pf_dora*0.6+if_sara*0.4"): dá timbres diferentes, sempre falando
# português. Uma fala com "voz" própria usa a dela (um personagem por voz).
# Para cada fala, o Kokoro (Apache 2.0) gera o áudio em "saida" e o
# faster-whisper (MIT) escuta de volta, palavra por palavra, com o tempo de
# cada uma. Saída (stdout): [{"duracao", "palavras": [{"palavra", "inicio", "fim"}]}].
#
# Uso: python voz.py <pedido.json>
#      python voz.py --testar     (fala uma frase curta e confere)
import json
import os
import sys
import warnings

warnings.filterwarnings("ignore")

import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel
from kokoro_onnx import Kokoro

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".voz", "modelos")


def carregar():
    kokoro = Kokoro(os.path.join(PASTA, "kokoro.onnx"), os.path.join(PASTA, "vozes.bin"))
    whisper = WhisperModel("small", device="cpu", compute_type="int8", download_root=os.path.join(PASTA, "whisper"))
    return kokoro, whisper


def voz_de(kokoro, nome):
    if "+" not in nome and "*" not in nome:
        return nome
    estilo = None
    for parte in nome.split("+"):
        voz, _, peso = parte.strip().partition("*")
        vetor = kokoro.get_voice_style(voz.strip()) * float(peso or 1)
        estilo = vetor if estilo is None else estilo + vetor
    return estilo


def escutar(whisper, amostras, taxa):
    # O Whisper quer 16 kHz. Os números vão direto (sem ler o arquivo de novo).
    a16 = np.interp(np.arange(0, len(amostras), taxa / 16000), np.arange(len(amostras)), amostras).astype("float32")
    trechos, _ = whisper.transcribe(a16, language="pt", word_timestamps=True)
    return [
        {"palavra": p.word.strip(), "inicio": round(p.start, 3), "fim": round(p.end, 3)}
        for t in trechos
        for p in (t.words or [])
    ]


def main():
    if sys.argv[1:] == ["--testar"]:
        kokoro, whisper = carregar()
        amostras, taxa = kokoro.create("Tudo pronto para narrar.", voice="pf_dora", speed=1.0, lang="pt-br")
        print(" ".join(p["palavra"] for p in escutar(whisper, amostras, taxa)))
        return
    with open(sys.argv[1], encoding="utf-8") as arquivo:
        pedido = json.load(arquivo)
    kokoro, whisper = carregar()
    resultado = []
    for fala in pedido["falas"]:
        amostras, taxa = kokoro.create(
            fala["texto"],
            voice=voz_de(kokoro, fala.get("voz") or pedido["voz"]),
            speed=fala.get("velocidade") or pedido.get("velocidade", 1.0),
            lang="pt-br",
        )
        os.makedirs(os.path.dirname(fala["saida"]), exist_ok=True)
        sf.write(fala["saida"], amostras, taxa, subtype="PCM_16")
        resultado.append({"duracao": round(len(amostras) / taxa, 3), "palavras": escutar(whisper, amostras, taxa)})
    sys.stdout.write(json.dumps(resultado, ensure_ascii=False))


main()
