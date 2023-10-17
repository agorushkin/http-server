import { MIME_TYPES } from './mime-types.ts';

export const extension = (path: string) => {
  const extension = path.split('.').pop();
  const mime = MIME_TYPES[ `.${ extension }` ] ?? MIME_TYPES['.txt'];

  return mime;
};
