import { initGIS, signIn, confirmSignOut, loadStoredToken, fetchUserInfo } from '../shared/auth.js';

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('hubScreen').style.display   = 'none';
}

function showHub() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('hubScreen').style.display   = 'block';
}

async function onSignIn() {
  try {
    const p = await fetchUserInfo();
    const av = document.getElementById('userAvatar');
    if (av) {
      av.src = p.picture || '';
      av.title = `${p.name} — Çıkış için tıklayın`;
    }
    const greet = document.getElementById('hubGreet');
    if (greet && p.given_name) greet.textContent = `Merhaba, ${p.given_name}`;
  } catch (_) {}
  showHub();
}

function bindEvents() {
  document.getElementById('loginBtn').addEventListener('click', signIn);
  document.getElementById('userAvatar').addEventListener('click', confirmSignOut);
}

function boot() {
  initGIS(onSignIn);
  if (loadStoredToken()) {
    onSignIn();
  } else {
    showLogin();
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
