import logging
import threading
import time

logger = logging.getLogger(__name__)


class Listener:
    def __init__(
        self,
        whisper_model="distil-whisper-large-v3",
        wake_word="hey_jarvis",
        wake_word_sensitivity=0.85,
        idle_timeout_seconds=30,
        wake_word_timeout_seconds=3,
        on_transcription=None,
        on_wake=None,
    ):
        self._whisper_model = whisper_model
        self._wake_word = wake_word
        self._wake_sensitivity = wake_word_sensitivity
        self._idle_timeout = idle_timeout_seconds
        self._wake_timeout = wake_word_timeout_seconds
        self._on_transcription = on_transcription or (lambda text: None)
        self._on_wake = on_wake or (lambda: None)
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
            post_speech_silence_duration=0.6,
            enable_realtime_transcription=False,
            wakeword_backend="oww",
            wake_words=self._wake_word,
            # For the oww backend RealtimeSTT compares the model score >= this
            # value (core/wakeword.py), so HIGHER means STRICTER -- the library
            # docstring's "1 = most sensitive" only describes Porcupine.
            wake_words_sensitivity=self._wake_sensitivity,
            wake_word_timeout=self._wake_timeout,
            on_wakeword_detected=self._handle_wake_word,
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
        logger.info("Wake word detected!")
        self._mode = "listening"
        self._last_speech_time = time.time()
        self._on_wake()

    def _handle_transcription(self, text):
        if self._muted:
            return
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
