import { toPng } from 'html-to-image';

const SITE_URL = 'https://github-roast.pages.dev';

export function getShareUrl(username) {
  const base = import.meta.env.PROD ? SITE_URL : window.location.origin;
  return `${base}/?u=${encodeURIComponent(username)}`;
}

export function getShareText(username, roast) {
  const snippet = roast.length > 120 ? `${roast.slice(0, 117)}…` : roast;
  return `🔥 @${username} got ROASTED on GitHub:\n\n"${snippet}"\n\nGet yours → ${getShareUrl(username)}`;
}

export async function exportCardAsPng(element) {
  if (!element) throw new Error('Card not found');
  return toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#0d1117',
  });
}

export async function downloadCardImage(element, username) {
  const dataUrl = await exportCardAsPng(element);
  const link = document.createElement('a');
  link.download = `github-roast-${username}.png`;
  link.href = dataUrl;
  link.click();
  return dataUrl;
}

export async function shareCardNative(element, username, roast) {
  const dataUrl = await exportCardAsPng(element);
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `github-roast-${username}.png`, { type: 'image/png' });
  const shareData = {
    title: `GitHub Roast — @${username}`,
    text: getShareText(username, roast),
    url: getShareUrl(username),
    files: [file],
  };

  if (navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return 'shared';
  }

  if (navigator.share) {
    await navigator.share({
      title: shareData.title,
      text: shareData.text,
      url: shareData.url,
    });
    return 'link-shared';
  }

  await navigator.clipboard.writeText(getShareText(username, roast));
  return 'copied';
}

export function openTwitterShare(username, roast) {
  const text = getShareText(username, roast);
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
}

export function openLinkedInShare(username) {
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl(username))}`;
  window.open(url, '_blank', 'noopener,noreferrer,width=550,height=620');
}

export function openWhatsAppShare(username, roast) {
  const text = getShareText(username, roast);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}
