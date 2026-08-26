/**
 * Todo-list plugin, Host half.
 *
 * Registers the 'todo-list' settings namespace the web card edits, persists
 * that namespace's resolved section to <project root>/.data/todo-list/todos.json
 * on every committed change, and seeds the namespace back from the file on
 * boot, so the file is the durable hand-editable copy of the user's list.
 *
 * @module @deepseek-ai/dsh-client-todo-list
 */

import { Context } from '@deepseek-ai/cordis'
import { deepEqualJson, settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  TODO_NAMESPACE, TodoSettingsSchema, loadTodoFile, migrateTodoSection, todoDataFile, writeTodoFile,
} from './todo-file.ts'

/** Plugin config. */
export interface Config {
  /**
   * Project root under which the 'data' directory lives; defaults to
   * process.cwd(), i.e. the project root the host was launched from.
   */
  root?: string
}

/**
 * Resolve the project root from config or the launch directory.
 * @param config - raw plugin config.
 * @returns the directory the todo document is rooted at.
 */
function projectRoot(config: Config): string {
  return config.root ?? process.cwd()
}

/**
 * Register the todo namespace, seed it from disk, and write it back on change.
 * @param ctx - Host context that may acquire the settings service.
 * @param config - plugin config.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const root = projectRoot(config)
  ctx.inject(['settings'], (settingsCtx) => {
    const scope = settingsCtx.settings.register(settingsNamespace(TODO_NAMESPACE), TodoSettingsSchema)
    const off = settingsCtx.on('settings/updated', (ns, next) => {
      if (String(ns) !== TODO_NAMESPACE) return
      void writeTodoFile(root, next as Record<string, unknown>).catch((error: unknown) => {
        settingsCtx.logger.error('todo-list: could not write %s', todoDataFile(root))
        settingsCtx.logger.error(error)
      })
    })
    settingsCtx.effect(() => off, 'todo-list: document sync')
    void (async () => {
      const file = await loadTodoFile(root)
      const normalized = file === undefined ? undefined : migrateTodoSection(file)
      const current = scope.get() as Record<string, unknown>
      if (normalized !== undefined && !deepEqualJson(normalized, current)) {
        void scope.replace(normalized).catch((error: unknown) => {
          settingsCtx.logger.error('todo-list: could not seed namespace from %s', todoDataFile(root))
          settingsCtx.logger.error(error)
        })
      }
    })()
  })
}
