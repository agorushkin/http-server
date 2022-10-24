import { WebRequest } from './event/event.ts';

export type Handler = (request: WebRequest, next: () => void) => void | Promise<void>;
export type HandlerRunner = ReturnType<typeof CreateHandlerRunner>;
export function CreateHandlerRunner(method: string, route: string, handler: Handler): Handler {
  return async function (request: WebRequest, next: () => void) {
    request.route = route;

    const isPatternPassed = new URLPattern({ pathname: request.route }).test(request.href);
    const isMethodPassed = method == request.method || method == 'ANY';

    isPatternPassed && isMethodPassed && await handler(request, next);
  };
}