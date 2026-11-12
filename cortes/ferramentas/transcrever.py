# Transcreve um áudio com o faster-whisper (MIT), palavra por palavra.
# Quem chama é o ferramentas/transcrever.mts.
#
# Uso: python transcrever.py <audio.wav> <saida.json> <modelo> <idioma>
# Saída: {"idioma", "duracaoSeg", "segmentos": [{"i", "f", "texto", "palavras": [{"p", "i", "f"}]}]}
import json
import os
import sys
import warnings
import wave

warnings.filterwarnings("ignore")

import numpy as np
from faster_whisper import WhisperModel

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".cortes", "modelos", "whisper")


def ler_wav(arquivo):
    # O transcrever.mts já entrega WAV mono de 16 kHz (o Whisper quer assim).
    # Lido aqui direto, sem o PyAV (as versões novas dele não abrem com o faster-whisper).
    with wave.open(arquivo, "rb") as w:
        bruto = w.readframes(w.getnframes())
    return np.frombuffer(bruto, dtype=np.int16).astype(np.float32) / 32768.0


def main():
    arquivo, saida, modelo, idioma = sys.argv[1:5]
    audio = ler_wav(arquivo)
    whisper = WhisperModel(modelo, device="cpu", compute_type="int8", download_root=PASTA)
    trechos, info = whisper.transcribe(
        audio,
        language=None if idioma == "auto" else idioma,
        word_timestamps=True,
        vad_filter=True,
    )
    segmentos = []
    for t in trechos:
        segmentos.append(
            {
                "i": round(t.start, 2),
                "f": round(t.end, 2),
                "texto": t.text.strip(),
                "palavras": [
                    {"p": p.word.strip(), "i": round(p.start, 2), "f": round(p.end, 2)} for p in (t.words or [])
                ],
            }
        )
        pct = min(100, int(t.end / max(info.duration, 1) * 100))
        sys.stderr.write(f"\r  {pct}% transcrito")
        sys.stderr.flush()
    sys.stderr.write("\n")
    with open(saida, "w", encoding="utf-8") as arquivo:
        json.dump(
            {"idioma": info.language, "duracaoSeg": round(info.duration, 2), "segmentos": segmentos},
            arquivo,
            ensure_ascii=False,
        )


main()
