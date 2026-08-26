
import type { Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    greetingEnum: {
      hello: 'hello'
      goodbye: 'goodbye'
    }
  }
}


export const name = 'greeting-enum'

export const inject = []

export function apply(ctx: Context): void {
  ctx.provide('greetingEnum', {
    hello: 'hello',
    goodbye: 'goodbye',
  })

  ctx.logger.info(`[${name}] apply reached`)
}
