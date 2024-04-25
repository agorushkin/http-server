import { ServerRequest } from './event.ts';
import { ServerRouter } from './router.ts';

export type Handler = (request: ServerRequest) => void | Promise<void>;

interface ListenerOptions {
  port?: number;
  hostname?: string;

  signal?: AbortSignal;
}

interface TLSOptions {
  key: string;
  cert: string;
}

/**
 * A server class that's used to listen to incoming requests.
 */
export class Server extends ServerRouter {
  private signal?: AbortSignal;

  constructor() {
    super('', []);
  }

  /**
   * Initialize the server.
   *
   * @param port The port to listen on.
   * @param hostname The hostname to listen on.
   * @param files Required if using HTTPS. The certificate and key files.
   *
   * @example
   * ```ts
   * server.listen(8080, '0.0.0.0', {
   *   cert: './cert.pem',
   *   key: './key.pem',
   * });
   * ```
   */
  listen = (
    port: number = 8080,
    hostname?: string,
    tls?: { cert: string; key: string },
  ): void => {
    this.signal = new AbortController().signal;

    Deno.serve({
      port,
      hostname,
      ...tls,
      handler: async (raw, { remoteAddr: addr }) => {
        let respond: (response: Response) => void;
        const response = new Promise((resolve) => respond = resolve);
        const request = new ServerRequest(raw, addr, respond!);

        for (const handler of this.handlers) await handler(request);

        return await response as Promise<Response>;
      },
      onListen: () => {},
    });
  };

  /**
   * Stops the server from accepting any future incoming requests.
   */
  close = (): void => {
    this.signal?.dispatchEvent(new Event('abort'));
  };

  /**
   * Adds a non-route specific handler to the server.
   *
   * @param handlers The handlers to use.
   *
   * @example
   * ```ts
   * server.use(async ({ respond }) => {
   *   respond({ body: 'Hello, World', status: 200 });
   * });
   * ```
   */
  use = (...handlers: Handler[]): void => {
    handlers = handlers.map((handler) => async (request: ServerRequest) => {
      request.params = {};
      request.route = null;

      await handler(request);
    });

    this.handlers.push(...handlers);
  };
}
