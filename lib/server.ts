import { Middleware, Handler } from './middleware.ts';
import { Router } from './router.ts';
import { HTTPRequest } from './event/event.ts';

import Constants from './constants.json' assert { type: 'json' };

const { CONTENT_TYPES } = Constants;

export class Server {
  #middleware = new Array<Middleware>();
  #listeners = new Array<Middleware>();
  #server: Deno.Listener | null = null

  /**
   * Launch the server.
   * 
   * @param port - The port to listen on.
   * @example
   * server.listen();
   * server.listen(8080);
  */
  async listen(port = 8080): Promise<void> {
    this.#server = Deno.listen({ port });

    try {
      for await (const conn of this.#server) (async () => {
        for await (const { request, respondWith } of Deno.serveHttp(conn)) {
          let responded = false;

          this.#run(request, (response: Response) => {
            if (responded) return null;

            respondWith(response);
            responded = true;
          });
        }
      })();
    } catch {/* Do nothing */}
  }

  #run(request: Request, respond: (resonse: Response) => void) {
    const httpRequest = new HTTPRequest(request, respond);
    const handlers = [...this.#middleware, ...this.#listeners];
    const handled = new Set<number>();

    function next(index = -1): () => void {
      if (handled.has(index) || !handlers[index + 1]) return () => undefined

      return async () => {
        const handler = handlers[index + 1]
        if (!handled.has(index))
          await handler(httpRequest, next(index + 1));

          handled.add(index);
        next(index + 1)();
      }
    }

    next()();
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
  on(route = '/*', method = 'GET'): (...handlers: Handler[]) => Server {
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
      handlers.forEach(handler => this.#listeners.push(Middleware(method, route, handler)));

      return this;
    };
  }

  /**
   * Add middleware.
   * 
   * @param route - The route to listen on.
   * @param method - The method to listen for.
   * @example
   * server.use()(() => console.log('Request'));
   * server.use('/')(() => console.log('Request'));
   * server.use('/', 'ANY')(() => console.log('Request'));
   * 
   * @returns A function that can later be used to add handlers.
   */
  use(route = '/*', method = 'ANY'): (...handlers: Handler[]) => Server {
    /**
     * A function to add handlers.
     * 
     * @param handlers - The handlers to add.
     * @example
     * server.use()(() => console.log('Request'));
     * server.use('/')(() => console.log('Request'));
     * server.use('/', 'ANY')(() => console.log('Request'));
    */
    return (...handlers: Handler[] | Router[]): Server => {
      handlers[0] instanceof Router
        ? (handlers as Router[]).forEach(router => this.#middleware.push(...router.handlers()))
        : (handlers as Handler[]).forEach(handler => this.#middleware.push(Middleware(method, route, handler)));

      return this;
    }
  }

  /**
   * Add a static file server.
   * 
   * @param route - The route to serve on.
   * @param root - The path to serve files from.
   * @example
   * server.static();
   * server.static('/files');
   * server.static('/files', '/path/to/files');
   */
  static(route = '/*', root = ''): Server {
    route = `/${route.replace(/\/?\*?$/, '/*')}`.replace(/\/+/g, '/');

    this.use(route, 'GET')(async ({ href, respond }) => {
      const pathname = new URL(href).pathname;

      const base = route.split('/').filter((item) => item != '*' && item != '');
      const rest = pathname.replace(/^\//, '').split('/').filter((_, index) => index >= base.length);
      const path = `file://${[Deno.cwd(), root, ...rest].join('/')}`;

      const contentType = (CONTENT_TYPES as Record<string, string>)[path.split('/').at(-1)?.split('.').at(-1) ?? ''] ?? 'text/plain'

      await fetch(path)
        .then(async (file) => {
          respond({
            body: await file.arrayBuffer(),
            headers: { 'content-type': contentType },
          });
        })
        .catch(() => respond({ status: 404 }));
    });

    return this;
  }

  /**
   * Close the server.
   * 
   * @example
   * server.close();
   */
  close(): void {
    this.#server?.close();
  }
}
