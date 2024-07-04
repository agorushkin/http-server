type ServerResponseBody =
  | null
  | string
  | ArrayBufferLike
  | FormData
  | ReadableStream<Uint8Array>;

export type Locals = Record<string | number | symbol, unknown>;

/** The response data that can be sent in response. */
export type ServerResponse = {
  body?: ServerResponseBody;
  headers?: Headers | Record<string, string>;
  status?: number;
};

/** The request class that is passed to handlers. */
export class ServerRequest<L extends Locals> {
  #request: Request;
  #respond: (response: Response) => void;

  /** Response context that can be used accross handlers. Will be used if `respond` function hadn't been called by the end of the cycle. */
  response: Required<Omit<ServerResponse, 'headers'> & { headers: Headers }>;
  /** The address that the request was made from. Null if unix socket was used. */
  readonly addr: Deno.NetAddr;
  /** The full URL that the request was made to. */
  readonly href: string;
  /** The request body. */
  readonly body: ReadableStream<Uint8Array> | null;
  /** The HTTP method used to make the request. */
  readonly method: string;
  /** The referrer of the request. */
  readonly referrer: string;
  /** The request headers. */
  readonly headers: Headers;
  /** The request cookies. */
  readonly cookie: Map<string, string>;
  /** The request query. */
  readonly query: URLSearchParams;
  /** Has the request been responded to yet. */
  responded = false;
  /** Can the request be upgraded. */
  upgradable = false;
  /** Has the request been upgraded yet. */
  upgraded = false;
  /** Local context that can be used accross handlers. */
  locals: Partial<L> = {};

  /** Consumes the request body and attempts to parse it to JSON. */
  json: <T = unknown>() => Promise<T>;
  /** Consumes the request body and converts it to string. */
  text: () => Promise<string>;
  /** Consumes the request body and returns it as ArrayBuffer. */
  buffer: () => Promise<ArrayBuffer>;
  /** Consumes the request body and returns it as a FormData object. */
  form: () => Promise<FormData>;
  /** Consumes the request body and returns it as a Blob object. */
  blob: () => Promise<Blob>;
  /** Has the request body been consumed yet. */
  get consumed() {
    return this.#request.bodyUsed;
  }

  /** Parameters that have been parsed from a spciefied route. */
  params: Map<string, string | undefined> = new Map();
  /** The route that the request was made to. Null if no route was specified. */
  route: string | null = null;

  constructor(
    request: Request,
    addr: Deno.NetAddr,
    respond: (res: Response) => void,
  ) {
    this.#request = request;
    this.#respond = respond;
    this.response = {
      body: null,
      headers: new Headers(),
      status: 404,
    };

    this.addr = addr;
    this.body = request.body;
    this.href = request.url;
    this.method = request.method;
    this.referrer = request.referrer;

    this.json = request.json.bind(request);
    this.text = request.text.bind(request);
    this.buffer = request.arrayBuffer.bind(request);
    this.form = request.formData.bind(request);
    this.blob = request.blob.bind(request);

    this.headers = request.headers;
    this.query = new URL(request.url).searchParams;

    this.cookie = new Map();

    if (this.headers.has('cookie')) {
      const cookie = this.headers.get('cookie');
      const crumbs = cookie?.split(';');

      if (!crumbs) return;

      for (const crumb of crumbs) {
        const [key, value] = [...crumb.split('='), ''];
        this.cookie.set(
          decodeURIComponent(key.trim()),
          decodeURIComponent(value.trim()),
        );
      }
    }

    const upgrade = this.headers.get('upgrade');
    const secret = this.headers.get('sec-websocket-key');

    if (
      upgrade?.toLowerCase() === 'websocket' &&
      secret && secret !== ''
    ) this.upgradable = true;
  }

  /**
   * Responds to the request with the given response.
   *
   * @param response The response data to send.
   *
   * @example
   * ```ts
   * server.get('/hello', ({ respond }) => {››
   *   respond({
   *     body: 'Hello, World!',
   *     headers: { 'Content-Type': 'text/plain' },
   *     status: 200,
   *   });
   * });
   */
  respond = (response?: ServerResponse): void => {
    const status = response?.status ?? this.response.status;
    const headers = response?.headers ?? this.response.headers;
    const body = response?.body ?? this.response.body;

    response instanceof Response
      ? this.#respond(response)
      : this.#respond(new Response(body, { status, headers }));

    this.responded = true;
  };

  /**
   * Upgrades the request to a WebSocket connection.
   *
   * @returns A promise that resolves to the WebSocket connection, or null if the request cannot be upgraded.
   *
   * @example
   * ```ts
   * server.get('/ws', async ({ upgrade }) => {
   *   const socket = await upgrade();
   *
   *   if (!socket) return;
   *
   *   socket.send('Hello, World');
   * });
   */
  upgrade = (): Promise<WebSocket | null> => {
    return new Promise((resolve, reject) => {
      if (!this.upgradable || this.upgraded) return reject(null);

      try {
        const { socket, response } = Deno.upgradeWebSocket(this.#request);

        this.#respond(response);
        this.responded = true;
        this.upgraded = true;
        resolve(socket);
      } catch {
        reject(null);
      }
    });
  };

  /**
   * Redirects the request to the given URL.
   *
   * @param url The URL to redirect to.
   *
   * @example
   * ```ts
   * server.get('/search', ({ redirect }) => {
   *   redirect('https://google.com');
   * });
   */
  redirect = (url: string): void => {
    this.responded = true;
    this.#respond(
      new Response(null, { status: 302, headers: { location: url } }),
    );
  };
}
