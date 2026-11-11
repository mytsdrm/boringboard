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
    {id: 'macos', displayName: 'macOS', description: 'Menu bar on top, floating translucent sidebar.'},
    {id: 'windows', displayName: 'Windows', description: 'Title bar with window controls, Mica-style panels.'},
    {id: 'ubuntu', displayName: 'Ubuntu', description: 'Dark top bar with clock, GNOME-style headers.'},
    {id: 'chromeos', displayName: 'ChromeOS', description: 'Shelf at the bottom, rounded cards.'},
    {id: 'compact', displayName: 'Compact', description: 'Narrower sidebar and denser spacing.'},
    {id: 'mirrored', displayName: 'Mirrored', description: 'Sidebar on the right.'},
]

export const layoutChangeEvent = 'bb-layout-change'

let activeLayoutName = defaultLayoutName

export function isLayoutName(name: string | null | undefined): name is string {
    return Boolean(name) && layoutOptions.some((l) => l.id === name)
}

export function setLayout(name: string): string {
    const layout = isLayoutName(name) ? name : defaultLayoutName
    activeLayoutName = layout
    UserSettings.layoutName = layout
    document.documentElement.setAttribute('data-bb-layout', layout)
    window.dispatchEvent(new CustomEvent(layoutChangeEvent, {detail: layout}))
    return layout
}

export function getActiveLayoutName(): string {
    return activeLayoutName
}

export function loadLayout(): string {
    return setLayout(UserSettings.layoutName || defaultLayoutName)
}
