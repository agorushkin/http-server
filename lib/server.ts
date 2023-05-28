import { HttpRequest } from './event.ts';
import { listen } from './listen.ts';

export type Handler = (request: HttpRequest) => unknown | Promise<unknown>;

export class HttpServer {
  #signal: AbortSignal | null = null;
  #handlers = new Array<Handler>();

  listen = (port: number, files?: { cert: string, key: string }) => {
    this.#signal = new AbortController().signal;

    listen(async (raw, ip) => {
      let respond: (response: Response) => void;
      const response = new Promise(resolve => respond = resolve);
      const request  = new HttpRequest(raw, ip, respond!);

      for (const handler of this.#handlers) await handler(request);

      return await response as Promise<Response>;
    }, { port, files, signal: this.#signal });
  };

  close = () => {
    this.#signal?.dispatchEvent(new Event('abort'));
    return this.#signal?.aborted ?? false;
  };

  use = (handler: Handler) => {
    const callback = async (request: HttpRequest) => {
      request.params = {};
      request.route = null;

      await handler(request);
    };

    this.#handlers.unshift(callback);
  };

  route = (route: string, method = 'GET') => {
    return (handler: Handler) => {
      const callback = async (request: HttpRequest) => {
        const pattern = new URLPattern({ pathname: route });
        const params  = pattern.exec(request.href)?.pathname.groups;
  
        const isPatternPassed = pattern.test(request.href);
        const isMethodPassed = method == request.method || method == 'ANY';
  
        if (!isPatternPassed || !isMethodPassed) return;

        request.params = params ?? {};
        request.route = route;

        await handler(request);
      };

      this.#handlers.push(callback);
    };
  };
}