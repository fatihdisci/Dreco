import { initGIS, loadStoredToken, confirmSignOut, fetchUserInfo } from '../shared/auth.js';
import { showToast } from '../shared/utils.js';
import { getMyChannel, getUploadVideoIds, getVideosByIds } from './api.js';
import { renderChannelHeader, renderStats, renderLatestVideos, renderTopVideos, showLoading, showError } from './ui.js';

async function loadDashboard() {
  showLoading('Kanal verileri çekiliyor...');
  try {
    const channel = await getMyChannel();
    if (!channel) {
      showError('Bu hesaba bağlı bir YouTube kanalı bulunamadı.');
      return;
    }
    renderChannelHeader(channel);

    const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) {
      renderStats(channel, []);
      return;
    }
    const ids = await getUploadVideoIds(uploads, 50);
    const videos = await getVideosByIds(ids);

    renderStats(channel, videos);
    renderLatestVideos(videos.slice(0, 12));
    renderTopVideos(videos);
  } catch (e) {
    console.error(e);
    showError(e.message || String(e));
    showToast('YouTube verileri alınamadı', 'error');
  }
}

async function onSignIn() {
  try {
    const p = await fetchUserInfo();
    const av = document.getElementById('userAvatar');
    if (av) {
      av.src = p.picture || '';
      av.title = `${p.name} — Çıkış için tıklayın`;
    }
  } catch (_) {}
  await loadDashboard();
}

function bindEvents() {
  document.getElementById('userAvatar').addEventListener('click', confirmSignOut);
  document.getElementById('refreshBtn').addEventListener('click', () => loadDashboard());
}

function boot() {
  initGIS(onSignIn);
  if (loadStoredToken()) {
    onSignIn();
  } else {
    location.href = 'index.html';
  }
}

window.addEventListener('load', () => {
  bindEvents();
  if (window.google && window.google.accounts) {
    boot();
  } else {
    const gsiScript = document.querySelector('script[src*="gsi"]');
    if (gsiScript) gsiScript.addEventListener('load', boot);
  }
});
