# BoringBoard

**A place for all those "I'll do it later" tasks.**

BoringBoard is a self-hosted project and task board. It started as a small fork of [Focalboard](https://github.com/mattermost/focalboard) (big love to the original team ❤️) and grew into a personal playground for project management: it follows my own workflow, my habits, and occasionally my questionable decisions.

The goal isn't to reinvent project management. The goal is to make it a little less painful, a little more practical, and maybe even a little less boring. That's why it's called **BoringBoard**.

<a href="https://www.producthunt.com/products/boringboard-another-fork-of-focalboard?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-boringboard-another-fork-of-focalboard" target="_blank" rel="noopener noreferrer"><img alt="BoringBoard on Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1161605&amp;theme=light&amp;t=1780545806963"></a>

![The Demo Project board in the default Nova theme](README.assets/screenshots/board.png)

**Try it online:** <https://project.creativework.asia> &nbsp;·&nbsp; log in with **`demo` / `demo123456`**

## Contents

- [Quick start](#quick-start)
- [Features](#features)
  - [Boards, views and tasks](#boards-views-and-tasks)
  - [Dashboard](#dashboard)
  - [Appearance: themes, colors and layouts](#appearance-themes-colors-and-layouts)
  - [Task board info and sharing](#task-board-info-and-sharing)
  - [AI board creation](#ai-board-creation)
  - [Administration](#administration)
- [Configuration](#configuration)
- [Deploy on a server](#deploy-on-a-server)
- [Development](#development)
- [Credits and license](#credits-and-license)

## Quick start

```bash
git clone https://github.com/mytsdrm/boringboard.git
cd boringboard
./run.sh
```

Open the URL the script prints (normally <http://localhost:8000>) and sign in with one of the accounts that are created on first start:

| Account | Username | Password | What it is for |
| --- | --- | --- | --- |
| Demo | `demo` | `demo123456` | A regular user with a ready-made **Demo Project** board |
| Admin | `admin` | `admin123` | The `SuperAdmin` account with the Users, System Settings and module menus |

Change the admin password right away, or set your own credentials in `.env` before the first start (see [Configuration](#configuration)).

`run.sh` installs missing system packages on Linux, starts the Go server, builds and watches the web app, and reloads the browser when frontend files change. Ports are picked automatically: it tries `EXTERNAL_PORT` (default `8000`) for the web UI and `APP_PORT` (default `8001`) for the API. A leftover BoringBoard process on those ports is stopped; if another program owns a port, the script moves to the next free one and prints the URL to open.

## Features

### Boards, views and tasks

Everything you expect from a Focalboard-style board, with a cleaner look:

- **Board, Table, Gallery and Calendar views** of the same tasks, plus saved filtered views (the demo has an "Urgent and high" view).
- **Rich task cards** with every property type (select, multi-select, person, multi-person, date ranges, numbers, checkbox, URL, email, phone, text), checklists, rich text, dividers, attachments and comments.
- **Card templates** and **board templates** (Meeting Agenda, Sales Pipeline CRM, Sprint Planner, Roadmap and more).
- **Personal and joined boards** grouped in the sidebar, with counters.

The **demo account** gets a sample *Demo Project* board on first start that shows all of this off. It is created once and then left alone (it is only replaced when a new version of the sample data ships).

| Card detail | Calendar view |
| --- | --- |
| ![Task card with properties](README.assets/screenshots/card.png) | ![Calendar view](README.assets/screenshots/calendar.png) |
| **Gallery view** | **Table view (Windows layout)** |
| ![Gallery view](README.assets/screenshots/gallery.png) | ![Table view in the Windows layout](README.assets/screenshots/layout-windows.png) |

### Dashboard

A personal summary page: how many boards you own and have joined, total tasks, how many people you've invited, recently updated boards (with who changed them last) and a recent activity feed.

![Dashboard](README.assets/screenshots/dashboard.png)

### Appearance: themes, colors and layouts

Click the **palette icon** next to the logo (or **Settings → Appearance**) to open the Appearance drawer. It slides in from the right without dimming the page, so every change shows up live. Your choice is saved to your profile and follows you to other devices.

![Appearance drawer](README.assets/screenshots/appearance.png)

- **Themes:** Nova (default: white workspace, deep ink sidebar, violet accent), Modern, Sand, Classic (the old blue look), Dark, Midnight, and System (Nova or Midnight, following your OS).
- **Custom colors:** pick an accent from the presets or any hex color, and optionally a base (background) color. Text and sidebar colors are derived from it and contrast is adjusted automatically.
- **Layouts** that dress the app like a desktop OS: BoringBoard, macOS (menu bar and floating dock), Windows (title bar and taskbar), Ubuntu (top bar and dock), ChromeOS (shelf and rounded cards), Compact (denser spacing) and Mirrored (sidebar on the right). Layouts apply on screens 768 px and wider.
- **Sidebar position:** left, bottom or right. macOS, Windows and Ubuntu put it at the bottom like a taskbar or dock, and the board tree opens from a **Task Boards** button.

| Midnight theme | Custom base and accent (Paper + Teal) |
| --- | --- |
| ![Midnight theme](README.assets/screenshots/theme-midnight.png) | ![Custom colors](README.assets/screenshots/custom-colors.png) |
| **macOS layout** | **Ubuntu layout** |
| ![macOS layout](README.assets/screenshots/layout-macos.png) | ![Ubuntu layout](README.assets/screenshots/layout-ubuntu.png) |

### Task board info and sharing

- **Task Board Info:** board owners can store the repository URL, dev and prod branches, and environment URLs on a board. They show in a read-only panel in the board header (see the screenshots above).
- **Share dialog** with invite history: who was invited and when, newest first.
- **Permissions:** admins decide whether invited users may re-share a board or edit its properties. Invited users can't rename the board or change its description.

### AI board creation

Describe a project in a sentence and BoringBoard drafts a task board for you. You see a preview first and only create the real board when you're happy with it.

- Providers: **OpenAI, Gemini, Ollama, Cline and AnythingLLM**.
- Pick the provider and model in System Settings (Ollama models are loaded from the configured endpoint).
- Turn AI on for everyone or for selected users only, with a searchable picker built for long user lists.

### Administration

Log in as the `SuperAdmin` to get these menus in the sidebar.

- **Users:** search, filter by group, paginate, and add, edit or delete users (including a contact number).
- **System Settings**
  - *General:* app name, logo (also used as favicon), time zone, AI settings and task board permissions. Branding changes reach every open browser in real time, and custom branding loads first so the default logo never flashes.
  - *Modules:* switch the optional **Reminder**, **Announcement** and **Plugin** menus on or off.
  - *Notification:* choose which events notify people (task board activity, task activity) and through which channels (web, email, WhatsApp, Telegram).
- **Activity Logs:** board activity from every registered user, with search, user filter, date range, pagination, and print or export.
- **Templates:** browse and manage the board templates.
- **Reminder** (module): scheduled reminders with an audience, a channel, and a repeat rule.
- **Announcement** (module): messages shown to logged-in users, with priority, audience and schedule.
- **Plugin** (module): import a plugin ZIP, run it, and add its page or widget to the sidebar. See [`examples/plugins`](examples/plugins) for the manifest format and a starter plugin.
- **Profile menu** (every user): invite users, edit your profile, change your password, log out.

| Users | System Settings |
| --- | --- |
| ![Users](README.assets/screenshots/admin-users.png) | ![System Settings](README.assets/screenshots/admin-system-settings.png) |
| **Modules** | **Activity Logs** |
| ![Modules](README.assets/screenshots/admin-modules.png) | ![Activity Logs](README.assets/screenshots/admin-activity-logs.png) |
| **Reminders** | **Announcements** |
| ![Reminders](README.assets/screenshots/admin-reminders.png) | ![Announcements](README.assets/screenshots/admin-announcements.png) |
| **Templates** | **Plugin** |
| ![Templates](README.assets/screenshots/admin-templates.png) | ![Plugin](README.assets/screenshots/admin-plugin.png) |

## Configuration

Settings are read from an `.env` file in the project folder. Create it if it doesn't exist; every line is optional.

```bash
EXCLUDE_ENTERPRISE="1"
EXTERNAL_PORT="8000"          # first port to try for the web UI
APP_PORT="8001"               # first port to try for the API (run.sh only)

# Admin account (the password is only used when the account is first created)
BORINGBOARD_DEFAULTADMINUSERNAME="admin"
BORINGBOARD_DEFAULTADMINPASSWORD="admin123"

# Demo account with the sample board
BORINGBOARD_DEMOUSERENABLED="true"
BORINGBOARD_DEMOUSERUSERNAME="demo"
BORINGBOARD_DEMOUSERPASSWORD="demo123456"

# AI provider endpoints
BORINGBOARD_AI_OPENAI_ENDPOINT="https://api.openai.com/v1"
BORINGBOARD_AI_GEMINI_ENDPOINT="https://generativelanguage.googleapis.com/v1beta"
BORINGBOARD_AI_OLLAMA_ENDPOINT="http://localhost:11434"
BORINGBOARD_AI_CLINE_ENDPOINT="https://api.cline.bot/api/v1"
BORINGBOARD_AI_ANYTHINGLLM_ENDPOINT="http://localhost:3001/api/v1"
BORINGBOARD_AI_TIMEOUT="180"
```

Set `BORINGBOARD_DEMOUSERENABLED="false"` to skip the demo account on a production server.

## Deploy on a server

```bash
./deploy               # standalone server (own Docker network, no CapRover)
./deploy caprover      # server with CapRover (joins captain-overlay-network)
./deploy --check       # only run the checks, change nothing
./deploy --no-build    # restart with the image that is already built
```

`./deploy` builds and starts BoringBoard with Postgres in Docker. It picks a free host port (starting at `EXTERNAL_PORT`, default `8000`), saves it in `.env`, and moves to the next free port if another program takes it later. Without a mode it keeps the mode of the install that is already running. It waits until BoringBoard answers and shows the logs if it doesn't.

## Development

| Path | What's there |
| --- | --- |
| `server/` | Go API server (Focalboard based), including the demo seed in `server/app/demo.go` |
| `webapp/` | React + TypeScript web app |
| `examples/plugins/` | Plugin manifest docs and an example plugin |
| `docker/` | Dockerfiles and compose files used by `./deploy` |
| `promo/` | Scripts that record the promo video from the demo board |

Useful commands:

```bash
./run.sh                         # dev server with auto-reload
make server                      # build the server into bin/
cd webapp && npm run pack        # production build of the web app
make server-test                 # Go tests
cd webapp && npm run check       # ESLint and stylelint
cd webapp && npm run test        # Jest unit tests
```

**Branches:** there are only two. All work goes to `dev`, and `dev` is merged into `main` for releases. Please don't open other branches.

## Credits and license

BoringBoard is built on [Focalboard](https://github.com/mattermost/focalboard) by Mattermost and keeps its license. See [LICENSE.txt](LICENSE.txt) and [NOTICE.txt](NOTICE.txt).

<details>
<summary><strong>Original Focalboard README</strong></summary>

The content below is kept from the original Focalboard project for upstream reference.

![CI Status](https://github.com/mattermost/focalboard/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/mattermost/focalboard/actions/workflows/codeql-analysis.yml/badge.svg)
![Dev Release](https://github.com/mattermost/focalboard/actions/workflows/dev-release.yml/badge.svg)
![Prod Release](https://github.com/mattermost/focalboard/actions/workflows/prod-release.yml/badge.svg)

![BoringBoard](README.assets/hero.jpg)

BoringBoard is an open source, multilingual, self-hosted project management tool that's an alternative to Trello, Notion, and Asana.

It helps define, organize, track and manage work across individuals and teams. Focalboard comes in two editions:

- **[Personal Desktop](https://www.focalboard.com/docs/personal-edition/desktop/)**: A standalone, single-user [macOS](https://apps.apple.com/app/apple-store/id1556908618?pt=2114704&ct=website&mt=8), [Windows](https://www.microsoft.com/store/apps/9NLN2T0SX9VF?cid=website), or [Linux](https://www.focalboard.com/download/personal-edition/desktop/#linux-desktop) desktop app for your own todos and personal projects.

- **[Personal Server](https://www.focalboard.com/download/personal-edition/ubuntu/)**: A standalone, multi-user server for development and personal use.

## Try Focalboard

### Personal Desktop (Windows, Mac or Linux Desktop)

- **Windows**: Download from the [Windows App Store](https://www.microsoft.com/store/productId/9NLN2T0SX9VF) or download `focalboard-win.zip` from the [latest release](https://github.com/mattermost/focalboard/releases), unpack, and run `Focalboard.exe`.
- **Mac**: Download from the [Mac App Store](https://apps.apple.com/us/app/focalboard-insiders/id1556908618?mt=12).
- **Linux Desktop**: Download `focalboard-linux.tar.gz` from the [latest release](https://github.com/mattermost/focalboard/releases), unpack, and open `focalboard-app`.

### Personal Server

**Ubuntu**: You can download and run the compiled Focalboard **Personal Server** on Ubuntu by following [our latest install guide](https://www.focalboard.com/download/personal-edition/ubuntu/).

### API Docs

Boards API docs can be found over at <https://htmlpreview.github.io/?https://github.com/mattermost/focalboard/blob/main/server/swagger/docs/html/index.html>

### Getting started

Our [developer guide](https://developers.mattermost.com/contribute/focalboard/personal-server-setup-guide) has detailed instructions on how to set up your development environment for the **Personal Server**. You can also join the [~Focalboard community channel](https://community.mattermost.com/core/channels/focalboard) to connect with other developers.

Create an `.env` file in the focalboard directory that contains:

```
EXCLUDE_ENTERPRISE="1"
```

To build the server:

```
make prebuild
make
```

To run the server:

```
 ./bin/focalboard-server
```

Then navigate your browser to [`http://localhost:8000`](http://localhost:8000) to access your Focalboard server. The port is configured in `config.json`.

Once the server is running, you can rebuild just the web app via `make webapp` in a separate terminal window. Reload your browser to see the changes.

### Building and running production builds

- **Linux server package**:
  - Run `make prebuild`
  - Run `make server-linux-package`
  - Uncompress `dist/focalboard-server-linux-amd64.tar.gz` to a directory of your choice.
- **Docker**:
  - To run it locally from offical image:
    - `docker run -it -p 80:8000 mattermost/focalboard`
  - To build it for your current architecture:
    - `docker build -f docker/Dockerfile .`
  - To build it for a custom architecture (experimental):
    - `docker build -f docker/Dockerfile --platform linux/arm64 .`

### Unit testing

Before checking in commits, run `make ci`, which includes:

- **Server unit tests**: `make server-test`
- **Web app ESLint**: `cd webapp; npm run check`
- **Web app unit tests**: `cd webapp; npm run test`
- **Web app UI tests**: `cd webapp; npm run cypress:ci`

### Staying informed

- **Changes**: See the [CHANGELOG](CHANGELOG.md) for the latest updates
- **Bug Reports**: [File a bug report](https://github.com/mattermost/focalboard/issues/new?assignees=&labels=bug&template=bug_report.md&title=)
- **Chat**: Join the [~Focalboard community channel](https://community.mattermost.com/core/channels/focalboard)

</details>
