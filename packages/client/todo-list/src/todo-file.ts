/**
 * Todo-list data contract and its on-disk document.
 *
 * The Host half owns one durable file <project root>/.data/todo-list/todos.json
 * holding the resolved 'todo-list' settings section. The settings seam is the
 * transport the web page writes through; this module is the document it lands
 * in, so an operator can hand-edit the file and the page picks the change up
 * on the next restart.
 *
 * Data is hierarchic: a task owns todo-lists and each list owns ordered items.
 * A built-in "daily tasks" task cannot be deleted; the previous flat item list
 * format migrates into that task.
 *
 * @module @deepseek-ai/dsh-client-todo-list
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import z from '@deepseek-ai/schemastery'

/** Settings namespace the Host half registers and the page edits. */
export const TODO_NAMESPACE = 'todo-list'
/** Directory under the project root that holds the todo document. */
export const TODO_DATA_DIRNAME = '.data'
/** Sub-directory that isolates the todo-list data. */
export const TODO_LIST_DIRNAME = 'todo-list'
/** Name of the on-disk todo document. */
export const TODO_DATA_FILENAME = 'todos.json'
/** Stable id of the built-in, non-deletable daily task. */
export const DAILY_TASK_ID = 'daily'
/** Stored name of the built-in daily task. */
export const DAILY_TASK_NAME = '日常任务'
/** Stored name given to the list that absorbs migrated flat items. */
export const DEFAULT_LIST_NAME = '日常'

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

/** The resolved 'todo-list' settings section. */
export interface TodoSettings {
  /** Ordered tasks. */
  tasks?: TodoTask[]
}

const TodoItemSchema: z<TodoItem> = z.object({
  id: z.string(),
  done: z.boolean(),
  text: z.string(),
})

const TodoListSchema: z<TodoList> = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(TodoItemSchema).default([]),
})

const TodoTaskSchema: z<TodoTask> = z.object({
  id: z.string(),
  name: z.string(),
  builtin: z.boolean(),
  lists: z.array(TodoListSchema).default([]),
})

/** Schemastery schema backing the 'todo-list' namespace. */
export const TodoSettingsSchema: z<TodoSettings> = z.object({
  tasks: z.array(TodoTaskSchema).default([]),
})

/**
 * Absolute path of the todo document under a project root.
 * @param root - the project root directory.
 * @returns the path to 'todos.json' under 'root/.data/todo-list'.
 */
export function todoDataFile(root: string): string {
  return join(root, TODO_DATA_DIRNAME, TODO_LIST_DIRNAME, TODO_DATA_FILENAME)
}

/** Whether a filesystem error means absence. */
function isENOENT(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT'
}

/**
 * Read the stored todo section from disk.
 * @param root - the project root directory.
 * @returns the raw stored section ({ tasks: [...] }), or undefined when the
 * document is absent or does not parse to an object.
 */
export async function loadTodoFile(root: string): Promise<Record<string, unknown> | undefined> {
  let text: string
  try {
    text = await readFile(todoDataFile(root), 'utf8')
  } catch (error) {
    if (isENOENT(error)) return undefined
    throw error
  }
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
  return parsed as Record<string, unknown>
}

/**
 * Persist a todo section to disk, creating the parent directory as needed.
 * The settings seam serializes writes, so a plain write is sufficient.
 * @param root - the project root directory.
 * @param section - the resolved section to store.
 * @returns settlement once the file is on disk.
 */
export async function writeTodoFile(root: string, section: Record<string, unknown>): Promise<void> {
  const filename = todoDataFile(root)
  await mkdir(dirname(filename), { recursive: true, mode: 0o700 })
  await writeFile(filename, JSON.stringify(section, null, 2) + '\n', { mode: 0o600 })
}

/** Whether a value is a well-formed todo item. */
function isTodoItem(value: unknown): value is TodoItem {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && typeof (value as TodoItem).id === 'string'
    && typeof (value as TodoItem).done === 'boolean'
    && typeof (value as TodoItem).text === 'string'
}

/** Narrow a raw list into well-formed items, or undefined on any malformed one. */
function cleanItems(raw: unknown[]): TodoItem[] | undefined {
  const items = raw.filter(isTodoItem)
  return items.length === raw.length ? items : undefined
}

/** Narrow a raw tasks array into well-formed lists, or undefined. */
function cleanLists(raw: unknown[]): TodoList[] | undefined {
  const lists: TodoList[] = []
  for (const value of raw) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
    const list = value as Record<string, unknown>
    if (typeof list.id !== 'string' || typeof list.name !== 'string' || !Array.isArray(list.items)) {
      return undefined
    }
    const items = cleanItems(list.items)
    if (items === undefined) return undefined
    lists.push({ id: list.id, name: list.name, items })
  }
  return lists
}

/** Narrow a raw tasks array into well-formed tasks, or undefined. */
function cleanTasks(raw: unknown[]): TodoTask[] | undefined {
  const tasks: TodoTask[] = []
  for (const value of raw) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
    const task = value as Record<string, unknown>
    if (typeof task.id !== 'string' || typeof task.name !== 'string' || !Array.isArray(task.lists)) {
      return undefined
    }
    const lists = cleanLists(task.lists)
    if (lists === undefined) return undefined
    tasks.push({ id: task.id, name: task.name, builtin: task.builtin === true, lists })
  }
  return tasks
}

/** Ensure the built-in daily task is always present, at the head. */
function withDailyTask(tasks: TodoTask[]): TodoTask[] {
  if (tasks.some(task => task.id === DAILY_TASK_ID)) return tasks
  return [{ id: DAILY_TASK_ID, name: DAILY_TASK_NAME, builtin: true, lists: [] }, ...tasks]
}

/**
 * Migrate + narrow a stored section onto the hierarchical shape. Returns
 * undefined for a section that neither holds a valid 'tasks' list nor a valid
 * legacy flat 'items' list, so a malformed file cannot be seeded back.
 * @param section - the raw stored section.
 * @returns a clean '{ tasks: [...] }' section, or undefined when malformed.
 */
export function migrateTodoSection(section: Record<string, unknown>): Record<string, unknown> | undefined {
  if (Array.isArray(section.tasks)) {
    const tasks = cleanTasks(section.tasks)
    return tasks === undefined ? undefined : { tasks: withDailyTask(tasks) }
  }
  if (Array.isArray(section.items)) {
    const items = cleanItems(section.items)
    if (items === undefined) return undefined
    return {
      tasks: [{
        id: DAILY_TASK_ID,
        name: DAILY_TASK_NAME,
        builtin: true,
        lists: [{ id: crypto.randomUUID(), name: DEFAULT_LIST_NAME, items }],
      }],
    }
  }
  return undefined
}
