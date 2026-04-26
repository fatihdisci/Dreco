import { loadStoredToken, confirmSignOut, fetchUserInfo, initGIS } from '../shared/auth.js';
import { showToast } from '../shared/utils.js';
import { getChannel, getUploadVideoIds, getVideosByIds } from './api.js';
import { renderChannelHeader, renderStats, renderLatestVideos, renderTopVideos, showLoading, showError } from './ui.js';

async function loadDashboard() {
  showLoading('Kanal verileri çekiliyor...');
  try {
    const channel = await getChannel();
    if (!channel) {
      showError('Kanal bulunamadı.');
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

async function showAvatarIfSignedIn() {
  if (!loadStoredToken()) return;
  // GIS yüklü değilse sessiz refresh işe yaramaz; sadece avatarı denemek için fetch çağırırız.
  try {
    const p = await fetchUserInfo();
    const av = document.getElementById('userAvatar');
    if (av) {
      av.src = p.picture || '';
      av.title = `${p.name} — Çıkış için tıklayın`;
      av.style.display = 'inline-block';
    }
  } catch (_) {}
}

function bindEvents() {
  document.getElementById('userAvatar').addEventListener('click', confirmSignOut);
  document.getElementById('refreshBtn').addEventListener('click', () => loadDashboard());
}

window.addEventListener('load', () => {
  bindEvents();

  // GIS hazır olunca initGIS — opsiyonel: token yenileme/çıkış için.
  const onGsiReady = () => initGIS(() => {});
  if (window.google && window.google.accounts) onGsiReady();
  else {
    const gsiScript = document.querySelector('script[src*="gsi"]');
    if (gsiScript) gsiScript.addEventListener('load', onGsiReady);
  }

  showAvatarIfSignedIn();
  loadDashboard();
});
