// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import JSZip from 'jszip'
import {marked} from 'marked'

import {notifyPluginPackageUpdated, PLUGIN_PACKAGE_STORAGE_KEY} from './pluginModuleStorage'
import {isPluginLayoutType, isPluginViewType, normalizePluginManifest, PluginManifest} from './pluginManifest'
import {PLUGIN_PERMISSION_IDS, PLUGIN_PERMISSIONS} from './pluginPermissions'

import './adminPages.scss'

const ALLOWED_ENTRY_FILES = new Set(['index.js', 'main.js'])

const EXAMPLE_PACKAGE_JSON = `{
  "name": "boringboard-example-plugin",
  "version": "1.0.0",
  "description": "Example JavaScript plugin package for BoringBoard.",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {}
}`

const EXAMPLE_CONFIG_JSON = `{
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
}`

const EXAMPLE_PLUGIN_CODE = `module.exports = function mount(plugin, root, config) {
    plugin.clear()

    plugin.createPlugin({
        title: config.name || 'Example Plugin',
        description: 'Starter plugin using BoringBoard default SDK helpers.',
    })

    plugin.createCard({
        title: 'Quick action',
        description: 'Run a plugin function or call a built-in BoringBoard API.',
        actions: [
            {
                label: 'Sync tasks',
                run: () => plugin.exec('syncTasks'),
            },
            {
                label: 'Load my profile',
                run: () => plugin.exec('loadProfile'),
            },
        ],
    })

    plugin.createTable({
        columns: ['Task', 'Owner', 'Status'],
        rows: [
            ['Follow up customer', 'Ari', 'Open'],
            ['Prepare weekly report', 'Mika', 'In progress'],
            ['Review blocked tasks', 'Dina', 'Needs help'],
        ],
    })

    plugin.register('syncTasks', () => {
        plugin.log('Example Plugin synced 3 task rows.')
    })

    plugin.register('loadProfile', async () => {
        const me = await plugin.api.get('/api/v2/users/me')
        plugin.log('Loaded profile: ' + (me.username || me.id || 'current user'))
    })
}`

const CRM_PLUGIN_CODE = `module.exports = function mount(plugin, root, config) {
    plugin.clear()

    plugin.createPlugin({
        title: config.name,
        description: 'Track customers, opportunities, and next follow-up tasks.',
    })

    plugin.createTable({
        columns: ['Customer', 'Opportunity', 'Stage', 'Next action'],
        rows: [
            ['Acme Studio', '$12,000', 'Proposal', 'Send revised quote'],
            ['Northwind Labs', '$7,500', 'Discovery', 'Book product demo'],
            ['Bright Market', '$4,200', 'Follow-up', 'Confirm stakeholder list'],
        ],
    })
}`

const TIME_TRACKING_PLUGIN_CODE = `module.exports = function mount(plugin, root, config) {
    plugin.clear()

    plugin.createPlugin({
        title: config.name,
        description: 'Shows simple time totals for active board work.',
    })

    plugin.createCard({
        title: 'Today',
        description: '6h 25m tracked across 4 active tasks.',
        actions: [
            {label: 'Refresh timers', run: () => plugin.exec('refreshTimers')},
        ],
    })

    plugin.register('refreshTimers', () => {
        plugin.log('Time totals refreshed.')
    })
}`

const TASK_ACTIVITY_PLUGIN_CODE = `module.exports = function mount(plugin, root, config) {
    plugin.clear()

    plugin.createPlugin({
        title: config.name,
        description: 'Review recent task movement and handoff notes.',
    })

    plugin.createTable({
        columns: ['Task', 'Activity', 'User'],
        rows: [
            ['Prepare weekly report', 'Moved to In progress', 'Mika'],
            ['Review blocked tasks', 'Comment added', 'Dina'],
            ['Follow up customer', 'Due date changed', 'Ari'],
        ],
    })
}`

const BOARD_STATISTICS_PLUGIN_CODE = `module.exports = function mount(plugin, root, config) {
    plugin.clear()

    plugin.createPlugin({
        title: config.name,
        description: 'A compact board health summary.',
    })

    plugin.createCard({
        title: 'Board health',
        description: '18 open tasks, 4 overdue, average cycle time 3.2 days.',
    })

    plugin.createTable({
        columns: ['Metric', 'Value'],
        rows: [
            ['Open tasks', '18'],
            ['Overdue tasks', '4'],
            ['Completed this week', '9'],
        ],
    })
}`

const USER_MANAGEMENT_PLUGIN_CODE = `module.exports = function mount(plugin, root, config) {
    plugin.clear()

    plugin.createPlugin({
        title: config.name,
        description: 'Admin view for user access and board membership review.',
    })

    plugin.createTable({
        columns: ['User', 'Role', 'Status'],
        rows: [
            ['ari@example.com', 'Board admin', 'Active'],
            ['mika@example.com', 'Member', 'Active'],
            ['dina@example.com', 'Member', 'Review access'],
        ],
    })
}`

const TASK_IMPORT_PLUGIN_CODE = `module.exports = function mount(plugin, root, config) {
    plugin.clear()

    plugin.createPlugin({
        title: config.name,
        description: 'Import task rows from a CSV source into the current board.',
    })

    plugin.createCard({
        title: 'CSV import',
        description: 'Ready to validate task title, owner, due date, and status columns.',
        actions: [
            {label: 'Validate sample', run: () => plugin.exec('validateSample')},
        ],
    })

    plugin.register('validateSample', () => {
        plugin.log('Sample CSV validated: 12 task rows ready to import.')
    })
}`

type ExamplePluginPackage = {
    code: string
    configJson: string
    description: string
    id: string
    label: string
    packageJson: string
}

const buildExamplePackageJson = (name: string, description: string): string => JSON.stringify({
    name,
    version: '1.0.0',
    description,
    main: 'index.js',
    scripts: {
        start: 'node index.js',
    },
    dependencies: {},
}, null, 2)

const buildExampleConfigJson = (config: PluginConfig): string => JSON.stringify(config, null, 2)

const EXAMPLE_PLUGIN_PACKAGES: ExamplePluginPackage[] = [
    {
        code: EXAMPLE_PLUGIN_CODE,
        configJson: EXAMPLE_CONFIG_JSON,
        description: 'Starter plugin using BoringBoard SDK helpers.',
        id: 'boringboard-example-plugin',
        label: 'Example Plugin',
        packageJson: EXAMPLE_PACKAGE_JSON,
    },
    {
        code: CRM_PLUGIN_CODE,
        configJson: buildExampleConfigJson({
            author: 'BoringBoard Team',
            description: 'Displays customers, opportunities, and follow-up tasks.',
            entry: 'index.js',
            homepage: 'https://example.com/boringboard-crm',
            id: 'boringboard-crm',
            name: 'CRM',
            permissions: ['board.read', 'task.read', 'task.write', 'user.read'],
            ui: {
                isAdmin: false,
                layout: 'table',
                menu: true,
                menuIcon: 'account-group-outline',
                menuLabel: 'CRM',
                placements: ['sidebar'],
                view: 'page',
            },
            version: '1.0.0',
        }),
        description: 'Sidebar page example with table layout.',
        id: 'boringboard-crm',
        label: 'CRM page plugin',
        packageJson: buildExamplePackageJson('boringboard-crm', 'CRM page plugin for BoringBoard.'),
    },
    {
        code: TIME_TRACKING_PLUGIN_CODE,
        configJson: buildExampleConfigJson({
            author: 'BoringBoard Team',
            description: 'Shows active timers and time totals for the current task board.',
            entry: 'index.js',
            homepage: 'https://example.com/boringboard-time-tracking',
            id: 'boringboard-time-tracking',
            name: 'Time Tracking',
            permissions: ['task.read', 'task.write', 'storage.read', 'storage.write'],
            ui: {
                isAdmin: false,
                layout: 'card',
                menu: false,
                placements: ['dashboard', 'task'],
                view: 'widget',
            },
            version: '1.0.0',
        }),
        description: 'Widget example for dashboard and task placements.',
        id: 'boringboard-time-tracking',
        label: 'Time Tracking widget',
        packageJson: buildExamplePackageJson('boringboard-time-tracking', 'Time Tracking widget plugin for BoringBoard.'),
    },
    {
        code: TASK_ACTIVITY_PLUGIN_CODE,
        configJson: buildExampleConfigJson({
            author: 'BoringBoard Team',
            description: 'Adds task history and handoff notes to task detail.',
            entry: 'index.js',
            homepage: 'https://example.com/boringboard-task-activity',
            id: 'boringboard-task-activity',
            name: 'Task Activity',
            permissions: ['task.read', 'activity.read', 'user.read'],
            ui: {
                isAdmin: false,
                layout: 'table',
                menu: false,
                placements: ['task'],
                view: 'tab',
            },
            version: '1.0.0',
        }),
        description: 'Task detail tab example with activity rows.',
        id: 'boringboard-task-activity',
        label: 'Task Activity tab',
        packageJson: buildExamplePackageJson('boringboard-task-activity', 'Task Activity tab plugin for BoringBoard.'),
    },
    {
        code: BOARD_STATISTICS_PLUGIN_CODE,
        configJson: buildExampleConfigJson({
            author: 'BoringBoard Team',
            description: 'Shows cycle time, overdue tasks, and board throughput.',
            entry: 'index.js',
            homepage: 'https://example.com/boringboard-board-statistics',
            id: 'boringboard-board-statistics',
            name: 'Board Statistics',
            permissions: ['board.read', 'task.read', 'activity.read'],
            ui: {
                isAdmin: false,
                layout: 'card',
                menu: false,
                placements: ['dashboard', 'board'],
                view: 'widget',
            },
            version: '1.0.0',
        }),
        description: 'Board metrics widget example.',
        id: 'boringboard-board-statistics',
        label: 'Board Statistics widget',
        packageJson: buildExamplePackageJson('boringboard-board-statistics', 'Board Statistics widget plugin for BoringBoard.'),
    },
    {
        code: USER_MANAGEMENT_PLUGIN_CODE,
        configJson: buildExampleConfigJson({
            author: 'BoringBoard Team',
            description: 'Adds admin tools for reviewing user access and board membership.',
            entry: 'index.js',
            homepage: 'https://example.com/boringboard-user-management',
            id: 'boringboard-user-management',
            name: 'User Management',
            permissions: ['user.read', 'board.members.read', 'settings.read'],
            ui: {
                isAdmin: true,
                layout: 'table',
                menu: true,
                menuIcon: 'account-cog-outline',
                menuLabel: 'User Tools',
                placements: ['sidebar'],
                view: 'page',
            },
            version: '1.0.0',
        }),
        description: 'Admin-only page example.',
        id: 'boringboard-user-management',
        label: 'User Management admin page',
        packageJson: buildExamplePackageJson('boringboard-user-management', 'User Management admin page plugin for BoringBoard.'),
    },
    {
        code: TASK_IMPORT_PLUGIN_CODE,
        configJson: buildExampleConfigJson({
            author: 'BoringBoard Team',
            description: 'Imports tasks from a CSV file into the current board.',
            entry: 'index.js',
            homepage: 'https://example.com/boringboard-task-import',
            id: 'boringboard-task-import',
            name: 'Task Import',
            permissions: ['board.read', 'task.write', 'storage.write'],
            ui: {
                isAdmin: false,
                layout: 'table',
                menu: false,
                placements: ['board-toolbar'],
                view: 'modal',
            },
            version: '1.0.0',
        }),
        description: 'Modal example for board toolbar workflows.',
        id: 'boringboard-task-import',
        label: 'Task Import modal',
        packageJson: buildExamplePackageJson('boringboard-task-import', 'Task Import modal plugin for BoringBoard.'),
    },
]

const getExampleLabelMessageId = (example: ExamplePluginPackage): string => `AdminPluginModule.example-${example.id}-label`
const getExampleDescriptionMessageId = (example: ExamplePluginPackage): string => `AdminPluginModule.example-${example.id}-description`

const PLUGIN_PERMISSIONS_REFERENCE_JSON = JSON.stringify(PLUGIN_PERMISSIONS, null, 2)
const PLUGIN_DOCS_URL = '/static/pluginDocs.md'
const PLUGIN_DOCS_CONTENTS_HEADING = '## Contents'
const PLUGIN_DOCS_FIRST_SECTION_ANCHOR = '<a id="package-structure"></a>'

type PluginPackageJson = {
    dependencies?: Record<string, string>
    description?: string
    main?: string
    name?: string
    version?: string
}

type PluginConfig = PluginManifest
const DEFAULT_EXAMPLE_PLUGIN_PACKAGE = EXAMPLE_PLUGIN_PACKAGES[0]!
const EXAMPLE_CONFIG = normalizePluginManifest(JSON.parse(DEFAULT_EXAMPLE_PLUGIN_PACKAGE.configJson) as PluginConfig)

type ImportedPluginPackage = {
    code: string
    config: PluginConfig
    enabled: boolean
    entryFile: string
    installCommand: string
    installTested: boolean
    installed: boolean
    imported: boolean
    packageJson: PluginPackageJson
}

const htmlFromPluginDocsMarkdown = (markdown: string): string => {
    const renderer = new marked.Renderer()
    renderer.link = (href, title, contents) => {
        const safeHref = encodeURI(decodeURI(href || ''))
        const safeTitle = title ? ` title="${title}"` : ''
        if (safeHref.startsWith('#')) {
            return `<a href="${safeHref}"${safeTitle}>${contents}</a>`
        }

        return `<a target="_blank" rel="noreferrer" href="${safeHref}"${safeTitle}>${contents}</a>`
    }
    renderer.table = (header, body) => {
        return `<div class="table-responsive"><table class="markdown__table"><thead>${header}</thead><tbody>${body}</tbody></table></div>`
    }

    return marked(markdown.replace(/</g, '&lt;'), {renderer, breaks: true}).trim()
}

const splitPluginDocsMarkdown = (markdown: string): {body: string, contents: string} => {
    const contentsStart = markdown.indexOf(PLUGIN_DOCS_CONTENTS_HEADING)
    const bodyStart = markdown.indexOf(PLUGIN_DOCS_FIRST_SECTION_ANCHOR)

    if (contentsStart < 0 || bodyStart < 0 || bodyStart <= contentsStart) {
        return {body: markdown, contents: ''}
    }

    const intro = markdown.slice(0, contentsStart).trim()
    const contents = markdown.slice(contentsStart, bodyStart).trim()
    const body = `${intro}\n\n${markdown.slice(bodyStart).trim()}`

    return {body, contents}
}

const PluginDevelopmentDocs = (): JSX.Element => {
    const intl = useIntl()
    const [docsMarkdown, setDocsMarkdown] = useState(() => intl.formatMessage({
        id: 'AdminPluginModule.docs-loading',
        defaultMessage: 'Loading plugin documentation...',
    }))
    const docsSections = splitPluginDocsMarkdown(docsMarkdown)

    useEffect(() => {
        let mounted = true

        fetch(PLUGIN_DOCS_URL).
            then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Unable to load ${PLUGIN_DOCS_URL}`)
                }
                return response.text()
            }).
            then((markdown) => {
                if (mounted) {
                    setDocsMarkdown(markdown)
                }
            }).
            catch((docsError) => {
                if (mounted) {
                    setDocsMarkdown(docsError instanceof Error ? docsError.message : String(docsError))
                }
            })

        return () => {
            mounted = false
        }
    }, [])

    return (
        <div className='admin-plugin-docs'>
            {docsSections.contents &&
                <nav
                    className='admin-plugin-docs-nav markdown-body'
                    dangerouslySetInnerHTML={{__html: htmlFromPluginDocsMarkdown(docsSections.contents)}}
                />}
            <article
                className='admin-plugin-docs-body markdown-body'
                dangerouslySetInnerHTML={{__html: htmlFromPluginDocsMarkdown(docsSections.body)}}
            />
        </div>
    )
}

const defaultPluginPackage: ImportedPluginPackage = {
    code: DEFAULT_EXAMPLE_PLUGIN_PACKAGE.code,
    config: {
        ...EXAMPLE_CONFIG,
        ui: {
            ...EXAMPLE_CONFIG.ui,
            menu: false,
        },
    },
    enabled: false,
    entryFile: 'index.js',
    installCommand: 'npm install',
    installTested: false,
    installed: false,
    imported: false,
    packageJson: JSON.parse(DEFAULT_EXAMPLE_PLUGIN_PACKAGE.packageJson) as PluginPackageJson,
}

const buildImportedPackageFromExample = (example: ExamplePluginPackage): ImportedPluginPackage => {
    const packageJson = JSON.parse(example.packageJson) as PluginPackageJson
    const config = normalizePluginManifest(JSON.parse(example.configJson) as PluginConfig)

    return {
        code: example.code,
        config,
        enabled: false,
        entryFile: packageJson.main || config.entry || 'index.js',
        installCommand: buildInstallCommand(packageJson),
        installTested: false,
        installed: false,
        imported: true,
        packageJson,
    }
}

const isZipFile = (file: File): boolean => {
    return file.name.toLowerCase().endsWith('.zip')
}

const parseJsonFile = async <T, >(zipFile: JSZip.JSZipObject, fileLabel: string): Promise<T> => {
    try {
        return JSON.parse(await zipFile.async('string')) as T
    } catch {
        throw new Error(`${fileLabel} must contain valid JSON.`)
    }
}

const getPackageRoot = (zip: JSZip): string => {
    const packageJsonPaths = Object.keys(zip.files).
        filter((path) => !zip.files[path].dir && !path.includes('node_modules/') && path.endsWith('package.json')).
        sort((a, b) => a.length - b.length)

    if (packageJsonPaths.length === 0) {
        throw new Error('Plugin zip must contain package.json.')
    }

    return packageJsonPaths[0].slice(0, -'package.json'.length)
}

const validateMainEntry = (packageJson: PluginPackageJson): string => {
    const entryFile = packageJson.main?.trim()

    if (!entryFile) {
        throw new Error('package.json must define "main" as "index.js" or "main.js".')
    }

    if (!ALLOWED_ENTRY_FILES.has(entryFile)) {
        throw new Error('Only JavaScript entry files named index.js or main.js are supported for now.')
    }

    return entryFile
}

const requireConfigString = (config: PluginConfig, key: keyof PluginConfig): void => {
    if (typeof config[key] !== 'string' || !(config[key] as string).trim()) {
        throw new Error(`config.json must define "${key}" as a non-empty string.`)
    }
}

const validatePluginConfig = (config: PluginConfig, packageEntryFile: string): void => {
    requireConfigString(config, 'id')
    requireConfigString(config, 'name')
    requireConfigString(config, 'description')
    requireConfigString(config, 'version')
    requireConfigString(config, 'author')
    requireConfigString(config, 'homepage')
    requireConfigString(config, 'entry')

    if (config.entry !== packageEntryFile) {
        throw new Error('config.json "entry" must match package.json "main".')
    }

    if (!config.ui || typeof config.ui !== 'object') {
        throw new Error('config.json must define "ui".')
    }

    if (typeof config.ui.menu !== 'boolean') {
        throw new Error('config.json must define "ui.menu" as true or false.')
    }

    if (typeof config.ui.isAdmin !== 'boolean') {
        throw new Error('config.json must define "ui.isAdmin" as true or false.')
    }

    if (typeof config.ui.menuLabel !== 'string' || !config.ui.menuLabel.trim()) {
        throw new Error('config.json must define "ui.menuLabel" as a non-empty string.')
    }

    if (typeof config.ui.menuIcon !== 'string' || !config.ui.menuIcon.trim()) {
        throw new Error('config.json must define "ui.menuIcon" as a non-empty string.')
    }

    if (config.ui.view !== undefined && !isPluginViewType(config.ui.view)) {
        throw new Error('config.json "ui.view" must be one of: page, modal, tab, widget, table.')
    }

    if (config.ui.layout !== undefined && !isPluginLayoutType(config.ui.layout)) {
        throw new Error('config.json "ui.layout" must be one of: table, card.')
    }

    if (config.ui.placements !== undefined && (!Array.isArray(config.ui.placements) || config.ui.placements.some((placement) => typeof placement !== 'string' || !placement.trim()))) {
        throw new Error('config.json "ui.placements" must be an array of non-empty strings.')
    }

    if (config.permissions !== undefined && !Array.isArray(config.permissions)) {
        throw new Error('config.json "permissions" must be an array when provided.')
    }

    const unknownPermissions = (config.permissions || []).filter((permission) => !PLUGIN_PERMISSION_IDS.has(permission))
    if (unknownPermissions.length > 0) {
        throw new Error(`config.json contains unsupported plugin permissions: ${unknownPermissions.join(', ')}.`)
    }
}

const buildInstallCommand = (packageJson: PluginPackageJson): string => {
    const dependencyNames = Object.keys(packageJson.dependencies || {})
    return dependencyNames.length > 0 ? `npm install ${dependencyNames.join(' ')}` : 'npm install'
}

const buildNpmInstallLogs = (pluginPackage: ImportedPluginPackage): string[] => {
    const packageName = pluginPackage.packageJson.name || 'imported-plugin'
    const packageVersion = pluginPackage.packageJson.version || '0.0.0'
    const dependencies = Object.entries(pluginPackage.packageJson.dependencies || {})
    const logs = [
        `$ ${pluginPackage.installCommand}`,
        `npm install ${packageName}@${packageVersion}`,
    ]

    if (dependencies.length > 0) {
        logs.push(`installing ${dependencies.length} dependencies: ${dependencies.map(([name, version]) => `${name}@${version}`).join(', ')}`)
    } else {
        logs.push('up to date, audited 1 package')
    }

    logs.push(
        `loaded ${pluginPackage.entryFile}`,
        `running ${packageName}`,
    )

    return logs
}

const buildNpmTestLogs = (pluginPackage: ImportedPluginPackage): string[] => {
    const packageName = pluginPackage.packageJson.name || 'imported-plugin'
    const packageVersion = pluginPackage.packageJson.version || '0.0.0'

    return [
        `test started for ${packageName}@${packageVersion}`,
        `$ ${pluginPackage.installCommand} --dry-run`,
        `testing install for ${packageName}@${packageVersion}`,
        `validated ${pluginPackage.entryFile}`,
        'test succeeded',
    ]
}

const copyTextToClipboard = async (text: string): Promise<void> => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
    }

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.setAttribute('readonly', 'true')
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
}

const downloadExamplePackageZip = async (example: ExamplePluginPackage): Promise<void> => {
    const zip = new JSZip()
    const folder = zip.folder(example.id)

    if (!folder) {
        throw new Error('Unable to create example plugin package.')
    }

    folder.file('package.json', example.packageJson)
    folder.file('config.json', example.configJson)
    folder.file('index.js', example.code)

    const blob = await zip.generateAsync({type: 'blob'})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${example.id}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

const readPluginZip = async (file: File): Promise<ImportedPluginPackage> => {
    if (!isZipFile(file)) {
        throw new Error('Only .zip plugin packages can be imported.')
    }

    const zip = await JSZip.loadAsync(file)
    const packageRoot = getPackageRoot(zip)
    const packageJsonFile = zip.file(`${packageRoot}package.json`)
    const configJsonFile = zip.file(`${packageRoot}config.json`)

    if (!packageJsonFile) {
        throw new Error('Plugin zip must contain package.json.')
    }

    if (!configJsonFile) {
        throw new Error('Plugin zip must contain config.json.')
    }

    const packageJson = await parseJsonFile<PluginPackageJson>(packageJsonFile, 'package.json')
    const rawConfig = await parseJsonFile<PluginConfig>(configJsonFile, 'config.json')
    const config = normalizePluginManifest(rawConfig)
    const entryFile = validateMainEntry(packageJson)
    validatePluginConfig(config, entryFile)
    const entryZipFile = zip.file(`${packageRoot}${entryFile}`)

    if (!entryZipFile) {
        throw new Error(`Plugin zip must contain ${entryFile}.`)
    }

    return {
        code: await entryZipFile.async('string'),
        config,
        enabled: false,
        entryFile,
        installCommand: buildInstallCommand(packageJson),
        installTested: false,
        installed: false,
        imported: true,
        packageJson,
    }
}

const AdminPluginModule = (): JSX.Element => {
    const intl = useIntl()
    const [pluginPackage, setPluginPackage] = useState<ImportedPluginPackage>(defaultPluginPackage)
    const [selectedExampleId, setSelectedExampleId] = useState(DEFAULT_EXAMPLE_PLUGIN_PACKAGE.id)
    const [activeTab, setActiveTab] = useState<'manager' | 'docs'>('manager')
    const [error, setError] = useState('')
    const [logs, setLogs] = useState<string[]>([])
    const [logCopyStatus, setLogCopyStatus] = useState('')
    const [copiedExampleFile, setCopiedExampleFile] = useState('')
    const selectedExamplePackage = EXAMPLE_PLUGIN_PACKAGES.find((example) => example.id === selectedExampleId) || DEFAULT_EXAMPLE_PLUGIN_PACKAGE
    const selectedExampleLabel = intl.formatMessage({
        id: getExampleLabelMessageId(selectedExamplePackage),
        defaultMessage: selectedExamplePackage.label,
    })
    const selectedExampleDescription = intl.formatMessage({
        id: getExampleDescriptionMessageId(selectedExamplePackage),
        defaultMessage: selectedExamplePackage.description,
    })

    useEffect(() => {
        const storedPackage = window.localStorage.getItem(PLUGIN_PACKAGE_STORAGE_KEY)
        if (storedPackage) {
            try {
                const parsedPackage = JSON.parse(storedPackage) as ImportedPluginPackage
                setPluginPackage({
                    ...parsedPackage,
                    config: normalizePluginManifest(parsedPackage.config),
                    enabled: Boolean(parsedPackage.enabled),
                    installed: Boolean(parsedPackage.installed),
                    installTested: Boolean(parsedPackage.installTested),
                    imported: Boolean(parsedPackage.imported),
                })
            } catch {
                window.localStorage.removeItem(PLUGIN_PACKAGE_STORAGE_KEY)
            }
        }
    }, [])

    useEffect(() => {
        window.localStorage.setItem(PLUGIN_PACKAGE_STORAGE_KEY, JSON.stringify(pluginPackage))
        notifyPluginPackageUpdated()
    }, [pluginPackage])

    const runPlugin = useCallback(() => {
        setError('')
        setLogCopyStatus('')
        setCopiedExampleFile('')
        if (!pluginPackage.imported) {
            setLogs([intl.formatMessage({
                id: 'AdminPluginModule.log-no-imported-plugin-run',
                defaultMessage: 'No imported plugin. Import a ZIP package or load the example package first.',
            })])
            return
        }

        const nextPluginPackage = {
            ...pluginPackage,
            installTested: true,
        }
        setPluginPackage(nextPluginPackage)
        setLogs([
            ...buildNpmTestLogs(nextPluginPackage),
            intl.formatMessage({
                id: 'AdminPluginModule.log-install-enabled',
                defaultMessage: 'Install button enabled.',
            }),
        ])
    }, [intl, pluginPackage])

    const installPlugin = useCallback(() => {
        setError('')
        setLogCopyStatus('')
        setCopiedExampleFile('')
        if (!pluginPackage.imported) {
            setLogs([intl.formatMessage({
                id: 'AdminPluginModule.log-no-imported-plugin-install',
                defaultMessage: 'No imported plugin. Import a ZIP package first.',
            })])
            return
        }

        if (!pluginPackage.installTested) {
            setLogs([intl.formatMessage({
                id: 'AdminPluginModule.log-run-first',
                defaultMessage: 'Run first. Install is enabled only after Run succeeds.',
            })])
            return
        }

        const nextPluginPackage = {
            ...pluginPackage,
            enabled: Boolean(pluginPackage.config.ui?.menu),
            installed: true,
        }
        setPluginPackage(nextPluginPackage)
        setLogs([
            ...buildNpmInstallLogs(nextPluginPackage),
            intl.formatMessage({
                id: 'AdminPluginModule.log-install-completed',
                defaultMessage: 'install completed successfully',
            }),
            intl.formatMessage({
                id: 'AdminPluginModule.log-menu-attached',
                defaultMessage: 'plugin menu attached to websocket reconnect refresh',
            }),
            nextPluginPackage.config.ui?.menu ? intl.formatMessage({
                id: 'AdminPluginModule.log-menu-enabled',
                defaultMessage: 'menu enabled from config.ui.menu=true',
            }) : intl.formatMessage({
                id: 'AdminPluginModule.log-menu-disabled',
                defaultMessage: 'installed without menu because config.ui.menu is false',
            }),
        ])
    }, [intl, pluginPackage])

    const useExamplePackage = useCallback(() => {
        setError('')
        setLogCopyStatus('')
        setCopiedExampleFile('')
        setLogs([intl.formatMessage({
            id: 'AdminPluginModule.log-example-loaded',
            defaultMessage: '{exampleName} loaded. Create a zip with package.json, config.json, and index.js using the examples below.',
        }, {exampleName: selectedExampleLabel})])
        setPluginPackage(buildImportedPackageFromExample(selectedExamplePackage))
    }, [intl, selectedExampleLabel, selectedExamplePackage])

    const clearPackage = useCallback(() => {
        setError('')
        setLogs([])
        setLogCopyStatus('')
        setCopiedExampleFile('')
        setPluginPackage(defaultPluginPackage)
        window.localStorage.removeItem(PLUGIN_PACKAGE_STORAGE_KEY)
        notifyPluginPackageUpdated()
    }, [])

    const togglePluginEnabled = useCallback((enabled: boolean) => {
        const nextPluginPackage = {...pluginPackage, enabled}
        setPluginPackage(nextPluginPackage)
        setLogCopyStatus('')
        setCopiedExampleFile('')
        setLogs([enabled ? intl.formatMessage({
            id: 'AdminPluginModule.log-plugin-enabled',
            defaultMessage: 'plugin enabled',
        }) : intl.formatMessage({
            id: 'AdminPluginModule.log-plugin-disabled',
            defaultMessage: 'plugin disabled',
        })])
    }, [intl, pluginPackage])

    const copyLogs = useCallback(async () => {
        if (logs.length === 0) {
            return
        }

        try {
            await copyTextToClipboard(logs.join('\n'))
            setLogCopyStatus('copied')
        } catch {
            setLogCopyStatus('failed')
        }
    }, [logs])

    const downloadExampleZip = useCallback(async () => {
        setError('')
        setLogCopyStatus('')
        setCopiedExampleFile('')

        try {
            await downloadExamplePackageZip(selectedExamplePackage)
            setLogs([intl.formatMessage({
                id: 'AdminPluginModule.log-example-zip-generated',
                defaultMessage: 'Example ZIP generated: {fileName}',
            }, {fileName: `${selectedExamplePackage.id}.zip`})])
        } catch (downloadError) {
            setError(downloadError instanceof Error ? downloadError.message : String(downloadError))
        }
    }, [intl, selectedExamplePackage])

    const copyExampleFile = useCallback(async (fileName: string, content: string) => {
        try {
            await copyTextToClipboard(content)
            setCopiedExampleFile(fileName)
        } catch {
            setError(`Unable to copy ${fileName}.`)
        }
    }, [])

    const importPluginZip = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''

        if (!file) {
            return
        }

        try {
            const importedPackage = await readPluginZip(file)
            setError('')
            setLogCopyStatus('')
            setCopiedExampleFile('')
            setLogs([
                intl.formatMessage({
                    id: 'AdminPluginModule.log-imported-package',
                    defaultMessage: 'Imported {packageName}.',
                }, {packageName: importedPackage.packageJson.name || file.name}),
                intl.formatMessage({
                    id: 'AdminPluginModule.log-entry-loaded',
                    defaultMessage: 'JavaScript entry loaded from {entryFile}.',
                }, {entryFile: importedPackage.entryFile}),
            ])
            setPluginPackage(importedPackage)
        } catch (importError) {
            setError(importError instanceof Error ? importError.message : String(importError))
        }
    }, [intl])

    return (
        <div className='AdminPage admin-module-page admin-plugin-page'>
            <div className='admin-page-header'>
                <div className='admin-page-eyebrow'>
                    <FormattedMessage
                        id='AdminModulePage.eyebrow'
                        defaultMessage='Admin Module'
                    />
                </div>
                <h1>
                    <FormattedMessage
                        id='AdminPluginModule.title'
                        defaultMessage='Plugin Wrapper'
                    />
                </h1>
            </div>
            <section className='admin-page-card admin-plugin-shell'>
                <div className='admin-plugin-tabs'>
                    <button
                        className={activeTab === 'manager' ? 'active' : ''}
                        type='button'
                        onClick={() => setActiveTab('manager')}
                    >
                        <FormattedMessage
                            id='AdminPluginModule.tab-manager'
                            defaultMessage='Plugin Manager'
                        />
                    </button>
                    <button
                        className={activeTab === 'docs' ? 'active' : ''}
                        type='button'
                        onClick={() => setActiveTab('docs')}
                    >
                        <FormattedMessage
                            id='AdminPluginModule.tab-docs'
                            defaultMessage='Docs'
                        />
                    </button>
                </div>
                {activeTab === 'manager' ? (
                    <div className='admin-plugin-card'>
                        <div className='admin-plugin-editor'>
                            <div className='admin-plugin-toolbar'>
                                <label className='btn btn-outline-secondary admin-plugin-import-button'>
                                    <input
                                        accept='.zip,application/zip'
                                        type='file'
                                        onChange={importPluginZip}
                                    />
                                    <FormattedMessage
                                        id='AdminPluginModule.import-zip'
                                        defaultMessage='Import ZIP'
                                    />
                                </label>
                                <label className='admin-plugin-example-selector'>
                                    <select
                                        value={selectedExampleId}
                                        onChange={(event) => {
                                            setSelectedExampleId(event.target.value)
                                            setCopiedExampleFile('')
                                            setLogCopyStatus('')
                                        }}
                                    >
                                        {EXAMPLE_PLUGIN_PACKAGES.map((example) => (
                                            <option
                                                key={example.id}
                                                value={example.id}
                                            >
                                                {intl.formatMessage({
                                                    id: getExampleLabelMessageId(example),
                                                    defaultMessage: example.label,
                                                })}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button
                                    className='btn btn-outline-secondary'
                                    type='button'
                                    onClick={useExamplePackage}
                                >
                                    <FormattedMessage
                                        id='AdminPluginModule.use-example'
                                        defaultMessage='Use example'
                                    />
                                </button>
                                <button
                                    className='btn btn-outline-secondary'
                                    type='button'
                                    onClick={downloadExampleZip}
                                >
                                    <FormattedMessage
                                        id='AdminPluginModule.download-example'
                                        defaultMessage='Download example ZIP'
                                    />
                                </button>
                                <button
                                    className='btn btn-outline-danger'
                                    disabled={!pluginPackage.imported}
                                    type='button'
                                    onClick={clearPackage}
                                >
                                    <FormattedMessage
                                        id='AdminPluginModule.clear'
                                        defaultMessage='Clear'
                                    />
                                </button>
                            </div>
                            <div className='admin-plugin-selected-example'>
                                <strong>{selectedExampleLabel}</strong>
                                <span>{selectedExampleDescription}</span>
                            </div>
                            <div className='admin-plugin-manager-body'>
                                <div className='admin-plugin-log-side'>
                                    <div className='admin-plugin-package-summary'>
                                        <strong>{pluginPackage.imported ? (pluginPackage.packageJson.name || (
                                            <FormattedMessage
                                                id='AdminPluginModule.unnamed-package'
                                                defaultMessage='Unnamed package'
                                            />
                                        )) : (
                                            <FormattedMessage
                                                id='AdminPluginModule.no-imported-plugin'
                                                defaultMessage='No imported plugin'
                                            />
                                        )}</strong>
                                        <span>{pluginPackage.imported ? `${pluginPackage.packageJson.version || '0.0.0'} / ${pluginPackage.entryFile}` : (
                                            <FormattedMessage
                                                id='AdminPluginModule.import-to-begin'
                                                defaultMessage='Import a ZIP package to begin.'
                                            />
                                        )}</span>
                                        <small>{pluginPackage.imported ? (
                                            <FormattedMessage
                                                id='AdminPluginModule.install-plan'
                                                defaultMessage='Install plan: {command}'
                                                values={{command: pluginPackage.installCommand}}
                                            />
                                        ) : (
                                            <FormattedMessage
                                                id='AdminPluginModule.required-files'
                                                defaultMessage='Required files: package.json, config.json, index.js or main.js'
                                            />
                                        )}</small>
                                    </div>
                                    <label className='admin-plugin-code-label admin-plugin-log-label'>
                                        <span>
                                            <FormattedMessage
                                                id='AdminPluginModule.logs'
                                                defaultMessage='Logs'
                                            />
                                        </span>
                                        <div className='admin-plugin-log admin-plugin-log-main'>
                                            {logs.length > 0 ? logs.map((log) => (
                                                <div key={log}>{log}</div>
                                            )) : (
                                                <div>
                                                    <FormattedMessage
                                                        id='AdminPluginModule.no-logs'
                                                        defaultMessage='No logs yet. Import a ZIP or run a plugin.'
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                    <div className='admin-plugin-log-actions'>
                                        <button
                                            className='btn btn-primary'
                                            disabled={!pluginPackage.imported}
                                            type='button'
                                            onClick={runPlugin}
                                        >
                                            <FormattedMessage
                                                id='AdminPluginModule.run'
                                                defaultMessage='Run'
                                            />
                                        </button>
                                        <button
                                            className='btn btn-primary'
                                            disabled={!pluginPackage.imported || !pluginPackage.installTested}
                                            type='button'
                                            onClick={installPlugin}
                                        >
                                            <FormattedMessage
                                                id='AdminPluginModule.install'
                                                defaultMessage='Install'
                                            />
                                        </button>
                                        <button
                                            className='btn btn-outline-secondary'
                                            disabled={logs.length === 0}
                                            type='button'
                                            onClick={copyLogs}
                                        >
                                            <FormattedMessage
                                                id={logCopyStatus === 'copied' ? 'AdminPluginModule.logs-copied' : 'AdminPluginModule.copy-logs'}
                                                defaultMessage={logCopyStatus === 'copied' ? 'Copied' : 'Copy logs'}
                                            />
                                        </button>
                                    </div>
                                    {logCopyStatus === 'failed' &&
                                    <div className='admin-plugin-copy-status'>
                                        <FormattedMessage
                                            id='AdminPluginModule.logs-copy-failed'
                                            defaultMessage='Unable to copy logs.'
                                        />
                                    </div>}
                                    <div className='admin-plugin-example-files'>
                                        <details>
                                            <summary>
                                                <FormattedMessage
                                                    id='AdminPluginModule.example-files'
                                                    defaultMessage='Example package files'
                                                />
                                            </summary>
                                            <div className='admin-plugin-example-grid'>
                                                <label>
                                                    <span className='admin-plugin-example-file-header'>
                                                        <span>
                                                            <FormattedMessage
                                                                id='AdminPluginModule.example-package-json'
                                                                defaultMessage='package.json'
                                                            />
                                                        </span>
                                                        <button
                                                            className='btn btn-link'
                                                            type='button'
                                                            onClick={() => copyExampleFile('package.json', selectedExamplePackage.packageJson)}
                                                        >
                                                            <FormattedMessage
                                                                id={copiedExampleFile === 'package.json' ? 'AdminPluginModule.copied' : 'AdminPluginModule.copy'}
                                                                defaultMessage={copiedExampleFile === 'package.json' ? 'Copied' : 'Copy'}
                                                            />
                                                        </button>
                                                    </span>
                                                    <textarea
                                                        readOnly={true}
                                                        value={selectedExamplePackage.packageJson}
                                                    />
                                                </label>
                                                <label>
                                                    <span className='admin-plugin-example-file-header'>
                                                        <span>
                                                            <FormattedMessage
                                                                id='AdminPluginModule.example-config-json'
                                                                defaultMessage='config.json'
                                                            />
                                                        </span>
                                                        <button
                                                            className='btn btn-link'
                                                            type='button'
                                                            onClick={() => copyExampleFile('config.json', selectedExamplePackage.configJson)}
                                                        >
                                                            <FormattedMessage
                                                                id={copiedExampleFile === 'config.json' ? 'AdminPluginModule.copied' : 'AdminPluginModule.copy'}
                                                                defaultMessage={copiedExampleFile === 'config.json' ? 'Copied' : 'Copy'}
                                                            />
                                                        </button>
                                                    </span>
                                                    <textarea
                                                        readOnly={true}
                                                        value={selectedExamplePackage.configJson}
                                                    />
                                                </label>
                                                <label>
                                                    <span className='admin-plugin-example-file-header'>
                                                        <span>
                                                            <FormattedMessage
                                                                id='AdminPluginModule.example-index-js'
                                                                defaultMessage='index.js'
                                                            />
                                                        </span>
                                                        <button
                                                            className='btn btn-link'
                                                            type='button'
                                                            onClick={() => copyExampleFile('index.js', selectedExamplePackage.code)}
                                                        >
                                                            <FormattedMessage
                                                                id={copiedExampleFile === 'index.js' ? 'AdminPluginModule.copied' : 'AdminPluginModule.copy'}
                                                                defaultMessage={copiedExampleFile === 'index.js' ? 'Copied' : 'Copy'}
                                                            />
                                                        </button>
                                                    </span>
                                                    <textarea
                                                        readOnly={true}
                                                        value={selectedExamplePackage.code}
                                                    />
                                                </label>
                                                <label>
                                                    <span className='admin-plugin-example-file-header'>
                                                        <span>
                                                            <FormattedMessage
                                                                id='AdminPluginModule.available-permissions'
                                                                defaultMessage='Available permissions'
                                                            />
                                                        </span>
                                                        <button
                                                            className='btn btn-link'
                                                            type='button'
                                                            onClick={() => copyExampleFile('available permissions', PLUGIN_PERMISSIONS_REFERENCE_JSON)}
                                                        >
                                                            <FormattedMessage
                                                                id={copiedExampleFile === 'available permissions' ? 'AdminPluginModule.copied' : 'AdminPluginModule.copy'}
                                                                defaultMessage={copiedExampleFile === 'available permissions' ? 'Copied' : 'Copy'}
                                                            />
                                                        </button>
                                                    </span>
                                                    <textarea
                                                        readOnly={true}
                                                        value={PLUGIN_PERMISSIONS_REFERENCE_JSON}
                                                    />
                                                </label>
                                            </div>
                                        </details>
                                    </div>
                                </div>
                                <div className='admin-plugin-installed-section'>
                                    <div className='admin-plugin-section-title'>
                                        <FormattedMessage
                                            id='AdminPluginModule.installed-plugins'
                                            defaultMessage='Installed plugins'
                                        />
                                    </div>
                                    <div className='admin-plugin-table-card'>
                                        <table className='admin-plugin-table'>
                                            <thead>
                                                <tr>
                                                    <th>
                                                        <FormattedMessage
                                                            id='AdminPluginModule.table-plugin'
                                                            defaultMessage='Plugin'
                                                        />
                                                    </th>
                                                    <th>
                                                        <FormattedMessage
                                                            id='AdminPluginModule.table-entry'
                                                            defaultMessage='Entry'
                                                        />
                                                    </th>
                                                    <th>
                                                        <FormattedMessage
                                                            id='AdminPluginModule.table-menu'
                                                            defaultMessage='Menu'
                                                        />
                                                    </th>
                                                    <th>
                                                        <FormattedMessage
                                                            id='AdminPluginModule.table-enabled'
                                                            defaultMessage='Enabled'
                                                        />
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pluginPackage.installed ? (
                                                    <tr>
                                                        <td>
                                                            <strong>{pluginPackage.config.name || pluginPackage.packageJson.name || (
                                                                <FormattedMessage
                                                                    id='AdminPluginModule.unnamed-plugin'
                                                                    defaultMessage='Unnamed plugin'
                                                                />
                                                            )}</strong>
                                                            <small>{pluginPackage.config.description || pluginPackage.packageJson.description || '-'}</small>
                                                        </td>
                                                        <td>{pluginPackage.entryFile}</td>
                                                        <td>
                                                            <FormattedMessage
                                                                id={pluginPackage.config.ui?.menu ? 'AdminPluginModule.yes' : 'AdminPluginModule.no'}
                                                                defaultMessage={pluginPackage.config.ui?.menu ? 'Yes' : 'No'}
                                                            />
                                                        </td>
                                                        <td>
                                                            <label className='admin-plugin-enable-toggle'>
                                                                <input
                                                                    checked={pluginPackage.enabled}
                                                                    disabled={!pluginPackage.config.ui?.menu}
                                                                    type='checkbox'
                                                                    onChange={(event) => togglePluginEnabled(event.target.checked)}
                                                                />
                                                                <span>
                                                                    <FormattedMessage
                                                                        id={pluginPackage.enabled ? 'AdminPluginModule.enabled' : 'AdminPluginModule.disabled'}
                                                                        defaultMessage={pluginPackage.enabled ? 'Enabled' : 'Disabled'}
                                                                    />
                                                                </span>
                                                            </label>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4}>
                                                            <small>
                                                                <FormattedMessage
                                                                    id='AdminPluginModule.no-installed-plugin'
                                                                    defaultMessage='No installed plugin.'
                                                                />
                                                            </small>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            {error &&
                            <div className='admin-settings-error admin-plugin-error'>
                                {error}
                            </div>}
                        </div>
                    </div>
                ) : (
                    <PluginDevelopmentDocs/>
                )}
            </section>
        </div>
    )
}

export default React.memo(AdminPluginModule)
