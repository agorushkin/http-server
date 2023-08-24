import { HttpRequest } from './event.ts';

import { listen } from './listen.ts';

export type Handler = (request: HttpRequest) => void;

export class Server {
  #signal: AbortSignal | null = null;
  #handlers = new Array<Handler>();
  
  listen = (port: number, hostname: string | null = null, files?: { cert: string, key: string }) => {
    this.#signal = new AbortController().signal;
    
    listen(async (raw, ip) => {
      let   respond: (response: Response)  => void;
      const response = new Promise(resolve => respond = resolve);
      const request  = new HttpRequest(raw, ip, respond!);
      
      for (const handler of this.#handlers) await handler(request);
      
      return await response as Promise<Response>;
    }, { port, hostname: hostname ?? undefined, files, signal: this.#signal });
  };
  
  close = () => {
    this.#signal?.dispatchEvent(new Event('abort'));
  };
  
  use = (...handlers: Handler[]) => {
		handlers.map(handler => async (request: HttpRequest) => {
			request.params = {};
			request.route  = null;

			await handler(request);
		});
    
    this.#handlers.unshift(...handlers);
  };
  
  handle = (method: string, route: string, ...handlers: Handler[]) => {
    handlers = handlers.map(handler => async (request: HttpRequest) => {
      const pattern = new URLPattern({ pathname: route });
      const params  = pattern.exec(request.href)?.pathname.groups;
      
      const isPatternPassed = pattern.test(request.href);
      const isMethodPassed  = method == request.method || method == 'ANY';
      
      if (!isPatternPassed || !isMethodPassed) return;
      
      request.params = params ?? {};
      request.route  = route;

      await handler(request);
    });
    
    this.#handlers.push(...handlers);
  };
  
  get    = (route: string, ...handlers: Handler[]) => this.handle('GET',    route, ...handlers);
  post   = (route: string, ...handlers: Handler[]) => this.handle('POST',   route, ...handlers);
  put    = (route: string, ...handlers: Handler[]) => this.handle('PUT',    route, ...handlers);
  patch  = (route: string, ...handlers: Handler[]) => this.handle('PATCH',  route, ...handlers);
  delete = (route: string, ...handlers: Handler[]) => this.handle('DELETE', route, ...handlers);
}