import { Handler, CreateHandlerRunner } from './handler.ts';

export class Router {
  #handlers = new Set<Handler>();
  #base: string;

  constructor(base = '') {
    this.#base = base;
  }

  use(route = '/*', method = 'GET'): (...handlers: Handler[]) => Router {
    return (...handlers: Handler[]) => {
      route = `${ this.#base }/${ route }`;
      for (const handler of handlers) {
        this.#handlers.add(CreateHandlerRunner(method, route, handler))
      }

      return this;
    };
  }

  handlers(): Handler[] {
    return [...this.#handlers];
  }
}