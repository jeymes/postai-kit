# Fala e confere a narração. Roda no Python do .voz/ (npm run voz:instalar);
# quem chama é o ferramentas/narrar.mts.
#
# Entrada: um JSON com {"voz", "velocidade", "idioma"?, "falas": [{"texto", "saida", "voz"?}]}.
# "idioma": pt (padrão), en ou es: a língua que a voz fala e que o Whisper escuta.
# A voz pode ser uma só ("pf_dora") ou a mistura de várias, com o peso de cada
# uma ("pf_dora*0.6+if_sara*0.4"): dá timbres diferentes, falando no idioma
# pedido. Uma fala com "voz" própria usa a dela (um personagem por voz).
# Para cada fala, o Kokoro (Apache 2.0) gera o áudio em "saida" e o
# faster-whisper (MIT) escuta de volta, palavra por palavra, com o tempo de
# cada uma. Saída (stdout): [{"duracao", "palavras": [{"palavra", "inicio", "fim"}]}].
#
# Uso: python voz.py <pedido.json>
#      python voz.py --testar     (fala uma frase curta e confere)
#      python voz.py --escutar <pedido.json>
#          a voz já veio pronta (do Google, pelo Postaí): {"idioma"?, "falas": [{"entrada", "saida"}]}.
#          Só iguala o volume, grava em "saida" e o Whisper escuta (o Kokoro nem carrega).
#          Saída igual à de cima.
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


def carregar_whisper():
    return WhisperModel("small", device="cpu", compute_type="int8", download_root=os.path.join(PASTA, "whisper"))


def carregar():
    kokoro = Kokoro(os.path.join(PASTA, "kokoro.onnx"), os.path.join(PASTA, "vozes.bin"))
    return kokoro, carregar_whisper()


def voz_de(kokoro, nome):
    if "+" not in nome and "*" not in nome:
        return nome
    estilo = None
    for parte in nome.split("+"):
        voz, _, peso = parte.strip().partition("*")
        vetor = kokoro.get_voice_style(voz.strip()) * float(peso or 1)
        estilo = vetor if estilo is None else estilo + vetor
    return estilo


# A língua de cada idioma no Kokoro e no Whisper
LINGUA_DO_KOKORO = {"pt": "pt-br", "en": "en-us", "es": "es"}
LINGUA_DO_WHISPER = {"pt": "pt", "en": "en", "es": "es"}


def escutar(whisper, amostras, taxa, idioma="pt"):
    # O Whisper quer 16 kHz. Os números vão direto (sem ler o arquivo de novo).
    a16 = np.interp(np.arange(0, len(amostras), taxa / 16000), np.arange(len(amostras)), amostras).astype("float32")
    trechos, _ = whisper.transcribe(a16, language=LINGUA_DO_WHISPER.get(idioma, "pt"), word_timestamps=True)
    return [
        {"palavra": p.word.strip(), "inicio": round(p.start, 3), "fim": round(p.end, 3)}
        for t in trechos
        for p in (t.words or [])
    ]


# Nível da narração (25/11/2026): o Kokoro sai baixo e variando de voz para voz
# (a crítica mediu -21,6 dB no vídeo de Salomão). Igualamos cada fala: os
# trechos com voz ficam perto de -16 dB e o pico nunca passa de -1 dB (não estoura).
ALVO_DB = -16.0
PICO_MAX = 10 ** (-1.0 / 20)


def igualar_volume(amostras, taxa):
    a = np.asarray(amostras, dtype=np.float32)
    if a.size == 0:
        return a
    janela = max(1, int(taxa * 0.05))
    n = a.size // janela
    if n == 0:
        return a
    rms = np.sqrt(np.mean(a[: n * janela].reshape(n, janela) ** 2, axis=1))
    com_voz = rms[rms > max(rms.max() * 0.1, 1e-4)]
    if com_voz.size == 0:
        return a
    atual = float(np.sqrt(np.mean(com_voz ** 2)))
    ganho = (10 ** (ALVO_DB / 20)) / atual
    # As pontas mais altas da fala passam do limite: arredonda só elas (limitador
    # suave), sem baixar a fala toda. No máximo 6 dB de ponta arredondada.
    pico = float(np.abs(a).max())
    if pico * ganho > PICO_MAX * 2:
        ganho = PICO_MAX * 2 / pico
    a = a * ganho
    joelho = 0.7
    folga = PICO_MAX - joelho
    alto = np.abs(a) > joelho
    a[alto] = np.sign(a[alto]) * (joelho + folga * np.tanh((np.abs(a[alto]) - joelho) / folga))
    return a


def escutar_prontas(caminho):
    # A voz do Google: o áudio já existe; aqui ele só fica no nível da narração e é conferido
    with open(caminho, encoding="utf-8") as arquivo:
        pedido = json.load(arquivo)
    whisper = carregar_whisper()
    idioma = pedido.get("idioma") or "pt"
    resultado = []
    for fala in pedido["falas"]:
        amostras, taxa = sf.read(fala["entrada"], dtype="float32", always_2d=True)
        amostras = igualar_volume(amostras.mean(axis=1), taxa)
        os.makedirs(os.path.dirname(fala["saida"]), exist_ok=True)
        sf.write(fala["saida"], amostras, taxa, subtype="PCM_16")
        resultado.append({"duracao": round(len(amostras) / taxa, 3), "palavras": escutar(whisper, amostras, taxa, idioma)})
    sys.stdout.write(json.dumps(resultado, ensure_ascii=False))


def main():
    if sys.argv[1:2] == ["--escutar"]:
        escutar_prontas(sys.argv[2])
        return
    if sys.argv[1:] == ["--testar"]:
        kokoro, whisper = carregar()
        amostras, taxa = kokoro.create("Tudo pronto para narrar.", voice="pf_dora", speed=1.0, lang="pt-br")
        print(" ".join(p["palavra"] for p in escutar(whisper, amostras, taxa)))
        return
    with open(sys.argv[1], encoding="utf-8") as arquivo:
        pedido = json.load(arquivo)
    kokoro, whisper = carregar()
    idioma = pedido.get("idioma") or "pt"
    resultado = []
    for fala in pedido["falas"]:
        amostras, taxa = kokoro.create(
            fala["texto"],
            voice=voz_de(kokoro, fala.get("voz") or pedido["voz"]),
            speed=fala.get("velocidade") or pedido.get("velocidade", 1.0),
            lang=LINGUA_DO_KOKORO.get(idioma, "pt-br"),
        )
        amostras = igualar_volume(amostras, taxa)
        os.makedirs(os.path.dirname(fala["saida"]), exist_ok=True)
        sf.write(fala["saida"], amostras, taxa, subtype="PCM_16")
        resultado.append({"duracao": round(len(amostras) / taxa, 3), "palavras": escutar(whisper, amostras, taxa, idioma)})
    sys.stdout.write(json.dumps(resultado, ensure_ascii=False))


main()
