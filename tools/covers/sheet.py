import sys, os
from PIL import Image
src, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 3
files = sorted(f for f in os.listdir(src) if f.endswith(('.png', '.webp')))
tw, th = 420, 236
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 6), rows * (th + 6)), (40, 40, 40))
for i, f in enumerate(files):
    im = Image.open(os.path.join(src, f)).convert('RGB')
    im = im.resize((tw, th), Image.NEAREST if im.width < 400 else Image.LANCZOS)
    sheet.paste(im, ((i % cols) * (tw + 6), (i // cols) * (th + 6)))
sheet.save(out)
print(files)
