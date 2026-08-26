/**
 * Package-owned invariant companion for @deepseek-ai/dsh-client-todo-list.
 * @module @deepseek-ai/dsh-client-todo-list/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-todo-list'

/** Cordis companion plugin name. */
export const name = 'client-todo-list-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the settings seam validates and publishes the durable
 * 'todo-list' section, and the file document's relation to it is a Host
 * contract covered by the file-store and apply tests rather than a Cordis
 * runtime relationship.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
