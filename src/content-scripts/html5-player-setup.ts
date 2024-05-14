import App from '../app/app';
import { HTML5VideoPlayer } from '../app/controller';
import { Hostname } from '../config';
import { CommandType } from '../types';
import { setupCanvasAndAwaitClick } from '../ui/canvas';
import { getVideoElement, waitForVideoElementViaObserver, waitForVideoElementViaPolling } from '../utils/video';

let app: App | null = null;

let waitForVideoElement: (document: Document, time: number) => Promise<HTMLVideoElement | null>;

// Use polling by default for stable video element detection as mutation observers may not work on some websites.
switch (window.location.hostname) {
  case Hostname.YOUTUBE:
  case Hostname.BILIBILI:
  case Hostname.CRUNCHYROLL:
    waitForVideoElement = waitForVideoElementViaObserver;
    break;
  case Hostname.NICOVIDEO:
    waitForVideoElement = waitForVideoElementViaPolling;
    break;
  default:
    waitForVideoElement = waitForVideoElementViaPolling;
    break;
}

function isInIframe(win: Window) {
  return win.parent != win;
}

chrome.storage.local.get('joinInfo', (result) => {
  (async () => {
    if (!result.joinInfo) {
      return;
    }
    const videoElement = getVideoElement(document) || (await waitForVideoElement(document, 60));
    if (videoElement) {
      const player = new HTML5VideoPlayer(videoElement); // Set the global player
      app = new App(player); // Initialize App with the global player
      const roomId = result.joinInfo.roomId;
      const key = result.joinInfo.key;
      const url = result.joinInfo.url;
      if (roomId) {
        chrome.storage.local.remove('joinInfo');
        await app.joinRoom(roomId, url, key);

        // if (isInIframe(window)) {
        //   // If the video is in an iframe, wait for the user to interact with the video to comply with autoplay policies.
        //   await setupCanvasAndAwaitClick(videoElement);
        // }
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
          const player = new HTML5VideoPlayer(videoElement); // Set the global player
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

// Update the state when the tab is visible.
document.addEventListener('visibilitychange', () => {
  if (app && document.visibilityState === 'visible') {
    app.fetchState();
  }
});

// // Update the state when the window is focused.
// window.addEventListener('focus', (event) => {
//   if (app) {
//     app.fetchState();
//   }
// });

// Unsubscribe from events to prevent sending messages to the server when the tab is closed.
window.addEventListener('beforeunload', () => {
  app?.exitRoom();
});
