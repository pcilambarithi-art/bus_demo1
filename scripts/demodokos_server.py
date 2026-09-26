"""
DCE Campus Transit - Demodokos Foundry Voice Bridge Server
Model: cmp-nct/demodokos-foundry-music-v4 (8B Text-to-Audio / Voice Model)

This server bridges your locally trained / cloned voice model from Demodokos Foundry
to the React/Capacitor Bus Tracker web app via a high-speed local REST API.

Prerequisites:
  1. Python 3.10+ on Windows with an NVIDIA GPU (RTX 3060/4060 or better recommended).
  2. Install dependencies:
       pip install fastapi uvicorn torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
       pip install transformers accelerate soundfile pydantic huggingface_hub

How to Run:
  python scripts/demodokos_server.py
  Server will listen at: http://localhost:8000
"""

import io
import os
import sys
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DemodokosServer")

app = FastAPI(
    title="DCE Transit Demodokos Voice API",
    description="Local inference server for cmp-nct/demodokos-foundry-music-v4",
    version="1.0.0",
)

# Allow Cross-Origin Requests from Vite Dev Server & Capacitor App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_ID = "cmp-nct/demodokos-foundry-music-v4"
DEVICE = "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES") != "" else "cpu"

class TTSRequest(BaseModel):
    text: str
    speed: Optional[float] = 1.0
    voice_model: Optional[str] = MODEL_ID
    reference_audio_path: Optional[str] = None

class DemodokosEngine:
    def __init__(self):
        self.pipeline = None
        self.is_loaded = False
        self._try_load()

    def _try_load(self):
        try:
            import torch
            from transformers import pipeline

            device_str = "cuda:0" if torch.cuda.is_available() else "cpu"
            logger.info(f"Checking hardware: PyTorch CUDA available = {torch.cuda.is_available()} ({device_str})")
            logger.info(f"Target model repository: {MODEL_ID}")

            # Note: If running via Demodokos Foundry desktop app, the app can expose a local port.
            # Otherwise, Hugging Face Transformers loads the weights locally.
            self.pipeline = pipeline(
                "text-to-audio",
                model=MODEL_ID,
                device=device_str,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            )
            self.is_loaded = True
            logger.info("Successfully loaded Demodokos Foundry model.")
        except Exception as e:
            logger.warning(
                f"Could not load HuggingFace model directly ({e}). "
                "Running in fallback simulation mode for testing or awaiting local Foundry instance."
            )
            self.is_loaded = False

    def synthesize(self, text: str, speed: float = 1.0, reference_path: Optional[str] = None) -> bytes:
        import soundfile as sf

        if self.is_loaded and self.pipeline:
            # Generate audio using the Demodokos model
            outputs = self.pipeline(text, forward_params={"speed": speed})
            audio_data = outputs["audio"]
            sample_rate = outputs["sampling_rate"]

            buffer = io.BytesIO()
            sf.write(buffer, audio_data, sample_rate, format="WAV")
            buffer.seek(0)
            return buffer.read()
        else:
            # Fallback high-clarity synthesized beep/tone sequence if weights are still downloading
            logger.info(f"[Fallback Synthesizer] Generating placeholder audio for: '{text}' (speed {speed}x)")
            sample_rate = 24000
            duration = max(1.0, len(text) * 0.05 / speed)
            t = np.linspace(0, duration, int(sample_rate * duration), False)
            # Gentle two-tone chord signaling active connection
            tone1 = 0.2 * np.sin(2 * np.pi * 440 * t)
            tone2 = 0.2 * np.sin(2 * np.pi * 554.37 * t)
            audio_wave = (tone1 + tone2).astype(np.float32)

            buffer = io.BytesIO()
            sf.write(buffer, audio_wave, sample_rate, format="WAV")
            buffer.seek(0)
            return buffer.read()

engine = DemodokosEngine()

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Demodokos Foundry Transit Voice Bridge",
        "model": MODEL_ID,
        "is_loaded": engine.is_loaded,
        "endpoints": {
            "tts": "/api/tts (POST)",
            "health": "/health (GET)",
        },
    }

@app.get("/health")
def health():
    return {"status": "ok", "loaded": engine.is_loaded}

@app.post("/api/tts")
async def generate_speech(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text string provided.")

    logger.info(f"Generating speech for: '{req.text[:60]}...' (Speed: {req.speed}x)")
    audio_bytes = engine.synthesize(req.text, req.speed or 1.0, req.reference_audio_path)

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": "inline; filename=speech.wav",
            "Cache-Control": "no-cache",
        },
    )

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting DCE Demodokos Voice API on http://localhost:8000 ...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
