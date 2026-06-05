// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type PluginViewType = 'page' | 'modal' | 'tab' | 'widget' | 'table'
export type PluginLayoutType = 'table' | 'card'

export const DEFAULT_PLUGIN_VIEW: PluginViewType = 'page'
export const DEFAULT_PLUGIN_LAYOUT: PluginLayoutType = 'card'
export const DEFAULT_MENU_PLACEMENTS = ['sidebar']

export const PLUGIN_VIEW_TYPES: PluginViewType[] = ['page', 'modal', 'tab', 'widget', 'table']
export const PLUGIN_LAYOUT_TYPES: PluginLayoutType[] = ['table', 'card']

export type PluginUiManifest = {
    isAdmin?: boolean
    layout?: PluginLayoutType
    menu?: boolean
    menuIcon?: string
    menuLabel?: string
    placements?: string[]
    view?: PluginViewType
}

export type PluginManifest = {
    author?: string
    description?: string
    entry?: string
    homepage?: string
    id?: string
    isMenu?: boolean
    license?: string
    name?: string
    permissions?: string[]
    ui?: PluginUiManifest
    version?: string
}

export const normalizePluginManifest = (manifest: PluginManifest): PluginManifest => {
    const ui = manifest.ui || {}
    const menu = ui.menu ?? manifest.isMenu ?? false
    let placements = ui.placements
    if (placements === undefined) {
        placements = menu ? [...DEFAULT_MENU_PLACEMENTS] : []
    }

    return {
        ...manifest,
        ui: {
            ...ui,
            isAdmin: ui.isAdmin ?? true,
            layout: ui.layout === undefined ? DEFAULT_PLUGIN_LAYOUT : ui.layout,
            menu,
            menuIcon: ui.menuIcon || 'apps',
            menuLabel: ui.menuLabel || manifest.name || manifest.id || 'Imported Plugin',
            placements,
            view: ui.view === undefined ? DEFAULT_PLUGIN_VIEW : ui.view,
        },
    }
}

export const isPluginViewType = (value: unknown): value is PluginViewType => {
    return typeof value === 'string' && PLUGIN_VIEW_TYPES.includes(value as PluginViewType)
}

export const isPluginLayoutType = (value: unknown): value is PluginLayoutType => {
    return typeof value === 'string' && PLUGIN_LAYOUT_TYPES.includes(value as PluginLayoutType)
}
