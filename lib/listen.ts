export type ListenerOptions = {
  port?: number;
  hostname?: string;

  files?: {
    key: string;
    cert: string;
  };

  signal?: AbortSignal;
};

export const listen = async (
  handler: (request: Request, addr: string | null) => Promise<Response>,
  options: ListenerOptions,
): Promise<void> => {
  options.port ??= 8080;

  const { port, hostname, files, signal } = options;

  const listener = files?.cert && files?.key
    ? Deno.listenTls({
      port,
      hostname,
      certFile: files.cert,
      keyFile: files.key,
    })
    : Deno.listen({ port, hostname });

  signal?.addEventListener('abort', listener.close);

  while (!signal?.aborted) {
    try {
      const conn = await listener.accept();
      const tunnel = Deno.serveHttp(conn);

      (async () => {
        for await (const event of tunnel) {
          const { request, respondWith } = event;
          const addr = conn.remoteAddr.transport === 'tcp'
            ? conn.remoteAddr.hostname
            : null;

          respondWith(await handler(request, addr)).catch(() => {});
        }
      })().catch(() => {});
    } catch {
      continue;
    }
  }
};
