import { HttpResponse } from '../../mod.ts';
import { MIME_TYPES } from './mime-types.ts';

export const file = async (path: string): Promise<HttpResponse> => {
  path = path?.[0] === '/' ? path : `${ Deno.cwd() }/${ path }`;

  const file = await fetch(`file://${ path }`).then(file => file.body).catch(() => null);
  const type = MIME_TYPES?.[ path.split('.').pop() ?? 'txt' ] ?? 'text/plain';

  if (!file) return { status: 404 };

  const stat = await Deno.stat(path);

  const mtime = stat.mtime === null ? new Date().toUTCString() : stat.mtime.toUTCString();
  const size  = stat.size.toString();

  return {
    status: 200,
    body: file,
    headers: {
      'content-type': type,
      'last-modified': mtime,
      'content-length': size,
    },
  };
};