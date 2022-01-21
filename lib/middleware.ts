import { HTTPRequest } from './event/event.ts';

export type Handler = (request: HTTPRequest, next: () => void) => void | Promise<void>;
export type Middleware = ReturnType<typeof Middleware>;
export function Middleware(method: string, route: string, handler: Handler) {
  return async function (request: HTTPRequest, next: () => void) {
    request.route = route;

    // Check if the request path matches the route.
    const isPatternPassed = new URLPattern({ pathname: request.route }).test(request.href);
    // Check if the request method matches the method.
    const isMethodPassed = method == request.method || method == 'ANY';

    // If the request path and method pass, calls the handler, else returns false.
    return isPatternPassed && isMethodPassed
      ? (await handler(request, next), true)
      : false;
  };
}