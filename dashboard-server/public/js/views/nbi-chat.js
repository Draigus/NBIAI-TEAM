// ==================== EMBEDDED CLAUDE CHAT ====================

var _chatWs = null;
var _chatOpen = false;
var _chatMessages = [];
var _chatStreaming = false;

function _chatToggle() {
  _chatOpen = !_chatOpen;
  var panel = document.getElementById('ccChatPanel');
  var fab = document.getElementById('ccChatFab');
  if (panel) panel.className = 'cc-chat' + (_chatOpen ? '' : ' hidden');
  if (fab) fab.className = 'cc-chat-fab' + (_chatOpen ? ' hidden' : '');
  if (_chatOpen) _chatClearAlert();
  if (_chatOpen && !_chatWs) _chatConnect();
}

function _chatAlert() {
  var fab = document.getElementById('ccChatFab');
  if (fab && !_chatOpen) {
    fab.classList.add('has-alert');
    var img = fab.querySelector('img');
    if (img) img.src = '/public/img/playsage-notify.gif';
  }
}

function _chatClearAlert() {
  var fab = document.getElementById('ccChatFab');
  if (fab) {
    fab.classList.remove('has-alert');
    var img = fab.querySelector('img');
    if (img) img.src = '/public/img/playsage-icon.png';
  }
}

function _chatConnect() {
  var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  _chatWs = new WebSocket(proto + '//' + location.host + '/ws/chat');
  _chatWs.onmessage = function(ev) {
    var msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.type === 'chunk') {
      if (_chatMessages.length > 0 && _chatMessages[_chatMessages.length - 1].role === 'typing') {
        _chatMessages[_chatMessages.length - 1].text += msg.text;
      } else {
        _chatMessages.push({ role: 'typing', text: msg.text });
      }
      _chatRenderMsgs();
    } else if (msg.type === 'done') {
      if (_chatMessages.length > 0 && _chatMessages[_chatMessages.length - 1].role === 'typing') {
        _chatMessages[_chatMessages.length - 1].role = 'assistant';
        _chatMessages[_chatMessages.length - 1].text = msg.text;
      }
      _chatStreaming = false;
      _chatRenderMsgs();
      var btn = document.getElementById('ccChatSend');
      if (btn) btn.disabled = false;
    } else if (msg.type === 'error') {
      _chatMessages.push({ role: 'error', text: msg.text });
      _chatStreaming = false;
      _chatRenderMsgs();
      var btn2 = document.getElementById('ccChatSend');
      if (btn2) btn2.disabled = false;
    }
  };
  _chatWs.onclose = function() { _chatWs = null; };
}

function _chatSend() {
  var input = document.getElementById('ccChatInput');
  if (!input || !input.value.trim()) return;
  var text = input.value.trim();
  input.value = '';
  _chatMessages.push({ role: 'user', text: text });
  _chatStreaming = true;
  _chatRenderMsgs();
  var btn = document.getElementById('ccChatSend');
  if (btn) btn.disabled = true;
  if (!_chatWs || _chatWs.readyState !== WebSocket.OPEN) _chatConnect();
  setTimeout(function() {
    if (_chatWs && _chatWs.readyState === WebSocket.OPEN) {
      _chatWs.send(JSON.stringify({ type: 'chat', text: text }));
    }
  }, 100);
}

function _chatRenderMsgs() {
  var container = document.getElementById('ccChatMsgs');
  if (!container) return;
  var html = '';
  _chatMessages.forEach(function(m) {
    var cls = m.role === 'user' ? 'user' : m.role === 'error' ? 'error' : m.role === 'typing' ? 'assistant typing' : 'assistant';
    var content = m.role === 'user' || m.role === 'error' ? esc(m.text) : _chatMd(m.text);
    html += '<div class="cc-chat-msg ' + cls + '">' + content + '</div>';
  });
  if (_chatStreaming && (_chatMessages.length === 0 || _chatMessages[_chatMessages.length - 1].role !== 'typing')) {
    html += '<div class="cc-chat-msg assistant typing">Thinking...</div>';
  }
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function _chatMd(text) {
  if (!text) return '';
  var s = esc(text);
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/^### (.*$)/gm, '<strong style="font-size:0.9em;">$1</strong>');
  s = s.replace(/^## (.*$)/gm, '<strong style="font-size:0.95em;">$1</strong>');
  s = s.replace(/^# (.*$)/gm, '<strong style="font-size:1em;">$1</strong>');
  s = s.replace(/^- (.*$)/gm, '&bull; $1');
  s = s.replace(/^\d+\. (.*$)/gm, function(m, p1) { return '&bull; ' + p1; });
  s = s.replace(/\n/g, '<br>');
  return s;
}

function _chatKeydown(ev) {
  if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); _chatSend(); }
}

