import { WebRequestBody } from './body.ts';

interface WebResponse {
  body?: null | string | ArrayBufferLike | FormData;
  status?: number;
  headers?: Record<string, string>;
}

export class WebRequest {
  #route = '/*';

  href: string;
  params: Record<string, string>;
  headers: Record<string, string>;
  method: string;
  body: WebRequestBody;
  ip: string | null;

  respond(response: WebResponse): void {}

  upgrade(): Promise<WebSocket> | null { return null }

  constructor(request: Request, ip: string | null, respond: (res: Response) => void) {
    this.href    = request.url;
    this.params  = {};

    this.headers = Object.fromEntries(request.headers.entries());
    this.method  = request.method;
    this.body    = new WebRequestBody(request), 
    this.ip      = ip;

    this.respond = (response: WebResponse = { body: null, status: 200, headers: {} }) => {
      const { body, status, headers } = response;

      const rawResponse = body instanceof Response
        ? body
        : new Response(body as null, { status, headers });

      respond(rawResponse);
    };

    this.upgrade = () => {
      const { href, headers, respond } = this;

      if (headers.upgrade != 'websocket') return null;

      const request = new Request(href, { headers });

      try {
        const { socket, response } = Deno.upgradeWebSocket(request);

        respond({ body: response as unknown as null });
        return new Promise((resolve) => { setTimeout(() => resolve(socket), 0) });
      } catch {
        respond({ status: 400 });
        return null;
      }
    }
  }

  get route() {
    return this.#route;
  }

  set route(value) {
    this.#route = value.replace(/(\/+|\\+)/g, '/');

    const routePattern = new URLPattern({ pathname: this.#route });
    const routeParams  = routePattern.exec(this.href)?.pathname.groups;

    this.params = routeParams ?? {};
  }
}