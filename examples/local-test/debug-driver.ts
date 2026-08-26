#!/usr/bin/env node
/**
 * Local cordis debug driver — boots `examples/local-test/cordis.yml` through
 * the real Loader and app-boot, then disposes. Designed to be driven from the
 * "dsh: 调试 local-test cordis (src context.ts)" VS Code launch config so
 * breakpoints land directly on `vendor/cordis/src/context.ts`.
 *
 * Keyless: the console logger and the relative probe need no DEEPSEEK_API_KEY.
 * @module local-test/debug-driver
 */

import type { Context } from '@deepseek-ai/cordis'
import { boot, installFailLoud, loadEnv, resolveConfigPath } from '@deepseek-ai/dsh-app-boot'

const NAME = 'local-test-driver'

const uninstallFailLoud = installFailLoud(NAME)
let ctx: Context | undefined
try {
  // loadEnv pulls the root .env (credentials home resolvers expect it before boot).
  loadEnv(NAME)
  // resolveConfigPath anchors relative paths at process.cwd() and emits an absolute path.
  ctx = await boot(NAME, resolveConfigPath('examples/local-test/cordis.yml', undefined))
  // Re-read the probe's provided value as a sanity assertion that the tree mounted.
  console.log(`[${NAME}] probe greeting=${String(ctx.get('probeGreeting'))}`)
  console.log(`[${NAME}] booted ok`)
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  if (error instanceof Error && error.stack) process.stderr.write(`${error.stack}\n`)
  process.exitCode = 1
} finally {
  await ctx?.fiber.dispose()
  uninstallFailLoud()
}
