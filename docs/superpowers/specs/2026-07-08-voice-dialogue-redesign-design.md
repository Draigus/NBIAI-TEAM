# Voice Dialogue Redesign: One-Shot Capture, Follow-Up Window, Live Data

**Date:** 2026-07-08 (evening session, Fable 5)
**Status:** Awaiting Glen's review
**Supersedes:** the wake-interaction section of `2026-07-08-aios-voice-module-design.md`. The TTS, STT model, bridge, and persistent-worker architecture from that spec and the v3 handoff are unchanged.

## Problem

Glen's report: "I've been yet to get it to interact back and forth in dialogue, and half the time it won't answer me." Secondary: "Says in this mode it can't query WorkSage or look at live data when I can get it to respond."

Root causes, verified against the installed RealtimeSTT source (paths relative to `voice-module/.venv/Lib/site-packages/RealtimeSTT/`):

1. **The "Yes?" mute cycle destroys capture.** Wake word fires mid-utterance, our callback mutes the mic and speaks "Yes?". Mute stops audio chunks entirely, so the in-progress recording stalls, then finalises on the first silence chunks after unmute, capturing only the pre-mute fragment. Live log evidence: transcriptions "Hey Jarvis, can you." (2.0s) and "State." (1.4s). The question Glen asks after hearing "Yes?" is never recorded.
2. **One wake word buys exactly one utterance.** `core/lifecycle.py:52` resets `wakeword_detected = False` when recording starts, and `core/lifecycle.py:218-226` re-arms continuous listening only when wake words are off. After every reply the recorder silently returns to wake-word mode, so answering Jarvis does nothing. Dialogue is structurally impossible in the current flow.
3. **The wake phrase leaks into transcripts.** RealtimeSTT strips `wake_word_buffer_duration` seconds of audio from the front of a recording (`core/recording.py:200`, applied at 260-277) but the default is 0.1s, far too short for "Hey Jarvis" (~1s).
4. **The voice brain has no data.** The system prompt (correctly, after the bypassPermissions removal) tells the model it cannot see AIOS data, so it tells Glen it cannot answer operational questions. That honesty is right; the missing data is the problem.

## Design

### Part 1: One-shot capture (fixes "won't answer me")

Glen speaks the wake word and the question in one breath: "Hey Jarvis, what are my top priorities?"

- **No more "Yes?".** The wake acknowledgement becomes a short chime (~120ms, quiet, rising tone) played WITHOUT muting the mic, so capture continues uninterrupted while Glen finishes his sentence. A pure tone has no phonetic content, so it cannot re-trigger the openwakeword model, and on the headset it does not reach the mic at all.
- **Native wake-word stripping.** Pass `wake_word_buffer_duration` (new config knob, default 1.1s) to the recorder so "Hey Jarvis" is removed at the audio level. A text-level backstop strips any leading wake-phrase remnant from the transcription (case-insensitive, punctuation-tolerant) before it reaches the bridge.
- **Natural pauses allowed.** `post_speech_silence_duration` rises from 0.6s to 1.2s (new config knob) so a mid-sentence pause does not cut the question off.
- **Mic muting now happens in exactly one place:** while a reply (or any `/speak` text) is being played by TTS. The existing source-level mute (`set_microphone(False)` plus queue clear on unmute) is unchanged for that path.
- If Glen says only "Hey Jarvis" and waits, the chime confirms the wake, and the existing 15s wake-to-speech window (`wake_word_timeout`) applies unchanged.

### Part 2: Follow-up window (fixes "no back-and-forth dialogue")

After each reply finishes playing, the listener opens a 10-second window in which plain voice activity starts a recording, no wake word needed.

- Mechanism verified in source: `core/recording.py:209-212` starts recording on voice activity whenever the wake-word activation delay has not yet passed and `start_recording_on_voice_activity` is set. The public `wakeup()` API restarts that window (`listen_start = now`). We set the recorder's `wake_word_activation_delay` to the window length when opening it and restore it when it closes, so the window is scoped precisely to post-reply moments.
- **Open:** when reply TTS ends (speaker's `on_end` hook, after unmute). New listener method `open_followup_window()`.
- **Close:** after `followup_window_seconds` (new config knob, default 10) with no speech. RealtimeSTT fires `on_wakeword_timeout` exactly once when the activation delay passes (`core/recording.py:146-155`); that callback plays the **close tick** (short falling tone) so Glen knows he is back to needing "Hey Jarvis". The same tick plays if a wake word was heard but no speech followed within the 15s window (`core/recording.py:430-438` routes through the same callback), which is also a "window closed" event.
- If Glen speaks within the window, the turn proceeds exactly like a wake-word turn (same transcription path, same bridge, same rolling context), and a fresh follow-up window opens after the next reply. Conversations continue until Glen stops replying for 10s or says a reset phrase.
- `followup_window_seconds: 0` disables the feature entirely (window never opens, no ticks).
- The dead `idle_timeout_seconds` config knob is REMOVED. The follow-up window is what it was always meant to be.
- Accepted trade-off, stated plainly: for 10s after each reply the mic accepts any speech, so ambient conversation can trigger a spurious turn. Cost is a spurious spoken reply from an unprivileged worker. The window is short, configurable, and can be disabled.

### Part 3: Live WorkSage data (fixes "can't see live data")

The dashboard voice route injects a read-only data snapshot into each worker turn. No tools are granted. bypassPermissions stays dead. The model receives data in its prompt; it cannot fetch, write, or act.

- **New module `dashboard-server/lib/voice-context.js`:** builds a compact plain-text snapshot from Postgres (the route factory already receives `pool`). Content, each section capped so the whole snapshot stays under ~600 tokens:
  - Active work items: top items by priority/status (in progress and blocked first), with type, title, status, assignee.
  - Today's and tomorrow's meetings/calendar entries.
  - Bug tracker: open counts by status plus the newest few titles.
  - Leads with overdue follow-ups (count and names).
  - A timestamp line: "WorkSage snapshot as of HH:MM".
  - Exact tables and columns to be confirmed against the live schema during implementation planning; the planner must verify with real queries, not assume names.
- **Injection:** fetched fresh per turn and prepended to the turn text as a clearly delimited block. The system prompt instructs that the latest snapshot supersedes earlier ones. Bounded by the worker's 20-exchange recycle, worst case roughly 12k tokens of snapshot data per session, well within budget.
- **Failure handling:** if the snapshot query fails or exceeds a 1500ms budget, the turn proceeds without it and the model is told "live data temporarily unavailable" for that turn. A voice turn must never 500 because a snapshot query failed.
- **System prompt rewrite:** the model HAS a read-only snapshot and answers operational questions from it; it must not claim ability to act, write, or fetch anything beyond the snapshot; for questions outside the snapshot it says it does not have that data rather than guessing. The existing honesty and no-fabrication constraints stay.

### Chimes (shared detail)

Two tones generated programmatically with numpy at startup (no asset files): wake-ack (rising, ~120ms) and window-close tick (falling, ~100ms), quiet by default (`chime_volume` config knob, default 0.3). Played via a new `Speaker.play_tone()` that goes straight to sounddevice WITHOUT the mute hooks and without entering the speech queue, so tones never interrupt capture or TTS. TTS playback and tones share the audio device; sounddevice handles concurrent short playback. The close tick cannot coincide with a reply (the window opens only after a reply ends), but an externally triggered `/speak` could overlap it; a tone over speech is harmless, so no interlock is added.

## Config changes (`voice-module/config.json`)

| Knob | Change | Default |
|---|---|---|
| `wake_word_buffer_duration_seconds` | new | 1.1 |
| `post_speech_silence_seconds` | new (was hardcoded 0.6) | 1.2 |
| `followup_window_seconds` | new (0 disables) | 10 |
| `chime_volume` | new (0 disables chimes) | 0.3 |
| `idle_timeout_seconds` | REMOVED (dead knob, superseded) | n/a |

Unchanged: `wake_word_sensitivity` 0.85, `wake_word_debounce_seconds` 5.0, `wake_word_timeout_seconds` 15, model choices, ports, token env.

## Files touched

- `voice-module/lib/listener.py`: recorder params, follow-up window open/close, wake handler no longer paired with mute, transcription wake-phrase backstop strip.
- `voice-module/lib/speaker.py`: `play_tone()`, tone generation.
- `voice-module/voice_server.py`: callback wiring (chime on wake, follow-up window after reply, close tick), config plumbing.
- `voice-module/config.json`: knobs above.
- `voice-module/tests/`: updated and new pytest coverage (window logic, strip logic, tone path, no-mute-on-wake).
- `dashboard-server/lib/voice-context.js`: NEW, snapshot builder.
- `dashboard-server/routes/voice.js`: snapshot injection, system prompt rewrite, failure path.
- `dashboard-server/tests/unit/voice-context.test.mjs`: NEW.
- `dashboard-server/tests/unit/voice-routes.test.mjs`: updated.

The dashboard-server side touches 4 files, which crosses the worktree-first threshold in CLAUDE.md; the implementation plan must decide worktree strategy explicitly (note: live voice verification needs the PM2 server running from the main tree, so the plan should address how changes reach the running instance).

## Testing and verification

- pytest (voice-module): all existing 29 plus new tests for window open/close, activation-delay restore, wake-phrase strip variants, tone playback not touching mute hooks, chime disabled at volume 0.
- Vitest (dashboard-server): snapshot builder against a mocked pool (content, caps, timeout, failure fallback), route injection, prompt update. Full suite must stay green (1171 baseline).
- Live verification with Glen's ear, the only test that counts here: (1) one-breath question answered; (2) follow-up reply within 10s answered without wake word; (3) close tick heard after letting the window lapse; (4) "what are my top priorities" answered from real WorkSage data; (5) reply audio not self-transcribed.
- Latency check: `turn_ms` in dashboard logs before/after; snapshot adds prompt tokens, expected effect on warm turns under ~1s.

## Out of scope (unchanged from handoff)

- Push-to-talk (still decorative; needs its own design with Glen's mic).
- AIOS-initiated speech (cadence to `/speak`).
- Audio device rebinding feature (restart `nbi-voice` after switching devices remains the rule).
- RHO hardening items.

## Decisions taken by Glen this session

- 10-second follow-up window: approved ("we can try ten seconds").
- Close tick on window expiry: approved.
- Read-only data injection into the voice turn (no tools): approved by directive to fix "can't query WorkSage".
