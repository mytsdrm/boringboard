// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defaultLayoutName, getActiveLayoutName, layoutChangeEvent, loadLayout, setLayout} from './layout'
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
})
