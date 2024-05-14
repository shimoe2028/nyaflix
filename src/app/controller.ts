import { Action, ActionType } from '../types';
import { cyrb53 } from '../utils/string';
import { buildUrl } from '../utils/url';

export interface VideoState {
  id: string;
  timestamp: number;
  currentTime: number;
  paused: boolean;
}

// HTML5 Video DOM. Reference: https://www.w3schools.com/tags/ref_av_dom.asp
export interface Player {
  paused: boolean;
  currentTime: number;
  duration: number;
  readyState: number;
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
  addEventListener(event: string, callback: (event: Event) => void): void;
  removeEventListener(event: string, callback: (event: Event) => void): void;
}

interface YTPlayer extends HTMLElement {
  loadVideoById(videoId: string, startSeconds: Number): void;
}

// Calculate the current time based on the state and the current time.
export function calculateCurrentTime(state: VideoState, duration: number): number {
  let currentTime = state.currentTime;
  if (!state.paused) {
    const offset = (Date.now() - state.timestamp) / 1000;
    currentTime = Math.max(Math.min(currentTime + offset, duration), 0);
  }
  return currentTime;
}

export class HTML5VideoPlayer implements Player {
  private videoElement: HTMLVideoElement;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async play(): Promise<void> {
    this.videoElement.play();
  }

  pause(): void {
    this.videoElement.pause();
  }

  seek(time: number): void {
    this.videoElement.currentTime = time;
  }

  get duration(): number {
    return this.videoElement.duration;
  }

  get currentTime(): number {
    return this.videoElement.currentTime;
  }

  get paused(): boolean {
    return this.videoElement.paused;
  }

  get readyState(): number {
    return this.videoElement.readyState;
  }

  addEventListener(event: string, callback: (event: Event) => void): void {
    this.videoElement.addEventListener(event, callback);
  }

  removeEventListener(event: string, callback: (event: Event) => void): void {
    this.videoElement.removeEventListener(event, callback);
  }
}

export class NetflixPlayer extends HTML5VideoPlayer implements Player {
  private handler: (action: Action) => void;

  constructor(videoElement: HTMLVideoElement, handler: (action: Action) => void) {
    super(videoElement);
    this.handler = handler;
  }

  async play(): Promise<void> {
    this.handler({ type: ActionType.PLAY });
  }

  pause(): void {
    this.handler({ type: ActionType.PAUSE });
  }

  seek(time: number): void {
    this.handler({ type: ActionType.SEEK, time });
  }
}

export class YoutubePlayer extends HTML5VideoPlayer implements Player {
  constructor(videoElement: HTMLVideoElement) {
    super(videoElement);
  }

  loadVideoById(videoId: string, startSeconds: Number = 0): void {
    const player = document.getElementById('movie_player') as YTPlayer;
    player.loadVideoById(videoId, startSeconds);
  }
}

type Locks = {
  play: boolean;
  pause: boolean;
  seeking: number;
  seeked: number;
  sync: number;
};

export default class VideoController {
  private player: Player;
  private remoteState: VideoState | null = null;
  private locks: Locks = {
    play: false,
    pause: false,
    seeking: 0,
    seeked: 0,
    sync: 0,
  };
  private _loadeddata: boolean = false;

  constructor(player: Player) {
    this.player = player;
  }

  private getId(): string {
    // Hash the URL to generate a privacy-friendly identifier using a hash function.
    return cyrb53(buildUrl(new URL(window.location.href))).toString();
  }

  public get loadeddata(): boolean {
    return this._loadeddata;
  }

  public set loadeddata(value: boolean) {
    this._loadeddata = value;
  }

  private isLocked(eventType: keyof Locks): boolean {
    if (eventType === 'seeking' || eventType === 'seeked') {
      const time = Date.now();
      // In case the seeking event is not fired.
      return time - this.locks[eventType] <= 5000;
    } else if (eventType === 'sync') {
      const time = Date.now();
      // In case the sync event is not fired.
      return time - this.locks[eventType] <= 5000;
    }
    return !!this.locks[eventType];
  }

  public setLock(eventType: keyof Locks): void {
    switch (eventType) {
      case 'play':
      case 'pause':
        this.locks[eventType] = true;
        break;
      case 'seeking':
      case 'seeked':
      case 'sync':
        this.locks[eventType] = Date.now();
    }
  }

  public isLockedAny(): boolean {
    const isLocked =
      this.isLocked('play') ||
      this.isLocked('pause') ||
      this.isLocked('seeking') ||
      this.isLocked('seeked') ||
      this.isLocked('sync');
    return isLocked;
  }

  public releaseLock(eventType: keyof Locks): void {
    switch (eventType) {
      case 'play':
      case 'pause':
        this.locks[eventType] = false;
        break;
      case 'seeking':
      case 'seeked':
      case 'sync':
        this.locks[eventType] = 0;
        break;
    }
  }

  public getState(): VideoState {
    return {
      id: this.getId(),
      timestamp: Date.now(),
      currentTime: this.player.currentTime,
      paused: this.player.paused,
    };
  }

  public updateLocalState(state: VideoState): void {
    // Do not update if remote state is newer.
    if (this.remoteState && state.timestamp < this.remoteState.timestamp) {
      return;
    }

    // Validate video ID.
    if (this.getId() !== state.id) {
      throw new Error('Video ID does not match.');
    }

    // All good, update the local state.
    this.setRemoteState(state);

    // Lock the player to prevent event loop.
    if (state.paused !== this.player.paused) {
      if (state.paused) {
        this.player.pause();
        this.setLock('pause');
        this.releaseLock('play');
      } else {
        this.player.play();
        this.setLock('play');
        this.releaseLock('pause');
      }
    } else {
      if (state.paused && this.isLocked('play')) {
        this.player.pause();
        this.setLock('pause');
        this.releaseLock('play');
      } else if (!state.paused && this.isLocked('pause')) {
        this.player.play();
        this.setLock('play');
        this.releaseLock('pause');
      }
    }

    const currentTime = calculateCurrentTime(state, this.player.duration);
    if (Math.abs(currentTime - this.player.currentTime) > 0.2) {
      this.player.seek(currentTime);

      this.setLock('seeked');
      this.setLock('seeking');
    }
  }

  public setRemoteState(state: VideoState | null) {
    this.remoteState = state;
  }

  public shouldUpdateRemoteState(localState: VideoState, eventType: 'play' | 'pause' | 'seeking' | 'seeked'): boolean {
    // Update the remote state if it is not yet initialized.
    if (!this.remoteState) {
      return true;
    }
    // Do not update if remote state is newer.
    if (localState.timestamp < this.remoteState.timestamp) {
      return false;
    }
    // Do not update if video ID does not match.
    if (this.remoteState.id !== localState.id) {
      return false;
    }

    switch (eventType) {
      case 'play':
      case 'pause':
        return this.remoteState.paused !== localState.paused;
      case 'seeking':
      case 'seeked':
        // Only update the remote state if the current time is different by more than 0.1 seconds.
        const currentTime = calculateCurrentTime(this.remoteState, this.player.duration);
        return Math.abs(currentTime - localState.currentTime) > 0.2;
    }
  }

  public addEventListener(event: string, callback: (event: Event) => void): void {
    this.player.addEventListener(event, callback);
  }

  public removeEventListener(event: string, callback: (event: Event) => void): void {
    this.player.removeEventListener(event, callback);
  }

  // public createOverlay() {
  //   const videoElement = this.player.videoElement;
  //   const overlayContainer = videoElement.parentNode;

  //   // Create the overlay div but do not display it immediately
  //   const overlay = document.createElement("div");
  //   overlay.classList.add("video-overlay");

  //   // Initially, the overlay is not active and therefore not visible
  //   // You can set the right property to be off-screen or set visibility to hidden
  //   overlay.style.right = "100%"; // Starts off-screen, assuming right alignment
  //   overlay.style.opacity = "0"; // Starts fully transparent

  //   // Append the hidden overlay to the container
  //   overlayContainer?.appendChild(overlay);
  // }

  // public displayOverlay(text: string) {
  //   const videoElement = this.player.videoElement;
  //   const overlayContainer = videoElement.parentNode;
  //   const overlay = overlayContainer?.querySelector(".video-overlay") as HTMLElement;
  //   overlay.innerText = text;
  //   // Add class for identification
  //   // overlay.classList.add("video-overlay");
  //   overlay.classList.toggle("active");

  //   // Remove any existing overlays first
  //   const existingOverlay = overlayContainer?.querySelector(".video-overlay") as HTMLElement;
  //   if (existingOverlay) {
  //     existingOverlay.style.animation = "slideOut 0.5s forwards";
  //     existingOverlay.addEventListener("animationend", () => existingOverlay.remove());
  //   }

  //   setTimeout(() => {
  //     overlay.classList.remove("active");
  //   }, 3000);
  // }
}
