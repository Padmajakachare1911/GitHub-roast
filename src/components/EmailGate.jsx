import { useState } from 'react';

export default function EmailGate({ username, onSubmit, withConvex }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !onSubmit) return;

    setStatus('loading');
    try {
      await onSubmit(email.trim());
      setStatus('done');
    } catch (err) {
      setStatus('error');
      console.error(err);
    }
  }

  if (!withConvex) {
    return (
      <div className="email-gate">
        <h3>Unlock your full roast report</h3>
        <p className="hint">
          Run <code>npx convex dev</code> to enable email capture.
        </p>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="email-gate success">
        <h3>Full report unlocked</h3>
        <p>Check your inbox soon — we saved your roast for @{username}.</p>
      </div>
    );
  }

  return (
    <div className="email-gate">
      <h3>Unlock your full roast report</h3>
      <p>Deeper stats, language breakdown, and repo autopsy — free, one email.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === 'loading'}
        />
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Saving…' : 'Unlock'}
        </button>
      </form>
      {status === 'error' && <p className="error">Signup failed — try again.</p>}
    </div>
  );
}
