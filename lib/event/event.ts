import { HTTPBody } from './body.ts';

/**
 * This class represents an HTTP response.
 */
interface HTTPResponse {
  body?: null | string | ArrayBufferLike | FormData;
  status?: number;
  headers?: Record<string, string>;
}

/**
 * This class represents an HTTP request.
*/
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
   * @returns A WebSocket if the request was upgraded, otherwise null.
  */
   upgrade: () => WebSocket | null;

  constructor(request: Request, respond: (res: Response) => void) {
    this.href    = request.url;
    this.params  = {};

    this.headers = Object.fromEntries(request.headers.entries());
    this.method  = request.method;
    this.body    = new HTTPBody(request), 

    this.respond = (response: HTTPResponse = { body: null, status: 200, headers: {} }) => {
      const { body, status, headers } = response;

      // Make a response object to respond with.
      const rawResponse = body instanceof Response
        ? body
        : new Response(body as null, { status, headers });

      respond(rawResponse);
    };

    this.upgrade = () => {
      const { href, headers, respond } = this;

      // Make sure the request wants to upgrade to a websocket.
      if (headers.upgrade != 'websocket') return null;

      // Make an instance of request.
      const request = new Request(href, headers);

      try {
        const { socket, response } = Deno.upgradeWebSocket(request);

        // Responds with the response to upgrade to a websocket.
        respond({ body: response as unknown as null });
        return socket;
      } catch {
        // Responds with bad request status as the upgrade failed.
        respond({ status: 400 });
        return null;
      }
    }
  }

  get route() {
    return this.#route;
  }

  set route(value) {
    // Make the route always use same deviders and remove multiple deviders at one spot.
    this.#route = value.replace(/(\/+|\\+)/g, '/');

    // Make a pattern to later parse the parameters with.
    const routePattern = new URLPattern({ pathname: this.#route });
    // Parse the route to get the parameters.
    const routeParams  = routePattern.exec(this.href)?.pathname.groups;

    this.params = routeParams ?? {};
  }
}