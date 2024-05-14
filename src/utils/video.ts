export const getVideoElement = (node: HTMLElement | Document): HTMLVideoElement | null => {
  try {
    const videoElements = node.getElementsByTagName('video');
    const validVideos = Array.from(videoElements).filter((video) => video.duration > 0);

    if (validVideos.length === 0) {
      return null;
    }

    if (validVideos.length > 1) {
      console.warn('Multiple video elements found. Using the first one.');
    }

    return validVideos[0];
  } catch (error) {
    return null;
  }
};

export const waitForVideoElementViaPolling = (
  document: Document,
  time: number,
  interval: number = 0.5,
): Promise<HTMLVideoElement | null> => {
  return new Promise((resolve) => {
    const endTime = Date.now() + time * 1000;

    const intervalId = setInterval(() => {
      const videoElement = getVideoElement(document);
      if (videoElement) {
        clearInterval(intervalId);
        resolve(videoElement);
        return;
      }
      if (Date.now() > endTime) {
        clearInterval(intervalId);
        resolve(null);
      }
    }, interval * 1000);
  });
};

export const waitForVideoElementViaObserver = (document: Document, time: number): Promise<HTMLVideoElement | null> => {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, time * 1000);

    const observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        for (let node of Array.from(mutation.addedNodes)) {
          const videoElement = getVideoElement(node as HTMLElement);
          if (videoElement) {
            clearTimeout(timeoutId); // Clear the timeout
            observer.disconnect(); // Stop observing once the video is found
            resolve(videoElement);
            return;
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
};
