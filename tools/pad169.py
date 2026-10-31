import sys
from PIL import Image, ImageOps
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
w, h = im.size
H = round(w * 9 / 16)
pad = (H - h) // 2
out = Image.new("RGB", (w, H))
out.paste(im, (0, pad))
top = ImageOps.flip(im.crop((0, 0, w, pad)))
bot = ImageOps.flip(im.crop((0, h - (H - h - pad), w, h)))
out.paste(top, (0, 0)); out.paste(bot, (0, pad + h))
out = out.resize((3840, 2160), Image.LANCZOS)
out.save(dst, quality=92)
