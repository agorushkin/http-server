import { Handler } from './server.ts';
import { MIME_TYPES } from './constants.ts';

import { HttpResponse } from './event.ts';

export const file = async (path: string): Promise<HttpResponse> => {
  path = path.replace(/\/\.\//g, '/');

  const base = path[0] === '/' ? '' : Deno.cwd();
  const file = await fetch(`file://${ base }/${ path }`).then(file => file.body).catch(() => null);
  const type = MIME_TYPES.get(path.split('.').pop() ?? 'txt') ?? 'text/plain';

  const headers: Record<string, string> = {
    'content-type': type,
  };

  if (file) {
    const stat = await Deno.stat(`${ base }/${ path }`);

    if (stat.mtime !== null) headers['last-modified'] = stat.mtime.toUTCString();
    headers['content-length'] = stat.size.toString();
  }

  return file
    ? { body: file, headers }
    : { status: 404 };
};

export interface FileServer {
  'access-control-allow-origin'?: string;
  'etag'?: string;

  'max-age'?: number;
  'immutable'?: boolean;
  'access'?: 'public' | 'private' | 'no-cache';
}

export const files = (route: string, root: string, options?: FileServer): Handler => {
  route = route.replace(/\*?$/, '*');

  return async ({ href, respond }) => {
    const pathname = new URL(href).pathname;

    const pattern = new URLPattern({ pathname: route });
    if (!pattern.test(href)) return;
    
    const base = route.split('/').filter((item) => item != '*' && item != '');
    const rest = pathname.replace(/^\//, '').split('/').filter((_, index) => index >= base.length);

    const source = `${ root.replace(/\/$/, '') }/${ [ ...rest ].join('/') }`;

    const response = await file(source);

    if (response.status === 404) return respond(response);

    const etag = btoa(encodeURIComponent(`${ rest.join('/') }-${ (response.headers as Record<string, string>)['last-modified'] ?? '0' }`));

    const headers = {
      'access-control-allow-origin': options?.['access-control-allow-origin'] ?? '*',
      'cache-control': [ options?.['access'] ?? 'public', `max-age=${ options?.['max-age'] ?? 0 }`, options?.['immutable'] ? 'immutable' : '' ].join(', '),
      'etag': options?.['etag'] ?? etag,
    };

    response.headers = { ...response.headers, ...headers };

    respond(response);
  };
};