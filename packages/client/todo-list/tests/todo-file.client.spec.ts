/** The on-disk todo document: path resolution, read, write, and migration. */

import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  TODO_DATA_DIRNAME, TODO_DATA_FILENAME, TODO_LIST_DIRNAME,
  loadTodoFile, migrateTodoSection, todoDataFile, writeTodoFile,
  type TodoTask,
} from '../src/todo-file.ts'

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'todo-file-'))
}

describe('todo-file', () => {
  it('resolves the document path under the project root', () => {
    if (process.platform === 'win32') return
    expect(todoDataFile('/project')).toBe('/project/.data/todo-list/todos.json')
    expect(TODO_DATA_DIRNAME).toBe('.data')
    expect(TODO_LIST_DIRNAME).toBe('todo-list')
    expect(TODO_DATA_FILENAME).toBe('todos.json')
  })

  it('returns undefined when the document is absent', async () => {
    const root = await tempRoot()
    try {
      expect(await loadTodoFile(root)).toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('round-trips a hierarchical section through write then load', async () => {
    const root = await tempRoot()
    try {
      const section = {
        tasks: [{ id: 'daily', name: '日常任务', builtin: true, lists: [{ id: 'l', name: '日常', items: [{ id: 'a', done: false, text: 'first' }] }] }],
      }
      await writeTodoFile(root, section)
      expect(await loadTodoFile(root)).toEqual(section)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('returns undefined for a document that is not an object', async () => {
    const root = await tempRoot()
    try {
      await mkdir(join(root, '.data', 'todo-list'), { recursive: true })
      await writeFile(todoDataFile(root), '[1, 2]\n', 'utf8')
      expect(await loadTodoFile(root)).toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('surfaces a malformed document', async () => {
    const root = await tempRoot()
    try {
      await mkdir(join(root, '.data', 'todo-list'), { recursive: true })
      await writeFile(todoDataFile(root), '{\n', 'utf8')
      await expect(loadTodoFile(root)).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('narrows a hierarchical section and always keeps the daily task at the head', () => {
    const out = migrateTodoSection({
      tasks: [{ id: 'p', name: 'Project', builtin: false, lists: [] }],
    })
    const tasks = out as { tasks: TodoTask[] }
    expect(tasks.tasks[0]!.id).toBe('daily')
    expect(tasks.tasks[1]!.id).toBe('p')
  })

  it('leaves an existing daily task in place', () => {
    const out = migrateTodoSection({
      tasks: [{ id: 'daily', name: '日常任务', builtin: true, lists: [] }],
    })
    expect((out as { tasks: TodoTask[] }).tasks).toHaveLength(1)
  })

  it('migrates legacy flat items into the built-in daily task', () => {
    const out = migrateTodoSection({ items: [{ id: 'a', done: false, text: 'x' }] })
    const tasks = (out as { tasks: TodoTask[] }).tasks
    expect(tasks[0]).toMatchObject({ id: 'daily', builtin: true })
    expect(tasks[0]!.lists[0]!.items).toEqual([{ id: 'a', done: false, text: 'x' }])
  })

  it('rejects a malformed section', () => {
    expect(migrateTodoSection({ tasks: [{ id: 'a' }] })).toBeUndefined()
    expect(migrateTodoSection({ items: [{ id: 'a', done: false }] })).toBeUndefined()
    expect(migrateTodoSection({})).toBeUndefined()
    expect(migrateTodoSection({ items: 'not-a-list' })).toBeUndefined()
    expect(migrateTodoSection({ tasks: 'not-a-list' })).toBeUndefined()
  })
})
