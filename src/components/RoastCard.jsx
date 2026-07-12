import { useRef, useState } from 'react';
import {
  copyShareCaption,
  downloadCardImage,
  getShareUrl,
  openInstagramHint,
  openLinkedInShare,
  openTwitterShare,
  openWhatsAppShare,
  shareCardNative,
} from '../lib/shareCard';

function proxyAvatar(url) {
  if (!url) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=200&h=200&fit=cover&mask=circle`;
}

function CardContent({ stats, roast, exportMode = false }) {
  const lang = stats.topLanguages[0]?.split(' ')[0] ?? '???';
  return (
    <>
      <div className="card-brand">
        <span className="brand-mark">GITHUB ROAST</span>
        <span className="brand-tag">AI · VIRAL · FREE</span>
      </div>

      <div className="card-stamp">ROASTED</div>

      <div className="card-header">
        <img
          src={proxyAvatar(stats.avatarUrl)}
          alt=""
          className="avatar"
          crossOrigin="anonymous"
        />
        <div>
          <h2>@{stats.login}</h2>
          <p className="meta">
            {stats.publicRepos} repos · {stats.followers} followers · {stats.staleRepoCount} stale
          </p>
        </div>
      </div>

      <blockquote className="roast-text">{roast}</blockquote>

      <div className="card-footer">
        <span className="card-stat">{lang}</span>
        <span className="card-cta">github-roast.pages.dev</span>
      </div>

      {exportMode && (
        <p className="card-watermark">Get roasted → github-roast.pages.dev/?u={stats.login}</p>
      )}
    </>
  );
}

export default function RoastCard({ stats, roast }) {
  const exportRef = useRef(null);
  const [shareStatus, setShareStatus] = useState('');
  const [busy, setBusy] = useState(false);

  function flash(msg, ms = 4000) {
    setShareStatus(msg);
    setTimeout(() => setShareStatus(''), ms);
  }

  async function withExport(fn) {
    setBusy(true);
    try {
      await fn(exportRef.current, stats.login, roast);
    } catch (err) {
      if (err.name !== 'AbortError') flash('Share failed — try Download PNG.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="share-wrap">
      <div className="roast-card social-card visible-card">
        <CardContent stats={stats} roast={roast} />
      </div>

      <div className="export-card-host" aria-hidden="true">
        <div className="roast-card social-card export-card" ref={exportRef}>
          <CardContent stats={stats} roast={roast} exportMode />
        </div>
      </div>

      <p className="share-hint">↓ Download the card & post it — that's what goes viral</p>

      <div className="share-grid">
        <button
          type="button"
          className="share-btn primary"
          disabled={busy}
          onClick={() =>
            withExport(async (el, user, text) => {
              await downloadCardImage(el, user);
              flash('PNG saved — upload to Instagram / X / WhatsApp!');
            })
          }
        >
          Download PNG
        </button>
        <button
          type="button"
          className="share-btn"
          disabled={busy}
          onClick={() =>
            withExport(async (el, user, text) => {
              const result = await shareCardNative(el, user, text);
              const msgs = {
                shared: 'Shared with image!',
                copied: 'Caption copied — paste on your story!',
                'link-shared': 'Link shared!',
              };
              flash(msgs[result] || 'Done!');
            })
          }
        >
          Share
        </button>
        <button
          type="button"
          className="share-btn x"
          disabled={busy}
          onClick={() =>
            withExport(async (el, user, text) => {
              await downloadCardImage(el, user);
              openTwitterShare(user, text);
              flash('PNG saved + X opened — attach the image to your tweet!');
            })
          }
        >
          Post on X
        </button>
        <button
          type="button"
          className="share-btn wa"
          disabled={busy}
          onClick={() =>
            withExport(async (el, user, text) => {
              await downloadCardImage(el, user);
              openWhatsAppShare(user, text);
              flash('PNG saved + WhatsApp opened — attach the image!');
            })
          }
        >
          WhatsApp
        </button>
        <button
          type="button"
          className="share-btn ig"
          disabled={busy}
          onClick={() =>
            withExport(async (el, user) => {
              await downloadCardImage(el, user);
              openInstagramHint(user);
            })
          }
        >
          Instagram
        </button>
        <button
          type="button"
          className="share-btn li"
          onClick={() => openLinkedInShare(stats.login, roast)}
        >
          LinkedIn
        </button>
        <button
          type="button"
          className="share-btn copy"
          onClick={() => {
            copyShareCaption(stats.login, roast);
            flash('Caption copied!');
          }}
        >
          Copy caption
        </button>
      </div>

      <p className="share-link">
        Share link:{' '}
        <a href={getShareUrl(stats.login)} target="_blank" rel="noreferrer">
          {getShareUrl(stats.login)}
        </a>
      </p>

      {shareStatus && <p className="share-status">{shareStatus}</p>}
    </div>
  );
}
