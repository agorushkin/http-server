import type { Locals, ServerRequest } from './event.ts';

export type Deferer = () => Promise<void>;

export type Handler<L extends Locals = Locals> = (
  request: ServerRequest<L>,
  defer: Deferer,
) => unknown;

/** The routing agent that can be used to create routes for the server.
 *
 * @example
 * ```ts
 * const server = new Server();
 * const router = new ServerRouter('/api');
 *
 * router.get(...handlers);
 *
 * server.use(...router);
 */
export class ServerRouter<L extends Locals> {
  protected handlers: Handler<L>[];

  readonly base: string;

  /**
   * Creates a new router.
   *
   * @param base The base path for the router.
   * @param list The list of handlers to use, as well as location to store.
   */
  constructor(base = '', list?: Handler<L>[]) {
    this.handlers = list ?? [];
    this.base = base;
  }

  /**
   * Adds a route and method specific handler to the server.
   *
   * @param method The HTTP method to handle.
   * @param route The route to handle.
   * @param handlers The handlers to use.
   *
   * @example
   * ```ts
   * server.handle('GET', '/hello', ({ respond }) => {
   *   respondI({ body: 'Hello, World!', status: 200 });
   * });
   * ```
   */
  handle = (
    method: string,
    route: string,
    ...handlers: Handler<L>[]
  ): void => {
    handlers = handlers.map(
      (handler) => async (request: ServerRequest<L>, defer: Deferer) => {
        const pattern = new URLPattern({ pathname: route });
        const match = pattern.exec(request.href)?.pathname.groups;

        const isPatternPassed = pattern.test(request.href);
        const isMethodPassed = method == request.method || method == 'ANY';

        if (!isPatternPassed || !isMethodPassed) return false;

        const params = new Map<string, string | undefined>();
        for (const key in match) params.set(key, match[key]);

        request.params = params;
        request.route = `${this.base}${route}`;

        await handler(request, defer);
        return true;
      },
    );

    this.handlers.push(...handlers);
  };

  /**
   * Adds a GET route handler to the server.
   *
   * @param route The route to handle.
   * @param handlers The handlers to use.
   */
  get = this.handle.bind(this, 'GET');

  /**
   * Adds a POST route handler to the server.
   *
   * @param route The route to handle.
   * @param handlers The handlers to use.
   */
  post = this.handle.bind(this, 'POST');

  /**
   * Adds a PUT route handler to the server.
   *
   * @param route The route to handle.
   * @param handlers The handlers to use.
   */
  put = this.handle.bind(this, 'PUT');

  /**
   * Adds a DELETE route handler to the server.
   *
   * @param route The route to handle.
   * @param handlers The handlers to use.
   */
  delete = this.handle.bind(this, 'DELETE');

  /**
   * Adds a PATCH route handler to the server.
   *
   * @param route The route to handle.
   * @param handlers The handlers to use.
   */
  patch = this.handle.bind(this, 'PATCH');

  [Symbol.iterator] = () => this.handlers[Symbol.iterator]();
}
