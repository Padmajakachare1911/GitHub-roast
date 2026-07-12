export function buildFullReport(stats, roast) {
  const accountAge = stats.createdAt
    ? Math.floor((Date.now() - new Date(stats.createdAt)) / (365.25 * 24 * 60 * 60 * 1000))
    : '?';

  const ratio =
    stats.following > 0
      ? (stats.followers / stats.following).toFixed(1)
      : stats.followers;

  return `GITHUB ROAST — FULL REPORT
@${stats.login}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR ROAST
"${roast}"

PROFILE AUTOPSY
• Public repos: ${stats.publicRepos}
• Followers / Following: ${stats.followers} / ${stats.following} (ratio ${ratio})
• Account age: ~${accountAge} years
• Bio: ${stats.bio || '(empty — the silence is loud)'}
• Top languages: ${stats.topLanguages.join(', ')}
• Stale repos (6+ mo): ${stats.staleRepoCount}
• Repos with descriptions: ${stats.reposWithDescription}/${stats.totalReposFetched}
• Forks: ${stats.forkCount}

REPO HALL OF SHAME
${stats.repoNames.map((r) => `• ${r}`).join('\n')}

RECENT ACTIVITY
${stats.recentRepos.length ? stats.recentRepos.map((r) => `• ${r}`).join('\n') : '• Nothing. Absolutely nothing.'}

VERDICT
${stats.staleRepoCount > stats.publicRepos / 2 ? 'Your GitHub is a museum, not a portfolio.' : stats.publicRepos < 3 ? 'Quantity is a strategy — you chose peace.' : 'Not terrible. But we both know that README could use work.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Roast a friend → https://github-roast.pages.dev/?u=THEIR_USERNAME
`;
}
