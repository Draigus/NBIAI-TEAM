import re
import queue
import threading
import logging
import numpy as np

logger = logging.getLogger(__name__)

SENTENCE_SPLIT_RE = re.compile(r'(?<=[.!?])\s+')

# UI cue tones: (start_hz, end_hz, seconds). Wake ack rises, close tick falls.
TONES = {
    "wake": (740, 1180, 0.12),
    "close": (880, 520, 0.10),
}
TONE_SAMPLE_RATE = 24000


def generate_tone(freq_start, freq_end, duration_s, volume=0.3, sample_rate=TONE_SAMPLE_RATE):
    n = int(sample_rate * duration_s)
    freqs = np.linspace(freq_start, freq_end, n, dtype=np.float32)
    phase = 2.0 * np.pi * np.cumsum(freqs) / sample_rate
    samples = np.sin(phase).astype(np.float32)
    fade = min(int(sample_rate * 0.01), n // 2)
    if fade:
        samples[:fade] *= np.linspace(0.0, 1.0, fade, dtype=np.float32)
        samples[-fade:] *= np.linspace(1.0, 0.0, fade, dtype=np.float32)
    return samples * float(volume)


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
    def __init__(self, voice="bf_emma", chime_volume=0.3):
        self._voice = voice
        self._chime_volume = float(chime_volume)
        self._model = None
        self._queue = SpeechQueue()
        self._speaking = False
        self._lock = threading.Lock()
        self._start_lock = threading.Lock()
        self._stop_event = threading.Event()
        self._on_speak_start = None
        self._on_speak_end = None
        self._tones = {}

    def set_mute_hooks(self, on_start, on_end):
        self._on_speak_start = on_start
        self._on_speak_end = on_end

    def load_model(self):
        import kokoro_onnx
        logger.info("Loading Kokoro TTS model (voice=%s)...", self._voice)
        self._model = kokoro_onnx.Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
        logger.info("Kokoro TTS model loaded")
        if self._chime_volume > 0:
            for name, (f0, f1, dur) in TONES.items():
                self._tones[name] = generate_tone(f0, f1, dur, self._chime_volume)

    def speak(self, text, priority="normal"):
        chunks = chunk_text(text)
        # Enqueue and the start-drain decision share a lock with the drain
        # loop's exit decision, so text enqueued while the drain thread is
        # winding down cannot be stranded in the queue.
        with self._start_lock:
            for chunk in chunks:
                self._queue.enqueue(chunk, priority)
            if chunks and not self._speaking:
                self._speaking = True
                threading.Thread(target=self._drain_queue, daemon=True).start()

    def stop(self):
        self._stop_event.set()
        self._queue.clear()

    def _drain_queue(self):
        import sounddevice as sd
        with self._lock:
            self._stop_event.clear()
            if self._on_speak_start:
                self._on_speak_start()
            clean_exit = False
            try:
                while True:
                    with self._start_lock:
                        text = self._queue.next()
                        if text is None:
                            self._speaking = False
                            clean_exit = True
                            break
                    if self._stop_event.is_set():
                        break
                    self._synthesise_and_play(text, sd)
            finally:
                # stop()/exception path only -- a clean exit already released
                # the flag under the lock, and a new drain may own it by now
                if not clean_exit:
                    with self._start_lock:
                        self._speaking = False
                if self._on_speak_end:
                    self._on_speak_end()

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
