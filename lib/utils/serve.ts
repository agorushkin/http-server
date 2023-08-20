import { Handler } from '../../mod.ts';
import { file } from './file.ts';

interface StaticRules {
  paths?: {
    [ route: string ]: string,
  },

  'access-control-allow-origin'?: string,
  'cache-control'?: string,
}

export const serve = (root: string, rules: StaticRules = {}): Handler => {
  rules['access-control-allow-origin'] ??= '*';
  rules['cache-control'] ??= 'max-age=0';
  rules.paths ??= {};

  const opts = {
    'access-control-allow-origin': '*',
    'cache-control': 'max-age=0',

    ...rules,
  };

  root = root?.[0] === '/' ? root : `${ Deno.cwd() }/${ root }`;

  return async ({ href, respond, route }) => {
    const pattern = new URLPattern({ pathname: route ?? '/*' });
    if (!pattern.test(href)) return;

    const path = pattern.exec(href)?.pathname.groups?.['0']?.replace(/\/+/g, '/') ?? '/';
    const response = await file(`${ root }/${ path }`);

    if (response.status === 404) return respond(response);

    const size  = (response.headers as Record<string, string>)['content-length']!;
    const mtime = (response.headers as Record<string, string>)['last-modified']!;
    const etag  = `"${ size }-${ mtime }"`;

    const headers = { ...response.headers, etag } as Record<string, string>;

    headers['access-control-allow-origin'] = opts['access-control-allow-origin'];
    headers['cache-control'] = opts.paths?.[ `/${ path }` ] ?? opts['cache-control'];

    respond({ ...response, headers });
  };
};