/**
 * This class represents an HTTP request's body.
*/
export class HTTPBody {
  #request;

  constructor(request: Request) {
    this.#request = request;
  }

  // Allows us to infinitelly tee the request without consuming the only readable stream.
  #consume(): Request {
    // Tee request body to make two other requests.
    const [ body1, body2 ] = this.#request.body?.tee() ?? [];

    // Make two copies of request, to store first, and serve the second.
    const savedRequest = new Request(this.#request.url, { body: body1, method: 'POST' });
    const servedRequest = new Request(this.#request.url, { body: body2, method: 'POST' });

    // Save the request for later teeing.
    this.#request = savedRequest;

    return servedRequest;
  }

  /**
   * Get the request body as a string.
   */
  async text(): Promise<string> {
    return await this.#consume().text();
  }

  /**
   * Get the request body as a JSON object.
   */
  async json(): Promise<unknown> {
    try {
      return await this.#consume().json();
    } catch {
      return null;
    }
  }

  /**
   * Get the request body as a form data.
   */
  async form(): Promise<FormData | null> {
    const isFormData = this.#request.headers.get('content-type')?.includes('multipart/form-data');

    return isFormData
      ? await this.#consume().formData()
      : Promise.resolve(null);
  }

  /**
   * Get the request body as an array buffer.
   */
  async buffer(): Promise<ArrayBuffer> {
    return await this.#consume().arrayBuffer();
  }
}
