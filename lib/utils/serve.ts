import type { Locals } from '../event.ts';
import type { Handler } from '../router.ts';

import { file } from './file.ts';

type StaticRules = {
  default?: {
    /** Access control header that is sent with every response sent by the handler. */
    'access-control-allow-origin'?: string;
    /** Default cache control header that is sent with response if specific to it rule isn't present */
    'cache-control'?: string;
  };

  paths?: {
    /** Cache control header string for a specified file. */
    [route: string]: string;
  };
};

/**
 * Creates a handler that serves static files from a specified directory.
 *
 * @param root The root directory to serve files from.
 * @param rules The rules to use when serving files.
 *
 * @example
 * ```ts
 * server.get('/public', serve('./assets/'));
 * ```
 */
export const serve = <L extends Locals>(
  root: string,
  rules: StaticRules = {},
): Handler<L> => {
  rules.default ??= {};
  rules.default['access-control-allow-origin'] ??= '*';
  rules.default['cache-control'] ??= 'max-age=0';
  rules.paths ??= {};

  root = root?.[0] === '/' ? root : `${Deno.cwd()}/${root}`;

  return async ({ href, respond, route }) => {
    const pattern = new URLPattern({ pathname: route ?? '/*' });
    if (!pattern.test(href)) return;

    const path =
      pattern.exec(href)?.pathname.groups?.['0']?.replace(/\/+/g, '/') ?? '/';
    const response = await file(`${root}/${path}`);

    if (response.status === 404) return respond(response);

    const headers = response.headers;

    const size = headers?.get('content-length')!;
    const mtime = headers?.get('last-modified')!;
    const etag = `"${size}-${mtime}"`;

    headers?.append('etag', etag);
    headers?.append(
      'access-control-allow-origin',
      rules.default!['access-control-allow-origin']!,
    );
    headers?.append(
      'cache-control',
      rules.paths?.[`/${path}`] ?? rules.default!['cache-control']!,
    );

    respond({ ...response, headers });
  };
};
