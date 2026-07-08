# Voice Dialogue Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the voice module hold real dialogue: one-shot wake capture (chime, no "Yes?"), a 10s post-reply follow-up window with close tick, and a read-only WorkSage snapshot injected into every voice turn.

**Architecture:** Voice module (Python/FastAPI, `voice-module/`) changes how RealtimeSTT is driven: native wake-audio stripping, longer silence tolerance, and a follow-up window built on the library's activation-delay mechanism (verified in `.venv/.../RealtimeSTT/core/recording.py:209-212` and `core/lifecycle.py:168`). Dashboard (`dashboard-server/`) gains `lib/voice-context.js`, a Postgres snapshot builder injected into each persistent-worker turn by `routes/voice.js`. No tools are granted to the worker; data arrives in the prompt only.

**Tech Stack:** Python 3.12 (pytest, RealtimeSTT, kokoro-onnx, sounddevice, numpy), Node/Express (vitest, supertest, pg), PM2.

**Spec:** `docs/superpowers/specs/2026-07-08-voice-dialogue-redesign-design.md`

**Schema facts (verified live 2026-07-08, do not re-derive):**
- Work items live in `tasks`: `title, item_type ('project'|'initiative'|'feature'|'story'|'task'), status ('Not started'|'Planning'|'In progress'|'In Review'|'Blocked'|'Done'|'Cancelled'), priority (MESSY case: 'Urgent'/'High'/'high'/'Medium'/'medium'/'Low'/'low'/''), due_date TEXT, client_id -> clients(id, name), assignees text[] of display names, updated_at`.
- `calendar_events`: `title, event_type, start_date DATE, end_date DATE`.
- `bug_reports`: `title, status ('open'|'in_progress'|'please_review'|'resolved'), created_at`.
- `leads`: `title, next_followup_date DATE, next_action, completed_at (NULL = active), stage_id -> lead_pipeline_stages(id, name, is_closed)`. lead_pipeline_stages has NO position column; it has sort_order.

**Environment rules (violating these wastes hours):**
- NEVER run two vitest invocations concurrently (shared test DB, globalSetup resets it).
- Harness evidence only records `npm test` runs launched with a literal `Set-Location <full path>; npm test` (PowerShell) in the same command. If Gate 1 blocks a commit, run `node .claude/harness/lib/finish-task.js` from the main tree to see which surface lacks evidence.
- `sounddevice.play()` owns ONE global stream: playing a tone while TTS is active cuts the speech off. `play_tone` must skip when speaking.
- PM2 serves both `nbi-dashboard` and `nbi-voice` from the MAIN tree. That is why implementation happens in a worktree (>3 dashboard-server files, CLAUDE.md rule) and only merges back when green.

---

### Task 0: Worktree setup

**Files:** none (environment)

- [ ] **Step 0.1:** Invoke the `superpowers:using-git-worktrees` skill to create a worktree for branch `feature/voice-dialogue` off `master`. Call the worktree path `<WT>` in all later tasks; substitute the real absolute path.

- [ ] **Step 0.2:** Copy untracked env/config the tests need (PowerShell):

```powershell
Copy-Item d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\.env "<WT>\dashboard-server\.env"
if (Test-Path d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\.env.test) { Copy-Item d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\.env.test "<WT>\dashboard-server\.env.test" }
Copy-Item d:\OneDrive\Claude_code\NBIAI_TEAM\voice-module\.env "<WT>\voice-module\.env" -ErrorAction SilentlyContinue
```

- [ ] **Step 0.3:** Install dashboard deps in the worktree: `Set-Location <WT>\dashboard-server; npm ci`
Expected: completes without error; `node_modules` present.

- [ ] **Step 0.4:** Python tests run against the MAIN tree venv (worktree has no `.venv`). Verify the harness works before changing anything:

```powershell
Set-Location <WT>\voice-module
d:\OneDrive\Claude_code\NBIAI_TEAM\voice-module\.venv\Scripts\python.exe -m pytest tests -q
```
Expected: `29 passed`.

---

### Task 1: Speaker tones (chime + close tick)

**Files:**
- Modify: `<WT>/voice-module/lib/speaker.py`
- Test: `<WT>/voice-module/tests/test_speaker.py`

- [ ] **Step 1.1: Write the failing tests.** Append to `tests/test_speaker.py`:

```python
import sys
import types

import numpy as np

from lib.speaker import Speaker, generate_tone


class TestGenerateTone:
    def test_length_and_volume_cap(self):
        samples = generate_tone(740, 1180, 0.12, volume=0.3, sample_rate=24000)
        assert len(samples) == int(24000 * 0.12)
        assert samples.dtype == np.float32
        peak = float(np.max(np.abs(samples)))
        assert 0.0 < peak <= 0.3 + 1e-6

    def test_fades_to_silence_at_edges(self):
        samples = generate_tone(880, 520, 0.10, volume=0.5)
        assert abs(float(samples[0])) < 1e-3
        assert abs(float(samples[-1])) < 1e-3


class TestPlayTone:
    def _speaker_with_fake_sd(self, monkeypatch, chime_volume=0.3):
        played = []
        fake_sd = types.ModuleType("sounddevice")
        fake_sd.play = lambda samples, samplerate: played.append((len(samples), samplerate))
        fake_sd.wait = lambda: None
        monkeypatch.setitem(sys.modules, "sounddevice", fake_sd)
        speaker = Speaker(voice="bf_emma", chime_volume=chime_volume)
        speaker._tones = {"wake": np.zeros(100, dtype=np.float32),
                          "close": np.zeros(80, dtype=np.float32)}
        return speaker, played

    def test_play_tone_never_touches_mute_hooks(self, monkeypatch):
        speaker, played = self._speaker_with_fake_sd(monkeypatch)
        hooks = []
        speaker.set_mute_hooks(on_start=lambda: hooks.append("mute"),
                               on_end=lambda: hooks.append("unmute"))
        speaker.play_tone("wake")
        assert played == [(100, 24000)]
        assert hooks == []

    def test_play_tone_skipped_while_speaking(self, monkeypatch):
        # sounddevice's play() owns a single stream; a tone during TTS
        # would cut the speech off, so it must be skipped instead.
        speaker, played = self._speaker_with_fake_sd(monkeypatch)
        speaker._speaking = True
        speaker.play_tone("close")
        assert played == []

    def test_volume_zero_disables_tones(self, monkeypatch):
        speaker, played = self._speaker_with_fake_sd(monkeypatch, chime_volume=0)
        speaker.play_tone("wake")
        assert played == []

    def test_unknown_tone_is_a_noop(self, monkeypatch):
        speaker, played = self._speaker_with_fake_sd(monkeypatch)
        speaker.play_tone("bogus")
        assert played == []
```

- [ ] **Step 1.2: Run to verify failure.**
`Set-Location <WT>\voice-module; d:\OneDrive\Claude_code\NBIAI_TEAM\voice-module\.venv\Scripts\python.exe -m pytest tests/test_speaker.py -q`
Expected: FAIL, `ImportError: cannot import name 'generate_tone'`.

- [ ] **Step 1.3: Implement.** In `lib/speaker.py`, after the imports add:

```python
# UI cue tones: (start_hz, end_hz, seconds). Wake ack rises, close tick falls.
TONES = {
    "wake": (740, 1180, 0.12),
    "close": (880, 520, 0.10),
}
TONE_SAMPLE_RATE = 24000


def generate_tone(freq_start, freq_end, duration_s, volume=0.3, sample_rate=TONE_SAMPLE_RATE):
    n = int(sample_rate * duration_s)
    t = np.arange(n, dtype=np.float32)
    freqs = np.linspace(freq_start, freq_end, n, dtype=np.float32)
    phase = 2.0 * np.pi * np.cumsum(freqs) / sample_rate
    samples = np.sin(phase).astype(np.float32)
    fade = min(int(sample_rate * 0.01), n // 2)
    if fade:
        samples[:fade] *= np.linspace(0.0, 1.0, fade, dtype=np.float32)
        samples[-fade:] *= np.linspace(1.0, 0.0, fade, dtype=np.float32)
    return samples * float(volume)
```

(Note: `t` is unused after the cumsum form; do not include it. Final body: freqs, phase, samples, fade, return.)

Change the constructor signature and add `play_tone`:

```python
    def __init__(self, voice="bf_emma", chime_volume=0.3):
        self._voice = voice
        self._chime_volume = float(chime_volume)
        self._tones = {}
        # ... rest of existing __init__ unchanged ...
```

In `load_model()`, after the Kokoro load:

```python
        if self._chime_volume > 0:
            for name, (f0, f1, dur) in TONES.items():
                self._tones[name] = generate_tone(f0, f1, dur, self._chime_volume)
```

New method on `Speaker`:

```python
    def play_tone(self, name):
        """Fire-and-forget UI cue, outside the speech queue and mute hooks.

        sounddevice's play() owns a single global stream, so playing while
        TTS is active would cut the speech off; skip the tone instead.
        """
        if self._chime_volume <= 0 or name not in self._tones or self._speaking:
            return
        import sounddevice as sd
        try:
            sd.play(self._tones[name], samplerate=TONE_SAMPLE_RATE)
        except Exception:
            logger.exception("Tone playback failed: %s", name)
```

`import numpy as np` is already at the top of speaker.py.

- [ ] **Step 1.4: Run tests.** Same command as 1.2. Expected: all pass (existing speaker tests still green).

- [ ] **Step 1.5: Commit.**

```powershell
Set-Location <WT>
git add voice-module/lib/speaker.py voice-module/tests/test_speaker.py
git commit -m @'
feat(voice): chime tones -- generate_tone + Speaker.play_tone outside mute hooks

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 2: Listener one-shot capture (recorder tuning + wake-phrase strip)

**Files:**
- Modify: `<WT>/voice-module/lib/listener.py`
- Test: `<WT>/voice-module/tests/test_listener.py`

- [ ] **Step 2.1: Write the failing tests.** In `tests/test_listener.py`, extend `make_listener` to pass kwargs through, then add the new test classes:

```python
def make_listener(**kwargs):
    listener = Listener(
        whisper_model="base.en",
        wake_word="hey_jarvis",
        **kwargs,
    )
    listener._recorder = MagicMock()
    return listener
```

(`on_transcription`/`on_wake` continue to arrive via kwargs; existing call sites are unchanged.)

```python
class TestRecorderTuning:
    def test_load_model_passes_capture_tuning(self, monkeypatch):
        import sys, types
        captured = {}

        class FakeRecorder:
            def __init__(self, **kwargs):
                captured.update(kwargs)

        fake = types.ModuleType("RealtimeSTT")
        fake.AudioToTextRecorder = FakeRecorder
        monkeypatch.setitem(sys.modules, "RealtimeSTT", fake)

        listener = Listener(
            whisper_model="base.en",
            wake_word="hey_jarvis",
            post_speech_silence_seconds=1.2,
            wake_word_buffer_seconds=1.1,
        )
        listener.load_model()
        assert captured["post_speech_silence_duration"] == 1.2
        assert captured["wake_word_buffer_duration"] == 1.1
        assert captured["on_recording_start"] == listener._handle_recording_start
        assert captured["on_wakeword_timeout"] == listener._handle_listen_timeout


class TestWakePhraseStrip:
    """Native audio stripping (wake_word_buffer_duration) removes most of the
    wake phrase; this text backstop removes any remnant that leaks through,
    and covers wake phrases spoken inside a follow-up window (where wake
    detection is off and nothing is stripped from the audio)."""

    def _delivered(self, text):
        received = []
        listener = make_listener(on_transcription=received.append)
        listener._handle_transcription(text)
        return received

    def test_strips_leading_wake_phrase_with_comma(self):
        assert self._delivered("Hey Jarvis, what are my priorities?") == \
            ["what are my priorities?"]

    def test_strips_lowercase_no_punctuation(self):
        assert self._delivered("hey jarvis what time is it") == \
            ["what time is it"]

    def test_strips_with_period_and_extra_space(self):
        assert self._delivered("Hey, Jarvis. Give me a status update.") == \
            ["Give me a status update."]

    def test_wake_phrase_alone_is_dropped(self):
        assert self._delivered("Hey Jarvis.") == []

    def test_mid_sentence_wake_phrase_untouched(self):
        assert self._delivered("Tell hey jarvis I said hello") == \
            ["Tell hey jarvis I said hello"]

    def test_plain_text_untouched(self):
        assert self._delivered("what are my priorities?") == \
            ["what are my priorities?"]
```

- [ ] **Step 2.2: Run to verify failure.**
`Set-Location <WT>\voice-module; d:\OneDrive\Claude_code\NBIAI_TEAM\voice-module\.venv\Scripts\python.exe -m pytest tests/test_listener.py -q`
Expected: FAIL (`unexpected keyword argument 'post_speech_silence_seconds'`, strip assertions fail).

- [ ] **Step 2.3: Implement.** In `lib/listener.py`:

Add `import re` at the top. Change the constructor: REMOVE `idle_timeout_seconds` (dead knob, spec removes it) and add the new params:

```python
    def __init__(
        self,
        whisper_model="distil-whisper-large-v3",
        wake_word="hey_jarvis",
        wake_word_sensitivity=0.85,
        wake_word_debounce_seconds=5.0,
        # wall-clock window from wake detection in which speech must START
        # (RealtimeSTT core/recording.py:430); generous because one-shot
        # capture means Glen may pause after the chime
        wake_word_timeout_seconds=15,
        # a mid-sentence pause must not cut the question off
        post_speech_silence_seconds=1.2,
        # audio stripped from the front of each wake recording; ~length of
        # the spoken wake phrase (RealtimeSTT core/recording.py:200)
        wake_word_buffer_seconds=1.1,
        # post-reply window in which plain voice activity starts a turn,
        # no wake word needed; 0 disables
        followup_window_seconds=10,
        on_transcription=None,
        on_wake=None,
        on_window_close=None,
    ):
        self._whisper_model = whisper_model
        self._wake_word = wake_word
        self._wake_sensitivity = wake_word_sensitivity
        self._wake_debounce = wake_word_debounce_seconds
        self._last_wake_accepted = 0.0
        self._wake_timeout = wake_word_timeout_seconds
        self._post_speech_silence = post_speech_silence_seconds
        self._wake_buffer = wake_word_buffer_seconds
        self._followup_window = followup_window_seconds
        self._followup_open = False
        self._on_transcription = on_transcription or (lambda text: None)
        self._on_wake = on_wake or (lambda: None)
        self._on_window_close = on_window_close or (lambda: None)
        # backstop strip for wake-phrase text that survives audio stripping;
        # leading position only ("hey_jarvis" -> "hey jarvis", punctuation
        # and case tolerant)
        words = [re.escape(w) for w in wake_word.replace("_", " ").split()]
        self._wake_strip_re = re.compile(
            r"^\W*" + r"[\s,.!?]*".join(words) + r"[\s,.!?]*", re.IGNORECASE
        )
        self._recorder = None
        self._active = False
        self._last_speech_time = 0
        self._mode = "idle"  # idle, listening, ptt
        self._muted = False
```

In `load_model()`, replace the `AudioToTextRecorder(...)` call's tuning lines:

```python
        self._recorder = AudioToTextRecorder(
            model=self._whisper_model,
            language="en",
            silero_sensitivity=0.4,
            webrtc_sensitivity=3,
            post_speech_silence_duration=self._post_speech_silence,
            enable_realtime_transcription=False,
            wakeword_backend="oww",
            wake_words=self._wake_word,
            # For the oww backend RealtimeSTT compares the model score >= this
            # value (core/wakeword.py), so HIGHER means STRICTER -- the library
            # docstring's "1 = most sensitive" only describes Porcupine.
            wake_words_sensitivity=self._wake_sensitivity,
            wake_word_timeout=self._wake_timeout,
            wake_word_buffer_duration=self._wake_buffer,
            on_wakeword_detected=self._handle_wake_word,
            on_recording_start=self._handle_recording_start,
            on_wakeword_timeout=self._handle_listen_timeout,
        )
```

In `_handle_transcription`, strip before the empty check:

```python
    def _handle_transcription(self, text):
        if self._muted:
            return
        text = self._wake_strip_re.sub("", text.strip(), count=1).strip()
        if not text:
            return
        self._last_speech_time = time.time()
        logger.info("Transcription: %s", text)
        self._on_transcription(text)
```

Add placeholder handlers so Task 2 stands alone (Task 3 fills in the window logic):

```python
    def _handle_recording_start(self):
        pass

    def _handle_listen_timeout(self):
        pass
```

- [ ] **Step 2.4: Run tests.** Same command as 2.2. Expected: all listener tests pass. The mid-sentence test passes because the regex is anchored (`^`); the wake-alone test passes because the stripped result is empty and dropped.

- [ ] **Step 2.5:** `voice_server.py` still passes `idle_timeout_seconds`; it breaks until Task 4. Run ONLY the test suite (which does not import voice_server):
`d:\OneDrive\Claude_code\NBIAI_TEAM\voice-module\.venv\Scripts\python.exe -m pytest tests -q`
Expected: PASS. Do not restart nbi-voice yet.

- [ ] **Step 2.6: Commit.**

```powershell
Set-Location <WT>
git add voice-module/lib/listener.py voice-module/tests/test_listener.py
git commit -m @'
feat(voice): one-shot capture tuning -- native wake strip, 1.2s silence, text backstop

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: Follow-up window

**Files:**
- Modify: `<WT>/voice-module/lib/listener.py`
- Test: `<WT>/voice-module/tests/test_listener.py`

Mechanism (verified in the installed library, cite in code comments):
- `wait_audio` always arms `start_recording_on_voice_activity` (`core/lifecycle.py:168`).
- Recording starts on voice activity alone whenever `wake_word_activation_delay` has NOT yet passed since `listen_start` (`core/recording.py:209-212`).
- `recorder.wakeup()` sets `listen_start = now`.
- When the delay passes, `on_wakeword_timeout` fires exactly once IF `wake_word_activation_delay` is truthy (`core/recording.py:146-155`); it also fires when a wake word got no speech within `wake_word_timeout` (`core/recording.py:430-438`). Both mean "stopped listening": play the close tick.
- Our recorder is constructed with `wake_word_activation_delay` unset (0), so wake-word mode is the resting state and the callback never fires at rest.

- [ ] **Step 3.1: Write the failing tests.** Append to `tests/test_listener.py`:

```python
class TestFollowupWindow:
    """After a reply, plain voice activity may start the next turn for
    followup_window_seconds; expiry plays a close tick. Built on RealtimeSTT's
    activation-delay gate (core/recording.py:209-212)."""

    def test_open_arms_recorder(self):
        listener = make_listener(followup_window_seconds=10)
        listener.open_followup_window()
        assert listener._recorder.wake_word_activation_delay == 10
        listener._recorder.wakeup.assert_called_once()

    def test_zero_window_disables(self):
        listener = make_listener(followup_window_seconds=0)
        listener.open_followup_window()
        listener._recorder.wakeup.assert_not_called()

    def test_no_recorder_is_safe(self):
        listener = make_listener(followup_window_seconds=10)
        listener._recorder = None
        listener.open_followup_window()  # must not raise

    def test_recording_start_consumes_window_silently(self):
        ticks = []
        listener = make_listener(followup_window_seconds=10,
                                 on_window_close=lambda: ticks.append(1))
        listener.open_followup_window()
        listener._handle_recording_start()
        # window consumed: delay reset so its expiry cannot fire a late tick
        assert listener._recorder.wake_word_activation_delay == 0
        assert ticks == []

    def test_expiry_resets_delay_and_ticks(self):
        ticks = []
        listener = make_listener(followup_window_seconds=10,
                                 on_window_close=lambda: ticks.append(1))
        listener.open_followup_window()
        listener._handle_listen_timeout()
        assert listener._recorder.wake_word_activation_delay == 0
        assert ticks == [1]

    def test_wake_no_speech_timeout_also_ticks(self):
        # RealtimeSTT routes "wake word heard, no speech in 15s" through the
        # same callback; that is also a stopped-listening event.
        ticks = []
        listener = make_listener(on_window_close=lambda: ticks.append(1))
        listener._handle_listen_timeout()
        assert ticks == [1]

    def test_wake_word_supersedes_open_window(self, monkeypatch):
        import lib.listener as listener_mod
        monkeypatch.setattr(listener_mod.time, "time", lambda: 1000.0)
        listener = make_listener(followup_window_seconds=10)
        listener.open_followup_window()
        listener._handle_wake_word()
        assert listener._followup_open is False
```

- [ ] **Step 3.2: Run to verify failure.** `... -m pytest tests/test_listener.py -q`
Expected: FAIL (`open_followup_window` missing, placeholder handlers do nothing).

- [ ] **Step 3.3: Implement.** Replace the Task 2 placeholders in `lib/listener.py` and add the opener:

```python
    def open_followup_window(self):
        """Post-reply window: voice activity starts the next turn, no wake
        word needed. wait_audio has already armed voice-activity recording
        (core/lifecycle.py:168); the activation-delay gate is what blocks it
        (core/recording.py:209-212), so hold that gate open for the window."""
        if self._followup_window <= 0 or not self._recorder:
            return
        self._followup_open = True
        try:
            self._recorder.wake_word_activation_delay = self._followup_window
            self._recorder.wakeup()  # listen_start = now
        except Exception:
            self._followup_open = False
            logger.exception("Failed to open follow-up window")
            return
        logger.info("Follow-up window open (%.0fs)", self._followup_window)

    def _handle_recording_start(self):
        # A turn began inside the window: consume it silently. Resetting the
        # delay now stops RealtimeSTT firing on_wakeword_timeout (and a bogus
        # close tick) when the window would have expired mid-turn.
        if self._followup_open:
            self._followup_open = False
            if self._recorder:
                self._recorder.wake_word_activation_delay = 0
            logger.info("Follow-up window consumed by speech")

    def _handle_listen_timeout(self):
        # Fired when the follow-up window expires unused (recording.py:146-155)
        # or a wake word got no speech within wake_word_timeout (:430-438).
        # Either way we are no longer listening: tick so Glen knows.
        if self._followup_open:
            self._followup_open = False
            if self._recorder:
                self._recorder.wake_word_activation_delay = 0
            logger.info("Follow-up window expired")
        else:
            logger.info("Wake window expired without speech")
        self._on_window_close()
```

In `_handle_wake_word`, after the debounce acceptance line (`self._last_wake_accepted = now`), add:

```python
        self._followup_open = False  # a wake word supersedes any open window
```

- [ ] **Step 3.4: Run the full voice-module suite.**
`Set-Location <WT>\voice-module; d:\OneDrive\Claude_code\NBIAI_TEAM\voice-module\.venv\Scripts\python.exe -m pytest tests -q`
Expected: PASS (all files).

- [ ] **Step 3.5: Commit.**

```powershell
Set-Location <WT>
git add voice-module/lib/listener.py voice-module/tests/test_listener.py
git commit -m @'
feat(voice): follow-up window -- 10s post-reply voice-activity turns, close tick

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 4: voice_server wiring + config.json

**Files:**
- Modify: `<WT>/voice-module/voice_server.py`
- Modify: `<WT>/voice-module/config.json`

- [ ] **Step 4.1:** In `voice_server.py`, make these exact changes:

Speaker construction (add chime volume):

```python
speaker = Speaker(
    voice=config.get("kokoro_voice", "bf_emma"),
    chime_volume=config.get("chime_volume", 0.3),
)
```

Replace `_on_wake` (the "Yes?" and its mute pairing are deleted; capture must continue):

```python
def _on_wake():
    # One-shot capture: acknowledge with a tone, never with TTS. Muting or
    # speaking here stalls the in-progress recording and loses the question
    # (root cause of the 2026-07-08 "won't answer me" failures).
    speaker.play_tone("wake")
```

Listener construction (remove `idle_timeout_seconds`, add new knobs and the close tick):

```python
listener = Listener(
    whisper_model=config.get("whisper_model", "distil-large-v3"),
    wake_word=config.get("wake_word", "hey_jarvis"),
    wake_word_sensitivity=config.get("wake_word_sensitivity", 0.85),
    wake_word_debounce_seconds=config.get("wake_word_debounce_seconds", 5.0),
    wake_word_timeout_seconds=config.get("wake_word_timeout_seconds", 15),
    post_speech_silence_seconds=config.get("post_speech_silence_seconds", 1.2),
    wake_word_buffer_seconds=config.get("wake_word_buffer_duration_seconds", 1.1),
    followup_window_seconds=config.get("followup_window_seconds", 10),
    on_transcription=_on_transcription,
    on_wake=_on_wake,
    on_window_close=lambda: speaker.play_tone("close"),
)
```

Mute hooks: unmute must be followed by opening the window (this also opens a window after externally triggered `/speak` announcements, which is desired: Glen can respond to them):

```python
def _after_speech():
    listener.unmute()
    listener.open_followup_window()


speaker.set_mute_hooks(on_start=listener.mute, on_end=_after_speech)
```

- [ ] **Step 4.2:** Replace `config.json` content:

```json
{
  "wake_word": "hey_jarvis",
  "wake_word_sensitivity": 0.85,
  "wake_word_debounce_seconds": 5.0,
  "wake_word_timeout_seconds": 15,
  "wake_word_buffer_duration_seconds": 1.1,
  "post_speech_silence_seconds": 1.2,
  "followup_window_seconds": 10,
  "chime_volume": 0.3,
  "push_to_talk_key": "alt_l",
  "whisper_model": "base.en",
  "kokoro_voice": "bf_emma",
  "speak_endpoint_port": 8891,
  "aios_api_url": "http://localhost:8888",
  "aios_internal_token_env": "AIOS_INTERNAL_TOKEN",
  "max_context_exchanges": 5,
  "context_reset_phrases": ["that's all", "thanks", "never mind", "stop"]
}
```

(`idle_timeout_seconds` is gone deliberately: dead knob, superseded by `followup_window_seconds`.)

- [ ] **Step 4.3:** Sanity-import check (catches constructor signature mismatches without starting audio):
`Set-Location <WT>\voice-module; d:\OneDrive\Claude_code\NBIAI_TEAM\voice-module\.venv\Scripts\python.exe -c "import voice_server; print('imports ok')"`
Expected: `imports ok` (model loading only happens on FastAPI startup, not import).

- [ ] **Step 4.4:** Full voice-module suite again: `... -m pytest tests -q`. Expected: PASS.

- [ ] **Step 4.5: Commit.**

```powershell
Set-Location <WT>
git add voice-module/voice_server.py voice-module/config.json
git commit -m @'
feat(voice): wire chime, follow-up window, close tick; drop Yes? and dead idle knob

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 5: WorkSage snapshot builder (dashboard-server/lib/voice-context.js)

**Files:**
- Create: `<WT>/dashboard-server/lib/voice-context.js`
- Create: `<WT>/dashboard-server/tests/unit/voice-context.test.mjs`

- [ ] **Step 5.1: Write the failing tests.** Create `tests/unit/voice-context.test.mjs`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { buildVoiceContext } = require('../../lib/voice-context');

function fixturePool() {
  return {
    query: vi.fn().mockImplementation((sql) => {
      if (sql.includes('FROM tasks')) {
        return Promise.resolve({ rows: [
          { title: 'Fix voice module', item_type: 'task', status: 'In progress', priority: 'Urgent', due_date: '2026-07-10', client: null },
          { title: 'Wonderland analytics', item_type: 'project', status: 'Blocked', priority: 'High', due_date: null, client: 'Lighthouse Games' },
        ] });
      }
      if (sql.includes('FROM calendar_events')) {
        return Promise.resolve({ rows: [
          { title: 'David Luong 1:1', event_type: 'meeting', start_date: '2026-07-08', end_date: '2026-07-08' },
        ] });
      }
      if (sql.includes('GROUP BY status')) {
        return Promise.resolve({ rows: [
          { status: 'open', n: 13 }, { status: 'please_review', n: 2 },
        ] });
      }
      if (sql.includes("status = 'open'")) {
        return Promise.resolve({ rows: [{ title: 'Kanban drag drops card' }] });
      }
      if (sql.includes('FROM leads')) {
        return Promise.resolve({ rows: [
          { title: 'Studio X pitch', next_followup_date: '2026-07-07', next_action: 'Send deck', stage: 'Proposal' },
        ] });
      }
      return Promise.resolve({ rows: [] });
    }),
  };
}

describe('buildVoiceContext', () => {
  it('formats all sections with a timestamp header', async () => {
    const text = await buildVoiceContext(fixturePool(), { log: vi.fn() });
    expect(text).toMatch(/^WorkSage snapshot as of \d{2}:\d{2}/);
    expect(text).toContain('[task] Fix voice module (In progress, Urgent, due 2026-07-10)');
    expect(text).toContain('[project] Wonderland analytics (Blocked, High, Lighthouse Games)');
    expect(text).toContain('David Luong 1:1');
    expect(text).toContain('open: 13');
    expect(text).toContain('please_review: 2');
    expect(text).toContain('Kanban drag drops card');
    expect(text).toContain('Studio X pitch (Proposal, follow up 2026-07-07: Send deck)');
  });

  it('states emptiness rather than omitting sections', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const text = await buildVoiceContext(pool, { log: vi.fn() });
    expect(text).toContain('no work items in progress');
    expect(text).toContain('no meetings or events');
    expect(text).toContain('no open bugs');
    expect(text).toContain('no leads needing follow-up');
  });

  it('returns null when a query fails, and logs', async () => {
    const log = vi.fn();
    const pool = { query: vi.fn().mockRejectedValue(new Error('db down')) };
    const text = await buildVoiceContext(pool, { log });
    expect(text).toBeNull();
    expect(log).toHaveBeenCalledWith('warn', 'Voice', expect.any(String),
      expect.objectContaining({ error: 'db down' }));
  });

  it('returns null when queries exceed the timeout', async () => {
    const pool = { query: vi.fn().mockImplementation(() => new Promise(() => {})) };
    const text = await buildVoiceContext(pool, { log: vi.fn(), timeoutMs: 20 });
    expect(text).toBeNull();
  });
});
```

- [ ] **Step 5.2: Run to verify failure.**
`Set-Location <WT>\dashboard-server; npx vitest run tests/unit/voice-context.test.mjs`
Expected: FAIL, cannot find module `../../lib/voice-context`.

- [ ] **Step 5.3: Implement.** Create `lib/voice-context.js`:

```javascript
'use strict';

// Read-only WorkSage snapshot for the voice worker's prompt. The voice brain
// has NO tools; this block is the only data it sees, so keep it compact
// (~600 tokens) and factual. Schema verified live 2026-07-08.

const DEFAULT_TIMEOUT_MS = 1500;

// tasks.priority casing is inconsistent in production data ('Urgent', 'High',
// 'high', 'medium', '', ...) so ordering must normalise.
const WORK_ITEMS_SQL = `
  SELECT t.title, t.item_type, t.status, t.priority, t.due_date, c.name AS client
    FROM tasks t
    LEFT JOIN clients c ON c.id = t.client_id
   WHERE t.status IN ('In progress', 'Blocked', 'In Review')
   ORDER BY CASE lower(coalesce(t.priority, ''))
              WHEN 'urgent' THEN 0 WHEN 'high' THEN 1
              WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
            t.updated_at DESC
   LIMIT 12`;

const EVENTS_SQL = `
  SELECT title, event_type, start_date::text, end_date::text
    FROM calendar_events
   WHERE start_date <= CURRENT_DATE + 1 AND end_date >= CURRENT_DATE
   ORDER BY start_date
   LIMIT 10`;

const BUG_COUNTS_SQL = `
  SELECT status, count(*)::int AS n
    FROM bug_reports
   WHERE status <> 'resolved'
   GROUP BY status`;

const BUG_NEWEST_SQL = `
  SELECT title FROM bug_reports
   WHERE status = 'open'
   ORDER BY created_at DESC
   LIMIT 3`;

const LEADS_SQL = `
  SELECT l.title, l.next_followup_date::text, l.next_action, s.name AS stage
    FROM leads l
    JOIN lead_pipeline_stages s ON s.id = l.stage_id
   WHERE l.completed_at IS NULL AND s.is_closed = false
     AND l.next_followup_date <= CURRENT_DATE
   ORDER BY l.next_followup_date
   LIMIT 5`;

function describeWorkItem(t) {
  const details = [t.status];
  if (t.priority) details.push(t.priority);
  if (t.client) details.push(t.client);
  if (t.due_date) details.push(`due ${t.due_date}`);
  return `- [${t.item_type}] ${t.title} (${details.join(', ')})`;
}

function formatSnapshot({ work, events, bugCounts, bugNewest, leads }) {
  const time = new Date().toTimeString().slice(0, 5);
  const lines = [`WorkSage snapshot as of ${time}:`, ''];

  lines.push('Active work items, highest priority first:');
  if (work.length === 0) lines.push('- no work items in progress');
  else work.forEach(t => lines.push(describeWorkItem(t)));

  lines.push('', 'Meetings and events today and tomorrow:');
  if (events.length === 0) lines.push('- no meetings or events');
  else events.forEach(e => lines.push(`- ${e.title} (${e.event_type}, ${e.start_date})`));

  lines.push('', 'Bug tracker:');
  if (bugCounts.length === 0) lines.push('- no open bugs');
  else {
    lines.push('- ' + bugCounts.map(b => `${b.status}: ${b.n}`).join(', '));
    bugNewest.forEach(b => lines.push(`- newest open: ${b.title}`));
  }

  lines.push('', 'Leads needing follow-up:');
  if (leads.length === 0) lines.push('- no leads needing follow-up');
  else leads.forEach(l => lines.push(
    `- ${l.title} (${l.stage}, follow up ${l.next_followup_date}${l.next_action ? ': ' + l.next_action : ''})`));

  return lines.join('\n');
}

// Resolves to the snapshot text, or null on any failure or timeout: a voice
// turn must never fail because the snapshot did.
async function buildVoiceContext(pool, { log = () => {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`snapshot exceeded ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    const [work, events, bugCounts, bugNewest, leads] = await Promise.race([
      Promise.all([
        pool.query(WORK_ITEMS_SQL),
        pool.query(EVENTS_SQL),
        pool.query(BUG_COUNTS_SQL),
        pool.query(BUG_NEWEST_SQL),
        pool.query(LEADS_SQL),
      ]),
      timeout,
    ]);
    return formatSnapshot({
      work: work.rows,
      events: events.rows,
      bugCounts: bugCounts.rows,
      bugNewest: bugNewest.rows,
      leads: leads.rows,
    });
  } catch (err) {
    log('warn', 'Voice', 'Snapshot build failed, turn proceeds without data', { error: err.message });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { buildVoiceContext };
```

- [ ] **Step 5.4: Run tests.** `npx vitest run tests/unit/voice-context.test.mjs`
Expected: 4 pass.

- [ ] **Step 5.5: Commit.**

```powershell
Set-Location <WT>
git add dashboard-server/lib/voice-context.js dashboard-server/tests/unit/voice-context.test.mjs
git commit -m @'
feat(voice): WorkSage snapshot builder -- read-only, timeout-bounded, never fails the turn

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 6: Inject the snapshot into voice turns (routes/voice.js)

**Files:**
- Modify: `<WT>/dashboard-server/routes/voice.js`
- Modify: `<WT>/dashboard-server/tests/unit/voice-routes.test.mjs`

- [ ] **Step 6.1: Update the tests first.** In `tests/unit/voice-routes.test.mjs`:

Replace `buildApp` so a fake snapshot builder is injected:

```javascript
function buildApp(workerOverrides = {}, { buildContext } = {}) {
  const app = express();
  app.use(express.json());
  const log = vi.fn();
  const worker = {
    ask: vi.fn().mockResolvedValue({ text: 'Spoken reply.', durationMs: 2100 }),
    warm: vi.fn().mockResolvedValue(null),
    stop: vi.fn(),
    status: vi.fn().mockReturnValue({ running: true, exchanges: 3, queued: 0, busy: false }),
    ...workerOverrides,
  };
  const createWorker = vi.fn().mockReturnValue(worker);
  const buildCtx = buildContext || vi.fn().mockResolvedValue('WorkSage snapshot as of 12:00:\n- [task] Example item (In progress)');
  app.use(createVoiceRoutes({ pool: {}, log, internalToken: TOKEN, createWorker, buildContext: buildCtx }));
  return { app, worker, createWorker, log, buildContext: buildCtx };
}
```

Replace the system-prompt assertion test:

```javascript
  it('creates the worker once with opus 4.6 and a snapshot-aware prompt', () => {
    expect(createWorker).toHaveBeenCalledTimes(1);
    const cfg = createWorker.mock.calls[0][0];
    expect(cfg.model).toBe('claude-opus-4-6');
    expect(cfg.prewarmOnRecycle).toBe(true);
    expect(cfg.systemPrompt).toMatch(/read-only WorkSage snapshot/);
    expect(cfg.systemPrompt).toMatch(/cannot execute actions/);
    expect(cfg.systemPrompt).toMatch(/do not have that data/);
  });
```

Replace the voice-input reply test and add snapshot tests:

```javascript
  it('POST voice-input prepends the snapshot to the turn text', async () => {
    const res = await request(app)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', TOKEN)
      .send({ text: 'Hello Jarvis' })
      .expect(200);
    expect(res.body.response_text).toBe('Spoken reply.');
    expect(res.body.turn_ms).toBe(2100);
    const askedText = worker.ask.mock.calls[0][0];
    expect(askedText).toContain('Current WorkSage snapshot');
    expect(askedText).toContain('Example item');
    expect(askedText).toMatch(/Glen says: Hello Jarvis$/);
  });

  it('degrades gracefully when the snapshot is unavailable', async () => {
    const { app: appNoData, worker: w } = buildApp({}, { buildContext: vi.fn().mockResolvedValue(null) });
    await request(appNoData)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', TOKEN)
      .send({ text: 'Hello' })
      .expect(200);
    const askedText = w.ask.mock.calls[0][0];
    expect(askedText).toContain('temporarily unavailable');
    expect(askedText).toMatch(/Glen says: Hello$/);
  });
```

Leave the token tests, context test, and status-endpoint tests as they are, EXCEPT the context test's `worker.ask` opts assertion is unchanged (freshContext handling does not move).

- [ ] **Step 6.2: Run to verify failure.** `npx vitest run tests/unit/voice-routes.test.mjs`
Expected: FAIL (prompt assertions, snapshot-prefix assertions).

- [ ] **Step 6.3: Implement.** In `routes/voice.js`:

Replace `SYSTEM_PROMPT`:

```javascript
const SYSTEM_PROMPT = [
  'You are the NBI AIOS voice assistant for Glen. Respond conversationally and concisely (1-3 sentences).',
  'Replies are spoken aloud by TTS, so plain prose only: no markdown, no lists, no code.',
  'Each user turn begins with a read-only WorkSage snapshot (work items, meetings, bugs, leads).',
  'Answer operational questions from the latest snapshot; it supersedes any earlier snapshot.',
  'You have no tools. You cannot execute actions, write or change data, browse, or fetch anything',
  'beyond the snapshot. If asked to act, say you cannot take actions yet and will flag it for Glen.',
  'If asked about data not in the snapshot, say plainly that you do not have that data.',
  'Never invent facts. If you cannot answer, say so honestly.',
].join('\n');
```

Change the factory signature and the turn handler:

```javascript
function createVoiceRoutes({ pool, log, internalToken, createWorker, buildContext }) {
  const buildCtx = buildContext || require('../lib/voice-context').buildVoiceContext;
```

In the POST handler, before `worker.ask`:

```javascript
      const snapshot = await buildCtx(pool, { log });
      const dataBlock = snapshot
        ? `Current WorkSage snapshot (supersedes any earlier snapshot in this conversation):\n${snapshot}`
        : 'Live WorkSage data is temporarily unavailable for this turn; say so if asked about it.';

      const result = await worker.ask(`${dataBlock}\n\nGlen says: ${text.trim()}`, {
        freshContext: buildContextBlock(context),
      });
```

Everything else in the route (token check, logging, error path, status endpoint) stays as is.

- [ ] **Step 6.4: Run route tests.** `npx vitest run tests/unit/voice-routes.test.mjs`
Expected: all pass.

- [ ] **Step 6.5:** Check `server.js` wiring still matches: `createVoiceRoutes` is called around `server.js:376` with `{ pool, log, internalToken, createWorker }`; `buildContext` is optional so no server.js change is needed. Read the call site to confirm no signature drift.

- [ ] **Step 6.6: Commit.**

```powershell
Set-Location <WT>
git add dashboard-server/routes/voice.js dashboard-server/tests/unit/voice-routes.test.mjs
git commit -m @'
feat(voice): inject read-only WorkSage snapshot into every voice turn

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 7: Full suites green in the worktree

- [ ] **Step 7.1:** Voice module, full run:
`Set-Location <WT>\voice-module; d:\OneDrive\Claude_code\NBIAI_TEAM\voice-module\.venv\Scripts\python.exe -m pytest tests -q`
Expected: PASS, count = 29 baseline + new tests, 0 failures.

- [ ] **Step 7.2:** Dashboard, full unit run (NEVER concurrent with any other vitest):
`Set-Location <WT>\dashboard-server; npm test`
Expected: all files pass (1171 baseline + new). If anything unrelated fails, STOP and investigate before proceeding (do not label it pre-existing).

- [ ] **Step 7.3:** If either suite is red, fix before Task 8. Do not carry failures forward.

---

### Task 8: Merge, restart, live verification (MUST run inline in the main session, not a subagent)

- [ ] **Step 8.1:** Invoke `superpowers:finishing-a-development-branch`. Intended integration: merge `feature/voice-dialogue` into `master` in the MAIN tree (no PR; solo repo), delete the worktree after merge.

- [ ] **Step 8.2:** In the main tree, re-run both suites for gate evidence (literal paths, sequential, never concurrent):

```powershell
Set-Location d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server; npm test
```
then
```powershell
Set-Location d:\OneDrive\Claude_code\NBIAI_TEAM\voice-module; .\.venv\Scripts\python.exe -m pytest tests -q
```
Both green. Then `node .claude/harness/lib/finish-task.js` from the repo root; report must say VERIFIED for the touched surfaces.

- [ ] **Step 8.3:** Restart both processes: `pm2 restart nbi-dashboard` then `pm2 restart nbi-voice`. Confirm `pm2 list` shows both online and `Invoke-RestMethod http://localhost:8891/health` returns `status: ok`.

- [ ] **Step 8.4:** Live route check with the real token (from `dashboard-server/.env`, `AIOS_INTERNAL_TOKEN`): POST `http://localhost:8888/api/internal/aios/voice-input` with `{"text": "What are my top priorities right now?"}`. Expected: 200, `response_text` references REAL current work items (cross-check titles against the dashboard), `turn_ms` present. Also ask a question the snapshot cannot answer ("what did I have for breakfast") and confirm it says it does not have that data rather than inventing.

- [ ] **Step 8.5:** Watch `pm2 logs nbi-voice --lines 40 --nostream` for: model loads, no tracebacks, "Follow-up window" lines appearing after replies.

- [ ] **Step 8.6:** Update `docs/HANDOFF.md` and the session log with what changed and the verification evidence. Commit.

---

### Task 9: Glen ear test (the only verification that counts)

Ask Glen to run, in order, and report each:
1. One breath: "Hey Jarvis, what are my top priorities?" Expect chime during/after the phrase, full answer citing real items, no "Yes?".
2. Within 10s of the reply ending, a follow-up with NO wake word: "and which of those is blocked?" Expect an answer.
3. Let the window lapse silently. Expect the falling close tick ~10s after the reply.
4. Say "Hey Jarvis" alone, wait 15s without speaking. Expect chime, then close tick, no transcription.
5. Confirm no self-hearing (Jarvis must not answer its own replies).

If wake capture clips the first word of questions, raise `wake_word_buffer_duration_seconds` down/up in 0.1 steps (down if words are clipped, up if "Jarvis" remnants appear in answers); `pm2 restart nbi-voice` after each change.

---

## Self-review notes (done at write time)

- Spec coverage: one-shot capture (Tasks 2, 4), chime/no-Yes (Tasks 1, 4), native strip + backstop (Task 2), 1.2s silence (Task 2), follow-up window + close tick (Tasks 3, 4), snapshot builder + injection + prompt + failure path (Tasks 5, 6), config knobs incl. dead-knob removal (Task 4), worktree question (Task 0 + Task 8 resolve it: build in worktree, merge then restart PM2 from main tree), schema verification (done live, results pinned in header).
- Deviation from spec, declared: spec said "sounddevice handles concurrent short playback"; verified false for the `sd.play` convenience API (single stream). `play_tone` therefore skips when TTS is active. Spec's intent (tones never interrupt speech) is preserved; mechanism corrected.
- Type consistency: `play_tone(name)` used in Tasks 1 and 4; `open_followup_window()`, `_handle_recording_start`, `_handle_listen_timeout` consistent across Tasks 2, 3, 4; `buildVoiceContext(pool, { log, timeoutMs })` consistent across Tasks 5, 6; `buildContext` route param optional so `server.js` is untouched.
