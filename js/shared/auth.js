import { CLIENT_ID, SCOPES, TOKEN_STORAGE_KEY } from './config.js';
import { state } from './state.js';
import { showToast } from './utils.js';

export function persistToken() {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
      accessToken: state.accessToken,
      tokenExpiry: state.tokenExpiry,
    }));
  } catch (_) {}
}

export function loadStoredToken() {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return false;
    const { accessToken, tokenExpiry } = JSON.parse(raw);
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
      state.accessToken = accessToken;
      state.tokenExpiry = tokenExpiry;
      return true;
    }
  } catch (_) {}
  return false;
}

export function clearStoredToken() {
  try { localStorage.removeItem(TOKEN_STORAGE_KEY); } catch (_) {}
}

export function initGIS(onAuthSuccess) {
  state.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: response => {
      if (response.error) {
        showToast('Giriş başarısız: ' + response.error, 'error');
        if (state.pendingResolve) { state.pendingResolve(false); state.pendingResolve = null; }
        return;
      }
      state.accessToken = response.access_token;
      state.tokenExpiry = Date.now() + response.expires_in * 1000 - 90000;
      persistToken();
      if (state.pendingResolve) { state.pendingResolve(true); state.pendingResolve = null; }
      else { onAuthSuccess(); }
    },
  });
}

export function signIn() {
  if (!state.tokenClient) {
    showToast('Google servisleri yükleniyor, birkaç saniye bekleyip tekrar deneyin.', 'error');
    return;
  }
  state.tokenClient.requestAccessToken({ prompt: 'consent' });
}

export function signOutToLogin() {
  state.accessToken = null;
  state.tokenExpiry = 0;
  state.rootFolderId = null;
  clearStoredToken();
  // Modüllerden çıkış: hub'a dön. Hub zaten oturum yoksa login ekranı gösterir.
  const inHub = location.pathname.endsWith('/index.html')
             || location.pathname.endsWith('/')
             || location.pathname === '';
  if (inHub) {
    location.reload();
  } else {
    location.href = 'index.html';
  }
}

export function confirmSignOut() {
  if (!confirm('Çıkış yapmak istiyor musunuz?')) return;
  if (state.accessToken) {
    google.accounts.oauth2.revoke(state.accessToken, () => {});
  }
  signOutToLogin();
}

export async function fetchUserInfo() {
  const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${state.accessToken}` },
  });
  if (!r.ok) throw new Error(`userinfo ${r.status}`);
  return r.json();
}

export async function ensureToken() {
  if (state.accessToken && Date.now() < state.tokenExpiry) return;
  const ok = await new Promise(resolve => {
    state.pendingResolve = resolve;
    state.tokenClient.requestAccessToken({ prompt: '' });
  });
  if (!ok) {
    signOutToLogin();
    throw new Error('Oturum süresi doldu, tekrar giriş yapın');
  }
}
