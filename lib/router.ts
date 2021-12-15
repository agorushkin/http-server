import { Middleware, Handler } from './middleware.ts';

export class Router {
  #handlers = new Set<Middleware>();
  #base: string;

  /**
   * Create a new router.
   * 
   * @param base - The base route.
  */
  constructor(base = '') {
    this.#base = base;
  }

  /**
   * Listen for incoming requests.
   * @param route - The route to listen on.
   * @param method - The method to listen for.
   * @example
   * server.on()(({ respond }) => respond('Hello World'));
   * server.on('/')(({ respond }) => respond('Hello World'));
   * server.on('/', 'GET')(({ respond }) => respond('Hello World'));
   * 
   * @returns A function that can later be used to add handlers.
  */
  on(route = '/*', method = 'GET'): (...handlers: Handler[]) => Router {
    /**
     * A function to add handlers.
     * 
     * @param handlers - The handlers to add.
     * @example
     * server.on()(({ respond }) => respond('Hello World'));
     * server.on('/')(({ respond }) => respond('Hello World'));
     * server.on('/', 'GET')(({ respond }) => respond('Hello World'));
    */
    return (...handlers: Handler[]) => {
      route = `${this.#base}/${route}`;
      handlers.forEach(handler => this.#handlers.add(Middleware(method, route, handler)));

      return this;
    };
  }

  /**
   * Get router handlers.
   * 
   * @returns Router handlers.
   */
  handlers(): Middleware[] {
    return [...this.#handlers];
  }
}