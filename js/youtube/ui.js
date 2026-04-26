/* ── FORMATTERS ───────────────────────────────────────────────────────── */
const NF = new Intl.NumberFormat('tr-TR');

export function fmtNum(n) {
  const v = Number(n || 0);
  return NF.format(v);
}

export function fmtCompact(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace('.', ',') + ' Mn';
  if (v >= 1_000)     return (v / 1_000).toFixed(v >= 10_000 ? 0 : 1).replace('.', ',') + ' B';
  return NF.format(v);
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)        return 'az önce';
  if (diff < 3600)      return Math.floor(diff / 60) + ' dk önce';
  if (diff < 86400)     return Math.floor(diff / 3600) + ' sa önce';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' gün önce';
  if (diff < 86400 * 30) return Math.floor(diff / (86400 * 7)) + ' hafta önce';
  if (diff < 86400 * 365) return Math.floor(diff / (86400 * 30)) + ' ay önce';
  return Math.floor(diff / (86400 * 365)) + ' yıl önce';
}

export function parseISODuration(d) {
  // PT#H#M#S
  const m = /^P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(d || '');
  if (!m) return 0;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

export function fmtDuration(sec) {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ── RENDERERS ────────────────────────────────────────────────────────── */
export function renderChannelHeader(channel) {
  const el = document.getElementById('ytChannelHeader');
  const sn = channel.snippet;
  const st = channel.statistics;
  const banner = channel.brandingSettings?.image?.bannerExternalUrl;
  el.innerHTML = `
    ${banner ? `<div class="yt-banner" style="background-image:url('${banner}=w1060-h175')"></div>` : ''}
    <div class="yt-channel-row">
      <img class="yt-avatar" src="${sn.thumbnails?.high?.url || sn.thumbnails?.default?.url || ''}" alt="${sn.title}">
      <div class="yt-channel-info">
        <div class="yt-channel-name">${sn.title}</div>
        <div class="yt-channel-handle">@${(channel.snippet.customUrl || '').replace('@', '')}</div>
      </div>
    </div>
  `;
}

export function renderStats(channel, videos) {
  const st = channel.statistics;
  const totalViews = +st.viewCount || 0;
  const subs = +st.subscriberCount || 0;
  const vids = +st.videoCount || 0;
  const avg = videos.length ? Math.round(videos.reduce((s, v) => s + (+v.statistics.viewCount || 0), 0) / videos.length) : 0;

  const el = document.getElementById('ytStats');
  el.innerHTML = `
    ${statCard('Abone',         fmtCompact(subs),       fmtNum(subs),       'pink')}
    ${statCard('Toplam İzlenme', fmtCompact(totalViews), fmtNum(totalViews), 'blue')}
    ${statCard('Video',          fmtNum(vids),           '',                 'yellow')}
    ${statCard('Son Video Ort.', fmtCompact(avg),        fmtNum(avg),        'green')}
  `;
}

function statCard(label, big, sub, color) {
  return `
    <div class="yt-stat-card yt-${color}">
      <div class="yt-stat-label">${label}</div>
      <div class="yt-stat-big">${big}</div>
      ${sub ? `<div class="yt-stat-sub">${sub}</div>` : ''}
    </div>`;
}

export function renderLatestVideos(videos) {
  const el = document.getElementById('ytLatest');
  if (!videos.length) {
    el.innerHTML = `<div class="yt-empty">Henüz video yok</div>`;
    return;
  }
  el.innerHTML = videos.map(videoCard).join('');
}

export function renderTopVideos(videos) {
  const el = document.getElementById('ytTop');
  const sorted = [...videos].sort((a, b) => (+b.statistics.viewCount || 0) - (+a.statistics.viewCount || 0)).slice(0, 5);
  if (!sorted.length) { el.innerHTML = ''; return; }
  el.innerHTML = sorted.map((v, i) => topRow(v, i + 1)).join('');
}

function videoCard(v) {
  const sn = v.snippet, st = v.statistics;
  const thumb = sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || '';
  const dur = fmtDuration(parseISODuration(v.contentDetails?.duration));
  const views = +st.viewCount || 0;
  const likes = +st.likeCount || 0;
  const comments = +st.commentCount || 0;
  const url = `https://www.youtube.com/watch?v=${v.id}`;
  return `
    <a class="yt-video-card" href="${url}" target="_blank" rel="noopener">
      <div class="yt-thumb-wrap">
        <img src="${thumb}" alt="" loading="lazy">
        ${dur ? `<span class="yt-duration">${dur}</span>` : ''}
      </div>
      <div class="yt-video-body">
        <div class="yt-video-title">${escapeHtml(sn.title)}</div>
        <div class="yt-video-meta">
          <span class="yt-pill">👁 ${fmtCompact(views)}</span>
          <span class="yt-pill">👍 ${fmtCompact(likes)}</span>
          <span class="yt-pill">💬 ${fmtCompact(comments)}</span>
        </div>
        <div class="yt-video-date">${timeAgo(sn.publishedAt)} · ${fmtDate(sn.publishedAt)}</div>
      </div>
    </a>`;
}

function topRow(v, rank) {
  const sn = v.snippet, st = v.statistics;
  const thumb = sn.thumbnails?.default?.url || '';
  const url = `https://www.youtube.com/watch?v=${v.id}`;
  return `
    <a class="yt-top-row" href="${url}" target="_blank" rel="noopener">
      <span class="yt-rank">#${rank}</span>
      <img class="yt-top-thumb" src="${thumb}" alt="">
      <div class="yt-top-info">
        <div class="yt-top-title">${escapeHtml(sn.title)}</div>
        <div class="yt-top-meta">${fmtCompact(+st.viewCount || 0)} izlenme · ${fmtCompact(+st.likeCount || 0)} beğeni</div>
      </div>
    </a>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export function showLoading(msg = 'Yükleniyor...') {
  const el = document.getElementById('ytChannelHeader');
  if (el) el.innerHTML = `<div class="yt-loading"><div class="yt-spin"></div><div>${msg}</div></div>`;
  for (const id of ['ytStats', 'ytLatest', 'ytTop']) {
    const e = document.getElementById(id);
    if (e) e.innerHTML = '';
  }
}

export function showError(msg) {
  const el = document.getElementById('ytChannelHeader');
  if (el) el.innerHTML = `<div class="yt-error"><strong>Hata</strong><div>${escapeHtml(msg)}</div></div>`;
}
