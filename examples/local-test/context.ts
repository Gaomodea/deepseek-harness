
import { Context } from '@deepseek-ai/cordis'
import Loader, { EntryOptions, Group } from '@deepseek-ai/cordis-plugin-loader'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import Include, { entryListSchema, PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import * as yaml from 'js-yaml'
import { readFile } from 'node:fs/promises'

async function setupLoader(ctx: Context) {
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  ctx.loader.builtins.group = Group
}

async function setupLogger(ctx: Context) {
  await ctx.loader.create({
    id: 'logger',
    name: '@deepseek-ai/cordis-plugin-logger-console',
    config: {
      levels: { default: 3 },   // DEBUG → 让 warn(2)/debug(3) 也显示
    },
  } as EntryOptions)
}

async function setupInclude(ctx: Context) {
  const patches = await resolveConfig()
  const includeConfig: Include.Config = {
    path: './cordis.yml',
    ...patches.length > 0 ? { patches: [...patches] } : {},
  }

  const rootInclude: EntryOptions = {
    id: 'include',
    name: 'cordis:include',
    config: includeConfig,
  }

  await ctx.loader.create(rootInclude)
}

async function resolveConfig() {
  const configUrl = fileURLToPath(new URL('cordis.patch.yml', import.meta.url))
  let config: PatchOptions[] = []

  try {
    const content = await readFile(configUrl, 'utf8')
    config = yaml.load(content, { schema: entryListSchema }) as PatchOptions[]
  } catch (_e) {
  }

  return config
}

async function boot() {
  const ctx = new Context()

  // `baseUrl` must be a file:// URL for relative specifiers to resolve
  // (`./probe.ts` → new URL('./probe.ts', baseUrl)). A bare filesystem path
  // has no hierarchical scheme and throws "Invalid relative URL or base
  // scheme is not hierarchical". Set it before constructing the Loader; the
  // Loader captures baseUrl on construction, so a later reassignment on this
  // parent ctx does not propagate to `ctx.loader`.
  ctx.baseUrl = dirname(import.meta.url) + '/'

  await setupLoader(ctx)
  await setupLogger(ctx)
  await setupInclude(ctx)

  const loader = ctx.get('loader')

  await loader?.await()
  ctx.logger.warn(typeof loader)

  const greetingEnum = ctx.get('greetingEnum')
  ctx.logger.warn(greetingEnum)
  ctx.logger.info('hello world')
}

boot()
