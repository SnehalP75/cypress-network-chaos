import type { ChaosEvent } from './types';
import { readSetting } from './settings';

/**
 * Chaos reporting has two paths:
 *
 *  - `recordSetup` runs in the Cypress command context (when a chaos command is
 *    invoked). It writes a Command Log entry and forwards to Node immediately.
 *  - `emit` runs inside cy.intercept handlers, which are NOT in the command
 *    queue, so it only pushes onto an in-memory queue. `flush` (called from the
 *    afterEach cleanup, a valid command context) drains the queue to Node.
 *
 * Forwarding to Node is best-effort: if the plugin task isn't registered, it is
 * disabled for the rest of the spec so a missing task never fails a test.
 */

const queue: ChaosEvent[] = [];

/**
 * The Node plugin sets `__chaosPlugin` in config.expose (or config.env on
 * Cypress < 15.10). We only forward events
 * when it's present, so without the plugin there is no `chaos:record` task to
 * fail on — reporting is simply a no-op and commands still work.
 */
function pluginPresent(): boolean {
  return Boolean(readSetting('__chaosPlugin'));
}

function sendToNode(event: ChaosEvent): void {
  if (!pluginPresent()) return;
  try {
    cy.task('chaos:record', event, { log: false });
  } catch {
    /* not in a command chain — ignore. */
  }
}

/** Record a chaos injection at command-invocation time. */
export function recordSetup(event: Omit<ChaosEvent, 'ts'>): void {
  const full: ChaosEvent = { ...event, ts: Date.now() };
  try {
    Cypress.log({
      name: 'chaos',
      displayName: 'chaos',
      message: `${event.command} ${event.pattern} → ${event.outcome}`,
      consoleProps: () => ({ ...full }),
    });
  } catch {
    /* ignore */
  }
  sendToNode(full);
}

/** Backwards-friendly alias used by offline toggling. */
export const record = recordSetup;

/** Queue a per-request chaos event from inside an intercept handler. */
export function emit(event: Omit<ChaosEvent, 'ts'>): void {
  queue.push({ ...event, ts: Date.now() });
}

/** Drain queued per-request events to Node. Call from a command context. */
export function flush(): void {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  for (const event of batch) sendToNode(event);
}

/** Count of queued-but-not-yet-flushed events (used by cleanup/debug). */
export function pendingCount(): number {
  return queue.length;
}

/** Discard any queued events (used when resetting between specs). */
export function clearQueue(): void {
  queue.length = 0;
}
