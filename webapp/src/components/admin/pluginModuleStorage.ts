// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {normalizePluginManifest, PluginLayoutType, PluginViewType} from './pluginManifest'

export const PLUGIN_PACKAGE_STORAGE_KEY = 'boringboardImportedPluginPackage'
export const PLUGIN_PACKAGE_UPDATED_EVENT = 'boringboard-plugin-package-updated'

type StoredPluginPackage = {
    code?: string
    config?: Parameters<typeof normalizePluginManifest>[0]
    enabled?: boolean
    entryFile?: string
    installed?: boolean
    packageJson?: {
        name?: string
    }
}

export type PluginMenuSettings = {
    adminOnly: boolean
    icon: string
    id: string
    layout: PluginLayoutType
    label: string
    placements: string[]
    path: string
    view: PluginViewType
}

export type PluginRuntimePackage = {
    code: string
    config: NonNullable<ReturnType<typeof normalizePluginManifest>>
    entryFile: string
    menuSettings: PluginMenuSettings
}

export const getPluginRuntimePath = (pluginId: string): string => {
    return `/plugins/${encodeURIComponent(pluginId)}`
}

const getStoredPluginPackage = (): StoredPluginPackage|null => {
    try {
        const storedPackage = window.localStorage.getItem(PLUGIN_PACKAGE_STORAGE_KEY)
        if (!storedPackage) {
            return null
        }

        return JSON.parse(storedPackage) as StoredPluginPackage
    } catch {
        return null
    }
}

const buildPluginMenuSettings = (pluginPackage: StoredPluginPackage, config: NonNullable<ReturnType<typeof normalizePluginManifest>>): PluginMenuSettings => {
    const id = config.id || pluginPackage.packageJson?.name || 'imported-plugin'
    const ui = config.ui || {}

    return {
        adminOnly: ui.isAdmin ?? true,
        icon: ui.menuIcon || 'apps',
        id,
        layout: ui.layout || 'card',
        label: ui.menuLabel || config.name || pluginPackage.packageJson?.name || 'Imported Plugin',
        placements: ui.placements || [],
        path: getPluginRuntimePath(id),
        view: ui.view || 'page',
    }
}

export const getStoredPluginRuntimePackage = (): PluginRuntimePackage|null => {
    const pluginPackage = getStoredPluginPackage()
    const config = pluginPackage?.config ? normalizePluginManifest(pluginPackage.config) : null
    if (!pluginPackage?.installed || !pluginPackage.enabled || !config || !pluginPackage.code) {
        return null
    }

    return {
        code: pluginPackage.code,
        config,
        entryFile: pluginPackage.entryFile || config.entry || 'index.js',
        menuSettings: buildPluginMenuSettings(pluginPackage, config),
    }
}

export const getStoredPluginMenuSettings = (): PluginMenuSettings|null => {
    const runtimePackage = getStoredPluginRuntimePackage()
    if (!runtimePackage?.config.ui?.menu) {
        return null
    }

    return runtimePackage.menuSettings
}

export const notifyPluginPackageUpdated = (): void => {
    window.dispatchEvent(new CustomEvent(PLUGIN_PACKAGE_UPDATED_EVENT))
}
