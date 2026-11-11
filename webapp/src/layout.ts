// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {UserSettings} from './userSettings'

// App shell layouts. Each one is mostly CSS keyed off
// html[data-bb-layout="..."], plus an optional desktop-style bar
// (see components/appearance/layoutChrome.tsx).
export type LayoutOption = {
    id: string
    displayName: string
    description: string
}

export const defaultLayoutName = 'default'

export const layoutOptions: LayoutOption[] = [
    {id: 'default', displayName: 'BoringBoard', description: 'Sidebar on the left, the standard look.'},
    {id: 'macos', displayName: 'macOS', description: 'Menu bar on top, floating dock at the bottom.'},
    {id: 'windows', displayName: 'Windows', description: 'Taskbar at the bottom, title bar with window controls.'},
    {id: 'ubuntu', displayName: 'Ubuntu', description: 'Dark top bar with clock, dock at the bottom.'},
    {id: 'chromeos', displayName: 'ChromeOS', description: 'Shelf at the bottom, rounded cards.'},
    {id: 'compact', displayName: 'Compact', description: 'Narrower sidebar and denser spacing.'},
    {id: 'mirrored', displayName: 'Mirrored', description: 'Sidebar on the right.'},
]

export const layoutChangeEvent = 'bb-layout-change'

export type SidebarPosition = 'left' | 'right' | 'bottom'

export const sidebarPositions: SidebarPosition[] = ['left', 'bottom', 'right']

// Desktop-style layouts put the sidebar where that OS puts its taskbar/dock.
export function defaultSidebarPosition(layout: string): SidebarPosition {
    if (layout === 'windows' || layout === 'macos' || layout === 'ubuntu') {
        return 'bottom'
    }
    if (layout === 'mirrored') {
        return 'right'
    }
    return 'left'
}

let activeLayoutName = defaultLayoutName
let activeSidebarPosition: SidebarPosition = 'left'

export function isSidebarPosition(value: string | null | undefined): value is SidebarPosition {
    return sidebarPositions.includes(value as SidebarPosition)
}

function announce(): void {
    window.dispatchEvent(new CustomEvent(layoutChangeEvent, {detail: activeLayoutName}))
}

export function setSidebarPosition(position: string): SidebarPosition {
    activeSidebarPosition = isSidebarPosition(position) ? position : defaultSidebarPosition(activeLayoutName)
    UserSettings.sidebarPosition = activeSidebarPosition
    document.documentElement.setAttribute('data-bb-sidebar', activeSidebarPosition)
    announce()
    return activeSidebarPosition
}

export function getActiveSidebarPosition(): SidebarPosition {
    return activeSidebarPosition
}

export function isLayoutName(name: string | null | undefined): name is string {
    return Boolean(name) && layoutOptions.some((l) => l.id === name)
}

// Picking a layout also moves the sidebar to that layout's usual place,
// unless a position is given (when restoring a saved choice).
export function setLayout(name: string, position?: string): string {
    const layout = isLayoutName(name) ? name : defaultLayoutName
    activeLayoutName = layout
    UserSettings.layoutName = layout
    document.documentElement.setAttribute('data-bb-layout', layout)
    setSidebarPosition(isSidebarPosition(position) ? position : defaultSidebarPosition(layout))
    return layout
}

export function getActiveLayoutName(): string {
    return activeLayoutName
}

export function loadLayout(): string {
    return setLayout(UserSettings.layoutName || defaultLayoutName, UserSettings.sidebarPosition || undefined)
}
