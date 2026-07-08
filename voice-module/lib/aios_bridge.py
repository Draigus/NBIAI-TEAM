import logging
from collections import deque

import httpx

logger = logging.getLogger(__name__)


class ConversationContext:
    def __init__(self, max_exchanges=5):
        self._max = max_exchanges
        self._exchanges = deque(maxlen=max_exchanges)

    def add(self, user_text, assistant_text):
        self._exchanges.append({"user": user_text, "assistant": assistant_text})

    def get_context(self):
        return list(self._exchanges)

    def reset(self):
        self._exchanges.clear()

    @staticmethod
    def is_reset_phrase(text, reset_phrases):
        return text.strip().lower() in [p.lower() for p in reset_phrases]


class AiosBridge:
    def __init__(self, api_url, internal_token, max_context_exchanges=5, context_reset_phrases=None):
        self._api_url = api_url.rstrip("/")
        self._token = internal_token
        self._context = ConversationContext(max_exchanges=max_context_exchanges)
        self._reset_phrases = context_reset_phrases or []

    def _build_payload(self, text):
        return {
            "text": text,
            "context": self._context.get_context(),
        }

    async def send(self, text):
        is_reset = ConversationContext.is_reset_phrase(text, self._reset_phrases)

        payload = self._build_payload(text)
        headers = {
            "Content-Type": "application/json",
            "x-nbi-internal-token": self._token,
        }
        url = f"{self._api_url}/api/internal/aios/voice-input"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
        except Exception:
            logger.exception("AIOS API call failed")
            data = {
                "response_text": "I can't reach the system right now.",
                "action_id": None,
            }

        response_text = data.get("response_text", "")
        self._context.add(text, response_text)

        if is_reset:
            self._context.reset()

        return data

    def reset_context(self):
        self._context.reset()
