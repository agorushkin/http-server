import { MIME_TYPES } from './mime-types.ts';

/**
 * Returns the MIME type of a file based on its extension.
 *
 * @param path The path to the file to get the MIME type of.
 *
 * @example
 * ```ts
 * extension('index.html'); // text/html
 * extension('index.css');  // text/css
 * extension('index.js');   // text/javascript
 * extension('index.json'); // application/json
 * ```
 */
export const extension = (path: string): string => {
  const extension = path.split('.').pop();
  const mime = MIME_TYPES[`${extension}`] ?? MIME_TYPES['txt'];

  return mime;
};
