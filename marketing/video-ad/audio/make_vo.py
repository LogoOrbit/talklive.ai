"""Voiceover for headphones.html, made with the open Kokoro TTS model (voice af_heart).

    pip install kokoro-onnx soundfile
    # model files: github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
    python make_vo.py <kokoro-v1.0.onnx> <voices-v1.0.bin> <out_dir>
"""
import os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

LINES = [
    "Your most boring minutes... could be the best part of your day.",
    "On the bus to school, or work.",
    "In the back seat of the car.",
    "Lying in bed, alone.",
    "Or on a break, bored out of your mind.",
    "Just put on your headphones,",
    "go to talk live dot app,",
    "tap to talk,",
    "and talk to anyone in the world.",
    "And have a good time.",
    "Talk Live. Talk to anyone, anywhere.",
]
k = Kokoro(sys.argv[1], sys.argv[2])
os.makedirs(sys.argv[3], exist_ok=True)
for i, line in enumerate(LINES):
    audio, sr = k.create(line, voice="af_heart", speed=0.95, lang="en-us")
    sf.write(os.path.join(sys.argv[3], f"{i:02d}.wav"), audio, sr)
