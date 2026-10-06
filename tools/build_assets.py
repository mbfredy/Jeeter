"""Build scene assets from the source renders.

    python3 tools/build_assets.py

For every scene in src/scenes.json with a tools/src-<id>.webp source:
  1. paints out regions listed in "inpaint" (e.g. the static blimp, replaced
     at runtime by the animated LED blimp)
  2. upscales 1.5x (Lanczos) with a light unsharp mask for crisp zooms
  3. writes public/scenes/<id>.webp
  4. writes public/scenes/<id>-fx.png, an RGB effect mask:
       R = water (ripple + sun glints)
       G = waterfall (downward flow)
       B = 0.4 warm practical lights (twinkle), 1.0 neon / screens (pulse)
Requires: pip install opencv-python-headless numpy
"""
import json
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "src", "scenes.json")))
OUT = os.path.join(ROOT, "public", "scenes")
os.makedirs(OUT, exist_ok=True)


def rect_mask(shape, rects):
    h, w = shape[:2]
    m = np.zeros((h, w), np.uint8)
    for x0, y0, x1, y1 in rects:
        m[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 255
    return m


def paint_out(img, x0, y0, x1, y1):
    """Remove an object sitting on a horizontally-banded background (sky,
    ridge line, water): each row is rebuilt by interpolating between the
    pixels just outside the box, only where the object differs from it."""
    h, w = img.shape[:2]
    X0, X1 = int(x0 * w), int(x1 * w)
    Y0, Y1 = int(y0 * h), min(h, int(y1 * h))
    f = img.astype(np.float32)
    fill = f.copy()
    t = np.linspace(0, 1, X1 - X0)[None, :, None]
    left = f[Y0:Y1, max(0, X0 - 6):X0].mean(axis=1, keepdims=True)
    right = f[Y0:Y1, X1:min(w, X1 + 6)].mean(axis=1, keepdims=True)
    band = left * (1 - t) + right * t
    # vertical smoothing keeps the band coherent
    band = cv2.GaussianBlur(band, (1, 5), 0)
    noise = np.random.default_rng(1).normal(0, 1.6, band.shape).astype(np.float32)
    fill[Y0:Y1, X0:X1] = band + noise
    diff = np.abs(f[Y0:Y1, X0:X1] - band).max(axis=2)
    m = (diff > 22).astype(np.uint8) * 255
    m = cv2.dilate(m, np.ones((9, 9), np.uint8))
    full = np.zeros((h, w), np.uint8)
    full[Y0:Y1, X0:X1] = m
    full = cv2.GaussianBlur(full, (0, 0), 3).astype(np.float32)[..., None] / 255.0
    return (f * (1 - full) + fill * full).clip(0, 255).astype(np.uint8)


def build(sid, scene):
    src = os.path.join(ROOT, "tools", f"src-{sid}.webp")
    if not os.path.exists(src):
        print(f"skip {sid}: no {src}")
        return
    img = cv2.imread(src, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]

    for x0, y0, x1, y1 in scene.get("inpaint", []):
        img = paint_out(img, x0, y0, x1, y1)

    # effect masks (computed at source resolution, stored half-size)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.int32)
    b, g, r = [img[..., i].astype(np.int32) for i in range(3)]
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    water_rgn = rect_mask(img.shape, scene.get("water", [])) > 0
    is_water = (hue >= 88) & (hue <= 118) & (sat > 70) & (val > 60) & (b > r + 30)
    water = (water_rgn & is_water).astype(np.uint8) * 255
    water = cv2.morphologyEx(water, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    water = cv2.GaussianBlur(water, (0, 0), 1.5)

    fall_rgn = rect_mask(img.shape, scene.get("waterfall", [])) > 0
    is_fall = (val > 170) & (sat < 70)
    fall = (fall_rgn & is_fall).astype(np.uint8) * 255
    fall = cv2.dilate(fall, np.ones((3, 3), np.uint8))
    fall = cv2.GaussianBlur(fall, (0, 0), 2)

    warm = (r > 205) & (g > 150) & (b < 175) & (r - b > 55) & (val > 200)
    lights = warm.astype(np.uint8) * 102  # 0.4
    neon_rgn = rect_mask(img.shape, scene.get("neon", [])) > 0
    color = scene.get("neonColor")
    if color == "green":
        neon = neon_rgn & (g > 170) & (g > r + 30) & (g > b + 30)
    elif color == "blue":
        neon = neon_rgn & (b > 170) & (b > r + 50)
    elif color == "gold":
        neon = neon_rgn & (val > 150) & (r > g) & (g > b) & (r > 150)
    else:  # screens / generic bright saturated panels
        neon = neon_rgn & (val > 90)
    lights[neon] = 255
    lights = cv2.GaussianBlur(lights, (0, 0), 1.2)

    fx = np.dstack([lights, fall, water])  # BGR order -> R=water G=fall B=lights
    fx = cv2.resize(fx, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(OUT, f"{sid}-fx.png"), fx)

    big = cv2.resize(img, (int(w * 1.5), int(h * 1.5)), interpolation=cv2.INTER_LANCZOS4)
    soft = cv2.GaussianBlur(big, (0, 0), 1.2)
    big = cv2.addWeighted(big, 1.35, soft, -0.35, 0)
    cv2.imwrite(os.path.join(OUT, f"{sid}.webp"), big, [cv2.IMWRITE_WEBP_QUALITY, 86])
    print(f"built {sid}: {big.shape[1]}x{big.shape[0]}")


for sid, scene in CFG["scenes"].items():
    build(sid, scene)
