import type { Pattern } from './types';

const METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const;

export interface ParsedPattern {
  method?: string;
  url: string;
}

/**
 * Parse an intent-level pattern into a cy.intercept route matcher.
 *
 *   '/api/*'            -> { url: '/api/*' }
 *   'POST /api/orders' -> { method: 'POST', url: '/api/orders' }
 *   '**'               -> { url: '**' }
 */
export function parsePattern(pattern: Pattern): ParsedPattern {
  const trimmed = pattern.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx > 0) {
    const maybeMethod = trimmed.slice(0, spaceIdx).toUpperCase();
    if ((METHODS as readonly string[]).includes(maybeMethod)) {
      return { method: maybeMethod, url: trimmed.slice(spaceIdx + 1).trim() };
    }
  }
  return { url: trimmed };
}

/** The response object passed to a `req.on('response', ...)` callback. */
export interface ChaosResponse {
  setDelay(ms: number): ChaosResponse;
  setThrottle(kbps: number): ChaosResponse;
}

/** The intercepted request — just the surface our commands touch. */
export interface ChaosRequest {
  url: string;
  method: string;
  reply(response: unknown): void;
  continue(): void;
  destroy(): void;
  on(event: 'response', cb: (res: ChaosResponse) => void): void;
}

export type ChaosHandler = (req: ChaosRequest) => void;

/**
 * Register a cy.intercept for a parsed pattern, choosing the method+url or
 * url-only overload. The Cypress route types are module-internal, so we type
 * our handler via {@link ChaosHandler} and cast at the boundary.
 */
export function applyIntercept(
  parsed: ParsedPattern,
  handler: ChaosHandler
): Cypress.Chainable<null> {
  const h = handler as unknown as (req: never) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parsed.method
    ? cy.intercept(parsed.method as any, parsed.url, h)
    : cy.intercept(parsed.url, h);
}
