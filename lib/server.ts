import { ServerRequest } from './event.ts';
import { ServerRouter } from './router.ts';

import { listen } from './listen.ts';

export type Handler = (request: ServerRequest) => void;

export class Server extends ServerRouter {
  #signal  : AbortSignal | null = null;
  #handlers: Handler[];

  constructor() {
    const handlers: Handler[] = [];

    super('', handlers);
    this.#handlers = handlers;
  };

  listen = (port: number, hostname: string | null = null, files?: { cert: string, key: string }) => {
    this.#signal = new AbortController().signal;

    listen(async (raw, ip) => {
      let   respond: (response: Response)  => void;
      const response = new Promise(resolve => respond = resolve);
      const request  = new ServerRequest(raw, ip, respond!);

      for (const handler of this.#handlers) await handler(request);

      return await response as Promise<Response>;
    }, { port, hostname: hostname ?? undefined, files, signal: this.#signal });
  };

  close = () => {
    this.#signal?.dispatchEvent(new Event('abort'));
  };

  use = (...handlers: Handler[]): void => {
		handlers = handlers.map(handler => async (request: ServerRequest) => {
			request.params = {};
			request.route  = null;

			await handler(request);
    });

    this.#handlers.push(...handlers);
  };
};
