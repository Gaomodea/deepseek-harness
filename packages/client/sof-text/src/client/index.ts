/**
 * Browser half: stack a token override layer on the active theme so chat text
 * reads as a softer Claude Code-like gray instead of bright white. The layer
 * composes over the base palette (light/dark both supplied) and is unwound
 * when this plugin is removed.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.theme Context merge provided by the ui-theme plugin.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'client-sof-text'

/** Hard dependency: the theme service provided by the ui-theme client plugin. */
export const inject = ['theme']

/** Layer identity for `theme.overrideTokens` (one per package source). */
const LAYER = 'sof-text-layer'

/**
 * Client plugin body: overwrite the primary/secondary label tokens with softer
 * grays in both palette modes.
 * @param ctx - client cordis context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.theme.overrideTokens(LAYER, {
    '--dsw-alias-label-primary': {
      light: '#1f1f1f',
      dark: '#b6b9bd',
    },
    '--dsw-alias-label-secondary': {
      light: '#6b6b6b',
      dark: '#798088',
    },
  }), 'sof-text: softer label colors')
}
