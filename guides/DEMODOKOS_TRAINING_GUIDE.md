# Training & Voice Cloning Guide: `cmp-nct/demodokos-foundry-music-v4`

This guide explains how to use the **`cmp-nct/demodokos-foundry-music-v4`** 8B audio model from the **Demodokos Foundry** suite to train / clone a custom transit voice assistant for the **Dhanalakshmi College of Engineering (DCE)** Bus Tracker application.

---

## 1. What is `cmp-nct/demodokos-foundry-music-v4`?

* **Developer**: `cmp-nct` on Hugging Face.
* **Architecture**: 8-Billion parameter (8B) Text-to-Audio and Speech Foundation model.
* **Capability**: High-fidelity speech synthesis, music generation, zero-shot and few-shot voice cloning, and audio mastering.
* **Platform**: Runs locally on Windows with NVIDIA GPUs (using PyTorch/CUDA or the Demodokos Foundry Windows desktop app).

---

## 2. Hardware & Software Requirements

| Component | Minimum | Recommended |
| :--- | :--- | :--- |
| **OS** | Windows 10 / 11 64-bit | Windows 11 64-bit |
| **GPU** | NVIDIA GTX 1660 / RTX 3050 (6GB VRAM) | NVIDIA RTX 3060 / 4060 / 4070 (8GB - 16GB VRAM) |
| **RAM** | 16 GB | 32 GB |
| **Python** | Python 3.10+ | Python 3.10 or 3.11 with CUDA 12.1+ |
| **Disk Space**| ~20 GB free space (for 8B model weights) | Fast NVMe SSD |

---

## 3. Step 1: Collect & Prepare Your Voice Dataset

To train or clone the transit voice assistant, you need clear reference recordings of the person whose voice you want for the bus announcements:

### Recommended Audio Specifications:
* **Duration**: 30 seconds to 3 minutes of continuous speech.
* **Format**: 44.1 kHz or 48 kHz, 16-bit WAV (Mono or Stereo).
* **Environment**: Quiet room with no echo, background chatter, or fan noise.
* **Tone**: Clear, steady pacing, authoritative yet friendly.

### Sample Transit Script to Record:
Record yourself or the announcer reading these transit sentences:
1. *"Vanakkam! Welcome to Dhanalakshmi College of Engineering Campus Transit."*
2. *"Express Route 7 from Tambaram is approaching Camp Road stop in approximately 3 minutes."*
3. *"Bus speed is currently 42 kilometers per hour. Moving smoothly along GST Road."*
4. *"Bus 07 has arrived at the college campus gate. Please alight safely."*
5. *"Emergency SOS protocol initiated. Security team has received vehicle coordinates."*

Save your file as: `scripts/voice_samples/dce_announcer.wav`.

---

## 4. Step 2: Training / Voice Cloning via Demodokos Foundry

Demodokos Foundry offers two paths for training/cloning:

### Method A: Zero-Code GUI (Demodokos Foundry Windows App)
1. Download and run the **Demodokos Foundry** installer from `cmp-nct` on Hugging Face (e.g. `demodokos-setup-signed.exe`).
2. Open **Demodokos Foundry** and navigate to the **Voice Studio / Voice Cloning** tab.
3. Under **Base Model**, select `cmp-nct/demodokos-foundry-music-v4`.
4. Click **Import Reference Audio** and select your `dce_announcer.wav`.
5. Enter Profile Name: `DCE Transit Assistant`.
6. Click **Analyze & Clone Voice**. The software analyzes formant frequencies, pitch contour, and vocal timbre on your NVIDIA GPU.
7. Click **Test Voice** with sample text: *"Bus 07 is arriving at Tambaram."*
8. Export the cloned profile or note the local session endpoint.

### Method B: Fine-Tuning via Python / Hugging Face Transformers
If you prefer running a PyTorch training loop with LoRA (Low-Rank Adaptation) on the 8B model:

```bash
# 1. Install ML dependencies
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install transformers datasets accelerate peft soundfile
```

Prepare a `train_data.jsonl` file:
```json
{"text": "Bus 07 is approaching Camp Road.", "audio": "voice_samples/sample1.wav"}
{"text": "Current speed is 45 km per hour.", "audio": "voice_samples/sample2.wav"}
```

Run fine-tuning using Hugging Face PEFT LoRA on `cmp-nct/demodokos-foundry-music-v4` to adapt the text-to-audio weights to your custom vocal identity.

---

## 5. Step 3: Run the Local Voice API Server

We have built a dedicated FastAPI bridge server located in this repository:

```bash
# In your terminal:
cd D:\github
pip install fastapi uvicorn soundfile pydantic
python scripts/demodokos_server.py
```

The server will initialize and listen on:
```
http://localhost:8000
```
API Endpoint:
* `POST http://localhost:8000/api/tts`
* Payload: `{"text": "Bus arriving", "speed": 1.0, "voice_model": "cmp-nct/demodokos-foundry-music-v4"}`
* Response: Direct binary `audio/wav` stream.

---

## 6. Step 4: Activating in the Bus Tracker Web & Mobile App

1. Start your Vite development server:
   ```bash
   npm run dev -- --host
   ```
2. Open `http://localhost:5173/` in your browser.
3. Go to the **Profile** screen.
4. Under **Voice Announcements**, select **Demodokos (v4)** (*Trained Audio AI*).
5. Click **"Test Voice"** to hear Demodokos synthesize audio directly from your local server.
6. Open the **AI Transit Copilot** modal or enable real-time tracking — milestone alerts and answers will now speak using your trained voice!

> **Fallback Guarantee**: If your Python server or GPU is offline, the app automatically fails over to Gemini 2.0 Multimodal Audio or high-fidelity Web Speech API so audio never drops.
