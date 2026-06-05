# BoringBoard Plugin Manifest Examples

BoringBoard plugins are imported as ZIP packages with `package.json`, `config.json`, and a JavaScript entry file defined by `package.json.main`.

The `ui` block describes how the plugin should be rendered. Runtime rendering is prepared by this manifest metadata; individual UI surfaces can use it without adding new schema fields later.

## UI Manifest Fields

```json
{
  "ui": {
    "menu": true,
    "isAdmin": true,
    "menuLabel": "Example",
    "menuIcon": "sparkles",
    "view": "page",
    "layout": "card",
    "placements": ["sidebar"]
  }
}
```

Allowed `view` values:

```txt
page
modal
tab
widget
table
```

Allowed `layout` values:

```txt
table
card
```

Defaults:

```txt
ui.view defaults to page
ui.layout defaults to card
ui.placements defaults to ["sidebar"] when ui.menu is true
```

## CRM Page Plugin

```json
{
  "id": "boringboard-crm",
  "name": "CRM",
  "description": "Displays customers, opportunities, and follow-up tasks from BoringBoard cards.",
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

## Time Tracking Widget

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

## Task Activity Tab

```json
{
  "id": "boringboard-task-activity",
  "name": "Task Activity",
  "description": "Adds a task detail tab with recent updates, comments, and assignment changes.",
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

## Board Statistics Widget

```json
{
  "id": "boringboard-board-statistics",
  "name": "Board Statistics",
  "description": "Displays completion rate, overdue count, and assignee workload for a board.",
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
  "permissions": ["board.read", "task.read", "user.read"]
}
```

## Task SLA Table

```json
{
  "id": "boringboard-task-sla-table",
  "name": "Task SLA Table",
  "description": "Shows due-date risk, time-to-complete, and blocked status for tasks across selected boards.",
  "version": "1.0.0",
  "author": "BoringBoard Team",
  "homepage": "https://example.com/boringboard-task-sla-table",
  "entry": "index.js",
  "ui": {
    "menu": true,
    "isAdmin": false,
    "menuLabel": "Task SLA",
    "menuIcon": "table",
    "view": "table",
    "layout": "table",
    "placements": ["sidebar", "dashboard"]
  },
  "permissions": ["board.read", "task.read", "user.read"]
}
```

## User Management Admin Page

```json
{
  "id": "boringboard-user-management",
  "name": "User Management",
  "description": "Provides an admin-only table for user onboarding, notification readiness, and role checks.",
  "version": "1.0.0",
  "author": "BoringBoard Team",
  "homepage": "https://example.com/boringboard-user-management",
  "entry": "index.js",
  "ui": {
    "menu": true,
    "isAdmin": true,
    "menuLabel": "Users",
    "menuIcon": "account-outline",
    "view": "page",
    "layout": "table",
    "placements": ["sidebar"]
  },
  "permissions": ["user.read", "settings.read", "settings.write"]
}
```

## Task Import Modal

```json
{
  "id": "boringboard-task-import",
  "name": "Task Import",
  "description": "Imports tasks from CSV into the current task board.",
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
  "permissions": ["board.read", "task.write", "storage.read", "storage.write"]
}
```
