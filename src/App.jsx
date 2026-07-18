import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import RoastCard from './components/RoastCard';
import EmailGate from './components/EmailGate';
import ChatBot from './components/ChatBot';
import { logVisit } from './lib/analytics';
import { trackGoal } from './lib/datafast';

const hasConvex = Boolean(import.meta.env.VITE_CONVEX_URL);

function useAutoRoast(username, loading, result, onRoast) {
  const autoRan = useRef(false);

  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get('u');
    if (!u || result || loading || autoRan.current) return;
    autoRan.current = true;
    onRoast({ preventDefault: () => {} }, u);
  }, [username, loading, result, onRoast]);
}

function useMidnightReset() {
  const [startOfToday, setStartOfToday] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  useEffect(() => {
    let timeoutId;
    function scheduleNextReset() {
      const now = Date.now();
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      const msUntilMidnight = nextMidnight.getTime() - now;

      // Add a 100ms buffer to ensure we are safely into the next day
      timeoutId = setTimeout(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        setStartOfToday(d.getTime());
        scheduleNextReset();
      }, msUntilMidnight + 100);
    }

    scheduleNextReset();
    return () => clearTimeout(timeoutId);
  }, []);

  return startOfToday;
}

function useLocalRoastCount(startOfToday) {
  const [count, setCount] = useState(() => {
    try {
      const stored = localStorage.getItem('local_roast_count');
      if (stored) {
        const { timestamp, value } = JSON.parse(stored);
        if (timestamp === startOfToday) {
          return value;
        }
      }
    } catch {
      // Ignore
    }
    return 0;
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('local_roast_count');
      if (stored) {
        const { timestamp } = JSON.parse(stored);
        if (timestamp !== startOfToday) {
          setCount(0);
          localStorage.setItem('local_roast_count', JSON.stringify({ timestamp: startOfToday, value: 0 }));
        }
      } else {
        localStorage.setItem('local_roast_count', JSON.stringify({ timestamp: startOfToday, value: count }));
      }
    } catch {
      // Ignore
    }
  }, [startOfToday, count]);

  const increment = useCallback(() => {
    setCount((prev) => {
      const newVal = prev + 1;
      try {
        localStorage.setItem('local_roast_count', JSON.stringify({ timestamp: startOfToday, value: newVal }));
      } catch {
        // Ignore
      }
      return newVal;
    });
  }, [startOfToday]);

  return [count, increment];
}

function RoastApp() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const startOfToday = useMidnightReset();
  const recordRoast = useMutation(api.roasts.record);
  const todayRoastCount = useQuery(api.roasts.getTodayCount, { startOfToday });

  const addSignup = useMutation(api.signups.add);
  const logVisitMutation = useMutation(api.visits.log);
  const signupCount = useQuery(api.signups.count);
  const visitCount = useQuery(api.visits.count);

  useEffect(() => {
    logVisit(logVisitMutation);
  }, [logVisitMutation]);

  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get('u');
    if (u) setUsername(u);
  }, []);

  const handleRoast = useCallback(
    async (e, overrideUser) => {
      e.preventDefault();
      const target = (overrideUser || username).trim().replace(/^@/, '');
      if (!target) return;

      setError('');
      setResult(null);
      setLoading(true);
      setUsername(target);

      try {
        const res = await fetch('/api/roast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: target }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Roast failed');
        setResult(data);
        trackGoal('roast', { username: data.stats.login });

        // Record the roast in Convex
        await recordRoast({ username: data.stats.login });

        const url = new URL(window.location.href);
        url.searchParams.set('u', data.stats.login);
        window.history.replaceState({}, '', url);
        document.title = `@${data.stats.login} got roasted | GitHub Roast`;
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [username, recordRoast],
  );

  useAutoRoast(username, loading, result, handleRoast);

  async function handleSignup(email, emailSent) {
    if (!result) return;
    await addSignup({
      email,
      username: result.stats.login,
      roast: result.roast,
      emailSent: emailSent ?? false,
    });
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
      showStats
      todayRoastCount={todayRoastCount}
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
  showStats,
  todayRoastCount,
}) {
  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Hermes Buildathon · Virality Track</p>
        <h1>GitHub Roast</h1>
        <p className="subtitle">
          Type a GitHub username → get a viral one-liner roast → share the card → sign up for the full
          autopsy.
        </p>
      </header>

      <form className="roast-form" onSubmit={onRoast}>
        {todayRoastCount !== undefined && todayRoastCount !== null && (
          <div className="daily-counter">
            <span className="counter-icon">🔥</span>
            <span className="counter-text">
              <span className="counter-number">{todayRoastCount}</span> {todayRoastCount === 1 ? 'developer' : 'developers'} roasted today
            </span>
          </div>
        )}
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
          <RoastCard stats={result.stats} roast={result.roast} />
          <EmailGate
            username={result.stats.login}
            roast={result.roast}
            stats={result.stats}
            onSignup={onSignup}
          />
        </section>
      )}

      {showStats && signupCount != null && visitCount != null && (
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

  const startOfToday = useMidnightReset();
  const [localRoastCount, incrementLocalRoastCount] = useLocalRoastCount(startOfToday);

  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get('u');
    if (u) setUsername(u);
  }, []);

  const handleRoast = useCallback(
    async (e, overrideUser) => {
      e.preventDefault();
      const target = (overrideUser || username).trim().replace(/^@/, '');
      if (!target) return;

      setError('');
      setResult(null);
      setLoading(true);
      setUsername(target);

      try {
        const res = await fetch('/api/roast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: target }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Roast failed');
        setResult(data);
        trackGoal('roast', { username: data.stats.login });

        // Increment local count
        incrementLocalRoastCount();

        const url = new URL(window.location.href);
        url.searchParams.set('u', data.stats.login);
        window.history.replaceState({}, '', url);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [username, incrementLocalRoastCount],
  );

  useAutoRoast(username, loading, result, handleRoast);

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
      showStats={false}
      todayRoastCount={localRoastCount}
    />
  );
}

export default function App() {
  return hasConvex ? <RoastApp /> : <AppWithoutConvex />;
}
