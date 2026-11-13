import sys, os
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(os.path.dirname(dst), exist_ok=True)
im = Image.open(src).convert('RGB')
im.resize((1080, 1920), Image.LANCZOS).save(dst, optimize=True)
