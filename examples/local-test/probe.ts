/**
 * Local cordis debugging probe — a deliberately tiny plugin mounted from
 * `examples/local-test/cordis.yml` so a running boot reaches
 * `vendor/cordis/src/context.ts` in a few grounded steps. Set a breakpoint in
 * `context.ts` (e.g. `Context.prototype.provide` or the constructor) and the
 * driver run will stop here.
 *
 * Function-plugin form required by the Loader: named exports, no default
 * export. See packages/CLAUDE.md "Plugin exports".
 * @module local-test/probe
 */

import type { Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    probeGreeting: string
  }
}

export const name = 'context-probe'

export const inject = ['greetingEnum']

/** Exercise a handful of `Context` APIs a real plugin uses in one synchronous apply. */
export function apply(ctx: Context): void {
  // `provide` writes into the service store — breakpoint target in context.ts.
  ctx.provide('probeGreeting', ctx.greetingEnum.hello + ' from local cordis context')
  // Fingerprint so a step-through sees the plugin reach apply. The driver
  // re-reads the provided value AFTER boot, when `get` resolves it.
  ctx.logger.info(`[${name}] apply reached`)
}
