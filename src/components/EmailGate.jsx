import { useState } from 'react';
import FullReport from './FullReport';
import { trackGoal } from '../lib/datafast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REPORT_PREVIEW = [
  'Language breakdown & commit patterns',
  'Repo hall of shame with last-push dates',
  'Follower ratio verdict',
  'Personalized recovery plan (jk... unless?)',
];

export default function EmailGate({ username, roast, stats, onSignup }) {
  const [step, setStep] = useState('locked');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [unlocked, setUnlocked] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setErrorMsg('Enter a valid email address.');
      return;
    }
    if (!consent) {
      setErrorMsg('Tick the box to agree before signing up.');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, username, roast, stats }),
      });
      const data = await res.json();
      if (!res.ok && !data.report) throw new Error(data.error || 'Signup failed');

      const emailSent = Boolean(data.emailSent);

      if (onSignup) {
        try {
          await onSignup(trimmed, emailSent);
        } catch {
          /* Convex optional */
        }
      }

      trackGoal('signup', { username, email_sent: String(emailSent) });

      setUnlocked({
        report: data.report,
        emailSent,
        email: trimmed,
        emailError: data.emailError,
      });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Signup failed — try again.');
    }
  }

  if (status === 'done' && unlocked) {
    return (
      <div className="email-gate success">
        <div className="gate-icon">✅</div>
        <h3>You're signed up!</h3>
        <p>
          Welcome to the roast club, <strong>{unlocked.email}</strong>.
        </p>
        <FullReport
          username={username}
          roast={roast}
          report={unlocked.report}
          emailSent={unlocked.emailSent}
          email={unlocked.email}
          emailError={unlocked.emailError}
        />
      </div>
    );
  }

  if (step === 'locked') {
    return (
      <div className="email-gate locked">
        <div className="gate-icon">🔒</div>
        <h3>Full report locked</h3>
        <p>That's the teaser. Sign up free to unlock the deep-dive autopsy for @{username}.</p>

        <ul className="report-preview">
          {REPORT_PREVIEW.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <button type="button" className="unlock-cta" onClick={() => setStep('signup')}>
          Sign up to unlock →
        </button>
        <p className="gate-note">Step 1 of 2 — no email collected until you sign up.</p>
      </div>
    );
  }

  return (
    <div className="email-gate signup">
      <button type="button" className="back-link" onClick={() => setStep('locked')}>
        ← Back
      </button>
      <h3>Create your free account</h3>
      <p>Step 2 of 2 — enter email + agree. We'll unlock the report instantly and email you a copy.</p>

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
            I want to sign up and receive my full GitHub roast report at this email. One email, no spam.
          </span>
        </label>

        <button type="submit" className="submit-cta" disabled={status === 'loading' || !consent}>
          {status === 'loading' ? 'Unlocking…' : 'Sign up & unlock report'}
        </button>
      </form>

      {(status === 'error' || errorMsg) && <p className="error">{errorMsg}</p>}
    </div>
  );
}
