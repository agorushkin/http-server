import { HTTPBody } from './body.ts';

interface HTTPResponse {
  body?: null | string | ArrayBufferLike | FormData;
  status?: number;
  headers?: Record<string, string>;
}

export class HTTPRequest {
  #route = '/*';

  href: string;
  params: Record<string, string>;

  headers: Record<string, string>;
  method: string;
  body: HTTPBody;

  /**
   * Respond to the request.
   * 
   * @param response - The response object.
   * @example
   * respond({ body: 'Hello World' });
   * respond({ body: arrayBuffer });
   * respond({ body: formData });
   * 
   * respond({ body: 'Hello World', status: 404, headers: {} });
  */
  respond: (response: HTTPResponse) => void;

  /**
   * Upgrade the request to a websocket connection.
   * 
   * @returns A WebSocket if the upgrade was successful, otherwise null.
  */
   upgrade: () => WebSocket | null;

  constructor(request: Request, respond: (res: Response) => void) {
    this.href = request.url;
    this.params = {};

    this.headers = Object.fromEntries(request.headers.entries());
    this.method = request.method;
    this.body = new HTTPBody(request), 

    this.respond = (response: HTTPResponse = { body: null, status: 200, headers: {} }) => {
      const { body, status, headers } = response;

      body instanceof Response
        ? respond(body)
        : respond(new Response(body as null, { status, headers }));
    };

    this.upgrade = () => {
      const
        href = this.href,
        headers = this.headers,
        respond = this.respond;

      if (headers.upgrade != 'websocket') return null;

      const request = new Request(href, headers);
      try {
        const { socket, response } = Deno.upgradeWebSocket(request);

        respond({ body: response as unknown as null });
        return socket;
      } catch {
        respond({ status: 405 });
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
    this.params = routePattern.exec(this.href)?.pathname.groups ?? {};
  }
}