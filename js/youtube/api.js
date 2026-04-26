import { state } from '../shared/state.js';
import { ensureToken } from '../shared/auth.js';

const YT = 'https://www.googleapis.com/youtube/v3';

async function ytReq(path) {
  await ensureToken();
  const res = await fetch(`${YT}${path}`, {
    headers: { Authorization: `Bearer ${state.accessToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`YouTube ${res.status}: ${t}`);
  }
  return res.json();
}

export async function getMyChannel() {
  const data = await ytReq('/channels?part=snippet,statistics,contentDetails,brandingSettings&mine=true');
  return data.items?.[0] || null;
}

export async function getUploadVideoIds(uploadsPlaylistId, max = 50) {
  const ids = [];
  let pageToken = '';
  while (ids.length < max) {
    const qp = `playlistId=${uploadsPlaylistId}&part=contentDetails&maxResults=50` + (pageToken ? `&pageToken=${pageToken}` : '');
    const data = await ytReq(`/playlistItems?${qp}`);
    for (const item of data.items || []) ids.push(item.contentDetails.videoId);
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return ids.slice(0, max);
}

export async function getVideosByIds(ids) {
  if (!ids.length) return [];
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await ytReq(`/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}&maxResults=50`);
    out.push(...(data.items || []));
  }
  return out;
}

export async function getRecentComments(channelId, max = 20) {
  try {
    const data = await ytReq(`/commentThreads?part=snippet&allThreadsRelatedToChannelId=${channelId}&order=time&maxResults=${Math.min(max, 50)}`);
    return data.items || [];
  } catch (_) {
    return [];
  }
}
