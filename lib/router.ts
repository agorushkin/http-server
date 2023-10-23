import { Handler, ServerRequest } from '../mod.ts';

export class ServerRouter {
  #handlers: Handler[];

  readonly base: string;

  constructor(base: string, list?: Handler[]) {
    this.#handlers = list ?? [];
    this.base      = base;
  };

  handle = (
    method: string,
    route: string,
    ...handlers: Handler[]
  ): void => {
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

  get    = this.handle.bind(this, 'GET');
  post   = this.handle.bind(this, 'POST');
  put    = this.handle.bind(this, 'PUT');
  delete = this.handle.bind(this, 'DELETE');
  patch  = this.handle.bind(this, 'PATCH');

  [Symbol.iterator] = () => this.#handlers[Symbol.iterator]();
};
