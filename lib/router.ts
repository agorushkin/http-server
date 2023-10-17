import { Handler, ServerRequest } from '../mod.ts';

export class ServerRouter {
  #handlers: Handler[];

  readonly base: string;

  constructor(base: string, store?: Handler[]) {
    this.#handlers = store ?? [];
    this.base = base;
  };

  handle = (method: string, route: string, ...handlers: Handler[]): void => {
    handlers = handlers.map(handler => async (request: ServerRequest) => {
      const pattern = new URLPattern({ pathname: route });
      const params  = pattern.exec(request.href)?.pathname.groups;

      const isPatternPassed = pattern.test(request.href);
      const isMethodPassed  = method == request.method || method == 'ANY';

      if (!isPatternPassed || !isMethodPassed) return;

      request.params = params ?? {};
      request.route  = `${ this.base }${ route }`;

      await handler(request);
    });

    this.#handlers.push(...handlers);
  };

  get    = (route: string, ...handlers: Handler[]) => this.handle('GET',    route, ...handlers);
  post   = (route: string, ...handlers: Handler[]) => this.handle('POST',   route, ...handlers);
  put    = (route: string, ...handlers: Handler[]) => this.handle('PUT',    route, ...handlers);
  delete = (route: string, ...handlers: Handler[]) => this.handle('DELETE', route, ...handlers);
  patch  = (route: string, ...handlers: Handler[]) => this.handle('PATCH',  route, ...handlers);

  [Symbol.iterator] = () => this.#handlers[Symbol.iterator]();
};
