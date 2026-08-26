/**
 * Todo-list plugin, browser half: a top-level settings section.
 *
 * Registers a page into 'settings.section' (the root settings nav) under the
 * 'todo.list' locale namespace, backed by the 'todo-list' settings namespace
 * the Host half serves. Export discipline: packages/client/AGENTS.md.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the ctx.settingsScope Context merge and 'settings.section' slot.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { TodoPage } from './TodoPage.tsx'
import { TODO_NS, TodoPageController } from './todo-controller.ts'
import { en, zh } from './locales.ts'

export type { TodoPageProps } from './TodoPage.tsx'
export type {
  TodoPageFace, TodoPageState, TodoItem, TodoList, TodoTask, TodoSettings,
} from './todo-controller.ts'
export type { TodoListLocaleKey } from './locales.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'todo.list'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'settingsScope']

/**
 * Register the todo-list dictionaries and the settings page.
 * @param ctx - browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'todo-list: page dictionaries')
  const controller = new TodoPageController(ctx.settingsScope.bind({ namespace: TODO_NS }))
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'todo',
    order: 5,
    label: () => t('nav'),
    locale: NS,
    children: {},
    inject: () => controller.inject(),
  }, TodoPage))
}
