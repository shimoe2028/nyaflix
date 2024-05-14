import { VideoState } from './app/controller';

export enum CommandType {
  CREATE_ROOM = 'createRoom',
  EXIT_ROOM = 'exitRoom',
  GET_ROOM_INFO = 'GetRoomInfo',
}

export enum ActionType {
  PLAY = 'play',
  PAUSE = 'pause',
  SEEK = 'seek',
}

export interface PlayAction {
  type: ActionType.PLAY;
}

export interface PauseAction {
  type: ActionType.PAUSE;
}

export interface SeekAction {
  type: ActionType.SEEK;
  time: number;
}

export type Action = PlayAction | PauseAction | SeekAction;

export enum MessageType {
  CREATE = 'create',
  FETCH = 'fetch',
  SYNC = 'sync',
  LOAD = 'load',
}

interface BaseMessage {
  type: MessageType;
  clientId: string;
}

export interface CreateMessage extends BaseMessage {
  type: MessageType.CREATE;
  videoState: VideoState;
  url: string;
}

export interface FetchMessage extends BaseMessage {
  type: MessageType.FETCH;
}

export interface SyncMessage extends BaseMessage {
  type: MessageType.SYNC;
  videoState: VideoState;
}

export interface LoadMessage extends BaseMessage {
  type: MessageType.LOAD;
  url: string;
}

export type Message = CreateMessage | FetchMessage | SyncMessage | LoadMessage;
