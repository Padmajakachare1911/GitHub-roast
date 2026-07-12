import { toPng } from 'html-to-image';

const SITE_URL = 'https://github-roast.pages.dev';

export function getShareUrl(username) {
  const base = import.meta.env.PROD ? SITE_URL : window.location.origin;
  return `${base}/?u=${encodeURIComponent(username)}`;
}

export function getShareText(username, roast) {
  const snippet = roast.length > 80 ? `${roast.slice(0, 77)}…` : roast;
  return `I just got ROASTED on GitHub 🔥\n\n@${username}: "${snippet}"\n\nRoast yourself → ${getShareUrl(username)}`;
}

export async function exportCardAsPng(element) {
  if (!element) throw new Error('Card not found');
  return toPng(element, {
    cacheBust: true,
    pixelRatio: 1,
    width: 1080,
    height: 1350,
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

export function copyShareCaption(username, roast) {
  return navigator.clipboard.writeText(getShareText(username, roast));
}

export function openTwitterShare(username, roast) {
  const text = getShareText(username, roast);
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    '_blank',
    'noopener,noreferrer,width=550,height=420',
  );
}

export function openLinkedInShare(username, roast) {
  const text = getShareText(username, roast).slice(0, 300);
  window.open(
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl(username))}&summary=${encodeURIComponent(text)}`,
    '_blank',
    'noopener,noreferrer,width=550,height=620',
  );
}

export function openWhatsAppShare(username, roast) {
  window.open(`https://wa.me/?text=${encodeURIComponent(getShareText(username, roast))}`, '_blank');
}

export function openInstagramHint(username) {
  alert(
    'Instagram:\n1. PNG just downloaded\n2. Open Instagram → Story or Post\n3. Upload the card image\n4. Add link sticker → ' +
      getShareUrl(username),
  );
}
