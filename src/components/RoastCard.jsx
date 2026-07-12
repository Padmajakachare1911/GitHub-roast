import { useRef, useState } from 'react';
import {
  downloadCardImage,
  getShareUrl,
  openLinkedInShare,
  openTwitterShare,
  openWhatsAppShare,
  shareCardNative,
} from '../lib/shareCard';

export default function RoastCard({ stats, roast }) {
  const cardRef = useRef(null);
  const [shareStatus, setShareStatus] = useState('');

  async function handleDownload() {
    try {
      await downloadCardImage(cardRef.current, stats.login);
      setShareStatus('Image saved — post it anywhere!');
      setTimeout(() => setShareStatus(''), 3000);
    } catch {
      setShareStatus('Could not save image. Try again.');
    }
  }

  async function handleNativeShare() {
    try {
      const result = await shareCardNative(cardRef.current, stats.login, roast);
      setShareStatus(result === 'copied' ? 'Caption copied — paste on your story!' : 'Shared!');
      setTimeout(() => setShareStatus(''), 3000);
    } catch (err) {
      if (err.name !== 'AbortError') setShareStatus('Share failed — try Download PNG instead.');
    }
  }

  return (
    <div className="share-wrap">
      <div className="roast-card social-card" id="roast-card" ref={cardRef}>
        <div className="card-brand">
          <span className="brand-mark">🔥 GITHUB ROAST</span>
          <span className="brand-url">github-roast.pages.dev</span>
        </div>

        <div className="card-header">
          <img src={stats.avatarUrl} alt="" className="avatar" crossOrigin="anonymous" />
          <div>
            <h2>@{stats.login}</h2>
            <p className="meta">
              {stats.publicRepos} repos · {stats.followers} followers
            </p>
          </div>
        </div>

        <blockquote className="roast-text">"{roast}"</blockquote>

        <div className="card-footer">
          <span className="card-stat">{stats.topLanguages[0]?.split(' ')[0] ?? '???'}</span>
          <span className="card-stat">{stats.staleRepoCount} stale repos</span>
          <span className="card-cta">Get roasted →</span>
        </div>
      </div>

      <p className="share-hint">Screenshot this card or tap a button below ↓</p>

      <div className="share-grid">
        <button type="button" className="share-btn primary" onClick={handleNativeShare}>
          Share
        </button>
        <button type="button" className="share-btn" onClick={handleDownload}>
          Download PNG
        </button>
        <button type="button" className="share-btn x" onClick={() => openTwitterShare(stats.login, roast)}>
          Post on X
        </button>
        <button type="button" className="share-btn wa" onClick={() => openWhatsAppShare(stats.login, roast)}>
          WhatsApp
        </button>
        <button type="button" className="share-btn li" onClick={() => openLinkedInShare(stats.login)}>
          LinkedIn
        </button>
        <button
          type="button"
          className="share-btn"
          onClick={() => {
            navigator.clipboard.writeText(getShareUrl(stats.login));
            setShareStatus('Link copied!');
            setTimeout(() => setShareStatus(''), 2500);
          }}
        >
          Copy link
        </button>
      </div>

      {shareStatus && <p className="share-status">{shareStatus}</p>}
    </div>
  );
}
