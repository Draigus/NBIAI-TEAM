# AIOS Voice Module Design

**Date:** 2026-07-08
**Status:** Approved
**Owner:** Glen Pryer

## Purpose

A fully local, bidirectional voice module for the NBI AIOS. Glen speaks to the AIOS and it speaks back, JARVIS-style. No cloud services, no APIs, no MCP servers. Everything runs on Glen's PC using open-source models on an NVIDIA GPU (16-24GB VRAM).

## Architecture

The voice module is a standalone Python process managed by PM2, sitting alongside the dashboard server. It has three operating modes:

1. **Idle/Listening** -- openWakeWord runs continuously on CPU (negligible resources), listening for "hey jarvis". GPU models are loaded but idle.
2. **Active conversation** -- After wake word trigger or hotkey press, RealtimeSTT streams speech to faster-whisper on GPU, transcribes it, sends text to the AIOS internal API, receives the response, and Kokoro TTS speaks it back through speakers.
3. **AIOS-initiated** -- When the AIOS wants to speak (signal detected, approval needed, brief ready), it pushes text to the voice module's local endpoint, and Kokoro speaks it.

### Conversation loop

```
Mic -> openWakeWord (CPU) -> Silero VAD -> faster-whisper (GPU) -> text
  -> AIOS internal API (localhost:8888) -> response text
  -> Kokoro TTS (GPU) -> speakers
```

Direct mic/speaker I/O via PyAudio. No browser required.

### VRAM budget

| Component | VRAM |
|---|---|
| Kokoro TTS (82M params) | ~2-3GB |
| Distil-Whisper Large V3 (756M params) | ~1.6GB |
| openWakeWord | 0 (CPU only) |
| Silero VAD | 0 (CPU only) |
| **Total** | **~4-5GB** |

Leaves 11-19GB free on a 16-24GB GPU.

## Component Stack

All components are free and open-source. No API keys, no subscriptions, no cloud accounts.

### STT: RealtimeSTT + Distil-Whisper Large V3

- **RealtimeSTT** wraps the entire listening pipeline: Silero VAD detects speech, openWakeWord detects "hey jarvis", faster-whisper transcribes.
- **Distil-Whisper Large V3**: 6.3x faster than Whisper Large V3, within 1% WER on long-form audio, ~1.6GB VRAM. English-only.
- Streaming mode: partial transcripts arrive as Glen speaks, final transcript on speech end. AIOS call fires the moment speech finishes.
- Licence: MIT (RealtimeSTT), MIT (Distil-Whisper).
- Sources: github.com/KoljaB/RealtimeSTT, huggingface.co/distil-whisper/distil-large-v3

### TTS: Kokoro TTS

- 82M parameters, ~2-3GB VRAM, ~67ms warm time-to-first-audio on GPU.
- Generates ~30 seconds of audio per second of compute (RTF ~0.03).
- Streams audio output: speech starts almost immediately, does not wait for full synthesis.
- Multiple built-in voice presets including British English voices for JARVIS aesthetic.
- Sentence-level chunking: speaks each sentence as it arrives from the AIOS response.
- CPU fallback: ~10x real-time, perfectly usable if GPU VRAM is constrained.
- Licence: Apache-2.0.
- Source: github.com/hexgrad/kokoro, huggingface.co/hexgrad/Kokoro-82M

### Wake word: openWakeWord

- Ships with a pre-trained "hey jarvis" model (trained on ~200,000 synthetic clips).
- Runs on a single RPi3 core (15-20 models simultaneously). Zero GPU cost.
- ONNX runtime based, no network calls.
- Licence: Apache-2.0.
- Source: github.com/dscripka/openWakeWord

### VAD: Silero VAD

- Ecosystem standard. Used by RealtimeSTT, Pipecat, and RealtimeVoiceChat.
- 4x fewer errors than WebRTC VAD (87.7% TPR vs 50% TPR at 5% FPR).
- Runs on CPU.
- Licence: MIT.
- Source: github.com/snakers4/silero-vad

## AIOS Integration

### Voice input to AIOS

The voice module calls a new endpoint on the dashboard server:

- `POST /api/aios/voice-input` receives transcribed text as natural language. The endpoint uses Claude dispatch (`lib/claude-dispatch.js`) to interpret intent and generate a conversational response. If the intent maps to an AIOS action (approve a signal, create a task, query status), the dispatch handles it and includes the result in the response.
- Request: `{ "text": "what signals came in today?", "context": [...last 5 exchanges] }`
- Response: `{ "response_text": "Three signals came in...", "action_id": null | "uuid" }`
- The voice module sends `response_text` to Kokoro and speaks it.
- Auth: `x-nbi-internal-token` header, same as existing AIOS internal routes.

### AIOS-initiated speech

The voice module exposes `POST /speak` on localhost:8890. Existing AIOS systems call this endpoint:

- Cadence tasks (morning brief, midday nudge) push summary text to `/speak`.
- Signal engine pushes notifications when signals require attention.
- Executor pushes completion/failure notifications.

Priority levels:
- `alert`: interrupts current speech immediately.
- `normal`: queues after current speech.
- `ambient`: only speaks if the system is idle.

### Conversation context

- Rolling context window of last 5 exchanges for follow-up questions.
- Context resets after idle timeout (30 seconds of silence) or explicitly ("that's all", "thanks").

## Interaction Modes

### Wake word

openWakeWord listens continuously on CPU. On "hey jarvis":
1. System enters active listening mode.
2. Silero VAD + Whisper pipeline acts as second filter (if no speech within 3 seconds of wake word, return to idle).
3. Stays in active listening mode for configurable timeout (default 30 seconds of silence).

### Push-to-talk

Global hotkey (default: F13, configurable) bypasses wake word and immediately starts recording. Useful for longer conversations or noisy environments.

## Configuration

Single JSON file at `voice-module/config.json`:

```json
{
  "wake_word": "hey_jarvis",
  "push_to_talk_key": "F13",
  "whisper_model": "distil-whisper-large-v3",
  "kokoro_voice": "bf_emma",
  "idle_timeout_seconds": 30,
  "speak_endpoint_port": 8890,
  "aios_api_url": "http://localhost:8888",
  "aios_internal_token": "from_env",
  "priority_levels": ["alert", "normal", "ambient"]
}
```

Voice preset is swappable without code changes.

## File Structure

```
voice-module/
  voice_server.py        -- Main process: FastAPI app, orchestrates all components
  config.json            -- Configuration
  requirements.txt       -- Python dependencies
  models/                -- Downloaded model weights (gitignored)
    kokoro/
    whisper/
    openwakeword/
  lib/
    listener.py          -- RealtimeSTT wrapper: wake word, VAD, transcription
    speaker.py           -- Kokoro TTS wrapper: text-to-speech, audio output
    aios_bridge.py       -- HTTP client to AIOS internal API + conversation context
    hotkey.py            -- Global hotkey listener for push-to-talk
  setup.py               -- One-time setup: downloads models, checks CUDA, validates audio
```

Dashboard server additions:
- `dashboard-server/routes/voice.js` -- new route: `POST /api/aios/voice-input`
- One-line `fetch` calls in cadence tasks / signal engine for AIOS-initiated speech

## Error Handling

- **GPU VRAM exhausted**: Kokoro falls back to CPU (~10x real-time, still usable).
- **AIOS API unreachable**: speaks "I can't reach the system right now" rather than silent failure.
- **Wake word false trigger**: Silero VAD + Whisper acts as second filter. No speech within 3 seconds returns to idle.
- **Audio device unavailable**: logs error, retries on configurable interval, speaks error on recovery.

## Process Management

- PM2 managed: `pm2 start voice_server.py --name nbi-voice --interpreter python`
- Logs to PM2 alongside dashboard server.
- Auto-restarts on crash.
- Started/stopped independently of dashboard server.

## Testing

- `setup.py` validates full pipeline end-to-end: records 3 seconds, transcribes, generates speech, plays back.
- Unit tests for `aios_bridge.py` (mocked API calls) and conversation context management.
- Manual verification: "hey jarvis, what signals came in today?" confirms full loop.

## Not in Scope (v1)

These are genuine architectural boundaries, not deferred features. Each is a clean extension point.

- No browser UI for voice (direct mic/speaker via PyAudio).
- No voice cloning (Kokoro preset voices only). Orpheus 3B or F5-TTS can be swapped in later for cloned voices.
- No multi-language support (English only via Distil-Whisper).
- No always-on transcription/note-taking mode (conversation mode only).

## Future Extension Points

- **Voice cloning**: swap Kokoro for Orpheus 3B (8-12GB VRAM) or F5-TTS (4-8GB VRAM) in `speaker.py`. Same interface.
- **Emotion/tone**: Orpheus supports `<laugh>`, `<sigh>`, `<whisper>` tags. Could map AIOS priority levels to emotional tone.
- **Multi-language**: swap Distil-Whisper for full Whisper Large V3 (~10GB VRAM).
- **Browser UI**: add a WebSocket transport alongside PyAudio for browser-based interaction.
- **Proactive voice**: AIOS-initiated speech could use ambient mode for low-priority nudges ("just so you know, the Couch Heroes pipeline has been idle for 3 days").

## Research Sources

All claims adversarially verified (3-vote system, 2/3 required to survive):

- tts-bench: 55-model benchmark (github.com/5uck1ess/tts-bench)
- Inferless TTS comparison on NVIDIA L4 GPU
- openWakeWord primary repo and "hey jarvis" model docs
- RealtimeSTT primary repo and transcription-engines.md
- RealtimeVoiceChat reference implementation (github.com/KoljaB/RealtimeVoiceChat)
- Pipecat framework evaluation (github.com/pipecat-ai/pipecat)
- Distil-Whisper model card and arXiv paper (2311.00430)
- HuggingFace model cards for Kokoro-82M, Orpheus, F5-TTS, Dia, CSM-1B
