/** Locale bundles for the todo settings page. */

/** Locale keys this page renders. */
export type TodoListLocaleKey =
  | 'nav' | 'title' | 'description' | 'readOnly' | 'saving'
  | 'newTask' | 'taskNamePlaceholder' | 'dailyTask' | 'newList'
  | 'listNamePlaceholder' | 'addItemPlaceholder' | 'add' | 'remove' | 'delete'
  | 'clearCompleted' | 'remaining' | 'allDone' | 'dragHint' | 'empty'

/** English copy. */
export const en: Record<TodoListLocaleKey, string> = {
  nav: 'Todo',
  title: 'Todo list',
  description: 'Tasks, each holding ordered lists of todo items, stored in this project space.',
  readOnly: 'This deployment stores settings read-only.',
  saving: 'Saving…',
  newTask: 'New task',
  taskNamePlaceholder: 'Task name',
  dailyTask: 'Daily tasks',
  newList: 'New list',
  listNamePlaceholder: 'List name',
  addItemPlaceholder: 'What needs doing?',
  add: 'Add',
  remove: 'Remove',
  delete: 'Delete',
  clearCompleted: 'Clear completed',
  remaining: 'pending',
  allDone: 'all done',
  dragHint: 'Drag to reorder',
  empty: 'Nothing here yet',
}

/** Simplified Chinese copy. */
export const zh: Record<TodoListLocaleKey, string> = {
  nav: '待办',
  title: '待办清单',
  description: '任务分级管理：任务下包含清单，清单内有带序号、可拖拽排序的条目。',
  readOnly: '本部署的设置为只读。',
  saving: '保存中…',
  newTask: '新建任务',
  taskNamePlaceholder: '任务名称',
  dailyTask: '日常任务',
  newList: '新建清单',
  listNamePlaceholder: '清单名称',
  addItemPlaceholder: '有什么要做的？',
  add: '添加',
  remove: '删除',
  delete: '删除',
  clearCompleted: '清除已完成',
  remaining: '项待办',
  allDone: '全部完成',
  dragHint: '拖拽排序',
  empty: '暂无内容',
}
