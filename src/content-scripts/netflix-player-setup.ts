import App from '../app/app';
import { NetflixPlayer, VideoState } from '../app/controller';
import { Action, ActionType, CommandType } from '../types';
import { getVideoElement, waitForVideoElementViaObserver } from '../utils/video';

let app: App | null = null;

function dispatchEvent(type: string, detail: any) {
  document.dispatchEvent(new CustomEvent(type, { detail: detail }));
}

const handler = (action: Action) => {
  switch (action.type) {
    case ActionType.PLAY:
      dispatchEvent('nyaflix:play', {});
      break;
    case ActionType.PAUSE:
      dispatchEvent('nyaflix:pause', {});
      break;
    case ActionType.SEEK:
      dispatchEvent('nyaflix:seek', { time: action.time });
      break;
  }
};

const waitForVideoElement = waitForVideoElementViaObserver;

chrome.storage.local.get('joinInfo', (result) => {
  (async () => {
    if (!result.joinInfo) {
      return;
    }
    const videoElement = getVideoElement(document) || (await waitForVideoElement(document, 60));
    if (videoElement) {
      const player = new NetflixPlayer(videoElement, handler); // Set the global player
      app = new App(player); // Initialize App with the global player
      const roomId = result.joinInfo.roomId;
      const url = result.joinInfo.url;
      const key = result.joinInfo.key;
      if (roomId) {
        chrome.storage.local.remove('joinInfo');
        await app.joinRoom(roomId, url, key);
        app.start();
      }
    }
  })();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.command) {
      case CommandType.CREATE_ROOM:
        const videoElement = getVideoElement(document) || (await waitForVideoElement(document, 2)); // FIXME: avoid waiting for video element
        if (videoElement) {
          const player = new NetflixPlayer(videoElement, handler); // Set the global player
          app = new App(player); // Initialize App with the global player
          const roomId = await app.createRoom(msg.url);
          app.start();
          sendResponse({ success: true, roomId, inviteUrl: app.getInviteUrl() });
        } else {
          sendResponse({ success: false, error: 'No video element found.' });
        }
        break;
      case CommandType.EXIT_ROOM:
        app?.exitRoom();
        break;
      case CommandType.GET_ROOM_INFO:
        if (app) {
          sendResponse({ roomId: app.getRoomId(), inviteUrl: app.getInviteUrl() });
        }
        break;
    }
  })();
  return true;
});

// Reload the video state when the tab becomes visible again.
document.addEventListener('visibilitychange', () => {
  if (app && document.visibilityState === 'visible') {
    app.fetchState();
  }
});

// // Update the state when the window is focused.
// window.addEventListener('focus', () => {
//   if (app) {
//     app.fetchState();
//   }
// });

// Unsubscribe from events to prevent sending messages to the server when the tab is closed.
window.addEventListener('beforeunload', () => {
  app?.exitRoom();
});

function injectScript(src: string) {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL(src);
  s.type = 'module';
  s.onload = () => s.remove();
  (document.head || document.documentElement).append(s);
}

injectScript('js/netflix-player-inject.js');
