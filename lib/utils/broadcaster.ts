export class ServerBrodcaster {
  channels: Map<unknown, Set<WebSocket>>;

  constructor(channels?: Map<unknown, Set<WebSocket>>) {
    this.channels = channels ?? new Map();
  }
  
  subscribe = (channel: unknown, socket: WebSocket): void => {
    const subscribers = this.channels.get(channel);

    socket.addEventListener('close', () => subscribers?.delete(socket));

    subscribers
      ? subscribers.add(socket)
      : this.channels.set(channel, new Set( [ socket ]));
  };

  unsubscribe = (channel: unknown, socket: WebSocket): void => {
    const subscribers = this.channels.get(channel);

    subscribers?.delete(socket);
  };

  broadcast = (channel: unknown, message: string | Blob | ArrayBufferLike | ArrayBufferView, excluded: WebSocket | null = null): void => {
    const subscribers = this.channels.get(channel);

    subscribers?.forEach((socket) => socket !== excluded && socket.send(message));
  };
}