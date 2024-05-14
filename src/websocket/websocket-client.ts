import ReconnectingWebSocket from 'reconnecting-websocket';
import { CloseEvent, ErrorEvent } from 'reconnecting-websocket';

import { DEBUG } from '../config';

class WebSocketClient {
  private socket: ReconnectingWebSocket | null = null;
  private readonly KEEP_ALIVE_INTERVAL = 15;
  constructor() {}

  async connect(url: string) {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      throw new Error('WebSocket is already initialized.');
    }

    return new Promise((resolve, reject) => {
      this.socket = new ReconnectingWebSocket(url);

      this.socket.onopen = resolve;
      this.socket.onerror = (error) => reject(error);
    });
  }

  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(data: any) {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized.');
    }

    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open.');
    }

    DEBUG && console.debug('Sending message to server:', data);
    if (typeof data !== 'string') {
      data = JSON.stringify(data);
    }
    this.socket.send(data);
  }

  keepAlive() {
    const keepAliveIntervalId = setInterval(
      () => {
        if (this.socket) {
          this.socket.send('ping');
        } else {
          clearInterval(keepAliveIntervalId);
        }
      },
      // Prevent the service worker from becoming inactive.
      this.KEEP_ALIVE_INTERVAL * 1000,
    );
  }

  onOpen(callback: () => void) {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized.');
    }

    this.socket.onopen = callback;
  }

  onMessage(callback: (data: any) => void) {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized.');
    }

    this.socket.onmessage = (event: MessageEvent) => {
      DEBUG && console.debug('Received message from server:', event.data);
      if (event.data === 'pong') {
        return;
      }
      callback(JSON.parse(event.data));
    };
  }

  onError(callback: (error: ErrorEvent) => void) {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized.');
    }

    this.socket.onerror = callback;
  }

  onClose(callback: (event: CloseEvent) => void) {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized.');
    }

    this.socket.onclose = callback;
  }

  get readyState() {
    return this.socket?.readyState;
  }
}

export default WebSocketClient;
