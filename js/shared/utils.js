import { MONTHS_TR } from './config.js';

export const enc = s => encodeURIComponent(s);

export function toMonthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  return `${MONTHS_TR[+month - 1]} ${year}`;
}

export function blobToDataUrl(blob) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.readAsDataURL(blob);
  });
}

export function imgDims(src) {
  return new Promise(res => {
    const i = new Image();
    i.onload = () => res({ w: i.width, h: i.height });
    i.src = src;
  });
}

export function compressImage(file, maxDim) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else       { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cv.toBlob(resolve, 'image/jpeg', 0.87);
    };
    img.src = url;
  });
}

export function sanitizeFilenamePart(input) {
  return String(input || '')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|#%{}~&]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 80);
}

export function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeHttpUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  const normalized = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value) ? value : `https://${value}`;
  let url;
  try {
    url = new URL(normalized);
  } catch (_) {
    throw new Error('Geçersiz URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Sadece http:// veya https:// linkleri kabul edilir');
  }
  return url.toString();
}

export function getDomainFromUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

export function filterResources(items, query = '', filter = 'Tümü') {
  const q = String(query || '').trim().toLowerCase();
  return items.filter(item => {
    if (filter === 'Favoriler' && !item.favorite) return false;
    if (filter !== 'Tümü' && filter !== 'Favoriler' && item.category !== filter) return false;
    if (!q) return true;
    const haystack = [
      item.title,
      item.url,
      item.category,
      item.note,
      ...(item.tags || []),
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

let toastTimer;
export function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 3200);
}
