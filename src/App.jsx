import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import RoastCard from './components/RoastCard';
import EmailGate from './components/EmailGate';
import ChatBot from './components/ChatBot';
import { logVisit } from './lib/analytics';

function RoastApp({ withConvex }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const addSignup = useMutation(api.signups.add);
  const logVisitMutation = useMutation(api.visits.log);
  const signupCount = useQuery(api.signups.count);
  const visitCount = useQuery(api.visits.count);

  useEffect(() => {
    logVisit(logVisitMutation);
  }, [logVisitMutation]);

  async function handleRoast(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Roast failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(email) {
    if (!result) return;
    await addSignup({ email, username: result.stats.login });
  }

  return (
    <AppShell
      username={username}
      setUsername={setUsername}
      loading={loading}
      error={error}
      result={result}
      onRoast={handleRoast}
      onSignup={handleSignup}
      signupCount={signupCount}
      visitCount={visitCount}
      withConvex={withConvex}
    />
  );
}

function AppShell({
  username,
  setUsername,
  loading,
  error,
  result,
  onRoast,
  onSignup,
  signupCount,
  visitCount,
  withConvex,
}) {
  async function handleShare() {
    const url = window.location.href;
    const text = `I just got roasted by GitHub Roast. Try yours: ${url}`;
    if (navigator.share) {
      await navigator.share({ title: 'GitHub Roast', text, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied!');
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Hermes Buildathon · Virality Track</p>
        <h1>GitHub Roast</h1>
        <p className="subtitle">
          Enter a GitHub username. Our AI reads your repos, commit habits, and README
          energy — then delivers a shareable roast.
        </p>
      </header>

      <form className="roast-form" onSubmit={onRoast}>
        <div className="input-row">
          <span className="prefix">github.com/</span>
          <input
            type="text"
            placeholder="octocat"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={loading || !username.trim()}>
            {loading ? 'Roasting…' : 'Roast me'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>

      {result && (
        <section className="results">
          <RoastCard stats={result.stats} roast={result.roast} onShare={handleShare} />
          <EmailGate username={result.stats.login} onSubmit={onSignup} withConvex={withConvex} />
        </section>
      )}

      {withConvex && signupCount != null && visitCount != null && (
        <footer className="stats-bar">
          <span>{visitCount} visitors</span>
          <span>{signupCount} signups</span>
        </footer>
      )}

      <ChatBot stats={result?.stats} roast={result?.roast} />
    </div>
  );
}

function AppWithoutConvex() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleRoast(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Roast failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      username={username}
      setUsername={setUsername}
      loading={loading}
      error={error}
      result={result}
      onRoast={handleRoast}
      onSignup={null}
      signupCount={null}
      visitCount={null}
      withConvex={false}
    />
  );
}

export default function App() {
  const withConvex = Boolean(import.meta.env.VITE_CONVEX_URL);
  return withConvex ? <RoastApp withConvex /> : <AppWithoutConvex />;
}
