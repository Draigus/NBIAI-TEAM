import asyncio
import json
import logging
import os
import sys

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

from lib.speaker import Speaker
from lib.listener import Listener
from lib.aios_bridge import AiosBridge
from lib.hotkey import HotkeyListener

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("voice-server")

# Load config
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")
with open(CONFIG_PATH) as f:
    config = json.load(f)

app = FastAPI(title="NBI AIOS Voice Module")

# Captured at startup so background threads can schedule async work on the main loop
_event_loop = None

speaker = Speaker(voice=config.get("kokoro_voice", "bf_emma"))
# Mute hooks wired after listener is created (below)
bridge = AiosBridge(
    api_url=config.get("aios_api_url", "http://localhost:8888"),
    internal_token=os.environ.get(config.get("aios_internal_token_env", "AIOS_INTERNAL_TOKEN"), ""),
    max_context_exchanges=config.get("max_context_exchanges", 5),
    context_reset_phrases=config.get("context_reset_phrases", []),
)


def _on_transcription(text):
    """Called from listener's background thread -- schedules async work on the main event loop."""
    if _event_loop:
        asyncio.run_coroutine_threadsafe(_handle_voice_input(text), _event_loop)


def _on_wake():
    listener.mute()
    speaker.speak("Yes?", priority="alert")


listener = Listener(
    whisper_model=config.get("whisper_model", "distil-large-v3"),
    wake_word=config.get("wake_word", "hey_jarvis"),
    wake_word_sensitivity=config.get("wake_word_sensitivity", 0.85),
    idle_timeout_seconds=config.get("idle_timeout_seconds", 30),
    wake_word_timeout_seconds=config.get("wake_word_timeout_seconds", 3),
    on_transcription=_on_transcription,
    on_wake=_on_wake,
)
speaker.set_mute_hooks(on_start=listener.mute, on_end=listener.unmute)

hotkey = HotkeyListener(
    key_name=config.get("push_to_talk_key", "f13"),
    on_press=listener.activate_ptt,
    on_release=listener.deactivate_ptt,
)


async def _handle_voice_input(text):
    logger.info("Processing voice input: %s", text)
    result = await bridge.send(text)
    response_text = result.get("response_text", "")
    if response_text:
        speaker.speak(response_text)
    action_id = result.get("action_id")
    if action_id:
        logger.info("Action created: %s", action_id)


class SpeakRequest(BaseModel):
    text: str
    priority: str = "normal"


@app.post("/speak")
async def speak_endpoint(req: SpeakRequest):
    if req.priority not in ("alert", "normal", "ambient"):
        raise HTTPException(status_code=400, detail="priority must be alert, normal, or ambient")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    if req.priority == "ambient" and not speaker.is_idle:
        return {"status": "skipped", "reason": "not idle"}
    speaker.speak(req.text, priority=req.priority)
    return {"status": "queued", "priority": req.priority}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "listener_mode": listener.mode,
        "speaker_active": speaker.is_speaking,
    }


@app.on_event("startup")
async def startup():
    global _event_loop
    _event_loop = asyncio.get_running_loop()
    logger.info("Loading models...")
    speaker.load_model()
    listener.load_model()
    listener.start()
    hotkey.start()
    logger.info("Voice module ready. Say 'Hey Jarvis' or press %s.",
                config.get("push_to_talk_key", "F13"))


@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down voice module...")
    listener.stop()
    hotkey.stop()
    speaker.stop()


if __name__ == "__main__":
    port = config.get("speak_endpoint_port", 8890)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
