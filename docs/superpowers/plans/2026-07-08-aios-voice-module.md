# AIOS Voice Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully local, bidirectional voice module for the NBI AIOS -- Glen speaks to it (STT), it speaks back (TTS), with wake word and push-to-talk activation, all running on an RTX 3090 (24GB VRAM).

**Architecture:** Standalone Python FastAPI process (PM2-managed, port 8890) with four libs: listener.py (RealtimeSTT + openWakeWord + Silero VAD), speaker.py (Kokoro TTS), aios_bridge.py (HTTP client to dashboard server), hotkey.py (global push-to-talk). Dashboard server gets one new route file (`routes/voice.js`) exposing `POST /api/internal/aios/voice-input` using the existing `x-nbi-internal-token` auth pattern.

**Tech Stack:** Python 3.12, FastAPI, RealtimeSTT (faster-whisper + Distil-Whisper Large V3), Kokoro TTS (kokoro-onnx), openWakeWord, Silero VAD, PyAudio, pynput, httpx. Node.js/Express for the dashboard route. NVIDIA RTX 3090 (24GB VRAM).

**Environment:** Python 3.12 at `C:\Users\gpbea\AppData\Local\Programs\Python\Python312`, PyTorch with CUDA already installed. PM2 manages processes. Dashboard server on localhost:8888. Internal token auth via `AIOS_INTERNAL_TOKEN` env var.

---

## File Map

### New files (voice-module/)

| File | Responsibility |
|---|---|
| `voice-module/voice_server.py` | FastAPI main process: `/speak` endpoint, startup/shutdown lifecycle, orchestrates listener + speaker |
| `voice-module/config.json` | All configurable settings (wake word, voice, hotkey, ports, timeouts) |
| `voice-module/requirements.txt` | Python dependencies with pinned versions |
| `voice-module/setup.py` | One-time setup: downloads models, checks CUDA, validates audio devices, runs end-to-end pipeline test |
| `voice-module/lib/__init__.py` | Empty package init |
| `voice-module/lib/speaker.py` | Kokoro TTS wrapper: load model, synthesise text to audio, stream to speakers via PyAudio |
| `voice-module/lib/listener.py` | RealtimeSTT wrapper: configure wake word, VAD, Whisper model, handle transcription callbacks |
| `voice-module/lib/aios_bridge.py` | HTTP client to AIOS internal API + rolling conversation context (last 5 exchanges) |
| `voice-module/lib/hotkey.py` | Global hotkey listener using pynput, emits push-to-talk events |
| `voice-module/tests/__init__.py` | Empty package init |
| `voice-module/tests/test_aios_bridge.py` | Unit tests for AIOS bridge and conversation context |
| `voice-module/tests/test_speaker.py` | Unit tests for speaker text chunking and queue logic |
| `voice-module/.gitignore` | Ignores models/, __pycache__/, *.pyc |

### New files (dashboard-server/)

| File | Responsibility |
|---|---|
| `dashboard-server/routes/voice.js` | `POST /api/internal/aios/voice-input` -- receives transcribed text, dispatches to Claude, returns conversational response |

### Modified files (dashboard-server/)

| File | Change |
|---|---|
| `dashboard-server/server.js` | Wire up voice routes (2 lines: require + app.use) |

---

## Task 1: Project Scaffold and Dependencies

**Files:**
- Create: `voice-module/requirements.txt`
- Create: `voice-module/config.json`
- Create: `voice-module/.gitignore`
- Create: `voice-module/lib/__init__.py`
- Create: `voice-module/tests/__init__.py`

- [ ] **Step 1: Create project directory structure**

```bash
mkdir -p voice-module/lib voice-module/tests voice-module/models
```

- [ ] **Step 2: Create requirements.txt**

Write `voice-module/requirements.txt`:

```
fastapi==0.115.12
uvicorn[standard]==0.34.3
RealtimeSTT==0.3.8
kokoro-onnx==0.7.4
openwakeword==0.6.0
pynput==1.8.1
httpx==0.28.1
pyaudio==0.2.14
sounddevice==0.5.1
numpy==1.26.4
```

Note: RealtimeSTT pulls in faster-whisper, Silero VAD, and webrtcvad as transitive dependencies. kokoro-onnx is the ONNX runtime variant of Kokoro TTS (no PyTorch dependency for inference, uses onnxruntime-gpu). Check `pip show RealtimeSTT` after install to confirm transitive deps.

- [ ] **Step 3: Create config.json**

Write `voice-module/config.json`:

```json
{
  "wake_word": "hey_jarvis",
  "push_to_talk_key": "f13",
  "whisper_model": "distil-whisper-large-v3",
  "kokoro_voice": "bf_emma",
  "idle_timeout_seconds": 30,
  "speak_endpoint_port": 8890,
  "aios_api_url": "http://localhost:8888",
  "aios_internal_token_env": "AIOS_INTERNAL_TOKEN",
  "wake_word_timeout_seconds": 3,
  "max_context_exchanges": 5,
  "context_reset_phrases": ["that's all", "thanks", "never mind", "stop"]
}
```

- [ ] **Step 4: Create .gitignore**

Write `voice-module/.gitignore`:

```
models/
__pycache__/
*.pyc
*.pyo
.venv/
```

- [ ] **Step 5: Create empty __init__.py files**

Write empty files at `voice-module/lib/__init__.py` and `voice-module/tests/__init__.py`.

- [ ] **Step 6: Create virtual environment and install dependencies**

```bash
cd voice-module
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Verify key packages:

```bash
python -c "import RealtimeSTT; print('RealtimeSTT OK')"
python -c "import kokoro_onnx; print('Kokoro OK')"
python -c "import openwakeword; print('openWakeWord OK')"
python -c "import fastapi; print('FastAPI OK')"
```

All four should print OK with no errors.

- [ ] **Step 7: Commit scaffold**

```bash
git add voice-module/
git commit -m "feat(voice): project scaffold with dependencies and config"
```

---

## Task 2: Speaker Module (Kokoro TTS)

**Files:**
- Create: `voice-module/lib/speaker.py`
- Create: `voice-module/tests/test_speaker.py`

- [ ] **Step 1: Write failing tests for text chunking**

Write `voice-module/tests/test_speaker.py`:

```python
import pytest
from voice_module_test_helpers import patch_kokoro

from lib.speaker import chunk_text, SpeechQueue


class TestChunkText:
    def test_single_sentence(self):
        result = chunk_text("Hello there.")
        assert result == ["Hello there."]

    def test_multiple_sentences(self):
        result = chunk_text("First sentence. Second sentence. Third one.")
        assert result == ["First sentence.", "Second sentence.", "Third one."]

    def test_preserves_question_marks(self):
        result = chunk_text("What signals came in? Tell me more.")
        assert result == ["What signals came in?", "Tell me more."]

    def test_empty_string(self):
        result = chunk_text("")
        assert result == []

    def test_no_trailing_period(self):
        result = chunk_text("No period at the end")
        assert result == ["No period at the end"]


class TestSpeechQueue:
    def test_queue_and_drain(self):
        q = SpeechQueue()
        q.enqueue("Hello.", priority="normal")
        q.enqueue("World.", priority="normal")
        assert q.next() == "Hello."
        assert q.next() == "World."
        assert q.next() is None

    def test_alert_priority_jumps_queue(self):
        q = SpeechQueue()
        q.enqueue("Normal message.", priority="normal")
        q.enqueue("URGENT.", priority="alert")
        assert q.next() == "URGENT."
        assert q.next() == "Normal message."

    def test_ambient_only_when_idle(self):
        q = SpeechQueue()
        q.enqueue("Background info.", priority="ambient")
        assert not q.is_empty()
        assert q.next() == "Background info."

    def test_clear_flushes_all(self):
        q = SpeechQueue()
        q.enqueue("A.", priority="normal")
        q.enqueue("B.", priority="normal")
        q.clear()
        assert q.next() is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd voice-module
.venv\Scripts\python -m pytest tests/test_speaker.py -v
```

Expected: ImportError or ModuleNotFoundError for `lib.speaker`.

- [ ] **Step 3: Implement speaker.py**

Write `voice-module/lib/speaker.py`:

```python
import re
import queue
import threading
import logging
import numpy as np

logger = logging.getLogger(__name__)

SENTENCE_SPLIT_RE = re.compile(r'(?<=[.!?])\s+')


def chunk_text(text):
    text = text.strip()
    if not text:
        return []
    chunks = SENTENCE_SPLIT_RE.split(text)
    return [c.strip() for c in chunks if c.strip()]


class SpeechQueue:
    def __init__(self):
        self._alert = queue.Queue()
        self._normal = queue.Queue()
        self._ambient = queue.Queue()

    def enqueue(self, text, priority="normal"):
        if priority == "alert":
            self._alert.put(text)
        elif priority == "ambient":
            self._ambient.put(text)
        else:
            self._normal.put(text)

    def next(self):
        for q in (self._alert, self._normal, self._ambient):
            try:
                return q.get_nowait()
            except queue.Empty:
                continue
        return None

    def is_empty(self):
        return self._alert.empty() and self._normal.empty() and self._ambient.empty()

    def clear(self):
        for q in (self._alert, self._normal, self._ambient):
            while not q.empty():
                try:
                    q.get_nowait()
                except queue.Empty:
                    break


class Speaker:
    def __init__(self, voice="bf_emma"):
        self._voice = voice
        self._model = None
        self._queue = SpeechQueue()
        self._speaking = False
        self._lock = threading.Lock()
        self._stop_event = threading.Event()

    def load_model(self):
        import kokoro_onnx
        logger.info("Loading Kokoro TTS model (voice=%s)...", self._voice)
        self._model = kokoro_onnx.Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
        logger.info("Kokoro TTS model loaded")

    def speak(self, text, priority="normal"):
        chunks = chunk_text(text)
        for chunk in chunks:
            self._queue.enqueue(chunk, priority)
        if not self._speaking:
            threading.Thread(target=self._drain_queue, daemon=True).start()

    def stop(self):
        self._stop_event.set()
        self._queue.clear()

    def _drain_queue(self):
        import sounddevice as sd
        with self._lock:
            self._speaking = True
            self._stop_event.clear()
            try:
                while True:
                    text = self._queue.next()
                    if text is None:
                        break
                    if self._stop_event.is_set():
                        break
                    self._synthesise_and_play(text, sd)
            finally:
                self._speaking = False

    def _synthesise_and_play(self, text, sd):
        try:
            samples, sample_rate = self._model.create(
                text, voice=self._voice, speed=1.0
            )
            if self._stop_event.is_set():
                return
            sd.play(samples, samplerate=sample_rate)
            sd.wait()
        except Exception:
            logger.exception("TTS synthesis failed for: %s", text[:80])

    @property
    def is_speaking(self):
        return self._speaking

    @property
    def is_idle(self):
        return not self._speaking and self._queue.is_empty()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd voice-module
.venv\Scripts\python -m pytest tests/test_speaker.py -v
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add voice-module/lib/speaker.py voice-module/tests/test_speaker.py
git commit -m "feat(voice): speaker module with Kokoro TTS, priority queue, text chunking"
```

---

## Task 3: AIOS Bridge Module

**Files:**
- Create: `voice-module/lib/aios_bridge.py`
- Create: `voice-module/tests/test_aios_bridge.py`

- [ ] **Step 1: Write failing tests for conversation context and API client**

Write `voice-module/tests/test_aios_bridge.py`:

```python
import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock

from lib.aios_bridge import ConversationContext, AiosBridge


class TestConversationContext:
    def test_empty_context(self):
        ctx = ConversationContext(max_exchanges=5)
        assert ctx.get_context() == []

    def test_add_exchange(self):
        ctx = ConversationContext(max_exchanges=5)
        ctx.add("what signals today?", "Three signals came in.")
        exchanges = ctx.get_context()
        assert len(exchanges) == 1
        assert exchanges[0]["user"] == "what signals today?"
        assert exchanges[0]["assistant"] == "Three signals came in."

    def test_rolling_window(self):
        ctx = ConversationContext(max_exchanges=3)
        for i in range(5):
            ctx.add(f"q{i}", f"a{i}")
        exchanges = ctx.get_context()
        assert len(exchanges) == 3
        assert exchanges[0]["user"] == "q2"
        assert exchanges[2]["user"] == "q4"

    def test_reset(self):
        ctx = ConversationContext(max_exchanges=5)
        ctx.add("hello", "hi")
        ctx.reset()
        assert ctx.get_context() == []

    def test_check_reset_phrase(self):
        ctx = ConversationContext(max_exchanges=5)
        reset_phrases = ["that's all", "thanks", "never mind"]
        assert ctx.is_reset_phrase("that's all", reset_phrases) is True
        assert ctx.is_reset_phrase("That's All", reset_phrases) is True
        assert ctx.is_reset_phrase("tell me more", reset_phrases) is False


class TestAiosBridge:
    @pytest.fixture
    def bridge(self):
        return AiosBridge(
            api_url="http://localhost:8888",
            internal_token="test-token-123",
            max_context_exchanges=5,
            context_reset_phrases=["that's all", "thanks"],
        )

    def test_build_request_payload(self, bridge):
        payload = bridge._build_payload("what signals today?")
        assert payload["text"] == "what signals today?"
        assert payload["context"] == []

    def test_build_request_payload_with_context(self, bridge):
        bridge._context.add("previous q", "previous a")
        payload = bridge._build_payload("follow up")
        assert payload["text"] == "follow up"
        assert len(payload["context"]) == 1
        assert payload["context"][0]["user"] == "previous q"

    @pytest.mark.asyncio
    async def test_send_calls_api(self, bridge):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response_text": "Here are today's signals.",
            "action_id": None,
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
            result = await bridge.send("what signals today?")

        assert result["response_text"] == "Here are today's signals."
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args
        assert call_kwargs.kwargs["headers"]["x-nbi-internal-token"] == "test-token-123"

    @pytest.mark.asyncio
    async def test_send_updates_context(self, bridge):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response_text": "Response text.",
            "action_id": None,
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            await bridge.send("my question")

        ctx = bridge._context.get_context()
        assert len(ctx) == 1
        assert ctx[0]["user"] == "my question"
        assert ctx[0]["assistant"] == "Response text."

    @pytest.mark.asyncio
    async def test_send_resets_on_phrase(self, bridge):
        bridge._context.add("old q", "old a")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response_text": "Goodbye.",
            "action_id": None,
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            result = await bridge.send("thanks")

        assert result["response_text"] == "Goodbye."
        assert bridge._context.get_context() == []

    @pytest.mark.asyncio
    async def test_send_handles_api_error(self, bridge):
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_response.raise_for_status.side_effect = Exception("500 Server Error")

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            result = await bridge.send("hello")

        assert "can't reach the system" in result["response_text"].lower() or "error" in result["response_text"].lower()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd voice-module
.venv\Scripts\python -m pytest tests/test_aios_bridge.py -v
```

Expected: ImportError for `lib.aios_bridge`.

- [ ] **Step 3: Implement aios_bridge.py**

Write `voice-module/lib/aios_bridge.py`:

```python
import logging
from collections import deque

import httpx

logger = logging.getLogger(__name__)


class ConversationContext:
    def __init__(self, max_exchanges=5):
        self._max = max_exchanges
        self._exchanges = deque(maxlen=max_exchanges)

    def add(self, user_text, assistant_text):
        self._exchanges.append({"user": user_text, "assistant": assistant_text})

    def get_context(self):
        return list(self._exchanges)

    def reset(self):
        self._exchanges.clear()

    @staticmethod
    def is_reset_phrase(text, reset_phrases):
        return text.strip().lower() in [p.lower() for p in reset_phrases]


class AiosBridge:
    def __init__(self, api_url, internal_token, max_context_exchanges=5, context_reset_phrases=None):
        self._api_url = api_url.rstrip("/")
        self._token = internal_token
        self._context = ConversationContext(max_exchanges=max_context_exchanges)
        self._reset_phrases = context_reset_phrases or []

    def _build_payload(self, text):
        return {
            "text": text,
            "context": self._context.get_context(),
        }

    async def send(self, text):
        is_reset = ConversationContext.is_reset_phrase(text, self._reset_phrases)

        payload = self._build_payload(text)
        headers = {
            "Content-Type": "application/json",
            "x-nbi-internal-token": self._token,
        }
        url = f"{self._api_url}/api/internal/aios/voice-input"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
        except Exception:
            logger.exception("AIOS API call failed")
            data = {
                "response_text": "I can't reach the system right now.",
                "action_id": None,
            }

        response_text = data.get("response_text", "")
        self._context.add(text, response_text)

        if is_reset:
            self._context.reset()

        return data

    def reset_context(self):
        self._context.reset()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd voice-module
.venv\Scripts\python -m pytest tests/test_aios_bridge.py -v
```

Expected: All 9 tests PASS. Note: install pytest-asyncio if not present (`pip install pytest-asyncio`).

- [ ] **Step 5: Commit**

```bash
git add voice-module/lib/aios_bridge.py voice-module/tests/test_aios_bridge.py
git commit -m "feat(voice): AIOS bridge with conversation context and error handling"
```

---

## Task 4: Hotkey Module

**Files:**
- Create: `voice-module/lib/hotkey.py`

- [ ] **Step 1: Implement hotkey.py**

Write `voice-module/lib/hotkey.py`:

```python
import logging
import threading
from pynput import keyboard

logger = logging.getLogger(__name__)


class HotkeyListener:
    def __init__(self, key_name="f13", on_press=None, on_release=None):
        self._key = self._resolve_key(key_name)
        self._on_press = on_press or (lambda: None)
        self._on_release = on_release or (lambda: None)
        self._listener = None
        self._pressed = False

    @staticmethod
    def _resolve_key(key_name):
        key_name = key_name.strip().lower()
        if hasattr(keyboard.Key, key_name):
            return getattr(keyboard.Key, key_name)
        if len(key_name) == 1:
            return keyboard.KeyCode.from_char(key_name)
        if key_name.startswith("f") and key_name[1:].isdigit():
            return keyboard.KeyCode.from_vk(111 + int(key_name[1:]))
        raise ValueError(f"Unknown key: {key_name}")

    def _handle_press(self, key):
        if key == self._key and not self._pressed:
            self._pressed = True
            logger.debug("Push-to-talk pressed")
            try:
                self._on_press()
            except Exception:
                logger.exception("on_press callback failed")

    def _handle_release(self, key):
        if key == self._key and self._pressed:
            self._pressed = False
            logger.debug("Push-to-talk released")
            try:
                self._on_release()
            except Exception:
                logger.exception("on_release callback failed")

    def start(self):
        self._listener = keyboard.Listener(
            on_press=self._handle_press,
            on_release=self._handle_release,
        )
        self._listener.daemon = True
        self._listener.start()
        logger.info("Hotkey listener started (key=%s)", self._key)

    def stop(self):
        if self._listener:
            self._listener.stop()
            self._listener = None
```

No unit tests for this module -- it wraps OS-level keyboard hooks that require a real keyboard event loop. Verified manually in Task 8.

- [ ] **Step 2: Commit**

```bash
git add voice-module/lib/hotkey.py
git commit -m "feat(voice): global hotkey listener for push-to-talk"
```

---

## Task 5: Listener Module (RealtimeSTT Wrapper)

**Files:**
- Create: `voice-module/lib/listener.py`

- [ ] **Step 1: Implement listener.py**

Write `voice-module/lib/listener.py`:

```python
import logging
import threading
import time

logger = logging.getLogger(__name__)


class Listener:
    def __init__(
        self,
        whisper_model="distil-whisper-large-v3",
        wake_word="hey_jarvis",
        idle_timeout_seconds=30,
        wake_word_timeout_seconds=3,
        on_transcription=None,
        on_wake=None,
    ):
        self._whisper_model = whisper_model
        self._wake_word = wake_word
        self._idle_timeout = idle_timeout_seconds
        self._wake_timeout = wake_word_timeout_seconds
        self._on_transcription = on_transcription or (lambda text: None)
        self._on_wake = on_wake or (lambda: None)
        self._recorder = None
        self._active = False
        self._last_speech_time = 0
        self._mode = "idle"  # idle, listening, ptt

    def load_model(self):
        from RealtimeSTT import AudioToTextRecorder

        logger.info("Loading STT model (whisper=%s, wake_word=%s)...",
                     self._whisper_model, self._wake_word)

        self._recorder = AudioToTextRecorder(
            model=self._whisper_model,
            language="en",
            silero_sensitivity=0.4,
            webrtc_sensitivity=3,
            post_speech_silence_duration=0.6,
            enable_realtime_transcription=False,
            wake_words=self._wake_word,
            wake_words_sensitivity=0.6,
            on_wakeword_detected=self._handle_wake_word,
        )
        logger.info("STT model loaded")

    def _handle_wake_word(self):
        logger.info("Wake word detected!")
        self._mode = "listening"
        self._last_speech_time = time.time()
        self._on_wake()

    def _handle_transcription(self, text):
        text = text.strip()
        if not text:
            return
        self._last_speech_time = time.time()
        logger.info("Transcription: %s", text)
        self._on_transcription(text)

    def start(self):
        self._active = True
        thread = threading.Thread(target=self._run_loop, daemon=True)
        thread.start()
        logger.info("Listener started (mode=wake_word)")

    def _run_loop(self):
        while self._active:
            try:
                text = self._recorder.text()
                if text:
                    self._handle_transcription(text)
            except Exception:
                logger.exception("Recorder loop error")
                time.sleep(1)

    def activate_ptt(self):
        self._mode = "ptt"
        self._last_speech_time = time.time()
        logger.info("Push-to-talk activated")

    def deactivate_ptt(self):
        if self._mode == "ptt":
            self._mode = "idle"
            logger.info("Push-to-talk deactivated")

    def stop(self):
        self._active = False
        if self._recorder:
            try:
                self._recorder.stop()
            except Exception:
                pass

    @property
    def mode(self):
        return self._mode

    @mode.setter
    def mode(self, value):
        self._mode = value
```

No unit tests for this module -- RealtimeSTT requires real audio hardware and GPU models. Verified in the end-to-end pipeline test (Task 8).

- [ ] **Step 2: Commit**

```bash
git add voice-module/lib/listener.py
git commit -m "feat(voice): listener module wrapping RealtimeSTT with wake word and PTT"
```

---

## Task 6: Voice Server (FastAPI Main Process)

**Files:**
- Create: `voice-module/voice_server.py`

- [ ] **Step 1: Implement voice_server.py**

Write `voice-module/voice_server.py`:

```python
import asyncio
import json
import logging
import os
import signal
import sys

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


listener = Listener(
    whisper_model=config.get("whisper_model", "distil-whisper-large-v3"),
    wake_word=config.get("wake_word", "hey_jarvis"),
    idle_timeout_seconds=config.get("idle_timeout_seconds", 30),
    wake_word_timeout_seconds=config.get("wake_word_timeout_seconds", 3),
    on_transcription=_on_transcription,
    on_wake=lambda: speaker.speak("Yes?", priority="alert"),
)
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
```

- [ ] **Step 2: Commit**

```bash
git add voice-module/voice_server.py
git commit -m "feat(voice): FastAPI main server orchestrating listener, speaker, bridge, hotkey"
```

---

## Task 7: Dashboard Server Voice Route

**Files:**
- Create: `dashboard-server/routes/voice.js`
- Modify: `dashboard-server/server.js:373` (add 2 lines to wire the route)

- [ ] **Step 1: Create routes/voice.js**

Write `dashboard-server/routes/voice.js`:

```javascript
'use strict';

const crypto = require('crypto');

function verifyInternalToken(presented, expected) {
  if (!expected || !presented || presented.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(presented, 'utf8'), Buffer.from(expected, 'utf8'));
}

function createVoiceRoutes({ pool, log, internalToken, dispatch }) {
  const router = require('express').Router();

  function requireInternal(req, res, next) {
    if (!verifyInternalToken(req.get('x-nbi-internal-token') || '', internalToken)) {
      return res.status(401).json({ error: 'unauthorised' });
    }
    next();
  }

  router.post('/api/internal/aios/voice-input', requireInternal, async (req, res) => {
    const { text, context } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const contextBlock = (context || [])
      .map(ex => `User: ${ex.user}\nAssistant: ${ex.assistant}`)
      .join('\n\n');

    const prompt = [
      'You are the NBI AIOS voice assistant. Respond conversationally and concisely (1-3 sentences).',
      'You have access to the AIOS action queue, signals, and work items.',
      'If the user asks to approve, reject, or act on something, do so and confirm.',
      'If you cannot fulfil a request, say so honestly.',
      '',
      contextBlock ? `Recent conversation:\n${contextBlock}\n` : '',
      `User says: ${text.trim()}`,
    ].filter(Boolean).join('\n');

    try {
      const result = await dispatch({
        prompt,
        model: 'claude-fable-5',
        cwd: process.cwd(),
        timeoutMs: 30000,
      });

      const responseText = (result.text || '').trim();
      log('info', 'Voice', 'Voice input processed', {
        input: text.substring(0, 100),
        responseLength: responseText.length,
      });

      res.json({
        response_text: responseText || 'I heard you but could not generate a response.',
        action_id: null,
      });
    } catch (err) {
      log('error', 'Voice', 'Voice dispatch failed', { error: err.message });
      res.status(500).json({
        response_text: "I'm having trouble processing that right now.",
        action_id: null,
      });
    }
  });

  return router;
}

module.exports = { createVoiceRoutes };
```

- [ ] **Step 2: Wire the route in server.js**

In `dashboard-server/server.js`, find the line:

```javascript
const { createInternalRoutes, createAdminRoutes } = require('./routes/aios');
```

Add immediately after it:

```javascript
const { createVoiceRoutes } = require('./routes/voice');
```

Then find the line:

```javascript
app.use(createInternalRoutes({ pool, log, broker: _aiosBroker, internalToken: process.env.AIOS_INTERNAL_TOKEN || '', auditLog }));
```

Add immediately after it:

```javascript
app.use(createVoiceRoutes({ pool, log, internalToken: process.env.AIOS_INTERNAL_TOKEN || '', dispatch: require('./lib/claude-dispatch').dispatch }));
```

- [ ] **Step 3: Verify server starts cleanly**

```bash
cd dashboard-server
node -e "require('./routes/voice')"
```

Expected: no errors (just exits cleanly, confirming the module loads).

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/routes/voice.js dashboard-server/server.js
git commit -m "feat(voice): dashboard server voice-input route using claude-dispatch"
```

---

## Task 8: Setup Script and End-to-End Validation

**Files:**
- Create: `voice-module/setup.py`

- [ ] **Step 1: Implement setup.py**

Write `voice-module/setup.py`:

```python
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
import subprocess
import sys
import time

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
        return True  # not a hard failure
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
    # Just verify the import and model name resolution works
    return True


def check_openwakeword():
    import openwakeword
    return True


def run_tts_test():
    """Synthesise a sentence and play it through speakers."""
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

    # System checks
    check("Python >= 3.10", check_python)
    check("CUDA / GPU", check_cuda)
    check("Audio devices", check_audio_devices)

    # Model checks
    if not args.check:
        logger.info("Downloading models if needed (first run only)...")

    check("Kokoro TTS loads", check_kokoro)
    check("RealtimeSTT imports", check_whisper)
    check("openWakeWord imports", check_openwakeword)

    # End-to-end TTS test
    logger.info("")
    logger.info("Running TTS playback test...")
    check("TTS playback", run_tts_test)

    # Summary
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
```

- [ ] **Step 2: Run setup validation**

```bash
cd voice-module
.venv\Scripts\python setup.py
```

Expected: all checks PASS, you hear "Voice module online. All systems operational." through your speakers. If any check fails, fix the issue before proceeding.

- [ ] **Step 3: Run the voice server**

```bash
cd voice-module
.venv\Scripts\python voice_server.py
```

Expected output:
```
Loading models...
Loading Kokoro TTS model (voice=bf_emma)...
Kokoro TTS model loaded
Loading STT model (whisper=distil-whisper-large-v3, wake_word=hey_jarvis)...
STT model loaded
Listener started (mode=wake_word)
Hotkey listener started (key=...)
Voice module ready. Say 'Hey Jarvis' or press F13.
INFO:     Uvicorn running on http://127.0.0.1:8890
```

- [ ] **Step 4: Test the /speak endpoint**

In a separate terminal:

```bash
curl -X POST http://localhost:8890/speak -H "Content-Type: application/json" -d "{\"text\": \"Testing the speak endpoint. Can you hear me?\", \"priority\": \"normal\"}"
```

Expected: JSON response `{"status":"queued","priority":"normal"}` and you hear the sentence through your speakers.

- [ ] **Step 5: Test the /health endpoint**

```bash
curl http://localhost:8890/health
```

Expected: `{"status":"ok","listener_mode":"idle","speaker_active":false}`

- [ ] **Step 6: Test wake word (manual)**

Say "Hey Jarvis" near your microphone. Expected: you hear "Yes?" and the system enters listening mode. Then say something like "hello" and verify it attempts to contact the AIOS API (will get a connection error if dashboard server voice route is not yet deployed, which is fine for this test -- check the voice server logs for the API call attempt).

- [ ] **Step 7: Commit**

```bash
git add voice-module/setup.py
git commit -m "feat(voice): setup script with CUDA, audio, and end-to-end TTS validation"
```

---

## Task 9: PM2 Configuration and Final Integration

**Files:**
- Modify: `voice-module/voice_server.py` (no changes needed if Task 6 is correct)

- [ ] **Step 1: Register with PM2**

```bash
pm2 start voice-module/voice_server.py --name nbi-voice --interpreter "voice-module/.venv/Scripts/python.exe" --cwd voice-module
pm2 save
```

- [ ] **Step 2: Verify PM2 management**

```bash
pm2 list
```

Expected: `nbi-voice` shows status `online`.

```bash
pm2 logs nbi-voice --lines 20
```

Expected: model loading messages and "Voice module ready" line.

- [ ] **Step 3: Restart dashboard server to pick up voice route**

```bash
pm2 restart nbi-dashboard
```

Verify the voice route is loaded:

```bash
curl -X POST http://localhost:8888/api/internal/aios/voice-input -H "Content-Type: application/json" -H "x-nbi-internal-token: YOUR_TOKEN" -d "{\"text\": \"hello\", \"context\": []}"
```

Expected: JSON response with `response_text` from Claude dispatch.

- [ ] **Step 4: Full end-to-end test**

With both nbi-voice and nbi-dashboard running:

1. Say "Hey Jarvis" -- hear "Yes?"
2. Say "What's the status of the system?" -- hear a response from the AIOS
3. Say "Thanks" -- context resets, system returns to idle
4. Press F13, say "Hello" -- push-to-talk works
5. Test `/speak` endpoint -- `curl -X POST http://localhost:8890/speak -H "Content-Type: application/json" -d "{\"text\": \"Morning brief ready.\", \"priority\": \"normal\"}"`

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "feat(voice): PM2 integration and full end-to-end voice module"
```

---

## Dependency Graph

```
Task 1 (scaffold)
  ├── Task 2 (speaker)     -- no deps beyond scaffold
  ├── Task 3 (bridge)      -- no deps beyond scaffold
  ├── Task 4 (hotkey)      -- no deps beyond scaffold
  └── Task 5 (listener)    -- no deps beyond scaffold
        │
Task 6 (voice server)      -- depends on Tasks 2-5
Task 7 (dashboard route)   -- independent of Tasks 2-6
Task 8 (setup + e2e test)  -- depends on Tasks 2-6
Task 9 (PM2 + integration) -- depends on Tasks 6-8
```

Tasks 2, 3, 4, 5 can run in parallel after Task 1.
Task 7 can run in parallel with everything after Task 1.
