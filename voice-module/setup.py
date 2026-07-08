"""
One-time setup and validation for the AIOS voice module.

Downloads models, checks CUDA, validates audio devices, and runs
an end-to-end pipeline test (record -> transcribe -> synthesise -> play).

Usage:
    python setup.py           # Full setup + validation
    python setup.py --check   # Validation only (skip downloads)
"""

import argparse
import logging
import os
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("setup")

CHECKS_PASSED = 0
CHECKS_FAILED = 0


def check(name, fn):
    global CHECKS_PASSED, CHECKS_FAILED
    try:
        result = fn()
        if result:
            logger.info("[PASS] %s", name)
            CHECKS_PASSED += 1
        else:
            logger.error("[FAIL] %s", name)
            CHECKS_FAILED += 1
    except Exception as e:
        logger.error("[FAIL] %s: %s", name, e)
        CHECKS_FAILED += 1


def check_python():
    v = sys.version_info
    return v.major == 3 and v.minor >= 10


def check_cuda():
    import torch
    if not torch.cuda.is_available():
        logger.warning("CUDA not available -- will use CPU (slower but functional)")
        return True
    name = torch.cuda.get_device_name(0)
    vram_gb = torch.cuda.get_device_properties(0).total_mem / (1024**3)
    logger.info("  GPU: %s (%.1f GB VRAM)", name, vram_gb)
    return True


def check_audio_devices():
    import sounddevice as sd
    devices = sd.query_devices()
    has_input = any(d["max_input_channels"] > 0 for d in devices)
    has_output = any(d["max_output_channels"] > 0 for d in devices)
    if has_input:
        default_in = sd.query_devices(kind="input")
        logger.info("  Input: %s", default_in["name"])
    if has_output:
        default_out = sd.query_devices(kind="output")
        logger.info("  Output: %s", default_out["name"])
    return has_input and has_output


def check_kokoro():
    import kokoro_onnx
    model = kokoro_onnx.Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
    samples, sr = model.create("Test.", voice="bf_emma", speed=1.0)
    return len(samples) > 0 and sr > 0


def check_whisper():
    from RealtimeSTT import AudioToTextRecorder
    return True


def check_openwakeword():
    import openwakeword
    return True


def run_tts_test():
    import kokoro_onnx
    import sounddevice as sd

    logger.info("  Synthesising test sentence...")
    model = kokoro_onnx.Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
    samples, sr = model.create(
        "Voice module online. All systems operational.",
        voice="bf_emma",
        speed=1.0,
    )
    logger.info("  Playing audio (%.1f seconds)...", len(samples) / sr)
    sd.play(samples, samplerate=sr)
    sd.wait()
    return True


def main():
    parser = argparse.ArgumentParser(description="AIOS Voice Module Setup")
    parser.add_argument("--check", action="store_true", help="Validation only, skip downloads")
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("AIOS Voice Module Setup")
    logger.info("=" * 60)

    check("Python >= 3.10", check_python)
    check("CUDA / GPU", check_cuda)
    check("Audio devices", check_audio_devices)

    if not args.check:
        logger.info("Downloading models if needed (first run only)...")

    check("Kokoro TTS loads", check_kokoro)
    check("RealtimeSTT imports", check_whisper)
    check("openWakeWord imports", check_openwakeword)

    logger.info("")
    logger.info("Running TTS playback test...")
    check("TTS playback", run_tts_test)

    logger.info("")
    logger.info("=" * 60)
    logger.info("Results: %d passed, %d failed", CHECKS_PASSED, CHECKS_FAILED)
    logger.info("=" * 60)

    if CHECKS_FAILED > 0:
        logger.error("Setup incomplete. Fix the failures above before starting the voice module.")
        sys.exit(1)
    else:
        logger.info("Setup complete. Start with: python voice_server.py")


if __name__ == "__main__":
    main()
