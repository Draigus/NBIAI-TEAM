import pytest
import queue

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
