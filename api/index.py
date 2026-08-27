"""Vercel entry point for the image colorization API."""

from __future__ import annotations

import os
import shutil
import threading
import traceback
import urllib.request
from io import BytesIO
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image, ImageOps


app = FastAPI(title="Image Colorizer API")

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "backend"
TMP_MODEL = Path("/tmp/colorization_deploy_v2.onnx")
LOCAL_MODEL = ASSETS / "colorization_deploy_v2.onnx"
MODEL_URL = os.environ.get(
    "MODEL_URL",
    "https://mirror.opencv.ai/colorization_deploy_v2.onnx",
)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_OUTPUT_EDGE = 1600

_session = None
_model_lock = threading.Lock()


def _model_path() -> Path:
    """Use the checked-out model locally and an on-demand /tmp copy on Vercel."""
    if LOCAL_MODEL.exists():
        return LOCAL_MODEL
    if TMP_MODEL.exists() and TMP_MODEL.stat().st_size > 100_000_000:
        return TMP_MODEL

    partial = TMP_MODEL.with_suffix(".download")
    partial.unlink(missing_ok=True)
    try:
        with urllib.request.urlopen(MODEL_URL, timeout=180) as source, partial.open("wb") as target:
            shutil.copyfileobj(source, target)
        if partial.stat().st_size < 100_000_000:
            raise RuntimeError("downloaded model is unexpectedly small")
        partial.replace(TMP_MODEL)
    except Exception:
        partial.unlink(missing_ok=True)
        raise
    return TMP_MODEL


def _network():
    global _session
    if _session is not None:
        return _session
    with _model_lock:
        if _session is None:
            _session = ort.InferenceSession(
                str(_model_path()), providers=["CPUExecutionProvider"]
            )
    return _session


def _rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    linear = np.where(rgb > 0.04045, ((rgb + 0.055) / 1.055) ** 2.4, rgb / 12.92)
    xyz = linear @ np.array(
        [[0.4124564, 0.3575761, 0.1804375],
         [0.2126729, 0.7151522, 0.0721750],
         [0.0193339, 0.1191920, 0.9503041]], dtype=np.float32
    ).T
    xyz /= np.array([0.95047, 1.0, 1.08883], dtype=np.float32)
    delta = 6 / 29
    f = np.where(xyz > delta ** 3, np.cbrt(xyz), xyz / (3 * delta ** 2) + 4 / 29)
    return np.stack((116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]),
                     200 * (f[..., 1] - f[..., 2])), axis=-1)


def _lab_to_rgb(lab: np.ndarray) -> np.ndarray:
    fy = (lab[..., 0] + 16) / 116
    fx = fy + lab[..., 1] / 500
    fz = fy - lab[..., 2] / 200
    delta = 6 / 29
    f = np.stack((fx, fy, fz), axis=-1)
    xyz = np.where(f > delta, f ** 3, 3 * delta ** 2 * (f - 4 / 29))
    xyz *= np.array([0.95047, 1.0, 1.08883], dtype=np.float32)
    linear = xyz @ np.array(
        [[3.2404542, -1.5371385, -0.4985314],
         [-0.9692660, 1.8760108, 0.0415560],
         [0.0556434, -0.2040259, 1.0572252]], dtype=np.float32
    ).T
    return np.where(linear > 0.0031308, 1.055 * np.maximum(linear, 0) ** (1 / 2.4) - 0.055,
                    12.92 * linear)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/upload")
async def colorize(file: UploadFile = File(...)):
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    print(f"[upload] received name={file.filename!r} bytes={len(content)}", flush=True)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image must be 10 MB or smaller")
    try:
        image = ImageOps.exif_transpose(Image.open(BytesIO(content))).convert("RGB")
        image.load()
    except Exception as exc:
        print(f"[upload] decode failed: {exc}", flush=True)
        raise HTTPException(400, "The uploaded file is not a supported image")

    original_size = image.size
    image.thumbnail((MAX_OUTPUT_EDGE, MAX_OUTPUT_EDGE), Image.Resampling.LANCZOS)
    print(f"[upload] decoded={original_size} processing={image.size}", flush=True)
    try:
        rgb = np.asarray(image, dtype=np.float32) / 255.0
        lab = _rgb_to_lab(rgb)
        lightness = np.asarray(
            Image.fromarray(lab[..., 0].astype(np.float32), mode="F").resize((224, 224), Image.Resampling.BICUBIC),
            dtype=np.float32,
        ) - 50.0
        session = _network()
        input_name = session.get_inputs()[0].name
        ab = session.run(None, {input_name: lightness[None, None]})[0][0].transpose(1, 2, 0)
        ab_channels = [
            np.asarray(Image.fromarray(ab[..., channel], mode="F").resize(image.size, Image.Resampling.BICUBIC))
            for channel in range(2)
        ]
        result_lab = np.stack((lab[..., 0], *ab_channels), axis=-1)
        result = Image.fromarray(np.clip(_lab_to_rgb(result_lab) * 255, 0, 255).astype(np.uint8))
        output = BytesIO()
        result.save(output, format="JPEG", quality=92, optimize=True)
        print(f"[upload] completed output_bytes={output.tell()}", flush=True)
    except Exception as exc:
        print(f"[upload] processing failed: {exc}\n{traceback.format_exc()}", flush=True)
        raise HTTPException(500, "The colorization service could not process this image")
    return Response(
        output.getvalue(),
        media_type="image/jpeg",
        headers={"Content-Disposition": 'inline; filename="colorized.jpg"'},
    )
