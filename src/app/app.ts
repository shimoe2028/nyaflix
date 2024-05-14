import { nanoid } from 'nanoid';

import { DEBUG, WEBSOCKET_SERVER } from '../config';
import { CreateMessage, FetchMessage, LoadMessage, Message, MessageType, SyncMessage } from '../types';
import { buildUrl, encryptUrl } from '../utils/url';
import WebSocketClient from '../websocket/websocket-client';
import Client from './client';
import { Player } from './controller';
import VideoController from './controller';

export default class App {
  private client: Client;
  private socket: WebSocketClient;
  private controller: VideoController;

  constructor(player: Player) {
    this.client = new Client(nanoid());
    this.socket = new WebSocketClient();
    this.controller = new VideoController(player);
  }

  private handleEvent = async (event: Event) => {
    const eventType = event.type;
    DEBUG && console.debug('event', eventType, this.controller.getState().currentTime, window.location.href);
    // Exit the room if not in the room.
    if (!this.client.isInRoom()) {
      this.exitRoom();
      return;
    }

    if (eventType === 'loadeddata') {
      if (this.controller.loadeddata) {
        return;
      }
      this.controller.loadeddata = true;
      if (!this.client.isCreator) {
        this.fetchState(true);
      }
      return;
    }

    if (eventType === 'abort') {
      // TODO: change video
      event.stopImmediatePropagation();
      this.exitRoom();
      return;
    }

    if (eventType === 'loadstart') {
      // TODO: update video url or reload video
      // const data: LoadMessage = {
      //   type: MessageType.LOAD,
      //   clientId: this.client.clientId,
      //   url: buildUrl(new URL(window.location.href), true),
      // };
      // this.socket.send(data);
      return;
    }

    if (eventType === 'ended') {
      return;
    }

    if (eventType == 'play' || eventType == 'pause' || eventType == 'seeking' || eventType == 'seeked') {
      const isLocked = this.controller.isLockedAny();
      this.controller.releaseLock(eventType);
      if (isLocked) {
        event.stopImmediatePropagation();
        return;
      }
      const localState = this.controller.getState();
      if (this.controller.shouldUpdateRemoteState(localState, eventType)) {
        this.controller.setRemoteState(localState);
        const data: SyncMessage = {
          type: MessageType.SYNC,
          clientId: this.client.clientId,
          videoState: localState,
        };
        this.socket.send(data);
      }
    }
  };

  private receiveMessage = (msg: Message) => {
    if (!this.client.isInRoom()) {
      // Exit the room if not in the room.
      this.exitRoom();
      return;
    }
    if (msg.type === MessageType.SYNC) {
      try {
        this.controller.updateLocalState(msg.videoState);
        this.controller.releaseLock('sync');
      } catch (error) {
        this.exitRoom();
      }
    }
  };

  private addEventListeners() {
    const events = ['play', 'pause', 'seeking', 'seeked', 'loadeddata', 'loadstart', 'abort', 'ended'];
    events.forEach((event) => this.controller.addEventListener(event, this.handleEvent));
  }

  private removeEventListeners() {
    const events = ['play', 'pause', 'seeking', 'seeked', 'loadeddata', 'loadstart', 'abort', 'ended'];
    events.forEach((event) => this.controller.removeEventListener(event, this.handleEvent));
  }

  private async enterRoom(roomId: string): Promise<void> {
    this.exitRoom();

    try {
      await this.socket.connect(new URL(roomId, WEBSOCKET_SERVER).href);
    } catch (error) {
      throw new Error('Failed to connect to WebSocket server: ' + error);
    }
  }

  public async createRoom(url: string): Promise<string> {
    const roomId = nanoid(6);
    await this.enterRoom(roomId);
    this.client.createRoom(roomId, url);
    return roomId;
  }

  public async joinRoom(roomId: string, url: string, key: string): Promise<void> {
    await this.enterRoom(roomId);
    this.client.joinRoom(roomId, key, url);
  }

  public start() {
    if (!this.client.isInRoom()) {
      throw new Error('Not in a room.');
    }

    this.addEventListeners();

    this.socket.onMessage(this.receiveMessage);
    this.socket.onOpen(() => {
      // console.debug('WebSocket connection opened.', this.socket.readyState);
      this.fetchState(true);
    });
    this.socket.onClose(() => {
      // console.debug('WebSocket connection closed.', this.socket.readyState);
      // this.exitRoom();
    });
    this.socket.keepAlive();
    if (this.client.isCreator) {
      const data: CreateMessage = {
        type: MessageType.CREATE,
        clientId: this.client.clientId,
        videoState: this.controller.getState(),
        url: encryptUrl(buildUrl(new URL(this.client.url!), true), this.client.key!),
      };
      this.socket.send(data);
    } else {
      this.fetchState(true);
    }
  }

  public exitRoom = () => {
    // console.debug('Exiting room.');
    this.client.exitRoom();
    this.removeEventListeners();
    this.socket.close();
  };

  public getRoomId = (): string | null => {
    return this.client.roomId;
  };

  public getInviteUrl = (): string | null => {
    return this.client.inviteUrl;
  };

  public fetchState = (force: boolean = false) => {
    if (this.client.isInRoom()) {
      if (force) {
        this.controller.setRemoteState(null);
      }
      this.controller.setLock('sync');
      const data: FetchMessage = {
        type: MessageType.FETCH,
        clientId: this.client.clientId,
      };
      this.socket.send(data);
    }
  };
}
