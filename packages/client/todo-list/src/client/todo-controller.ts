/** The todo settings page controller over the 'todo-list' settings namespace. */

import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/**
 * Namespace the Host half registers. Spelled here rather than imported: a
 * client package must not depend on a Host package, and the Host half spells
 * the same value.
 */
export const TODO_NS = 'todo-list'
/** Stable id of the built-in, non-deletable daily task. */
export const DAILY_TASK_ID = 'daily'

/** One todo item. */
export interface TodoItem {
  /** Stable entry id. */
  id: string
  /** Whether the entry is completed. */
  done: boolean
  /** The todo text. */
  text: string
}

/** One todo-list inside a task; items render in array order. */
export interface TodoList {
  /** Stable list id. */
  id: string
  /** Display name. */
  name: string
  /** Ordered entries. */
  items: TodoItem[]
}

/** One task grouping one or more todo-lists. */
export interface TodoTask {
  /** Stable task id. */
  id: string
  /** Stored display name (the built-in daily task renders a localized label). */
  name: string
  /** Present on the built-in daily task, which cannot be deleted. */
  builtin: boolean
  /** Ordered todo-lists. */
  lists: TodoList[]
}

/** The 'todo-list' namespace section as the page edits it. */
export interface TodoSettings {
  /** Ordered tasks. */
  tasks?: TodoTask[]
}

/** What the todo settings page renders. */
export interface TodoPageState {
  /** Whether the namespace is served to this client. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  /** Whether a write is currently crossing the wire. */
  saving: boolean
  /** Ordered tasks and their lists and items. */
  tasks: TodoTask[]
}

/** The registration-side face the settings section entry injects. */
export interface TodoPageFace {
  hooks: {
    /** Page snapshot bound by the renderer as useTodoPage. */
    todoPage: SnapshotStore<TodoPageState>
  }
  /** Append a new, empty task; blank names are ignored. */
  addTask: (name: string) => void
  /** Remove a task (the built-in daily task is never removed). */
  removeTask: (taskId: string) => void
  /** Reorder tasks. */
  moveTask: (from: number, to: number) => void
  /** Append a list to a task; blank names are ignored. */
  addList: (taskId: string, name: string) => void
  /** Remove a list from a task. */
  removeList: (taskId: string, listId: string) => void
  /** Reorder the lists of a task. */
  moveList: (taskId: string, from: number, to: number) => void
  /** Append an item to a list; blank text is ignored. */
  addItem: (taskId: string, listId: string, text: string) => void
  /** Flip an item's done flag. */
  toggleItem: (taskId: string, listId: string, itemId: string) => void
  /** Remove an item. */
  removeItem: (taskId: string, listId: string, itemId: string) => void
  /** Reorder the items of a list. */
  moveItem: (taskId: string, listId: string, from: number, to: number) => void
  /** Remove every completed item of a list. */
  clearCompleted: (taskId: string, listId: string) => void
}

/** Mint a stable id for a new task, list, or item. */
function newId(): string {
  return crypto.randomUUID()
}

/** Move an array element from one index to another, immutably. */
function reorder<T>(values: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= values.length || to >= values.length) return [...values]
  const next = [...values]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return next
  next.splice(to, 0, moved)
  return next
}

/** Replace one task's lists via a mapper, or return tasks unchanged for an unknown id. */
function mapTask(tasks: readonly TodoTask[], taskId: string, map: (task: TodoTask, lists: TodoList[]) => TodoTask): TodoTask[] {
  return tasks.map(task => task.id === taskId ? map(task, task.lists) : task)
}

/** Replace one list's items via a mapper, or return tasks unchanged for an unknown id. */
function mapList(
  tasks: readonly TodoTask[], taskId: string, listId: string,
  map: (list: TodoList, items: TodoItem[]) => TodoList,
): TodoTask[] {
  return mapTask(tasks, taskId, (task, lists) => ({
    ...task,
    lists: lists.map(list => list.id === listId ? map(list, list.items) : list),
  }))
}

/** Append a task; blank names are ignored. */
export function appendTask(tasks: readonly TodoTask[], name: string): TodoTask[] {
  const trimmed = name.trim()
  if (trimmed === '') return [...tasks]
  return [...tasks, { id: newId(), name: trimmed, builtin: false, lists: [] }]
}

/** Remove a task, never the built-in daily task. */
export function dropTask(tasks: readonly TodoTask[], taskId: string): TodoTask[] {
  return tasks.filter(task => task.builtin || task.id !== taskId)
}

/** Append a list to a task; blank names are ignored. */
export function appendList(tasks: readonly TodoTask[], taskId: string, name: string): TodoTask[] {
  const trimmed = name.trim()
  if (trimmed === '') return [...tasks]
  return mapTask(tasks, taskId, (task, lists) =>
    task.id === taskId ? { ...task, lists: [...lists, { id: newId(), name: trimmed, items: [] }] } : task)
}

/** Remove a list from a task. */
export function dropList(tasks: readonly TodoTask[], taskId: string, listId: string): TodoTask[] {
  return mapTask(tasks, taskId, (task, lists) => ({ ...task, lists: lists.filter(list => list.id !== listId) }))
}

/** Append an item to a list; blank text is ignored. */
export function appendItem(tasks: readonly TodoTask[], taskId: string, listId: string, text: string): TodoTask[] {
  return mapList(tasks, taskId, listId, (list, items) => {
    const trimmed = text.trim()
    return trimmed === '' ? list : { ...list, items: [...items, { id: newId(), done: false, text: trimmed }] }
  })
}

/** Flip an item's done flag. */
export function toggleItem(tasks: readonly TodoTask[], taskId: string, listId: string, itemId: string): TodoTask[] {
  return mapList(tasks, taskId, listId, (list, items) => ({
    ...list,
    items: items.map(item => item.id === itemId ? { ...item, done: !item.done } : item),
  }))
}

/** Remove an item. */
export function removeItem(tasks: readonly TodoTask[], taskId: string, listId: string, itemId: string): TodoTask[] {
  return mapList(tasks, taskId, listId, (list, items) => ({ ...list, items: items.filter(item => item.id !== itemId) }))
}

/** Remove every completed item of a list. */
export function clearCompleted(tasks: readonly TodoTask[], taskId: string, listId: string): TodoTask[] {
  return mapList(tasks, taskId, listId, (list, items) => ({ ...list, items: items.filter(item => !item.done) }))
}

/** Bridges the 'todo-list' scope onto the page snapshot. */
export class TodoPageController {
  private readonly store = createSnapshotStore<TodoPageState>({
    available: false, writable: false, saving: false, tasks: [],
  })
  private saving = false

  /** @param scope - the bound settings scope for the 'todo-list' namespace. */
  constructor(private readonly scope: SettingsScope<TodoSettings>) {
    this.publish()
    scope.subscribe(() => { this.publish() })
  }

  /**
   * Build the face the settings section registration injects.
   * @returns the page snapshot and its mutation actions.
   */
  inject(): TodoPageFace {
    return {
      hooks: { todoPage: this.store },
      addTask: (name) => { void this.commit(tasks => appendTask(tasks, name)) },
      removeTask: (taskId) => { void this.commit(tasks => dropTask(tasks, taskId)) },
      moveTask: (from, to) => { void this.commit(tasks => reorder(tasks, from, to)) },
      addList: (taskId, name) => { void this.commit(tasks => appendList(tasks, taskId, name)) },
      removeList: (taskId, listId) => { void this.commit(tasks => dropList(tasks, taskId, listId)) },
      moveList: (taskId, from, to) => {
        void this.commit(tasks => mapTask(tasks, taskId, (task, lists) => ({ ...task, lists: reorder(lists, from, to) })))
      },
      addItem: (taskId, listId, text) => { void this.commit(tasks => appendItem(tasks, taskId, listId, text)) },
      toggleItem: (taskId, listId, itemId) => { void this.commit(tasks => toggleItem(tasks, taskId, listId, itemId)) },
      removeItem: (taskId, listId, itemId) => { void this.commit(tasks => removeItem(tasks, taskId, listId, itemId)) },
      moveItem: (taskId, listId, from, to) => {
        void this.commit(tasks => mapList(tasks, taskId, listId, (list, items) => ({ ...list, items: reorder(items, from, to) })))
      },
      clearCompleted: (taskId, listId) => { void this.commit(tasks => clearCompleted(tasks, taskId, listId)) },
    }
  }

  /**
   * Apply one pure mutation to the current tasks and persist the result.
   * A page that is unavailable, read-only, or already writing ignores the call,
   * and a mutation that leaves the list unchanged writes nothing.
   * @param mutate - pure transform over the current tasks.
   * @returns settlement after the write.
   */
  private async commit(mutate: (tasks: TodoTask[]) => TodoTask[]): Promise<void> {
    const snapshot = this.scope.getSnapshot()
    if (snapshot.status !== 'ready' || !snapshot.writable || this.saving) return
    const current = snapshot.value?.tasks ?? []
    const next = mutate(current)
    if (JSON.stringify(current) === JSON.stringify(next)) return
    this.saving = true
    this.publish()
    await this.scope.set('tasks', next)
    this.saving = false
    this.publish()
  }

  /** Republish the page projection from the current scope snapshot. */
  private publish(): void {
    const snapshot = this.scope.getSnapshot()
    this.store.set({
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      saving: this.saving,
      tasks: snapshot.value?.tasks ?? [],
    })
  }
}
