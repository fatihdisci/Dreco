import { confirmSignOut, fetchUserInfo, initGIS, loadStoredToken } from '../shared/auth.js';
import { showToast } from '../shared/utils.js';
import { loadResourcesFile, saveResourcesFile } from './drive.js';
import {
  bindStaticUiHandlers,
  closeResourceModal,
  openExternal,
  openResourceModal,
  readFormData,
  renderFilters,
  renderList,
  toggleSaveBusy,
} from './ui.js';

const model = {
  fileId: null,
  items: [],
  query: '',
  filter: 'Tümü',
};

function rerender() {
  renderFilters(model.filter, filter => {
    model.filter = filter;
    rerender();
  });

  renderList(model.items, model.query, model.filter, {
    onOpen: item => openExternal(item),
    onFavorite: item => updateItem(item.id, { favorite: !item.favorite }),
    onEdit: item => openResourceModal(item),
    onDelete: item => removeItem(item.id),
  });
}

async function persist() {
  const data = await saveResourcesFile(model.fileId, { version: 1, items: model.items });
  return data;
}

async function updateItem(id, patch) {
  model.items = model.items.map(item => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
  rerender();
  try {
    await persist();
    showToast('Kaydedildi', 'success');
  } catch (e) {
    console.error(e);
    showToast('Kaydetme başarısız', 'error');
  }
}

async function removeItem(id) {
  if (!window.confirm('Bu kaynağı silmek istiyor musunuz?')) return;
  model.items = model.items.filter(item => item.id !== id);
  rerender();
  try {
    await persist();
    showToast('Kaynak silindi', 'success');
  } catch (e) {
    console.error(e);
    showToast('Silme başarısız', 'error');
  }
}

async function onSave() {
  toggleSaveBusy(true);
  try {
    const form = readFormData();
    const existing = model.items.find(item => item.id === form.id);
    const now = new Date().toISOString();
    if (existing) {
      model.items = model.items.map(item => item.id === form.id ? { ...item, ...form, updatedAt: now } : item);
    } else {
      model.items.unshift({ ...form, createdAt: now, updatedAt: now });
    }
    await persist();
    closeResourceModal();
    rerender();
    showToast('Kaynak kaydedildi', 'success');
  } catch (e) {
    console.error(e);
    showToast(e?.message || 'Kaydetme başarısız', 'error');
  } finally {
    toggleSaveBusy(false);
  }
}

async function onSignIn() {
  try {
    const p = await fetchUserInfo();
    const av = document.getElementById('userAvatar');
    av.src = p.picture || '';
    av.title = `${p.name} — Çıkış için tıklayın`;
  } catch (_) {}

  const { fileId, data } = await loadResourcesFile();
  model.fileId = fileId;
  model.items = Array.isArray(data.items) ? data.items : [];
  rerender();
}

function boot() {
  initGIS(onSignIn);
  if (loadStoredToken()) {
    onSignIn();
  } else {
    window.location.href = 'index.html';
  }
}

window.addEventListener('load', () => {
  bindStaticUiHandlers({
    onSave,
    onSearch: value => {
      model.query = value;
      rerender();
    },
    onSignOut: confirmSignOut,
  });

  if (window.google && window.google.accounts) {
    boot();
  } else {
    const gsiScript = document.querySelector('script[src*="gsi"]');
    if (gsiScript) gsiScript.addEventListener('load', boot);
  }
});
