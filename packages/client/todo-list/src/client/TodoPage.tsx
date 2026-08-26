/**
 * Todo settings page contributed to the settings section list.
 *
 * Renders the task / list / item hierarchy bound to the 'todo-list' settings
 * namespace: a task owns ordered todo-lists, each list owns ordered items, and
 * every level carries an ordinal number with drag-to-reorder. Each task, list,
 * and item row is a drop zone that reorders within its own collection.
 */

import { useState } from 'react'
import clsx from 'clsx'
import css from './TodoPage.module.css'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { TodoList, TodoPageFace } from './todo-controller.ts'
import type { TodoListLocaleKey } from './locales.ts'
import { DAILY_TASK_ID } from './todo-controller.ts'

/** Props the renderer binds for the todo settings page. */
export type TodoPageProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'todo.list'>
  & InjectFace<TodoPageFace>

/** What level a drag started at, and which collection it belongs to. */
interface DragState {
  kind: 'task' | 'list' | 'item'
  taskId: string | undefined
  listId: string | undefined
  from: number
  overRowId: string | null
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Todo settings page copy. */
    'todo.list': TodoListLocaleKey
  }
}

/** An inline add row: an input plus a submit button. */
function AddRow(props: {
  placeholder: string
  submitLabel: string
  busy: boolean
  onAdd: (value: string) => void
}) {
  const { placeholder, submitLabel, busy, onAdd } = props
  const [value, setValue] = useState('')
  const trimmed = value.trim()
  const submit = (): void => {
    if (busy || trimmed === '') return
    onAdd(trimmed)
    setValue('')
  }
  return (
    <div className={css.add}>
      <input
        className={css.input}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={busy}
        onChange={(event) => { setValue(event.target.value) }}
      />
      <button type="button" className={css.button} disabled={busy || trimmed === ''} onClick={submit}>
        {submitLabel}
      </button>
    </div>
  )
}

/** Props for one todo-list inside a task. */
interface ListBlockProps {
  taskId: string
  list: TodoList
  busy: boolean
  index: number
  dragOver: boolean
  t: (key: TodoListLocaleKey) => string
  onDragOver: (event: React.DragEvent) => void
  onDrop: () => void
  onBeginDrag: () => void
  onEndDrag: () => void
  onItemAdd: (text: string) => void
  onRemove: () => void
  onToggle: (itemId: string) => void
  onItemRemove: (itemId: string) => void
  onItemDrop: (to: number, from: number) => void
  onClear: () => void
}

/**
 * One todo-list row: ordered items with per-item drag reorder, plus its own
 * header drag that the page-level list drop consumes.
 * @param props - list block props.
 * @returns the todo-list element tree.
 */
function ListBlock(props: ListBlockProps) {
  const {
    taskId, list, busy, index, dragOver, t,
    onDragOver, onDrop, onBeginDrag, onEndDrag,
    onItemAdd, onRemove, onToggle, onItemRemove, onItemDrop, onClear,
  } = props
  const [itemDrag, setItemDrag] = useState<{ from: number; overId: string | null } | null>(null)
  const hasCompleted = list.items.some(item => item.done)
  const itemRowId = (itemIndex: number): string => 'item:' + taskId + ':' + list.id + ':' + String(itemIndex)
  return (
    <li className={clsx(css.listCard, dragOver && css.draggingOver)} onDragOver={onDragOver} onDrop={onDrop}>
      <div className={css.rowHead}>
        <span role="button" tabIndex={busy ? -1 : 0} draggable={!busy} className={css.handle}
          title={t('dragHint')}
          onDragStart={(event) => { event.dataTransfer.setData('text/plain', ''); onBeginDrag() }}
          onDragEnd={onEndDrag}
        >⋮⋮</span>
        <span className={css.number}>{index + 1}</span>
        <span className={css.rowName}>{list.name}</span>
        <button type="button" className={css.deleteBtn} disabled={busy} title={t('delete')} onClick={onRemove}>×</button>
      </div>
      <div className={css.body}>
        <AddRow placeholder={t('addItemPlaceholder')} submitLabel={t('add')} busy={busy} onAdd={onItemAdd} />
        {list.items.length === 0 && <p className={css.empty}>{t('empty')}</p>}
        <ul className={css.items}>
          {list.items.map((item, itemIndex) => {
            const rid = itemRowId(itemIndex)
            return (
              <li key={item.id}
                className={clsx(css.item, itemDrag?.overId === rid && css.draggingOver)}
                onDragOver={(event) => {
                  event.preventDefault()
                  setItemDrag(current => current ? { ...current, overId: rid } : current)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const current = itemDrag
                  if (current) { onItemDrop(itemIndex, current.from); setItemDrag(null); event.stopPropagation() }
                }}
              >
                <span role="button" tabIndex={busy ? -1 : 0} draggable={!busy} className={css.handle}
                  title={t('dragHint')}
                  onDragStart={(event) => { event.dataTransfer.setData('text/plain', ''); setItemDrag({ from: itemIndex, overId: rid }) }}
                  onDragEnd={() => { setItemDrag(null) }}
                >⋮⋮</span>
                <span className={css.number}>{itemIndex + 1}</span>
                <label className={css.itemLabel}>
                  <input type="checkbox" className={css.check} checked={item.done} disabled={busy}
                    onChange={() => { onToggle(item.id) }}
                  />
                  <span className={clsx(css.itemText, item.done && css.doneText)}>{item.text}</span>
                </label>
                <button type="button" className={css.deleteBtn} disabled={busy} title={t('remove')}
                  onClick={() => { onItemRemove(item.id) }}
                >×</button>
              </li>
            )
          })}
        </ul>
        {hasCompleted && (
          <div className={css.listActions}>
            <button type="button" className={css.buttonGhost} disabled={busy} onClick={onClear}>{t('clearCompleted')}</button>
          </div>
        )}
      </div>
    </li>
  )
}

/**
 * The settings section content column for the todo page.
 * @param props - composed slot props.
 * @returns the todo page element tree.
 */
export function TodoPage(props: TodoPageProps) {
  const { t } = props
  const state = props.useTodoPage(snapshot => snapshot)
  const [drag, setDrag] = useState<DragState | null>(null)
  const busy = !state.writable || state.saving

  if (!state.available) return null

  const contextMatch = (kind: 'task' | 'list' | 'item', taskId: string | undefined, listId: string | undefined): boolean => {
    if (drag === null || drag.kind !== kind) return false
    if (kind === 'task') return true
    if (kind === 'list') return drag.taskId === taskId
    return drag.taskId === taskId && drag.listId === listId
  }
  const beginDrag = (kind: 'task' | 'list' | 'item', taskId: string | undefined, listId: string | undefined, from: number): void => {
    if (busy) return
    setDrag({ kind, taskId, listId, from, overRowId: null })
  }
  const clearDrag = (): void => { setDrag(null) }
  const overRow = (kind: 'task' | 'list' | 'item', taskId: string | undefined, listId: string | undefined, rowId: string): void => {
    setDrag(current => current !== null && contextMatch(kind, taskId, listId) ? { ...current, overRowId: rowId } : current)
  }
  const dropRow = (kind: 'task' | 'list' | 'item', taskId: string | undefined, listId: string | undefined, index: number): void => {
    if (drag === null) return
    if (kind === 'task') {
      if (drag.kind === 'task') props.moveTask(drag.from, index)
    } else if (kind === 'list') {
      if (drag.kind === 'list' && taskId !== undefined) props.moveList(taskId, drag.from, index)
    } else if (drag.kind === 'item' && taskId !== undefined && listId !== undefined
      && drag.taskId === taskId && drag.listId === listId) {
      props.moveItem(taskId, listId, drag.from, index)
    }
    clearDrag()
  }

  return (
    <div className={css.page}>
      <header className={css.header}>
        <h2 className={css.title}>{t('title')}</h2>
        <p className={css.desc}>{t('description')}</p>
        {!state.writable && <p className={css.note}>{t('readOnly')}</p>}
      </header>
      <AddRow placeholder={t('taskNamePlaceholder')} submitLabel={t('newTask')} busy={busy}
        onAdd={(name) => { props.addTask(name) }}
      />
      <ul className={css.tasks}>
        {state.tasks.map((task, taskIndex) => {
          const taskRowId = 'task:' + String(taskIndex)
          const isDaily = task.builtin || task.id === DAILY_TASK_ID
          const displayName = isDaily ? t('dailyTask') : task.name
          return (
            <li key={task.id} className={clsx(css.taskCard, drag !== null && drag.overRowId === taskRowId && css.draggingOver)}>
              <div
                className={css.rowHead}
                onDragOver={(event) => { event.preventDefault(); overRow('task', undefined, undefined, taskRowId) }}
                onDrop={() => { dropRow('task', undefined, undefined, taskIndex) }}
              >
                <span role="button" tabIndex={busy ? -1 : 0} draggable={!busy} className={css.handle}
                  title={t('dragHint')}
                  onDragStart={(event) => { event.dataTransfer.setData('text/plain', ''); beginDrag('task', undefined, undefined, taskIndex) }}
                  onDragEnd={clearDrag}
                >⋮⋮</span>
                <span className={css.number}>{taskIndex + 1}</span>
                <span className={css.rowName}>{displayName}</span>
                <button type="button" className={css.deleteBtn} disabled={busy || isDaily} title={t('delete')}
                  onClick={() => { props.removeTask(task.id) }}
                >×</button>
              </div>
              <div className={css.body}>
                <AddRow placeholder={t('listNamePlaceholder')} submitLabel={t('newList')} busy={busy}
                  onAdd={(name) => { props.addList(task.id, name) }}
                />
                {task.lists.length === 0 && <p className={css.empty}>{t('empty')}</p>}
                <ul className={css.lists}>
                  {task.lists.map((list, listIndex) => {
                    const listRowId = 'list:' + task.id + ':' + String(listIndex)
                    return (
                      <ListBlock
                        key={list.id}
                        taskId={task.id}
                        list={list}
                        busy={busy}
                        index={listIndex}
                        dragOver={drag !== null && drag.overRowId === listRowId}
                        t={t}
                        onDragOver={(event) => { event.preventDefault(); overRow('list', task.id, undefined, listRowId) }}
                        onDrop={() => { dropRow('list', task.id, undefined, listIndex) }}
                        onBeginDrag={() => { beginDrag('list', task.id, undefined, listIndex) }}
                        onEndDrag={clearDrag}
                        onItemAdd={(text) => { props.addItem(task.id, list.id, text) }}
                        onRemove={() => { props.removeList(task.id, list.id) }}
                        onToggle={(itemId) => { props.toggleItem(task.id, list.id, itemId) }}
                        onItemRemove={(itemId) => { props.removeItem(task.id, list.id, itemId) }}
                        onItemDrop={(to, from) => { props.moveItem(task.id, list.id, from, to) }}
                        onClear={() => { props.clearCompleted(task.id, list.id) }}
                      />
                    )
                  })}
                </ul>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
