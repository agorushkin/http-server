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
    const wrapper = (request: HttpRequest) => {
      request.params = {};
      handler(request);
    };

    this.#handlers.unshift(wrapper);
  };

  route = (path: string, method = 'GET') => {
    return (handler: Handler) => {
      const wrapper = (request: HttpRequest) => {
        const pattern = new URLPattern({ pathname: path });
        const params  = pattern.exec(request.href)?.pathname.groups;
  
        const isPatternPassed = new URLPattern({ pathname: path }).test(request.href);
        const isMethodPassed = method == request.method || method == 'ANY';
  
        if (isPatternPassed && isMethodPassed) {
          request.params = params ?? {};
          handler(request);
        }
      };

      this.#handlers.push(wrapper);
    };
  };
}