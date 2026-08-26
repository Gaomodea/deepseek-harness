/** The Host half: namespace registration, file seeding/migration, and write-through. */

import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider, settingsNamespace, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../src/index.ts'
import { DAILY_TASK_ID, loadTodoFile, todoDataFile } from '../src/todo-file.ts'

class MemorySettings extends SettingsProvider {
  readonly doc: Record<string, unknown>
  constructor(ctx: ConstructorParameters<typeof SettingsProvider>[0], doc: Record<string, unknown> = {}) {
    super(ctx)
    this.doc = doc
  }
  get writable(): boolean { return true }
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve(structuredClone(this.doc)) }
  protected async persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.doc[ns] = structuredClone(section)
  }
}

interface ServedValue { tasks: Array<{ id: string; builtin: boolean; lists: Array<{ items: unknown[] }> }> }

async function emptyRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'todo-host-'))
  return root
}

describe('todo-list host half', () => {
  it('registers and disposes the durable todo namespace with its fiber', async () => {
    const root = await emptyRoot()
    try {
      const ctx = new Context()
      await ctx.plugin(MemorySettings).await()
      const fiber = ctx.plugin({ apply }, { root })
      await fiber.await()
      expect(ctx.settings.describe().map(row => String(row.ns))).toContain('todo-list')
      await fiber.dispose()
      expect(ctx.settings.describe().map(row => String(row.ns))).not.toContain('todo-list')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('migrates a legacy flat document into the daily task on boot', async () => {
    const root = await emptyRoot()
    try {
      const section = { items: [{ id: 'a', done: false, text: 'from disk' }] }
      await mkdir(join(root, '.data', 'todo-list'), { recursive: true })
      await writeFile(todoDataFile(root), JSON.stringify(section), 'utf8')
      const ctx = new Context()
      await ctx.plugin(MemorySettings).await()
      await ctx.plugin({ apply }, { root }).await()
      await vi.waitFor(() => {
        const row = ctx.settings.describe().find(entry => String(entry.ns) === 'todo-list')
        const value = row?.value as ServedValue
        expect(value.tasks[0]!.id).toBe(DAILY_TASK_ID)
        expect(value.tasks[0]!.lists[0]!.items).toEqual([{ id: 'a', done: false, text: 'from disk' }])
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('seeds a hierarchical document as-is on boot', async () => {
    const root = await emptyRoot()
    try {
      const section = {
        tasks: [{ id: 'daily', name: '日常任务', builtin: true, lists: [{ id: 'l', name: '日常', items: [{ id: 'a', done: false, text: 'kept' }] }] }],
      }
      await mkdir(join(root, '.data', 'todo-list'), { recursive: true })
      await writeFile(todoDataFile(root), JSON.stringify(section), 'utf8')
      const ctx = new Context()
      await ctx.plugin(MemorySettings).await()
      await ctx.plugin({ apply }, { root }).await()
      await vi.waitFor(() => {
        const row = ctx.settings.describe().find(entry => String(entry.ns) === 'todo-list')
        const value = row?.value as ServedValue
        expect(value.tasks[0]!.lists[0]!.items).toEqual([{ id: 'a', done: false, text: 'kept' }])
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('writes every committed change to the on-disk document', async () => {
    const root = await emptyRoot()
    try {
      const ctx = new Context()
      await ctx.plugin(MemorySettings).await()
      await ctx.plugin({ apply }, { root }).await()
      const next = {
        tasks: [{ id: 'daily', name: '日常任务', builtin: true, lists: [{ id: 'l', name: '日常', items: [{ id: 'b', done: true, text: 'written' }] }] }],
      }
      await ctx.settings.update(settingsNamespace('todo-list'), next)
      await vi.waitFor(async () => {
        expect(await loadTodoFile(root)).toEqual(next)
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
