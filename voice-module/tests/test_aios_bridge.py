import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from lib.aios_bridge import ConversationContext, AiosBridge


class TestConversationContext:
    def test_empty_context(self):
        ctx = ConversationContext(max_exchanges=5)
        assert ctx.get_context() == []

    def test_add_exchange(self):
        ctx = ConversationContext(max_exchanges=5)
        ctx.add("what signals today?", "Three signals came in.")
        exchanges = ctx.get_context()
        assert len(exchanges) == 1
        assert exchanges[0]["user"] == "what signals today?"
        assert exchanges[0]["assistant"] == "Three signals came in."

    def test_rolling_window(self):
        ctx = ConversationContext(max_exchanges=3)
        for i in range(5):
            ctx.add(f"q{i}", f"a{i}")
        exchanges = ctx.get_context()
        assert len(exchanges) == 3
        assert exchanges[0]["user"] == "q2"
        assert exchanges[2]["user"] == "q4"

    def test_reset(self):
        ctx = ConversationContext(max_exchanges=5)
        ctx.add("hello", "hi")
        ctx.reset()
        assert ctx.get_context() == []

    def test_check_reset_phrase(self):
        ctx = ConversationContext(max_exchanges=5)
        reset_phrases = ["that's all", "thanks", "never mind"]
        assert ctx.is_reset_phrase("that's all", reset_phrases) is True
        assert ctx.is_reset_phrase("That's All", reset_phrases) is True
        assert ctx.is_reset_phrase("tell me more", reset_phrases) is False


class TestAiosBridge:
    @pytest.fixture
    def bridge(self):
        return AiosBridge(
            api_url="http://localhost:8888",
            internal_token="test-token-123",
            max_context_exchanges=5,
            context_reset_phrases=["that's all", "thanks"],
        )

    def test_build_request_payload(self, bridge):
        payload = bridge._build_payload("what signals today?")
        assert payload["text"] == "what signals today?"
        assert payload["context"] == []

    def test_build_request_payload_with_context(self, bridge):
        bridge._context.add("previous q", "previous a")
        payload = bridge._build_payload("follow up")
        assert payload["text"] == "follow up"
        assert len(payload["context"]) == 1
        assert payload["context"][0]["user"] == "previous q"

    @pytest.mark.asyncio
    async def test_send_calls_api(self, bridge):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response_text": "Here are today's signals.",
            "action_id": None,
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
            result = await bridge.send("what signals today?")

        assert result["response_text"] == "Here are today's signals."
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args
        assert call_kwargs.kwargs["headers"]["x-nbi-internal-token"] == "test-token-123"

    @pytest.mark.asyncio
    async def test_send_updates_context(self, bridge):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response_text": "Response text.",
            "action_id": None,
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            await bridge.send("my question")

        ctx = bridge._context.get_context()
        assert len(ctx) == 1
        assert ctx[0]["user"] == "my question"
        assert ctx[0]["assistant"] == "Response text."

    @pytest.mark.asyncio
    async def test_send_resets_on_phrase(self, bridge):
        bridge._context.add("old q", "old a")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response_text": "Goodbye.",
            "action_id": None,
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            result = await bridge.send("thanks")

        assert result["response_text"] == "Goodbye."
        assert bridge._context.get_context() == []

    @pytest.mark.asyncio
    async def test_send_handles_api_error(self, bridge):
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_response.raise_for_status.side_effect = Exception("500 Server Error")

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            result = await bridge.send("hello")

        assert "can't reach the system" in result["response_text"].lower() or "error" in result["response_text"].lower()
