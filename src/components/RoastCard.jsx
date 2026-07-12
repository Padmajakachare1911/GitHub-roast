export default function RoastCard({ stats, roast, onShare }) {
  return (
    <div className="roast-card" id="roast-card">
      <div className="card-header">
        <img src={stats.avatarUrl} alt="" className="avatar" />
        <div>
          <h2>@{stats.login}</h2>
          <p className="meta">
            {stats.publicRepos} repos · {stats.followers} followers ·{' '}
            {stats.topLanguages.slice(0, 2).join(', ')}
          </p>
        </div>
      </div>
      <blockquote className="roast-text">{roast}</blockquote>
      <div className="card-actions">
        <button type="button" className="share-btn" onClick={onShare}>
          Share roast
        </button>
      </div>
    </div>
  );
}
