"""Generate per-pixel depth maps for the scene renders.

    python3 tools/build_depth.py /path/to/depth-anything-v2-large/model.onnx

Runs Depth Anything V2 (ONNX, CPU) on every tools/src-<scene>.webp and writes
public/scenes/<scene>-depth.png: 8-bit, white = near the camera, black = far.
The model output (relative inverse depth) is normalised with robust
percentiles, lightly edge-preserving smoothed so building silhouettes stay
crisp, and stored at half resolution.
Requires: pip install onnxruntime opencv-python-headless numpy
Model: https://huggingface.co/onnx-community/depth-anything-v2-large
"""
import os
import sys

import json

import cv2
import numpy as np
import onnxruntime as ort

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "scenes")
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)
# inference size: multiples of 14 (ViT patch), ~16:9
IN_W, IN_H = 1218, 686


SCENES = json.load(open(os.path.join(ROOT, "src", "scenes.json")))["scenes"]


def run(sess, path, inpaint=()):
    bgr = cv2.imread(path, cv2.IMREAD_COLOR)
    h, w = bgr.shape[:2]
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    x = cv2.resize(rgb, (IN_W, IN_H), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None]
    name = sess.get_inputs()[0].name
    d = sess.run(None, {name: x})[0].squeeze().astype(np.float32)
    d = cv2.resize(d, (w, h), interpolation=cv2.INTER_CUBIC)
    lo, hi = np.percentile(d, 1), np.percentile(d, 99.5)
    d = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
    # objects painted out of the colour image must vanish from depth too
    for x0, y0, x1, y1 in inpaint:
        X0, X1, Y0, Y1 = int(x0 * w), int(x1 * w), int(y0 * h), int(y1 * h)
        left = d[Y0:Y1, max(0, X0 - 4):X0].mean(axis=1, keepdims=True)
        right = d[Y0:Y1, X1:X1 + 4].mean(axis=1, keepdims=True)
        t = np.linspace(0, 1, X1 - X0)[None, :]
        d[Y0:Y1, X0:X1] = np.minimum(d[Y0:Y1, X0:X1], left * (1 - t) + right * t)
    # guided smoothing: flatten texture noise, keep edges aligned with the render
    d8 = (d * 255).astype(np.uint8)
    d8 = cv2.bilateralFilter(d8, 9, 30, 9)
    small = cv2.resize(d8, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    return small


def main():
    model = sys.argv[1]
    so = ort.SessionOptions()
    so.intra_op_num_threads = os.cpu_count() or 4
    sess = ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])
    only = sys.argv[2:]
    for f in sorted(os.listdir(os.path.join(ROOT, "tools"))):
        if not (f.startswith("src-") and f.endswith(".webp")):
            continue
        sid = f[4:-5]
        if only and sid not in only:
            continue
        depth = run(sess, os.path.join(ROOT, "tools", f), SCENES.get(sid, {}).get("inpaint", []))
        cv2.imwrite(os.path.join(OUT, f"{sid}-depth.png"), depth)
        print("depth", sid, depth.shape)


if __name__ == "__main__":
    main()
