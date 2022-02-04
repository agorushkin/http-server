import { HTTPRequest } from './event/event.ts';

import { Middleware, Handler } from './middleware.ts';
import { Router } from './router.ts';

import { CONTENT_TYPES } from './constants.ts';

export class Server {
  #middleware = new Array<Middleware>();
  #listeners = new Array<Middleware>();
  #server: Deno.Listener | null = null

  static Router = Router;

  /**
   * Launch the server.
   * 
   * @param port - The port to listen on.
   * @example
   * server.listen();
   * server.listen(8080);
  */
  async listen(port = 8080): Promise<void> {
    // Start listening for requests.
    this.#server = Deno.listen({ port });

    // Listens for TCP connections.
    for await (const conn of this.#server) (async () => {
      // Turns TCP conenctions into HTTP requests, and handles them.
      for await (const { request, respondWith } of Deno.serveHttp(conn)) {
        let responded = false;

        // Runs the function to handle the request, and call all the handlers.
        this.#run(request, (response: Response) => {
          if (responded) return null;

          respondWith(response);
          responded = true;
        });
      }
    })();
  }

  #run(request: Request, respond: (resonse: Response) => void) {
    const workedRequest = new HTTPRequest(request, respond);
    const handlers = [...this.#middleware, ...this.#listeners];
    const handled = new Set<number>();

    function next(index = -1): () => void {
      if (handled.has(index) || !handlers[index + 1]) return () => undefined

      return async () => {
        const handler = handlers[index + 1]
        // Checks if the handler has already been called.
        if (!handled.has(index))
          // Runs handler.
          await handler(workedRequest, next(index + 1));

          handled.add(index);
        next(index + 1)();
      }
    }

    // Executes the next function to start the chain of middleware.
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
    return (...handlers: (Handler | Router)[]): Server => {
      for (const middleware of handlers) {
        middleware instanceof Router
          ? this.#middleware.push(...middleware.handlers())
          : this.#middleware.push(Middleware(method, route, middleware)); 
      }
      
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

      // Get a clear path that can be easily parsed.
      const base = route.split('/').filter((item) => item != '*' && item != '');
      // Get a part of path that is used as a part of the route.
      const rest = pathname.replace(/^\//, '').split('/').filter((_, index) => index >= base.length);
      // Create a path to the file.
      const path = `file://${ [ Deno.cwd(), root, ...rest ].join('/') }`;

      // Extension of the file being requested.
      const extension = path.split(/\//).pop()?.split('.').pop() ?? '.txt';
      // Content type of the file being requested.
      const contentType = (CONTENT_TYPES as Record<string, string>)[extension] ?? 'text/plain';

      // Fetches the file located at the path.
      await fetch(path)
        .then(async (file) => {
          // Responds with file buffer and content type.
          respond({
            body: await file.arrayBuffer(),
            headers: { 'content-type': contentType },
          });
        })
        // Responds with a 404 if the file doesn't exist.
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
