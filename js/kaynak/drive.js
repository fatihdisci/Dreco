import { state } from '../shared/state.js';
import { ensureToken } from '../shared/auth.js';
import { enc } from '../shared/utils.js';

const APP_ROOT = 'Dreco';
const MODULE_FOLDER = 'Kaynak Kasası';
const DATA_FILE = 'kaynaklar.json';

async function driveReq(url, opts = {}) {
  await ensureToken();
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${state.accessToken}`, ...(opts.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`Drive ${res.status}: ${await res.text()}`);
  }
  return res;
}

async function findFolder(name, parentId) {
  let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;
  const r = await driveReq(`https://www.googleapis.com/drive/v3/files?q=${enc(q)}&fields=files(id)&pageSize=1`);
  const d = await r.json();
  return d.files?.[0]?.id || null;
}

async function ensureFolder(name, parentId) {
  const existing = await findFolder(name, parentId);
  if (existing) return existing;
  const body = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];
  const r = await driveReq('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await r.json()).id;
}

async function getModuleFolder() {
  const rootId = await ensureFolder(APP_ROOT, null);
  return ensureFolder(MODULE_FOLDER, rootId);
}

async function findDataFile(folderId) {
  const q = `'${folderId}' in parents and name='${DATA_FILE}' and trashed=false`;
  const r = await driveReq(`https://www.googleapis.com/drive/v3/files?q=${enc(q)}&fields=files(id,name)&pageSize=1`);
  const d = await r.json();
  return d.files?.[0] || null;
}

function defaultData() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: [],
  };
}

async function createDataFile(folderId, content) {
  const meta = JSON.stringify({ name: DATA_FILE, parents: [folderId], mimeType: 'application/json' });
  const form = new FormData();
  form.append('metadata', new Blob([meta], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
  const r = await driveReq('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    body: form,
  });
  return r.json();
}

export async function loadResourcesFile() {
  const folderId = await getModuleFolder();
  const file = await findDataFile(folderId);
  if (!file) {
    const init = defaultData();
    const created = await createDataFile(folderId, init);
    return { fileId: created.id, data: init };
  }
  const res = await driveReq(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
  const raw = await res.text();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.items)) parsed.items = [];
    if (!parsed.version) parsed.version = 1;
    return { fileId: file.id, data: parsed };
  } catch (_) {
    const init = defaultData();
    await saveResourcesFile(file.id, init);
    return { fileId: file.id, data: init };
  }
}

export async function saveResourcesFile(fileId, data) {
  const payload = { ...data, version: 1, updatedAt: new Date().toISOString() };
  await driveReq(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload, null, 2),
  });
  return payload;
}
