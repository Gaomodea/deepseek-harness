# dsh-client-todo-list

English | [中文](README.zh.md)

A todo-list feature contributed to the top-level **Todo** section of the web
settings panel. The Host half registers the `todo-list` settings namespace and
persists its resolved section to `<project root>/.data/todo-list/todos.json`; the
browser half renders a settings page (not a plugin-options card) that manages a
hierarchical backlog - tasks hold ordered todo-lists, each list holds ordered
items - through that namespace.

## How it appears

The browser half registers a page into `settings.section` under the nav id `todo`
(`order: 5`, between General and Models), so it renders as a top-level settings
row beside General / Models / Plugins rather than inside a plugin's option card.
The page appears exactly when this plugin's Host half is composed, because the
`todo-list` settings namespace is only then served to the browser. Every action
writes through the client settings scope, so adds / toggles / removes / reorders
land on the Host immediately and the page stays current via the scope snapshot.

## Data model and hierarchy

- **Task** owns one or more lists; tasks carry an ordinal and can be drag-reordered.
  A built-in **Daily** task is created for you and cannot be deleted.
- **Todo-list** belongs to exactly one task; lists carry an ordinal and can be
  drag-reordered within their task.
- **Item** belongs to exactly one list; items carry an ordinal and can be
  drag-reordered within their list, and are checked / removed / cleared as before.

The legacy v0 flat format (`{ items: [...] }`) is migrated on boot into the built-in
Daily task as its first list, so existing entries are preserved automatically.

## Storage

The Host half owns the durable document `<project root>/.data/todo-list/todos.json`.
On every committed change to the `todo-list` namespace it writes the resolved
section to that file; on boot it seeds the namespace back from the file when they
differ, so the file is the authoritative, hand-editable copy (migration runs on
that read). "Project root" defaults to the directory the host process was launched
from (`process.cwd()`); the plugin config key `root` overrides it.

## Configuration

- `root` - project root under which the `data` directory lives; defaults to the launch directory.

## Model Experience

None, as this feature is a browser configuration UI; no todo content reaches a model.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **The file is authoritative, not the settings document.** The todo section is also
  carried by the shared settings document (the settings seam is the transport), but on
  boot the file wins and re-seeds the namespace, so an operator edits `todos.json`
  rather than the `todo-list:` section of the settings file.
- **External file edits are read at restart only.** The Host half does not watch the
  document, so a change made to `todos.json` outside this process is picked up on the
  next boot, not live.
- **Drag-to-reorder uses native HTML5 drag events.** It works with a mouse or
  touch-capable trackpad; keyboard-only reordering is not provided.
