import { YT_API_KEY, YT_CHANNEL_ID } from '../shared/config.js';

const YT = 'https://www.googleapis.com/youtube/v3';

async function ytGet(path, params = {}) {
  const qs = new URLSearchParams({ ...params, key: YT_API_KEY }).toString();
  const res = await fetch(`${YT}${path}?${qs}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`YouTube ${res.status}: ${t}`);
  }
  return res.json();
}

export async function getChannel() {
  const data = await ytGet('/channels', {
    part: 'snippet,statistics,contentDetails,brandingSettings',
    id:   YT_CHANNEL_ID,
  });
  return data.items?.[0] || null;
}

export async function getUploadVideoIds(uploadsPlaylistId, max = 50) {
  const ids = [];
  let pageToken = '';
  while (ids.length < max) {
    const params = {
      part: 'contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: '50',
    };
    if (pageToken) params.pageToken = pageToken;
    const data = await ytGet('/playlistItems', params);
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
    const data = await ytGet('/videos', {
      part: 'snippet,statistics,contentDetails',
      id: chunk.join(','),
      maxResults: '50',
    });
    out.push(...(data.items || []));
  }
  return out;
}

export async function getRecentComments(max = 20) {
  try {
    const data = await ytGet('/commentThreads', {
      part: 'snippet',
      allThreadsRelatedToChannelId: YT_CHANNEL_ID,
      order: 'time',
      maxResults: String(Math.min(max, 50)),
    });
    return data.items || [];
  } catch (_) {
    return [];
  }
}
