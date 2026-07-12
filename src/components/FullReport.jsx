export default function FullReport({ username, roast, report, emailSent, email, emailError }) {
  return (
    <div className="full-report">
      <div className="report-header">
        <span className="report-badge">UNLOCKED</span>
        <h3>Full roast report — @{username}</h3>
      </div>

      <blockquote className="report-roast">"{roast}"</blockquote>

      <pre className="report-body">{report}</pre>

      <p className="report-footer">
        {emailSent ? (
          <>
            Also sent to <strong>{email}</strong> — check spam if missing.
          </>
        ) : emailError ? (
          <>
            Report unlocked above. Email failed: {emailError}
          </>
        ) : (
          <>Report unlocked above. Email delivery pending server config.</>
        )}
      </p>
    </div>
  );
}
