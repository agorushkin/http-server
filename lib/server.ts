import { ServerRequest } from './event.ts';
import { ServerRouter } from './router.ts';

import { listen } from './listen.ts';

export type Handler = (request: ServerRequest) => void;

/**
 * A server class that's used to listen to incoming requests.
*/
export class Server extends ServerRouter {
  #signal ?: AbortSignal;
  #handlers: Handler[];

  constructor() {
    const handlers: Handler[] = [];

    super('', handlers);
    this.#handlers = handlers;
  };

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
    port: number,
    hostname: string | null = null,
    files?: { cert: string, key: string },
  ): void => {
    this.#signal = new AbortController().signal;

    listen(async (raw, addr) => {
      let   respond: (response: Response)  => void;
      const response = new Promise(resolve => respond = resolve);
      const request  = new ServerRequest(raw, addr, respond!);

      for (const handler of this.#handlers) await handler(request);

      return await response as Promise<Response>;
    }, {
      port,
      hostname: hostname ?? undefined,
      signal: this.#signal,
      files,
    });
  };

  /**
   * Stops the server from accepting any future incoming requests.
  */
  close = (): void => {
    this.#signal?.dispatchEvent(new Event('abort'));
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
    handlers = handlers.map(handler => async (request: ServerRequest) => {
      request.params = {};
      request.route  = null;

      await handler(request);
    });

    this.#handlers.push(...handlers);
  };
};
