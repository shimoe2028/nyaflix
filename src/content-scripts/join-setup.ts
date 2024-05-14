import { HTTP_SERVER } from '../config';
import { decryptUrl, isValidHttpUrl } from '../utils/url';

const joinRegex = /\/join\/([^\/?]+)/;
const match = window.location.pathname.match(joinRegex);

async function fetchRoomInfo(roomId: string, key: string) {
  const response = await fetch(new URL(roomId, HTTP_SERVER).href, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'getRoomInfo' }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch room information');
  }
  const roomInfo = await response.json();
  return { url: await decryptUrl(roomInfo.url, key) };
}

if (match) {
  (async () => {
    try {
      window.stop();
      const roomId = match[1];
      const key = window.location.hash.substring(1);
      const roomInfo = await fetchRoomInfo(roomId, key);
      const url = roomInfo.url;
      if (!isValidHttpUrl(url)) {
        throw new Error('Invalid URL');
      }
      chrome.storage.local.set({ joinInfo: { roomId: roomId, key: key, url: url, inviteUrl: window.location.href } });

      window.location.replace(url);
    } catch (error) {
      // Redirect to error page.
      window.location.replace(new URL('error.html', HTTP_SERVER).href);
    }
  })();
}
