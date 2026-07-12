import { useState } from 'react';

const REPORT_PREVIEW = [
  'Language breakdown & commit patterns',
  'Repo hall of shame with last-push dates',
  'Follower-to-following ratio verdict',
  'Personalized recovery plan (jk... unless?)',
];

export default function EmailGate({ username, onSubmit, withConvex }) {
  const [step, setStep] = useState('locked');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Enter a valid email address.');
      return;
    }
    if (!consent) {
      setErrorMsg('Please agree to receive your roast report via email.');
      return;
    }
    if (!onSubmit) return;

    setStatus('loading');
    try {
      await onSubmit(email.trim());
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Signup failed — try again.');
    }
  }

  if (!withConvex) {
    return (
      <div className="email-gate locked">
        <div className="gate-icon">🔒</div>
        <h3>Full roast report locked</h3>
        <p className="hint">Run <code>npx convex dev</code> to enable signups + email delivery.</p>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="email-gate success">
        <div className="gate-icon">✅</div>
        <h3>You're signed up!</h3>
        <p>
          Full report for <strong>@{username}</strong> is on its way to <strong>{email}</strong>.
          Check spam if it doesn't land in 2 minutes.
        </p>
      </div>
    );
  }

  if (step === 'locked') {
    return (
      <div className="email-gate locked">
        <div className="gate-icon">🔒</div>
        <h3>Want the full roast report?</h3>
        <p>Sign up free — we'll email you the deep-dive autopsy for @{username}.</p>

        <ul className="report-preview">
          {REPORT_PREVIEW.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <button type="button" className="unlock-cta" onClick={() => setStep('signup')}>
          Sign up to unlock →
        </button>
      </div>
    );
  }

  return (
    <div className="email-gate signup">
      <button type="button" className="back-link" onClick={() => setStep('locked')}>
        ← Back
      </button>
      <h3>Sign up for your full report</h3>
      <p>Enter your email. We'll send the complete roast breakdown instantly.</p>

      <form onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="signup-email">
          Email address
        </label>
        <input
          id="signup-email"
          type="email"
          placeholder="you@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === 'loading'}
          autoComplete="email"
        />

        <label className="consent-row">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={status === 'loading'}
          />
          <span>
            I agree to receive my GitHub roast report at this email. One email, no spam.
          </span>
        </label>

        <button type="submit" className="submit-cta" disabled={status === 'loading' || !consent}>
          {status === 'loading' ? 'Sending report…' : 'Sign up & get report'}
        </button>
      </form>

      {(status === 'error' || errorMsg) && <p className="error">{errorMsg}</p>}
    </div>
  );
}
