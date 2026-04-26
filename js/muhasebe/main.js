import { state } from '../shared/state.js';
import { toMonthKey } from '../shared/utils.js';
import { initGIS, confirmSignOut, loadStoredToken, fetchUserInfo } from '../shared/auth.js';
import {
  buildMonthBar, buildPdfSel, loadFiles,
  openAddModal, closeAddModal, triggerCamera, triggerGallery,
  setType, previewFile, saveEvrak,
  openPdfModal, closePdfModal, openCropper,
} from './ui.js';
import { generatePdf } from './pdf.js';

async function onSignIn() {
  try {
    const p = await fetchUserInfo();
    const av = document.getElementById('userAvatar');
    av.src   = p.picture || '';
    av.title = `${p.name} — Çıkış için tıklayın`;
  } catch (_) {}

  buildMonthBar();
  buildPdfSel();
  await loadFiles();
}

function bindEvents() {
  document.getElementById('headerPdfBtn').addEventListener('click', openPdfModal);
  document.getElementById('userAvatar').addEventListener('click', confirmSignOut);
  document.getElementById('fab').addEventListener('click', openAddModal);

  document.getElementById('addModalClose').addEventListener('click', closeAddModal);
  document.getElementById('cameraBtn').addEventListener('click', triggerCamera);
  document.getElementById('galleryBtn').addEventListener('click', triggerGallery);
  document.getElementById('cropBtn').addEventListener('click', openCropper);
  document.getElementById('gelirBtn').addEventListener('click', () => setType('gelir'));
  document.getElementById('giderBtn').addEventListener('click', () => setType('gider'));
  document.getElementById('saveBtn').addEventListener('click', saveEvrak);

  document.getElementById('pdfModalClose').addEventListener('click', closePdfModal);
  document.getElementById('gelirPdfBtn').addEventListener('click', () => generatePdf('Gelir'));
  document.getElementById('giderPdfBtn').addEventListener('click', () => generatePdf('Gider'));

  document.getElementById('cameraInput').addEventListener('change',  e => previewFile(e.target.files[0]));
  document.getElementById('galleryInput').addEventListener('change', e => previewFile(e.target.files[0]));

  const addOverlay = document.getElementById('addOverlay');
  addOverlay.addEventListener('click', e => { if (e.target === addOverlay) closeAddModal(); });

  const pdfOverlay = document.getElementById('pdfOverlay');
  pdfOverlay.addEventListener('click', e => { if (e.target === pdfOverlay) closePdfModal(); });
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
  state.currentMonthKey = toMonthKey(new Date());
  bindEvents();

  if (window.google && window.google.accounts) {
    boot();
  } else {
    const gsiScript = document.querySelector('script[src*="gsi"]');
    if (gsiScript) gsiScript.addEventListener('load', boot);
  }
});
