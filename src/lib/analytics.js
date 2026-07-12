let visitLogged = false;

export async function logVisit(logMutation) {
  if (visitLogged || !logMutation) return;
  visitLogged = true;

  const sessionId = getSessionId();
  const referrer = document.referrer || undefined;

  try {
    await logMutation({
      sessionId,
      referrer,
      path: window.location.pathname,
    });
  } catch {
    visitLogged = false;
  }
}

function getSessionId() {
  const key = 'gr_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}
