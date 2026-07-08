"""Listener mute behaviour: audio must be cut at the source, not just flagged."""

from unittest.mock import MagicMock

from lib.listener import Listener


def make_listener(**kwargs):
    listener = Listener(
        whisper_model="base.en",
        wake_word="hey_jarvis",
        **kwargs,
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


class TestWakeDebounce:
    """One utterance re-fires the detector every 'Yes?' cycle (live bursts of
    4-9 at ~1.4s spacing); only one wake per refractory window may pass."""

    def test_second_wake_within_window_dropped(self, monkeypatch):
        import lib.listener as listener_mod
        woke = []
        listener = make_listener(on_wake=lambda: woke.append(True))
        clock = {"now": 1000.0}
        monkeypatch.setattr(listener_mod.time, "time", lambda: clock["now"])

        listener._handle_wake_word()
        clock["now"] += 1.4
        listener._handle_wake_word()
        clock["now"] += 1.4
        listener._handle_wake_word()
        assert woke == [True]

    def test_wake_accepted_after_window_expires(self, monkeypatch):
        import lib.listener as listener_mod
        woke = []
        listener = make_listener(on_wake=lambda: woke.append(True))
        clock = {"now": 1000.0}
        monkeypatch.setattr(listener_mod.time, "time", lambda: clock["now"])

        listener._handle_wake_word()
        clock["now"] += 5.1
        listener._handle_wake_word()
        assert woke == [True, True]


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

    def test_fused_word_starting_with_wake_word_untouched(self):
        assert self._delivered("Hey Jarvison said hello") == \
            ["Hey Jarvison said hello"]


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
