// Environment-specific configurations
if (typeof process.env.WEBSOCKET_SERVER === 'undefined') {
  throw new Error('Environment variable WEBSOCKET_SERVER is not defined.');
}
export const WEBSOCKET_SERVER = process.env.WEBSOCKET_SERVER as string;

if (typeof process.env.HTTP_SERVER === 'undefined') {
  throw new Error('Environment variable HTTP_SERVER is not defined.');
}
export const HTTP_SERVER = process.env.HTTP_SERVER as string;

// Hostname enum
export enum Hostname {
  YOUTUBE = 'www.youtube.com',
  NETFLIX = 'www.netflix.com',
  AMAZON = 'www.amazon.com',
  BILIBILI = 'www.bilibili.com',
  NICOVIDEO = 'www.nicovideo.jp',
  CRUNCHYROLL = 'www.crunchyroll.com',
}

export const DEBUG = process.env.NODE_ENV === 'development';
