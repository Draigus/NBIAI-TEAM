import logging
import threading
from pynput import keyboard

logger = logging.getLogger(__name__)


class HotkeyListener:
    def __init__(self, key_name="f13", on_press=None, on_release=None):
        self._key = self._resolve_key(key_name)
        self._on_press = on_press or (lambda: None)
        self._on_release = on_release or (lambda: None)
        self._listener = None
        self._pressed = False

    @staticmethod
    def _resolve_key(key_name):
        key_name = key_name.strip().lower()
        if hasattr(keyboard.Key, key_name):
            return getattr(keyboard.Key, key_name)
        if len(key_name) == 1:
            return keyboard.KeyCode.from_char(key_name)
        if key_name.startswith("f") and key_name[1:].isdigit():
            return keyboard.KeyCode.from_vk(111 + int(key_name[1:]))
        raise ValueError(f"Unknown key: {key_name}")

    def _handle_press(self, key):
        if key == self._key and not self._pressed:
            self._pressed = True
            logger.debug("Push-to-talk pressed")
            try:
                self._on_press()
            except Exception:
                logger.exception("on_press callback failed")

    def _handle_release(self, key):
        if key == self._key and self._pressed:
            self._pressed = False
            logger.debug("Push-to-talk released")
            try:
                self._on_release()
            except Exception:
                logger.exception("on_release callback failed")

    def start(self):
        self._listener = keyboard.Listener(
            on_press=self._handle_press,
            on_release=self._handle_release,
        )
        self._listener.daemon = True
        self._listener.start()
        logger.info("Hotkey listener started (key=%s)", self._key)

    def stop(self):
        if self._listener:
            self._listener.stop()
            self._listener = None
