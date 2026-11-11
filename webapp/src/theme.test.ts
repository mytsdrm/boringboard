// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    buildTheme,
    classicThemeName,
    darkTheme,
    darkThemeName,
    defaultThemeName,
    getActiveAccentName,
    getActiveThemeName,
    loadTheme,
    midnightThemeName,
    modernTheme,
    modernThemeName,
    setAppearance,
    themeAccentName,
} from './theme'
import {UserSettings} from './userSettings'

describe('theme', () => {
    beforeEach(() => {
        localStorage.clear()
        window.matchMedia = jest.fn().mockReturnValue({matches: false})
    })

    test('modern is the default theme', () => {
        expect(defaultThemeName).toBe(modernThemeName)
        loadTheme()
        expect(getActiveThemeName()).toBe(modernThemeName)
        expect(getActiveAccentName()).toBe(themeAccentName)
        expect(document.documentElement.style.getPropertyValue('--button-bg-rgb')).toBe(modernTheme.buttonBg)
    })

    test('theme default accent keeps the theme colors', () => {
        expect(buildTheme(darkThemeName, themeAccentName)).toEqual(darkTheme)
    })

    test('accent overrides buttons and links, lighter on dark themes', () => {
        const light = buildTheme(modernThemeName, 'teal')
        expect(light.buttonBg).toBe('13, 148, 136')
        expect(light.link).toBe('13, 148, 136')
        expect(light.mainBg).toBe(modernTheme.mainBg)

        const dark = buildTheme(midnightThemeName, 'teal')
        expect(dark.buttonBg).toBe('13, 148, 136')
        expect(dark.link).toBe('45, 212, 191')
    })

    test('choice is saved and restored', () => {
        setAppearance(classicThemeName, 'rose')
        expect(UserSettings.themeName).toBe(classicThemeName)
        expect(UserSettings.accentColor).toBe('rose')

        setAppearance(modernThemeName, themeAccentName)
        UserSettings.themeName = classicThemeName
        UserSettings.accentColor = 'rose'
        loadTheme()
        expect(getActiveThemeName()).toBe(classicThemeName)
        expect(getActiveAccentName()).toBe('rose')
    })

    test('unknown values fall back to defaults', () => {
        setAppearance('nope', 'nope')
        expect(getActiveThemeName()).toBe(defaultThemeName)
        expect(getActiveAccentName()).toBe(themeAccentName)
    })

    test('legacy stored themes migrate', () => {
        UserSettings.theme = JSON.stringify(darkTheme)
        loadTheme()
        expect(getActiveThemeName()).toBe(darkThemeName)
        expect(UserSettings.theme).toBeNull()

        localStorage.clear()
        UserSettings.theme = JSON.stringify({mainBg: '251, 253, 255'})
        loadTheme()
        expect(getActiveThemeName()).toBe(modernThemeName)
    })
})
