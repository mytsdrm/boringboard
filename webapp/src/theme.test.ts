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
    novaTheme,
    novaThemeName,
    sandThemeName,
    getActiveBaseColor,
    setAppearance,
    themeAccentName,
} from './theme'
import {UserSettings} from './userSettings'

describe('theme', () => {
    beforeEach(() => {
        localStorage.clear()
        window.matchMedia = jest.fn().mockReturnValue({matches: false})
    })

    test('nova is the default theme', () => {
        expect(defaultThemeName).toBe(novaThemeName)
        loadTheme()
        expect(getActiveThemeName()).toBe(novaThemeName)
        expect(getActiveAccentName()).toBe(themeAccentName)
        expect(getActiveBaseColor()).toBe('')
        expect(document.documentElement.style.getPropertyValue('--button-bg-rgb')).toBe(novaTheme.buttonBg)
    })

    test('custom accent color is used and kept readable', () => {
        const theme = buildTheme(modernThemeName, '#facc15')
        expect(theme.buttonBg).toBe('250, 204, 21')
        expect(theme.buttonFg).toBe('24, 24, 27')

        // a light yellow link would be unreadable on white, so it gets darkened
        expect(theme.link).not.toBe('250, 204, 21')
    })

    test('custom base color replaces the background and adapts the text', () => {
        const dark = buildTheme(modernThemeName, themeAccentName, '#0f1f1a')
        expect(dark.mainBg).toBe('15, 31, 26')
        expect(dark.sidebarWhiteLogo).toBe('true')

        const light = buildTheme(novaThemeName, themeAccentName, '#f8f4ec')
        expect(light.mainBg).toBe('248, 244, 236')

        // Nova keeps its dark sidebar on a light base
        expect(light.sidebarBg).toBe(novaTheme.sidebarBg)
    })

    test('base color is saved and restored', () => {
        setAppearance(sandThemeName, 'rose', '#EEF7F2')
        expect(UserSettings.baseColor).toBe('#eef7f2')
        loadTheme()
        expect(getActiveBaseColor()).toBe('#eef7f2')
        setAppearance(sandThemeName, 'rose', '')
        expect(UserSettings.baseColor).toBeNull()
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
        expect(getActiveThemeName()).toBe(novaThemeName)
    })
})
