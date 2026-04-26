import { MONTHS_TR } from '../shared/config.js';
import { state } from '../shared/state.js';
import { toMonthKey, monthLabel, compressImage, showToast } from '../shared/utils.js';
import { findFolder, getRootFolder, getTypeFolder, listFolder, uploadFile } from './drive.js';
import { runCropper } from './crop.js';

/* ── MONTH BAR ──────────────────────────────────────────────────────────── */
export function buildMonthBar() {
  const bar = document.getElementById('monthBar');
  bar.innerHTML = '';
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = toMonthKey(d);
    const el  = document.createElement('div');
    el.className = 'month-chip' + (key === state.currentMonthKey ? ' active' : '');
    el.textContent = `${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
    el.addEventListener('click', () => switchMonth(key, el));
    bar.appendChild(el);
  }
  setTimeout(() => bar.querySelector('.active')?.scrollIntoView({ inline: 'end', behavior: 'smooth' }), 120);
}

export function buildPdfSel() {
  const sel = document.getElementById('pdfMonthSel');
  sel.innerHTML = '';
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = toMonthKey(d);
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
    if (key === state.currentMonthKey) opt.selected = true;
    sel.appendChild(opt);
  }
}

async function switchMonth(key, el) {
  state.currentMonthKey = key;
  document.querySelectorAll('.month-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  await loadFiles();
}

/* ── FILE LIST ──────────────────────────────────────────────────────────── */
export async function loadFiles() {
  setStats('—', '—');
  showLoading();
  try {
    const root = await getRootFolder();
    const mId  = await findFolder(monthLabel(state.currentMonthKey), root);
    if (!mId) { setStats(0, 0); showEmpty(); return; }

    const [gId, dId] = await Promise.all([
      findFolder('Gelir', mId),
      findFolder('Gider', mId),
    ]);
    const [gelirFiles, giderFiles] = await Promise.all([
      gId ? listFolder(gId) : [],
      dId ? listFolder(dId) : [],
    ]);
    setStats(gelirFiles.length, giderFiles.length);
    renderGrid(gelirFiles, giderFiles);
  } catch (e) {
    console.error(e);
    setStats(0, 0);
    showEmpty('Yüklenirken hata oluştu');
  }
}

function setStats(g, d) {
  document.getElementById('gelirCount').textContent = g;
  document.getElementById('giderCount').textContent = d;
}

function showLoading() {
  document.getElementById('filesGrid').innerHTML = `
    <div class="empty-state">
      <div style="width:40px;height:40px;border:3px solid #000;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 14px"></div>
      <div class="empty-sub">Yükleniyor...</div>
    </div>`;
}

function showEmpty(msg = 'Bu ayda evrak yok') {
  document.getElementById('filesGrid').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
          <rect x="6" y="4" width="20" height="24" rx="2" stroke="#000" stroke-width="2.5"/>
          <path d="M10 12h12M10 17h8" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="empty-title">${msg}</div>
      <div class="empty-sub">+ butonuna basarak ekleyin</div>
    </div>`;
}

function renderGrid(gelirFiles, giderFiles) {
  const grid = document.getElementById('filesGrid');
  grid.innerHTML = '';
  if (!gelirFiles.length && !giderFiles.length) { showEmpty(); return; }

  const all = [
    ...gelirFiles.map(f => ({ ...f, type: 'gelir' })),
    ...giderFiles.map(f => ({ ...f, type: 'gider' })),
  ].sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

  const arrowUp   = `<svg width="11" height="11" fill="none" viewBox="0 0 11 11"><path d="M5.5 9V2M3 4.5l2.5-2.5 2.5 2.5" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const arrowDown = `<svg width="11" height="11" fill="none" viewBox="0 0 11 11"><path d="M5.5 2v7M3 6.5l2.5 2.5 2.5-2.5" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  all.forEach(f => {
    const el = document.createElement('div');
    el.className = 'file-item';
    el.innerHTML = f.thumbnailLink
      ? `<img src="${f.thumbnailLink}" alt="${f.name}" loading="lazy">`
      : `<div class="file-item-placeholder"><svg width="22" height="22" fill="none" viewBox="0 0 22 22"><rect x="3" y="2" width="16" height="18" rx="2" stroke="#000" stroke-width="2"/><path d="M7 9h8M7 13h5" stroke="#000" stroke-width="2" stroke-linecap="round"/></svg></div>`;
    el.innerHTML += `<div class="file-badge ${f.type}">${f.type === 'gelir' ? arrowUp : arrowDown}</div>`;
    grid.appendChild(el);
  });
}

/* ── ADD MODAL ──────────────────────────────────────────────────────────── */
function setCropBtnVisibility(visible) {
  const btn = document.getElementById('cropBtn');
  if (btn) btn.style.display = visible ? 'flex' : 'none';
}

function setCroppedBadge(visible) {
  const b = document.getElementById('croppedBadge');
  if (b) b.style.display = visible ? 'inline-flex' : 'none';
}

export function openAddModal() {
  document.getElementById('addOverlay').classList.add('open');
  document.getElementById('previewImg').style.display = 'none';
  document.getElementById('previewPlaceholder').style.display = 'block';
  document.getElementById('noteInput').value = '';
  document.getElementById('cameraInput').value = '';
  document.getElementById('galleryInput').value = '';
  state.selectedFile = null;
  state.croppedBlob  = null;
  setCropBtnVisibility(false);
  setCroppedBadge(false);
  setType('gelir');
}

export function closeAddModal() {
  document.getElementById('addOverlay').classList.remove('open');
}

export function triggerCamera()  { document.getElementById('cameraInput').click(); }
export function triggerGallery() { document.getElementById('galleryInput').click(); }

export function setType(t) {
  state.currentType = t;
  document.getElementById('gelirBtn').className = 'type-btn' + (t === 'gelir' ? ' active-gelir' : '');
  document.getElementById('giderBtn').className = 'type-btn' + (t === 'gider' ? ' active-gider' : '');
}

function showPreviewFromBlobOrFile(source) {
  const img = document.getElementById('previewImg');
  const url = URL.createObjectURL(source);
  img.onload = () => URL.revokeObjectURL(url);
  img.src = url;
  img.style.display = 'block';
  document.getElementById('previewPlaceholder').style.display = 'none';
}

export function previewFile(file) {
  if (!file) return;
  state.selectedFile = file;
  state.croppedBlob  = null;
  setCroppedBadge(false);
  setCropBtnVisibility(true);
  showPreviewFromBlobOrFile(file);
}

export async function openCropper() {
  if (!state.selectedFile) { showToast('Önce fotoğraf seçin', 'error'); return; }
  // Always crop from the original file so corners stay accurate across re-crops
  const result = await runCropper(state.selectedFile);
  if (!result) return; // cancelled
  state.croppedBlob = result;
  setCroppedBadge(true);
  showPreviewFromBlobOrFile(result);
}

export async function saveEvrak() {
  if (!state.selectedFile) { showToast('Önce fotoğraf seçin', 'error'); return; }
  const btn     = document.getElementById('saveBtn');
  const btnTxt  = document.getElementById('saveBtnText');
  const spinner = document.getElementById('saveSpinner');
  btn.disabled = true;
  btnTxt.textContent = 'Yükleniyor...';
  spinner.style.display = 'block';
  try {
    const now    = new Date();
    const mKey   = toMonthKey(now);
    const note   = document.getElementById('noteInput').value.trim();
    const ts     = now.toISOString().slice(0, 19).replace(/:/g, '-');
    // Cropped output is always JPEG; original may be PNG
    const isCropped = !!state.croppedBlob;
    const ext   = isCropped ? 'jpg' : (state.selectedFile.type.includes('png') ? 'png' : 'jpg');
    const name  = note ? `${ts}_${note}.${ext}` : `${ts}.${ext}`;
    const folder = await getTypeFolder(state.currentType, mKey);
    const blob   = isCropped
      ? await compressImage(state.croppedBlob, 1600)
      : await compressImage(state.selectedFile, 1400);
    await uploadFile(blob, folder, name);
    showToast('✓ Drive\'a yüklendi', 'success');
    closeAddModal();
    if (mKey === state.currentMonthKey) await loadFiles();
  } catch (e) {
    console.error(e);
    showToast('Hata: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btnTxt.textContent = "Kaydet & Drive'a Yükle";
    spinner.style.display = 'none';
  }
}

/* ── PDF MODAL ──────────────────────────────────────────────────────────── */
export function openPdfModal()  { document.getElementById('pdfOverlay').classList.add('open'); }
export function closePdfModal() { document.getElementById('pdfOverlay').classList.remove('open'); }
