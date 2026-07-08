import pytest
import queue
import sys
import types

import numpy as np

from lib.speaker import chunk_text, SpeechQueue, Speaker, generate_tone


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
