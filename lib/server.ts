import { HttpRequest } from './event.ts';
import { listen } from './listen.ts';

export type Handler = (request: HttpRequest) => unknown | Promise<unknown>;

export class HttpServer {
  #signal: AbortSignal | null = null;
  #handlers = new Array<Handler>();

  listen = (port: number, files?: { cert: string, key: string }) => {
    this.#signal = new AbortController().signal;

    listen(async (request, ip) => {
      let respond: (response: Response) => void;
      const response = new Promise(resolve => respond = resolve);
      const data     = new HttpRequest(request, ip, respond!);

      this.#handlers.map(handler => handler(data));

      return await response as Promise<Response>;
    }, { port, files, signal: this.#signal });
  };

  close = () => {
    this.#signal?.dispatchEvent(new Event('abort'));
    return this.#signal?.aborted ?? false;
  };

  plugin = (handler: Handler) => {
    const fn = (request: HttpRequest) => {
      request.params = {};
      handler(request);
    };

    this.#handlers.unshift(fn);
  };

  route = (route: string, method = 'GET') => {
    return (handler: Handler) => {
      const fn = (request: HttpRequest) => {
        const pattern = new URLPattern({ pathname: route });
        const params  = pattern.exec(request.href)?.pathname.groups;
  
        const isPatternPassed = pattern.test(request.href);
        const isMethodPassed = method == request.method || method == 'ANY';
  
        if (!isPatternPassed || !isMethodPassed) return;

        request.params = params ?? {};
        request.route = route;
        handler(request);
      };

      this.#handlers.push(fn);
    };
  };
}