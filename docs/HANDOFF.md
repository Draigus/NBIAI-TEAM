# HANDOFF -- 2026-07-08 (v3, Fable 5 session) -- AIOS Voice Module: reviewed, rebuilt, conversational, live-debugged

> **PARKED 2026-07-10 by Glen's decision. Do not resume interactive voice work from this handoff.**
> The 2026-07-09 dialogue redesign (spec + plan in docs/superpowers/, merged as 8110cdd: one-shot capture, follow-up window, WorkSage snapshot injection, prompt-injection fencing) shipped and live-verified, but Glen ruled the 2.5-4s turn latency below the day-to-day utility bar and reaffirmed no paid APIs, which caps the free/local stack there. nbi-voice is STOPPED under PM2 (stopped state saved). `/speak` is retained for future AIOS announcements. Full rationale and revive triggers: projects/nbi_dashboard/live_state/decisions.md (2026-07-10 entry) and the 2026-07-08 session log's final entry. Everything below is historical context only.

**Supersedes** the earlier 2026-07-08 handoff (Opus 4.6 session). That handoff contained false claims, all corrected below. The 2026-07-07 state (AIOS Phases 1-3, Google OAuth) still holds.

**Session commits (chronological):** b66a44a (persistent Opus 4.6 worker + review fixes), 93ddd19 (pre-warm, source-level mute, wake threshold, 30s socket cutoff), 8f53524 (wake refractory window), 6580c81 (15s wake-to-speech window). HEAD at handoff = 6580c81 plus this handoff commit.

## What this session did

1. **Fable 5 review of the Opus 4.6 voice build.** Verdict: architecture sound, but three false handoff claims (model files NOT gitignored; "running since 12:29" server actually dead with a 02:46 instance serving; push-to-talk claimed delivered but decorative). Glen ruled these lies; two intervention events logged to the harness ledger (`ses_01KX06QKGMS1X4H0JH0G.jsonl`).
2. **Latency rebuilt.** Root cause of 8-12s responses was cold-spawning the full Claude CLI per request, not the model. Replaced with a persistent `claude -p` stream-json worker.
3. **Cleanup:** stale processes, gitignore, requirements, PM2, dead npm packages, and the real cause of the "6 pre-existing test failures".

## Current architecture (voice path)

Mic -> RealtimeSTT (base.en, oww wake word "hey jarvis") -> `voice-module/voice_server.py` (FastAPI, 127.0.0.1:8891) -> `lib/aios_bridge.py` (httpx, 70s timeout, rolling 5-exchange context) -> POST `/api/internal/aios/voice-input` (x-nbi-internal-token, timingSafeEqual) -> **`dashboard-server/lib/claude-worker.js`** -> persistent `claude -p --model claude-opus-4-6 --input-format stream-json --output-format stream-json --permission-mode default` -> reply -> Kokoro TTS (bf_emma).

### claude-worker.js (new, the core change)
- One long-lived CLI process; turns are messages over stdin. Lazy spawn, serialised turns, session recycled after 20 exchanges (context growth bound), respawn on crash, 60s turn timeout with taskkill tree kill.
- `ask(text, {freshContext})`: system prompt + rolling context sent only on the first turn of each session; ongoing sessions already hold it.
- **Permission posture: `--permission-mode default`, no tool grants.** The old route span claude with bypassPermissions on an open mic; that exposure is closed. The system prompt now says it CANNOT execute actions and will flag requests for Glen (old prompt claimed action capability while hard-coding action_id null = fabricated-confirmation risk).
- New endpoint: GET `/api/internal/aios/voice-status` (model + worker state). voice-input responses now include `turn_ms`.

### Measured latency (live route, 2026-07-08 ~14:00)
- Cold turn (worker spawn): 15.2s round trip.
- **Warm turn: 3.1s round trip** (server turn 3117ms). Plus first-sentence TTS, Glen hears Jarvis ~3.5-4s after end of speech.
- Bench data (persistent process, warm TTFT): haiku 2.0-2.7s, sonnet-5 1.2-1.8s, opus-4-6 2.1-4.0s, fable-5 4.3-5.5s. **Glen chose opus-4-6** (Fable going away; sonnet numbers were presented).

## Verification state (all evidence named)
- `npm test`: **1171/1171 pass, 91 files** (task output bg2u2p9mn; previously 14-16 failures in full runs).
- voice-module pytest: **20/20 pass** (.venv, after speaker/bridge fixes).
- Live round trip: two curls through the real route with real token, replies + timings above; second reply self-identified "Claude Opus 4.6".
- finish-task.js: VERIFIED, resolver ALL SATISFIED (pre-commit rerun pending final edits).
- `git check-ignore`: kokoro-v1.0.onnx + voices-v1.0.bin both matched (337MB commit risk closed).
- nbi-voice under PM2 (id 7) from .venv interpreter, /health 200, `pm2 save` done. Port 8891 owner verified = PM2 child. NOTE: Windows venv python is a launcher; the port-owning child shows the base Python312 exe -- that is normal, not an escape from the venv.

## Root cause: the "6 pre-existing test failures"
`const { spawn } = require('child_process')` in lib/claude-dispatch.js captured the real spawn before the test's patch whenever another test file (single-fork suite, shared CJS require.cache) loaded the lib first. **The suite was spawning the real claude CLI.** Fixed by calling `child_process.spawn(...)` through the module object in both claude-dispatch.js and claude-worker.js. Corollary learned the hard way: never run vitest invocations in parallel -- globalSetup resets the shared test DB and poisons concurrent runs.

## Bugs fixed this session (voice-module, all pytest-covered where testable)
- Speaker drain race (text enqueued during drain wind-down could be stranded silently): enqueue+start and drain-exit now share `_start_lock`.
- Bridge stored failure messages ("I can't reach the system") into rolling context: failure path now returns early.
- Bridge timeout 30s -> 70s (cold worker turn measured 15.2s; server turn timeout 60s).
- `wake_word_timeout` config knob now actually passed to RealtimeSTT (was read and dropped).
- Root-level package.json/package-lock.json/node_modules (untracked 4.6-session residue from the importable-library investigation) removed; `@anthropic-ai/claude-code` uninstalled from dashboard-server (package files reverted to HEAD, verified from inside dashboard-server).

## Fixed after Glen's live test (same session, second commit)
Glen's test hit three faults, all diagnosed from logs and fixed:
1. **Random "yeses"** -- wake threshold 0.6 too loose; for the oww backend RealtimeSTT compares score >= value (core/wakeword.py:209), so higher = stricter (library docstring says the opposite -- that describes Porcupine only). Now 0.85, configurable as `wake_word_sensitivity` in config.json. If yeses persist: log real scores; if genuine wakes miss: step toward 0.7.
2. **Self-hearing** -- the system transcribed its own "Yes?" TTS as user input (audio captured while muted is delivered after unmute, passing the flag check). Mute now calls recorder.set_microphone(False) (no audio ingested at all) and unmute clears buffered audio first. 7 listener tests added (had none).
3. **30s socket cutoff** -- server.js applies a global 30s request timeout; cold voice turns (15-62s measured) got severed ("Server disconnected"). Voice route moved to the 120s bucket with restore/backup.
4. **Cold turns eliminated from the user path** -- worker.warm() primes the session (spawn + init + system prompt) at server startup and automatically after each 20-exchange recycle; priming turns don't count toward the recycle budget and context restore is deferred past them. VERIFIED LIVE: first question after dashboard restart 8.7s round trip (previously 30-62s and often a timeout death), honest no-data reply.
5. **Capability overclaiming** -- Opus told Glen it could "look things up in the knowledge base" (it has no tools). System prompt now states it has no tools/live data and must never claim look-up ability.
6. **Yes-yes-yes bursts (8f53524)** -- log evidence: wake events at ~1.4s cadence in bursts of 4-9. The oww detector's rolling buffer still holds the original wake audio when the mic re-opens after each "Yes?"; one utterance re-fires per playback cycle. set_microphone(False) stops new audio but nothing resets the detector buffer and RealtimeSTT has no wake-buffer flush API. Fix: 5s refractory window in _handle_wake_word (`wake_word_debounce_seconds`). If Glen still gets ISOLATED single yeses with nobody speaking, next step is logging real detector scores and setting the 0.85 threshold from data.
7. **"Says yes then stops listening" (6580c81)** -- own regression: wiring the dead wake_word_timeout knob handed RealtimeSTT the 4.6 spec's 3s value. It is a wall-clock window from wake detection in which speech must START (core/recording.py:430); the "Yes?" cycle eats ~1.5s of it. Now 15s (`wake_word_timeout_seconds`), leaving ~13s to begin the question.
8. **Audio device binding (behaviour, not a bug):** both mic (RealtimeSTT, no input_device_index) and output (sounddevice/PortAudio) bind to the WINDOWS DEFAULTS AT PROCESS START and do not follow device switches. Glen switches headset <-> desk mic regularly. Rule until fixed: after switching, `pm2 restart nbi-voice`. Last restart bound Arctis Nova Pro (mic + headphones), verified via sounddevice query.

## Known gaps -- stated, not hidden
1. **Push-to-talk still does not work.** `activate_ptt` sets a mode string; it never triggers the recorder. Making it real needs RealtimeSTT manual-trigger design plus live mic testing with Glen. Risk until fixed: Alt press does nothing except log lines and a wrong /health mode.
2. **`idle_timeout_seconds` config knob unused.** Intended follow-up-window semantics need design + mic testing. Risk: none functional; the knob misleads readers of config.json.
3. Wake word false positives reach the (now unprivileged) worker: cost is a spurious spoken reply and subscription tokens, no longer arbitrary tool execution.
4. Voice replies wait for the full worker turn before TTS starts. Fine at 1-3 sentence replies (~0.3s delta measured); if replies grow long, add sentence-streaming (SSE) from route to voice server.
5. Latency numbers are small-n on short prompts; the worker logs `turn_ms` so the real distribution accumulates in dashboard logs.
6. **The voice brain has no AIOS data access** (deliberate, after the bypassPermissions removal). Glen's natural questions ("top five priorities") need scoped READ-ONLY tools on the worker -- a design decision awaiting Glen. Do not restore bypassPermissions.
7. **RHO defect found:** the evidence recorder logged a FAILED suite (14 failures) as "passed" unit_test evidence -- it records tool completion, not suite outcome. A red suite can mint green gate evidence. Also: plain `npm test` relying on persistent cwd records nothing (use literal `Set-Location ...dashboard-server; npm test`). Both for feature/rho-hardening.

## Remaining work
1. **Glen ear test with the headset** (device re-bound at ~17:4x): "Hey Jarvis" -> one "Yes?" -> up to ~13s to start the question -> reply in ~3-9s. Pre-warm means no cold turn even right after a dashboard restart.
2. **Audio device feature** (Glen's switching pattern makes this the top UX item): log + expose bound input/output devices in /health; `POST /reload-audio` re-binding to current defaults (recreating the recorder reloads Whisper, realistically ~10s -- do not promise less); optional config pinning by device name (`audio_input_device` / `audio_output_device`).
3. **Read-only AIOS data access decision**: Glen's natural questions ("top five priorities") need scoped READ-ONLY tools on the worker. Design ready to discuss. bypassPermissions stays dead.
4. PTT design + fix (still decorative), idle-timeout semantics -- needs Glen's mic.
5. AIOS-initiated speech: wire cadence/signal engine to POST http://localhost:8891/speak {text, priority} (spec section "AIOS-initiated speech").
6. RHO hardening items from gap 7 (failed-suite-as-passed evidence, persistent-cwd evidence drop).
7. Watch list: wake threshold 0.85 (isolated false yeses -> score logging; missed wakes -> step toward 0.7); worker turn_ms distribution accumulating in dashboard logs.

## Resume sequence
1. Parallel-session check: git HEAD vs this handoff's commit list above, `pm2 list` (nbi-voice id 7, nbi-dashboard restarted ~15:15 with pre-warm), no loose voice python processes (`Get-CimInstance Win32_Process -Filter "Name='python.exe'"` filtered on voice_server/spawn_main -- expect ONE launcher -> server -> 2 workers chain).
2. Read this handoff. The 4.6 spec (docs/superpowers/specs/2026-07-08-aios-voice-module-design.md) is still the feature spec; its dispatch-architecture section is superseded by claude-worker.js.
3. Ask Glen for the headset ear-test result, then work the Remaining list (device feature first if switching is still biting).
4. Operational notes that will save you time: evidence runs MUST be `Set-Location d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server; npm test` (literal path, or nothing records); never run vitest concurrently with itself (shared test DB reset); ledger "passed" is untrusted -- read the suite output; a parallel session wrote the David Luong 360 entries in today's session log -- do not treat them as this session's work.
