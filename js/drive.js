import { ROOT_FOLDER_NAME } from './config.js';
import { state } from './state.js';
import { ensureToken } from './auth.js';
import { enc, monthLabel } from './utils.js';

async function driveReq(url, opts = {}) {
  await ensureToken();
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${state.accessToken}`, ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Drive ${res.status}: ${t}`);
  }
  return res;
}

export async function findFolder(name, parentId) {
  let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;
  const r = await driveReq(`https://www.googleapis.com/drive/v3/files?q=${enc(q)}&fields=files(id)&pageSize=1`);
  const d = await r.json();
  return d.files.length ? d.files[0].id : null;
}

export async function createFolder(name, parentId) {
  const body = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];
  const r = await driveReq('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await r.json()).id;
}

export async function ensureFolder(name, parentId) {
  return (await findFolder(name, parentId)) || (await createFolder(name, parentId));
}

export async function getRootFolder() {
  if (state.rootFolderId) return state.rootFolderId;
  state.rootFolderId = await ensureFolder(ROOT_FOLDER_NAME, null);
  return state.rootFolderId;
}

export async function getTypeFolder(type, monthKey) {
  const root  = await getRootFolder();
  const mId   = await ensureFolder(monthLabel(monthKey), root);
  return ensureFolder(type === 'gelir' ? 'Gelir' : 'Gider', mId);
}

export async function listFolder(folderId) {
  const q = `'${folderId}' in parents and trashed=false`;
  const r = await driveReq(
    `https://www.googleapis.com/drive/v3/files?q=${enc(q)}&fields=files(id,name,createdTime,thumbnailLink)&orderBy=createdTime&pageSize=200`
  );
  return (await r.json()).files || [];
}

export async function uploadFile(blob, folderId, name) {
  const meta = JSON.stringify({ name, parents: [folderId] });
  const form = new FormData();
  form.append('metadata', new Blob([meta], { type: 'application/json' }));
  form.append('file', blob);
  const r = await driveReq(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    { method: 'POST', body: form }
  );
  return r.json();
}

export async function downloadBlob(fileId) {
  const r = await driveReq(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  return r.blob();
}

export async function fetchUserInfo() {
  const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${state.accessToken}` },
  });
  return r.json();
}
