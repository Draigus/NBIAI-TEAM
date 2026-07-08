"""Listener mute behaviour: audio must be cut at the source, not just flagged."""

from unittest.mock import MagicMock

from lib.listener import Listener


def make_listener(**kwargs):
    listener = Listener(
        whisper_model="base.en",
        wake_word="hey_jarvis",
        on_transcription=kwargs.get("on_transcription"),
        on_wake=kwargs.get("on_wake"),
    )
    listener._recorder = MagicMock()
    return listener


class TestMute:
    def test_mute_disables_microphone_at_source(self):
        listener = make_listener()
        listener.mute()
        listener._recorder.set_microphone.assert_called_once_with(False)

    def test_unmute_clears_buffered_audio_before_reenabling(self):
        listener = make_listener()
        listener.mute()
        listener.unmute()
        listener._recorder.clear_audio_queue.assert_called_once()
        listener._recorder.set_microphone.assert_called_with(True)

    def test_mute_before_recorder_exists_does_not_crash(self):
        listener = make_listener()
        listener._recorder = None
        listener.mute()
        listener.unmute()

    def test_recorder_errors_do_not_propagate(self):
        listener = make_listener()
        listener._recorder.set_microphone.side_effect = RuntimeError("dead pipe")
        listener.mute()  # must not raise
        listener._recorder.clear_audio_queue.side_effect = RuntimeError("dead pipe")
        listener.unmute()  # must not raise


class TestMutedCallbacks:
    def test_transcription_dropped_while_muted(self):
        received = []
        listener = make_listener(on_transcription=received.append)
        listener.mute()
        listener._handle_transcription("Yes.")
        assert received == []

    def test_transcription_delivered_when_unmuted(self):
        received = []
        listener = make_listener(on_transcription=received.append)
        listener.mute()
        listener.unmute()
        listener._handle_transcription("real question")
        assert received == ["real question"]

    def test_wake_word_ignored_while_muted(self):
        woke = []
        listener = make_listener(on_wake=lambda: woke.append(True))
        listener.mute()
        listener._handle_wake_word()
        assert woke == []
