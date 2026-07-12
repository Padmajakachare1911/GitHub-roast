const websiteId = import.meta.env.VITE_DATAFAST_WEBSITE_ID;
const domain = import.meta.env.VITE_DATAFAST_DOMAIN;

let initialized = false;

function ensureQueue() {
  window.datafast =
    window.datafast ||
    function () {
      window.datafast.q = window.datafast.q || [];
      window.datafast.q.push(arguments);
    };
}

export function initDataFast() {
  if (initialized || !websiteId || !domain) return;
  initialized = true;

  ensureQueue();

  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://datafa.st/js/script.js';
  script.dataset.websiteId = websiteId;
  script.dataset.domain = domain;
  document.head.appendChild(script);
}

export function trackGoal(name, metadata) {
  if (!websiteId) return;
  ensureQueue();
  if (metadata && Object.keys(metadata).length > 0) {
    window.datafast(name, metadata);
  } else {
    window.datafast(name);
  }
}
