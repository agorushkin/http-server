type MessageType = string | Blob | ArrayBufferLike | ArrayBufferView;

/** A utility class used for WebSocket management and channel broadcasting */
export class ServerBrodcaster {
  channels: Map<unknown, Set<WebSocket>>;

  constructor(channels?: Map<unknown, Set<WebSocket>>) {
    this.channels = channels ?? new Map();
  };

  /**
   * Subscribes a WebSocket to a channel.
   *
   * If the socket closes, the socket will be automatically unsubscribed.
   *
   * @param channel The channel to subscribe to.
   * @param socket The WebSocket to subscribe.
   *
   * @example
   * ```ts
   * const channels = new ServerBrodcaster();
   *
   * server.get('/ws', ({ upgrade }) => {
   *   const socket = await upgrade();
   *
   *   if (!socket) return;
   *
   *   channels.subscribe('channel', socket);
   * });
   * ```
  */
  subscribe = (channel: unknown, socket: WebSocket): void => {
    const subscribers = this.channels.get(channel);

    socket.addEventListener('close', () => subscribers?.delete(socket));

    subscribers
      ? subscribers.add(socket)
      : this.channels.set(channel, new Set([ socket ]));
  };

  /**
   * Unsubscribes a WebSocket from a channel.
   *
   * @param channel The channel to unsubscribe from.
   * @param socket The WebSocket to unsubscribe.
  */
  unsubscribe = (channel: unknown, socket: WebSocket): void => {
    const subscribers = this.channels.get(channel);

    subscribers?.delete(socket);
  };

  /**
   * Broadcasts a message to all subscribers of a channel.
   *
   * @param channel The channel to broadcast to.
   * @param message The message to broadcast.
   * @param exclude The WebSockets to exclude from the broadcast.
   *
   * @example
   * ```ts
   * const channels = new ServerBrodcaster();
   *
   * server.get('/ws', ({ upgrade }) => {
   *   const socket = await upgrade();
   *
   *   if (!socket) return;
   *
   *   channels.subscribe('channel', socket);
   * });
   *
   * server.get('/broadcast', ({ respond }) => {
   *   channels.broadcast('channel', 'Hello, World!');
   *
   *   respond({ body: 'Broadcasted message!' });
   * });
  */
  broadcast = (
    channel: unknown,
    message: MessageType,
    ...exclude: WebSocket[]
  ): void => {
    const subscribers = this.channels.get(channel);

    subscribers?.forEach((socket) => {
      const isExcluded = Array.isArray(exclude)
        ? exclude.includes(socket)
        : socket === exclude;

      if (!isExcluded && socket.readyState === WebSocket.OPEN) socket.send(message);
    });
  };
};
