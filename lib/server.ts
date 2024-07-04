import { ServerRequest } from './event.ts';
import { ServerRouter } from './router.ts';
import { Deferer, Handler } from './router.ts';

type ServerOptions = {
  /** The port to listen on. Default is `8000`. */
  port?: number;
  /** The hostname to listen on. Default is `"127.0.0.1"`. */
  hostname?: string;
  /** The TLS configuration to use. */
  tls?: {
    /** The content of the key file. */
    key: string;
    /** The content of the certificate file. */
    cert: string;
  };
  /** The signal to use for aborting the server. */
  signal?: AbortSignal;
};

/**
 * A server class that's used to listen to incoming requests.
 */
export class Server extends ServerRouter {
  private signal?: AbortSignal;

  constructor() {
    super('', []);
  }

  #process = async (request: ServerRequest) => {
    const run = async (index: number) => {
      if (index >= this.handlers.length) return;

      const handler = this.handlers[index];
      await handler(request, () => run(index + 1));
    };

    await run(0);
  };

  /**
   * Initialize the server.
   *
   * @param options The options to use when initializing the server.
   *
   * @example
   * ```ts
   * server.listen({
   *   port: 8000,
   *   hostname: '127.0.0.1',
   *   tls: {
   *     cert: //...file.crt content,
   *     key: //...file.key content,
   *   },
   * });
   * ```
   */
  listen = (options: ServerOptions): void => {
    this.signal = new AbortController().signal;

    Deno.serve({
      ...options,
      handler: async (raw, { remoteAddr: addr }) => {
        let respond: (response: Response) => void;
        const response = new Promise((resolve) => respond = resolve);
        const request = new ServerRequest(raw, addr, respond!);

        await this.#process(request);
        if (!request.responded) request.respond(request.response);

        return await response as Promise<Response>;
      },
      onListen: () => {},
    });
  };

  /**
   * Closes server listener.
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
    handlers = handlers.map(
      (handler) => async (request: ServerRequest, defer: Deferer) => {
        request.params = new Map();
        request.route = null;

        await handler(request, defer);
      },
    );

    this.handlers.push(...handlers);
  };
}
