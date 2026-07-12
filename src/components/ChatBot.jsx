import { useState } from 'react';

export default function ChatBot({ stats, roast }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const canChat = Boolean(stats && roast);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || !canChat) return;

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          stats,
          roast,
          history: nextMessages.slice(0, -1),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`chat-bot ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="chat-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle roast chat"
      >
        {open ? '×' : '💬'}
      </button>

      {open && (
        <div className="chat-panel">
          <header>
            <strong>Roast Bot</strong>
            <span>Free API · no Telegram needed</span>
          </header>

          {!canChat ? (
            <p className="chat-hint">Roast a profile first, then ask follow-ups here.</p>
          ) : (
            <>
              <div className="chat-messages">
                {messages.length === 0 && (
                  <p className="chat-hint">
                    Ask why your repos are stale, what language to learn next, or beg for mercy.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.role}`}>
                    {m.content}
                  </div>
                ))}
                {loading && <div className="chat-bubble assistant">Thinking…</div>}
              </div>
              <form className="chat-input" onSubmit={sendMessage}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your roast…"
                  disabled={loading}
                />
                <button type="submit" disabled={loading || !input.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
