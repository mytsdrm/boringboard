// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defaultLayoutName, getActiveLayoutName, getActiveSidebarPosition, layoutChangeEvent, loadLayout, setLayout, setSidebarPosition} from './layout'
import {UserSettings} from './userSettings'

describe('layout', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    test('defaults to the standard layout', () => {
        expect(loadLayout()).toBe(defaultLayoutName)
        expect(document.documentElement.getAttribute('data-bb-layout')).toBe(defaultLayoutName)
    })

    test('applies, saves and announces a layout', () => {
        const handler = jest.fn()
        window.addEventListener(layoutChangeEvent, handler)
        setLayout('macos')
        window.removeEventListener(layoutChangeEvent, handler)

        expect(getActiveLayoutName()).toBe('macos')
        expect(UserSettings.layoutName).toBe('macos')
        expect(document.documentElement.getAttribute('data-bb-layout')).toBe('macos')
        expect(handler).toBeCalled()
    })

    test('unknown layouts fall back to the default', () => {
        UserSettings.layoutName = 'amiga'
        expect(loadLayout()).toBe(defaultLayoutName)
    })

    test('desktop layouts move the sidebar to the bottom, and it can be moved', () => {
        setLayout('windows')
        expect(getActiveSidebarPosition()).toBe('bottom')
        expect(document.documentElement.getAttribute('data-bb-sidebar')).toBe('bottom')

        setLayout('mirrored')
        expect(getActiveSidebarPosition()).toBe('right')

        setLayout('default')
        expect(getActiveSidebarPosition()).toBe('left')

        setSidebarPosition('right')
        expect(getActiveSidebarPosition()).toBe('right')
        expect(UserSettings.sidebarPosition).toBe('right')
    })

    test('a saved sidebar position wins over the layout default', () => {
        UserSettings.layoutName = 'macos'
        UserSettings.sidebarPosition = 'left'
        loadLayout()
        expect(getActiveLayoutName()).toBe('macos')
        expect(getActiveSidebarPosition()).toBe('left')
    })
})
