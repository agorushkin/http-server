import { Handler, file } from '../../mod.ts';

type StaticRules = {
  default?: {
    'access-control-allow-origin'?: string;
    'cache-control'?: string;
  };

  paths?: {
    [ route: string ]: string;
  };
};

export const serve = (root: string, rules: StaticRules = {}): Handler => {
  rules.default ??= {};
  rules.default['access-control-allow-origin'] ??= '*';
  rules.default['cache-control'] ??= 'max-age=0';
  rules.paths ??= {};

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

    headers['access-control-allow-origin'] = rules.default!['access-control-allow-origin']!;
    headers['cache-control'] = rules.paths?.[ `/${ path }` ] ?? rules.default!['cache-control']!;

    respond({ ...response, headers });
  };
};
