export {};

declare global {
  interface Window {
    netflix: any;
  }
}

type NetflixVideoPlayer = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
};

const getNetflixPlayer = (): NetflixVideoPlayer | undefined => {
  try {
    const videoPlayer = window.netflix.appContext.state.playerApp.getAPI().videoPlayer;
    return videoPlayer.getVideoPlayerBySessionId(videoPlayer.getAllPlayerSessionIds()[0]);
  } catch (error) {
    return undefined;
  }
};

document.addEventListener('nyaflix:play', () => {
  getNetflixPlayer()?.play();
});

document.addEventListener('nyaflix:pause', () => {
  getNetflixPlayer()?.pause();
});

document.addEventListener('nyaflix:seek', (event: any) => {
  getNetflixPlayer()?.seek(event.detail.time * 1000);
});
