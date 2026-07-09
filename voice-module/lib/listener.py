import logging
import re
import threading
import time

logger = logging.getLogger(__name__)


class Listener:
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
            r"^\W*" + r"[\s,.!?]*".join(words) + r"\b[\s,.!?]*", re.IGNORECASE
        )
        self._recorder = None
        self._active = False
        self._last_speech_time = 0
        self._mode = "idle"  # idle, listening, ptt
        self._muted = False

    def load_model(self):
        from RealtimeSTT import AudioToTextRecorder

        logger.info("Loading STT model (whisper=%s, wake_word=%s)...",
                     self._whisper_model, self._wake_word)

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
        logger.info("STT model loaded")

    def mute(self):
        self._muted = True
        # Cut audio at the source: the flag alone is not enough, because a
        # transcription captured while muted is delivered by recorder.text()
        # AFTER unmute and would pass the flag check (self-hearing bug: the
        # system transcribed its own "Yes?" TTS as user input).
        if self._recorder:
            try:
                self._recorder.set_microphone(False)
            except Exception:
                logger.exception("Failed to disable microphone on mute")

    def unmute(self):
        if self._recorder:
            try:
                self._recorder.clear_audio_queue()
                self._recorder.set_microphone(True)
            except Exception:
                logger.exception("Failed to re-enable microphone on unmute")
        self._muted = False

    def _handle_wake_word(self):
        if self._muted:
            return
        # Refractory window: the detector's rolling buffer still contains the
        # original wake audio when the mic re-opens after "Yes?", so one
        # utterance re-fires every playback cycle (observed live: bursts of
        # 4-9 yeses at ~1.4s spacing). Accept one wake per window.
        now = time.time()
        if now - self._last_wake_accepted < self._wake_debounce:
            logger.debug("Wake word ignored (within %.1fs debounce)", self._wake_debounce)
            return
        self._last_wake_accepted = now
        if self._followup_open:
            # a wake word supersedes any open window; also disarm the
            # recorder's activation delay or its expiry ticks forever after
            self._followup_open = False
            if self._recorder:
                self._recorder.wake_word_activation_delay = 0
        logger.info("Wake word detected!")
        self._mode = "listening"
        self._last_speech_time = time.time()
        self._on_wake()

    def _handle_transcription(self, text):
        if self._muted:
            return
        text = self._wake_strip_re.sub("", text.strip(), count=1).strip()
        if not text:
            return
        self._last_speech_time = time.time()
        logger.info("Transcription: %s", text)
        self._on_transcription(text)

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
