import { serve } from '../deps.ts';

import { CONTENT_TYPES } from './constants.ts';
import { WebRequest } from './event/event.ts';
import { Handler, HandlerRunner, CreateHandlerRunner } from './handler.ts';

export class WebServer {
  #abortSignal: AbortSignal | null = null;
  #handlers = new Array<HandlerRunner>();

  open(port = 8000) {
    const abortSignal = this.#abortSignal = new AbortController().signal;

    serve((req, connInfo) => {
      let respond: (res: Response) => void;
      const response = new Promise(resolve => respond = resolve);
      const request = new WebRequest(req, (connInfo.remoteAddr as { hostname: string })?.hostname, respond!);
  
      const handlers = [...this.#handlers];
      const handled  = new Set<number>();

      const createNext = (index = -1): () => void => {
        if (handled.has(index) || !handlers[index + 1]) return () => null
  
        return async () => {
          const handler = handlers[index + 1];
          if (!handled.has(index))
            await handler(request, createNext(index + 1));
  
          handled.add(index);
          createNext(index + 1)();
        }
      }
  
      createNext()();
    
      return response as Promise<Response> || new Response(null, { status: 404 });
    }, { port, signal: abortSignal, onListen: undefined });
  }

  use(route = '/', method = 'ANY') {
    return (...handlers: Handler[]) => {
      handlers.map(handler => this.#handlers.push(CreateHandlerRunner(method, route, handler)));

      return this;
    };
  }

  static(route = '/', source = './') {
    route = `/${ route.replace(/\/?\*?$/, '/*') }`.replace(/\/+/g, '/');

    this.use(route, 'GET')(async ({ href, respond }) => {
      const pathname = new URL(href).pathname;

      const base = route.split('/').filter((item) => item != '*' && item != '');
      const rest = pathname.replace(/^\//, '').split('/').filter((_, index) => index >= base.length);
      const path = `file://${ [ Deno.cwd(), source, ...rest ].join('/') }`;

      const extension = path.split(/\//).pop()?.split('.').pop() ?? '.txt';
      const contentType = (CONTENT_TYPES as Record<string, string>)[extension] ?? 'text/plain';

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

  close() {
    if (!this.#abortSignal) throw new Error('Web server is not yet open');

    this.#abortSignal?.dispatchEvent(new Event('abort'));
    this.#abortSignal = null;
  }
}