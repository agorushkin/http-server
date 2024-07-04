import { extension, ServerResponse } from '../../mod.ts';

/**
 * Fetches a file and returns it as a `respond` compatible response.
 *
 * In success, the response will have a status of `200` and the file as the body.
 * As well as the `content-type`, `last-modified`, and `content-length` headers.
 *
 * In failure, the response will have a status of `404`.
 *
 * @param path The path to the file to fetch.
 *
 * @example
 * ```ts
 * server.get('/main', async ({ respond }) => {
 *   respond(await file('./main.html'));
 * });
 * ```
 */
export const file = async (
  path: string,
): Promise<Omit<ServerResponse, 'headers'> & { headers?: Headers }> => {
  path = path?.[0] === '/' ? path : `${Deno.cwd()}/${path}`;

  const file = await fetch(`file://${path}`).then((file) => file.body).catch(
    () => null,
  );
  const type = extension(path);

  if (!file) return { status: 404 };

  const stat = await Deno.stat(path);

  const mtime = stat.mtime === null
    ? new Date().toUTCString()
    : stat.mtime.toUTCString();

  const size = stat.size.toString();

  return {
    status: 200,
    body: file,
    headers: new Headers([
      ['content-type', type],
      ['last-modified', mtime],
      ['content-length', size],
    ]),
  };
};
