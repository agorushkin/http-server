export interface ListenerOptions {
	port    ?: number;
	hostname?: string;
	
	files?: {
		key : string;
		cert: string;
	},
	
	signal?: AbortSignal;
}

export const listen = async (handler: (request: Request, ip: string | null) => Promise<Response>, options: ListenerOptions): Promise<void> => {
	options.port ??= 8000;
	
	const { port, hostname, files, signal } = options;
	
	const listener = files?.cert && files?.key
	? Deno.listenTls({ port, hostname, certFile: files.cert, keyFile: files.key })
	: Deno.listen({ port, hostname });
	
	signal?.addEventListener('abort', () => listener.close());
	
	while (!signal?.aborted) {
		try {
			const connection = await listener.accept();
			const http       = Deno.serveHttp(connection);
			
			(async () => {
				for await (const event of http) {
					const { request, respondWith: respond } = event;
					const addr = connection.remoteAddr;
					
					const ip = addr.transport === 'tcp'
					? addr.hostname
					: null;
					
					respond(await handler(request, ip)).catch(() => {});
				}
			})().catch(() => {});
		} catch { continue }
	}
};