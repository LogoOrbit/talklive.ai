"""Voiceover for headphones.html, made with the open Kokoro TTS model (voice af_heart).

    pip install kokoro-onnx soundfile
    # model files: github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
    python make_vo.py <kokoro-v1.0.onnx> <voices-v1.0.bin> <out_dir>
"""
import os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

from make_vo_lines import LINES
k = Kokoro(sys.argv[1], sys.argv[2])
os.makedirs(sys.argv[3], exist_ok=True)
for i, line in enumerate(LINES):
    audio, sr = k.create(line, voice="af_heart", speed=0.92, lang="en-us")
    sf.write(os.path.join(sys.argv[3], f"{i:02d}.wav"), audio, sr)
