# BoringBoard Plugin Development

Import plugins as ZIP packages. Each package must include `package.json`, `config.json`, and a JavaScript entry file named `index.js` or `main.js`.

## Contents

- [Package structure](#package-structure)
- [package.json](#package-json)
- [config.json](#config-json)
- [UI manifest values](#ui-manifest-values)
- [Runtime SDK](#runtime-sdk)
- [SDK helpers](#sdk-helpers)
- [Realistic manifest examples](#realistic-manifest-examples)
- [Available permissions](#available-permissions)

<a id="package-structure"></a>

## Package structure

```text
boringboard-example-plugin.zip
  package.json
  config.json
  index.js
```

<a id="package-json"></a>

## package.json

`package.json` defines the JavaScript package and the entry file. For now, BoringBoard only accepts JavaScript plugins.

```json
{
  "name": "boringboard-example-plugin",
  "version": "1.0.0",
  "description": "Example JavaScript plugin package for BoringBoard.",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {}
}
```

<a id="config-json"></a>

## config.json

`config.json` describes identity, permissions, and how BoringBoard should render the plugin.

`license` and `permissions` are optional. Other fields are required.

```json
{
  "id": "boringboard-example-plugin",
  "name": "Example Plugin",
  "description": "Renders a small plugin card inside BoringBoard.",
  "version": "1.0.0",
  "author": "BoringBoard Team",
  "homepage": "https://example.com",
  "license": "MIT",
  "entry": "index.js",
  "ui": {
    "menu": true,
    "isAdmin": true,
    "menuLabel": "Example",
    "menuIcon": "sparkles",
    "view": "page",
    "layout": "card",
    "placements": ["sidebar"]
  },
  "permissions": []
}
```

<a id="ui-manifest-values"></a>

## UI manifest values

`ui.view` controls the future rendering target. Allowed values are `page`, `modal`, `tab`, `widget`, and `table`.

`ui.layout` controls the preferred visual layout. Allowed values are `card` and `table`.

`ui.placements` is an array of placement names such as `sidebar`, `dashboard`, `task`, `board`, or `board-toolbar`.

If `ui.view` is missing, BoringBoard uses `page`. If `ui.layout` is missing, BoringBoard uses `card`. If `ui.placements` is missing and `ui.menu` is `true`, BoringBoard uses `["sidebar"]`.

<a id="runtime-sdk"></a>

## Runtime SDK

BoringBoard provides default SDK helpers so plugin authors can create common UI quickly.

```js
module.exports = function mount(plugin, root, config) {
    plugin.clear()

    plugin.createPlugin({
        title: config.name,
        description: config.description,
    })

    plugin.createCard({
        title: 'Quick action',
        description: 'Run a function or call a BoringBoard API.',
        actions: [
            {label: 'Load profile', run: () => plugin.exec('loadProfile')},
        ],
    })

    plugin.createTable({
        columns: ['Task', 'Owner', 'Status'],
        rows: [
            ['Follow up customer', 'Ari', 'Open'],
            ['Prepare weekly report', 'Mika', 'In progress'],
        ],
    })

    plugin.register('loadProfile', async () => {
        const me = await plugin.api.get('/api/v2/users/me')
        plugin.log('Loaded profile: ' + (me.username || me.id))
    })
}
```

<a id="sdk-helpers"></a>

## SDK helpers

- `plugin.clear()`
- `plugin.log(message)`
- `plugin.createPlugin({title, description})`
- `plugin.createCard({title, description, actions})`
- `plugin.createTable({columns, rows})`
- `plugin.create("card" | "table", props)`
- `plugin.register(name, fn)`
- `plugin.exec(name)`
- `plugin.callApi(path, options)`
- `plugin.api.get("/api/v2/...")`
- `plugin.api.post("/api/v2/...", body)`
- `plugin.api.put("/api/v2/...", body)`
- `plugin.api.patch("/api/v2/...", body)`
- `plugin.api.delete("/api/v2/...")`

<a id="realistic-manifest-examples"></a>

## Realistic manifest examples

<a id="crm-page-plugin"></a>

### CRM page plugin

```json
{
  "id": "boringboard-crm",
  "name": "CRM",
  "description": "Displays customers, opportunities, and follow-up tasks.",
  "version": "1.0.0",
  "author": "BoringBoard Team",
  "homepage": "https://example.com/boringboard-crm",
  "entry": "index.js",
  "ui": {
    "menu": true,
    "isAdmin": false,
    "menuLabel": "CRM",
    "menuIcon": "account-group-outline",
    "view": "page",
    "layout": "table",
    "placements": ["sidebar"]
  },
  "permissions": ["board.read", "task.read", "task.write", "user.read"]
}
```

<a id="time-tracking-widget"></a>

### Time Tracking widget

```json
{
  "id": "boringboard-time-tracking",
  "name": "Time Tracking",
  "description": "Shows active timers and time totals for the current task board.",
  "version": "1.0.0",
  "author": "BoringBoard Team",
  "homepage": "https://example.com/boringboard-time-tracking",
  "entry": "index.js",
  "ui": {
    "menu": false,
    "isAdmin": false,
    "view": "widget",
    "layout": "card",
    "placements": ["dashboard", "task"]
  },
  "permissions": ["task.read", "task.write", "storage.read", "storage.write"]
}
```

<a id="task-activity-tab"></a>

### Task Activity tab

```json
{
  "id": "boringboard-task-activity",
  "name": "Task Activity",
  "description": "Adds task history and handoff notes to task detail.",
  "version": "1.0.0",
  "author": "BoringBoard Team",
  "homepage": "https://example.com/boringboard-task-activity",
  "entry": "index.js",
  "ui": {
    "menu": false,
    "isAdmin": false,
    "view": "tab",
    "layout": "table",
    "placements": ["task"]
  },
  "permissions": ["task.read", "activity.read", "user.read"]
}
```

<a id="board-statistics-widget"></a>

### Board Statistics widget

```json
{
  "id": "boringboard-board-statistics",
  "name": "Board Statistics",
  "description": "Shows cycle time, overdue tasks, and board throughput.",
  "version": "1.0.0",
  "author": "BoringBoard Team",
  "homepage": "https://example.com/boringboard-board-statistics",
  "entry": "index.js",
  "ui": {
    "menu": false,
    "isAdmin": false,
    "view": "widget",
    "layout": "card",
    "placements": ["dashboard", "board"]
  },
  "permissions": ["board.read", "task.read", "activity.read"]
}
```

<a id="user-management-admin-page"></a>

### User Management admin page

```json
{
  "id": "boringboard-user-management",
  "name": "User Management",
  "description": "Adds admin tools for reviewing user access and board membership.",
  "version": "1.0.0",
  "author": "BoringBoard Team",
  "homepage": "https://example.com/boringboard-user-management",
  "entry": "index.js",
  "ui": {
    "menu": true,
    "isAdmin": true,
    "menuLabel": "User Tools",
    "menuIcon": "account-cog-outline",
    "view": "page",
    "layout": "table",
    "placements": ["sidebar"]
  },
  "permissions": ["user.read", "board.members.read", "settings.read"]
}
```

<a id="task-import-modal"></a>

### Task Import modal

```json
{
  "id": "boringboard-task-import",
  "name": "Task Import",
  "description": "Imports tasks from a CSV file into the current board.",
  "version": "1.0.0",
  "author": "BoringBoard Team",
  "homepage": "https://example.com/boringboard-task-import",
  "entry": "index.js",
  "ui": {
    "menu": false,
    "isAdmin": false,
    "view": "modal",
    "layout": "table",
    "placements": ["board-toolbar"]
  },
  "permissions": ["board.read", "task.write", "storage.write"]
}
```

<a id="available-permissions"></a>

## Available permissions

- `board.read`
- `board.write`
- `board.create`
- `board.delete`
- `board.share`
- `board.members.read`
- `board.members.write`
- `task.read`
- `task.write`
- `task.comment`
- `task.attachment.read`
- `task.attachment.write`
- `template.read`
- `template.write`
- `user.read`
- `team.read`
- `activity.read`
- `announcement.read`
- `announcement.write`
- `reminder.read`
- `reminder.write`
- `notification.send`
- `settings.read`
- `settings.write`
- `storage.read`
- `storage.write`
- `socket.subscribe`
- `socket.publish`
- `http.request`
- `ai.generate`
