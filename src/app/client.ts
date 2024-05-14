import { HTTP_SERVER } from '../config';
import { generatePassword } from '../utils/string';

class Client {
  private _clientId: string;
  private _isCreator: boolean = false;
  private _roomId: string | null = null;
  private _key: string | null = null;
  private _url: string | null = null;

  constructor(clientId: string) {
    this._clientId = clientId;
  }

  public get clientId(): string {
    return this._clientId;
  }

  public get isCreator(): boolean {
    return this._isCreator;
  }

  public isInRoom(): boolean {
    return this._roomId !== null;
  }

  public get roomId(): string | null {
    return this._roomId;
  }

  public get url(): string | null {
    return this._url;
  }

  public get inviteUrl(): string | null {
    // Construct the invitation URL using the roomId in the path, which helps in avoiding browser caching issues.
    // Append the key to the URL hash, which keeps it from being sent to the server in the HTTP request.
    return new URL(`join/${this.roomId}`, HTTP_SERVER).href + '#' + this.key!;
  }

  public get key(): string | null {
    return this._key;
  }

  public createRoom(roomId: string, url: string) {
    this._isCreator = true;
    this._roomId = roomId;
    this._key = generatePassword(12); // Generate a 72-bit key.
    this._url = url;
  }

  public joinRoom(roomId: string, key: string, url: string) {
    this._isCreator = false;
    this._roomId = roomId;
    this._key = key;
    this._url = url;
  }

  public exitRoom() {
    this._isCreator = false;
    this._roomId = null;
    this._key = null;
    this._url = null;
  }
}

export default Client;
