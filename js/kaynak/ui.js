import { escapeHtml, filterResources, getDomainFromUrl, normalizeHttpUrl, showToast } from '../shared/utils.js';

const CATEGORY_FILTERS = ['Tümü', 'Favoriler', 'AI', 'Hukuk', 'Kod', 'Video', 'Tasarım', 'Diğer'];

export function renderFilters(activeFilter, onSelect) {
  const row = document.getElementById('filterChips');
  row.innerHTML = '';
  CATEGORY_FILTERS.forEach(filter => {
    const btn = document.createElement('button');
    btn.className = `filter-chip${activeFilter === filter ? ' active' : ''}`;
    btn.textContent = filter;
    btn.addEventListener('click', () => onSelect(filter));
    row.appendChild(btn);
  });
}

function itemCard(item, handlers) {
  const card = document.createElement('div');
  card.className = 'kaynak-card';

  const safeTitle = escapeHtml(item.title || getDomainFromUrl(item.url));
  const safeDomain = escapeHtml(getDomainFromUrl(item.url));
  const safeNote = escapeHtml(item.note || '');

  card.innerHTML = `
    <div class="kaynak-top">
      <div>
        <div class="kaynak-title">${safeTitle}</div>
        <div class="kaynak-link">${safeDomain}</div>
      </div>
      <div class="tag-pill">${escapeHtml(item.category || 'Diğer')}</div>
    </div>
    ${safeNote ? `<div class="kaynak-note">${safeNote}</div>` : ''}
    <div class="tag-row">${(item.tags || []).map(tag => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('')}</div>
    <div class="kaynak-actions">
      <button class="mini-btn" data-act="open">Aç</button>
      <button class="mini-btn" data-act="favorite">${item.favorite ? '★ Favori' : '☆ Favori'}</button>
      <button class="mini-btn" data-act="edit">Düzenle</button>
    </div>
    <div class="kaynak-actions" style="grid-template-columns:1fr; margin-top:8px">
      <button class="mini-btn" data-act="delete" style="background:var(--gider)">Sil</button>
    </div>
  `;

  card.querySelector('[data-act="open"]').addEventListener('click', () => handlers.onOpen(item));
  card.querySelector('[data-act="favorite"]').addEventListener('click', () => handlers.onFavorite(item));
  card.querySelector('[data-act="edit"]').addEventListener('click', () => handlers.onEdit(item));
  card.querySelector('[data-act="delete"]').addEventListener('click', () => handlers.onDelete(item));
  return card;
}

export function renderList(items, query, activeFilter, handlers) {
  const root = document.getElementById('kaynakList');
  const filtered = filterResources(items, query, activeFilter);
  root.innerHTML = '';
  if (!filtered.length) {
    root.innerHTML = `
      <div class="empty-state" style="padding:30px 8px">
        <div class="empty-title">Henüz kaynak yok.</div>
        <div class="empty-sub">+ butonuna basarak ilk linkini ekle.</div>
      </div>
    `;
    return;
  }

  filtered.forEach(item => root.appendChild(itemCard(item, handlers)));
}

export function closeResourceModal() {
  document.getElementById('kaynakModalOverlay').classList.remove('open');
}

export function openResourceModal(item = null) {
  document.getElementById('kaynakModalOverlay').classList.add('open');
  document.getElementById('kaynakModalTitle').textContent = item ? 'Kaynak Düzenle' : 'Kaynak Ekle';
  document.getElementById('kaynakIdInput').value = item?.id || '';
  document.getElementById('kaynakTitleInput').value = item?.title || '';
  document.getElementById('kaynakUrlInput').value = item?.url || '';
  document.getElementById('kaynakCategoryInput').value = item?.category || '';
  document.getElementById('kaynakTagsInput').value = (item?.tags || []).join(', ');
  document.getElementById('kaynakNoteInput').value = item?.note || '';
  document.getElementById('kaynakFavInput').checked = !!item?.favorite;
}

export function readFormData() {
  const rawUrl = document.getElementById('kaynakUrlInput').value;
  const url = normalizeHttpUrl(rawUrl);
  const domain = getDomainFromUrl(url);
  const titleRaw = document.getElementById('kaynakTitleInput').value.trim();
  return {
    id: document.getElementById('kaynakIdInput').value || `${Date.now()}`,
    title: titleRaw || domain,
    url,
    category: document.getElementById('kaynakCategoryInput').value.trim() || 'Diğer',
    tags: document.getElementById('kaynakTagsInput').value.split(',').map(s => s.trim()).filter(Boolean),
    note: document.getElementById('kaynakNoteInput').value.trim(),
    favorite: document.getElementById('kaynakFavInput').checked,
  };
}

export function bindStaticUiHandlers(handlers) {
  document.getElementById('fabKaynak').addEventListener('click', () => openResourceModal());
  document.getElementById('kaynakModalClose').addEventListener('click', closeResourceModal);
  document.getElementById('kaynakCancelBtn').addEventListener('click', closeResourceModal);
  document.getElementById('kaynakSaveBtn').addEventListener('click', handlers.onSave);

  const overlay = document.getElementById('kaynakModalOverlay');
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeResourceModal();
  });

  document.getElementById('searchInput').addEventListener('input', e => handlers.onSearch(e.target.value));
  document.getElementById('userAvatar').addEventListener('click', handlers.onSignOut);
  document.getElementById('backBtn').addEventListener('click', e => {
    e.preventDefault();
    window.location.href = 'index.html';
  });
}

export function openExternal(item) {
  try {
    const safe = normalizeHttpUrl(item.url);
    window.open(safe, '_blank', 'noopener,noreferrer');
  } catch (_) {
    showToast('Geçersiz link', 'error');
  }
}

export function toggleSaveBusy(busy) {
  document.getElementById('kaynakSaveBtn').disabled = busy;
}
