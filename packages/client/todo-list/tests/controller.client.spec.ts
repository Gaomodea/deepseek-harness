/** The todo settings page controller: projections and the writes each action performs. */

import { describe, expect, it, vi } from 'vitest'
import { stubSettingsScope, type StubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import {
  TodoPageController, appendTask, dropTask, appendItem, toggleItem, removeItem, clearCompleted,
  type TodoSettings, type TodoTask,
} from '../src/client/todo-controller.ts'

/** Make the stub behave like a Host that accepts every write. */
function acceptWrites(host: StubSettingsScope<TodoSettings>): void {
  host.set.mockImplementation((field: string, value: unknown) => {
    host.publish({ value: { ...host.scope.getSnapshot().value as object, [field]: value } })
  })
}

const daily = (): TodoTask => ({ id: 'daily', name: '日常任务', builtin: true, lists: [] })

function listTask(): TodoTask {
  return {
    id: 'daily', name: '日常任务', builtin: true,
    lists: [{ id: 'l', name: 'L', items: [{ id: 'a', done: false, text: 'a' }, { id: 'b', done: false, text: 'b' }] }],
  }
}

function readyHost(tasks: TodoTask[] = []) {
  const host = stubSettingsScope<TodoSettings>()
  acceptWrites(host)
  host.publish({ status: 'ready', writable: true, value: { tasks }, base: {}, user: {} })
  return host
}

describe('TodoPageController', () => {
  it('projects availability, writability, saving, and tasks from the scope', () => {
    const host = stubSettingsScope<TodoSettings>()
    const controller = new TodoPageController(host.scope)
    host.publish({ status: 'ready', writable: true, value: { tasks: [daily()] }, base: {}, user: {} })
    const snapshot = controller.inject().hooks.todoPage.getSnapshot()
    expect(snapshot).toMatchObject({ available: true, writable: true, saving: false })
    expect(snapshot.tasks).toEqual([daily()])
  })

  it('stays unavailable while the namespace is loading', () => {
    const controller = new TodoPageController(stubSettingsScope<TodoSettings>().scope)
    expect(controller.inject().hooks.todoPage.getSnapshot().available).toBe(false)
  })

  it('adds a trimmed, empty task', async () => {
    const host = readyHost()
    const face = new TodoPageController(host.scope).inject()
    face.addTask('  Work  ')
    await vi.waitFor(() => {
      expect(host.set).toHaveBeenCalledWith('tasks', [
        expect.objectContaining({ name: 'Work', builtin: false, lists: [] }),
      ])
    })
  })

  it('removes a task but never the built-in daily task', async () => {
    const host = readyHost([daily(), { id: 'p', name: 'Project', builtin: false, lists: [] }])
    const face = new TodoPageController(host.scope).inject()
    face.removeTask('p')
    await vi.waitFor(() => {
      expect(host.set).toHaveBeenCalledWith('tasks', [daily()])
    })
    const host2 = readyHost([daily()])
    const face2 = new TodoPageController(host2.scope).inject()
    face2.removeTask('daily')
    await Promise.resolve()
    expect(host2.set).not.toHaveBeenCalled()
  })

  it('appends a list to a task', async () => {
    const host = readyHost([daily()])
    const face = new TodoPageController(host.scope).inject()
    face.addList('daily', '  Groceries  ')
    await vi.waitFor(() => {
      expect(host.set).toHaveBeenCalledWith('tasks', [
        expect.objectContaining({ lists: [expect.objectContaining({ name: 'Groceries', items: [] })] }),
      ])
    })
  })

  it('removes a list from a task', async () => {
    const host = readyHost([listTask()])
    const face = new TodoPageController(host.scope).inject()
    face.removeList('daily', 'l')
    await vi.waitFor(() => {
      expect(host.set).toHaveBeenCalledWith('tasks', [expect.objectContaining({ lists: [] })])
    })
  })

  it('adds a trimmed item to a list', async () => {
    const host = readyHost([listTask()])
    const face = new TodoPageController(host.scope).inject()
    face.addItem('daily', 'l', '  buy milk  ')
    await vi.waitFor(() => {
      expect(host.set).toHaveBeenCalledWith('tasks', [
        expect.objectContaining({ lists: [expect.objectContaining({
          items: [
            expect.objectContaining({ id: 'a' }),
            expect.objectContaining({ id: 'b' }),
            expect.objectContaining({ done: false, text: 'buy milk' }),
          ],
        })] }),
      ])
    })
  })

  it('toggles an item', async () => {
    const host = readyHost([listTask()])
    const face = new TodoPageController(host.scope).inject()
    face.toggleItem('daily', 'l', 'a')
    await vi.waitFor(() => {
      expect(host.set).toHaveBeenCalledWith('tasks', [
        expect.objectContaining({ lists: [expect.objectContaining({
          items: [expect.objectContaining({ id: 'a', done: true }), expect.objectContaining({ id: 'b' })],
        })] }),
      ])
    })
  })

  it('removes an item', async () => {
    const host = readyHost([listTask()])
    const face = new TodoPageController(host.scope).inject()
    face.removeItem('daily', 'l', 'a')
    await vi.waitFor(() => {
      expect(host.set).toHaveBeenCalledWith('tasks', [
        expect.objectContaining({ lists: [expect.objectContaining({
          items: [expect.objectContaining({ id: 'b' })],
        })] }),
      ])
    })
  })

  it('clears completed items', async () => {
    const task = listTask()
    task.lists[0]!.items[0]!.done = true
    const host = readyHost([task])
    const face = new TodoPageController(host.scope).inject()
    face.clearCompleted('daily', 'l')
    await vi.waitFor(() => {
      expect(host.set).toHaveBeenCalledWith('tasks', [
        expect.objectContaining({ lists: [expect.objectContaining({
          items: [expect.objectContaining({ id: 'b' })],
        })] }),
      ])
    })
  })

  it('reorders items, lists, and tasks', async () => {
    const itemHost = readyHost([listTask()])
    new TodoPageController(itemHost.scope).inject().moveItem('daily', 'l', 0, 1)
    await vi.waitFor(() => {
      expect(itemHost.set).toHaveBeenCalledWith('tasks', [
        expect.objectContaining({ lists: [expect.objectContaining({
          items: [expect.objectContaining({ id: 'b' }), expect.objectContaining({ id: 'a' })],
        })] }),
      ])
    })
    const listTask2 = (): TodoTask => ({ ...daily(),
      lists: [{ id: 'l1', name: 'L1', items: [] }, { id: 'l2', name: 'L2', items: [] }],
    })
    const listHost = readyHost([listTask2()])
    new TodoPageController(listHost.scope).inject().moveList('daily', 0, 1)
    await vi.waitFor(() => {
      const value = listHost.set.mock.calls[listHost.set.mock.calls.length - 1]?.[1] as Array<{ lists: Array<{ id: string }> }>
      expect(value[0]!.lists[0]!.id).toBe('l2')
    })
    const taskHost = readyHost([daily(), { id: 'b', name: 'B', builtin: false, lists: [] }, { id: 'a', name: 'A', builtin: false, lists: [] }])
    new TodoPageController(taskHost.scope).inject().moveTask(1, 2)
    await vi.waitFor(() => {
      const value = taskHost.set.mock.calls[taskHost.set.mock.calls.length - 1]?.[1] as Array<{ id: string }>
      expect(value.map(task => task.id)).toEqual(['daily', 'a', 'b'])
    })
  })

  it('ignores writes on a read-only document', async () => {
    const host = stubSettingsScope<TodoSettings>()
    const controller = new TodoPageController(host.scope)
    host.publish({ status: 'ready', writable: false, value: {}, base: {}, user: {} })
    controller.inject().addTask('nope')
    await Promise.resolve()
    expect(host.set).not.toHaveBeenCalled()
  })
})

describe('todo helpers', () => {
  it('appendTask trims and ignores blank names', () => {
    expect(appendTask([], '   ')).toEqual([])
    const next = appendTask([], 'Dev')
    expect(next[0]).toMatchObject({ name: 'Dev', builtin: false, lists: [] })
  })

  it('dropTask never removes the built-in daily task', () => {
    expect(dropTask([daily()], 'daily')).toEqual([daily()])
  })

  it('item helpers reshape only the matching list', () => {
    const base = listTask()
    const withItem = appendItem([base], 'daily', 'l', 'c')
    expect(withItem[0]!.lists[0]!.items.map(item => item.text)).toEqual(['a', 'b', 'c'])
    const flipped = toggleItem([base], 'daily', 'l', 'a')
    expect(flipped[0]!.lists[0]!.items[0]!.done).toBe(true)
    const without = removeItem([base], 'daily', 'l', 'a')
    expect(without[0]!.lists[0]!.items.map(item => item.text)).toEqual(['b'])
    const done = base.lists[0]!.items[1]!
    done.done = true
    const cleared = clearCompleted([base], 'daily', 'l')
    expect(cleared[0]!.lists[0]!.items.map(item => item.text)).toEqual(['a'])
  })
})
