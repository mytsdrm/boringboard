// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CSSObject} from '@emotion/serialize'
import isEqual from 'lodash/isEqual'
import color from 'color'

let activeThemeName: string

import {UserSettings} from './userSettings'

type Color = ReturnType<typeof color>

export type Theme = {
    mainBg: string
    mainFg: string
    buttonBg: string
    buttonFg: string
    sidebarBg: string
    sidebarFg: string
    sidebarTextActiveBorder: string
    sidebarWhiteLogo: string

    link: string
    linkVisited: string

    propDefault: string
    propGray: string
    propBrown: string
    propOrange: string
    propYellow: string
    propGreen: string
    propBlue: string
    propPurple: string
    propPink: string
    propRed: string

    // How derived surfaces (page background, panels, kanban columns, table
    // headers) are tinted: 'accent' mixes in the accent color, 'neutral' keeps
    // them gray so the accent only shows on buttons, links and highlights.
    surfaceTint?: 'accent' | 'neutral'

    // Soft accent glow at the top of the sidebar.
    sidebarGlow?: boolean
}

export const novaThemeName = 'nova-theme'
export const modernThemeName = 'modern-theme'
export const sandThemeName = 'sand-theme'
export const classicThemeName = 'classic-theme'
export const darkThemeName = 'dark-theme'
export const midnightThemeName = 'midnight-theme'
export const systemThemeName = 'system-theme'

// Kept for older imports: "light" is the classic blue look.
export const lightThemeName = classicThemeName

export const defaultThemeName = novaThemeName

const lightProps = {
    propDefault: '#fff',
    propGray: '#e5e7eb',
    propBrown: '#fde7d2',
    propOrange: '#fed7aa',
    propYellow: '#fef08a',
    propGreen: '#bbf7d0',
    propBlue: '#bfdbfe',
    propPurple: '#ddd6fe',
    propPink: '#fbcfe8',
    propRed: '#fecaca',
}

const darkProps = {
    propDefault: 'hsla(0, 100%, 100%, 0.08)',
    propGray: 'hsla(0, 0%, 70%, 0.4)',
    propBrown: 'hsla(25, 60%, 40%, 0.4)',
    propOrange: 'hsla(35, 100%, 50%, 0.4)',
    propYellow: 'hsla(48, 100%, 70%, 0.4)',
    propGreen: 'hsla(120, 100%, 70%, 0.4)',
    propBlue: 'hsla(240, 100%, 70%, 0.4)',
    propPurple: 'hsla(270, 100%, 64%, 0.4)',
    propPink: 'hsla(310, 100%, 80%, 0.4)',
    propRed: 'hsla(4, 100%, 70%, 0.4)',
}

// Default: light, airy content next to a deep ink sidebar, violet accent.
export const novaTheme: Theme = {
    mainBg: '255, 255, 255',
    mainFg: '22, 22, 34',
    buttonBg: '108, 71, 255',
    buttonFg: '255, 255, 255',
    sidebarBg: '24, 22, 40',
    sidebarFg: '229, 228, 245',
    sidebarTextActiveBorder: '167, 139, 250',
    sidebarWhiteLogo: 'true',

    link: '96, 61, 240',
    linkVisited: '#5b21b6',

    ...lightProps,
    surfaceTint: 'neutral',
    sidebarGlow: true,
}

export const sandTheme: Theme = {
    mainBg: '250, 247, 242',
    mainFg: '41, 37, 36',
    buttonBg: '194, 65, 12',
    buttonFg: '255, 255, 255',
    sidebarBg: '242, 236, 226',
    sidebarFg: '68, 64, 60',
    sidebarTextActiveBorder: '194, 65, 12',
    sidebarWhiteLogo: 'false',

    link: '180, 60, 10',
    linkVisited: '#7c2d12',

    ...lightProps,
    surfaceTint: 'neutral',
}

export const modernTheme: Theme = {
    mainBg: '255, 255, 255',
    mainFg: '24, 24, 27',
    buttonBg: '79, 70, 229',
    buttonFg: '255, 255, 255',
    sidebarBg: '250, 250, 250',
    sidebarFg: '39, 39, 42',
    sidebarTextActiveBorder: '79, 70, 229',
    sidebarWhiteLogo: 'false',

    link: '79, 70, 229',
    linkVisited: '#6d28d9',

    ...lightProps,
    surfaceTint: 'neutral',
}

export const classicTheme: Theme = {
    mainBg: '251, 253, 255',
    mainFg: '31, 41, 55',
    buttonBg: '18, 98, 255',
    buttonFg: '255, 255, 255',
    sidebarBg: '238, 244, 252',
    sidebarFg: '3, 20, 84',
    sidebarTextActiveBorder: '18, 98, 255',
    sidebarWhiteLogo: 'false',

    link: '18, 98, 255',
    linkVisited: '#551a8b',

    ...lightProps,
    surfaceTint: 'accent',
}

export const darkTheme: Theme = {
    mainBg: '15, 23, 42',
    mainFg: '226, 232, 240',
    buttonBg: '59, 130, 246',
    buttonFg: '255, 255, 255',
    sidebarBg: '11, 18, 32',
    sidebarFg: '219, 234, 254',
    sidebarTextActiveBorder: '96, 165, 250',
    sidebarWhiteLogo: 'true',

    link: '96, 165, 250',
    linkVisited: '147, 197, 253',

    ...darkProps,
    surfaceTint: 'accent',
}

export const midnightTheme: Theme = {
    mainBg: '20, 20, 23',
    mainFg: '228, 228, 231',
    buttonBg: '139, 92, 246',
    buttonFg: '255, 255, 255',
    sidebarBg: '14, 14, 16',
    sidebarFg: '228, 228, 231',
    sidebarTextActiveBorder: '167, 139, 250',
    sidebarWhiteLogo: 'true',

    link: '167, 139, 250',
    linkVisited: '196, 181, 253',

    ...darkProps,
    surfaceTint: 'neutral',
}

export const defaultTheme = novaTheme
export const lightTheme = classicTheme

export type ThemeOption = {
    id: string
    displayName: string
    theme: Theme | null
}

export const themeOptions: ThemeOption[] = [
    {id: novaThemeName, displayName: 'Nova', theme: novaTheme},
    {id: modernThemeName, displayName: 'Modern', theme: modernTheme},
    {id: sandThemeName, displayName: 'Sand', theme: sandTheme},
    {id: classicThemeName, displayName: 'Classic', theme: classicTheme},
    {id: darkThemeName, displayName: 'Dark', theme: darkTheme},
    {id: midnightThemeName, displayName: 'Midnight', theme: midnightTheme},
    {id: systemThemeName, displayName: 'System', theme: null},
]

export const themeAccentName = 'theme'

export type AccentOption = {
    id: string
    displayName: string

    // rgb triplets: one for light themes, one for dark themes
    light: string
    dark: string
}

export const accentOptions: AccentOption[] = [
    {id: themeAccentName, displayName: 'Theme default', light: '', dark: ''},
    {id: 'indigo', displayName: 'Indigo', light: '79, 70, 229', dark: '129, 140, 248'},
    {id: 'blue', displayName: 'Blue', light: '37, 99, 235', dark: '96, 165, 250'},
    {id: 'violet', displayName: 'Violet', light: '124, 58, 237', dark: '167, 139, 250'},
    {id: 'teal', displayName: 'Teal', light: '13, 148, 136', dark: '45, 212, 191'},
    {id: 'green', displayName: 'Green', light: '22, 163, 74', dark: '74, 222, 128'},
    {id: 'orange', displayName: 'Orange', light: '234, 88, 12', dark: '251, 146, 60'},
    {id: 'rose', displayName: 'Rose', light: '225, 29, 72', dark: '251, 113, 133'},
    {id: 'slate', displayName: 'Slate', light: '71, 85, 105', dark: '148, 163, 184'},
]

export const defaultAccentName = themeAccentName

export type BaseOption = {
    id: string
    displayName: string
    hex: string
}

// Ready-made base (background) colors. Any other color can be picked freely.
export const baseOptions: BaseOption[] = [
    {id: 'snow', displayName: 'Snow', hex: '#ffffff'},
    {id: 'mist', displayName: 'Mist', hex: '#f3f5f9'},
    {id: 'paper', displayName: 'Paper', hex: '#f8f4ec'},
    {id: 'mint', displayName: 'Mint', hex: '#eef7f2'},
    {id: 'blush', displayName: 'Blush', hex: '#fbf1f3'},
    {id: 'lavender', displayName: 'Lavender', hex: '#f3f1fb'},
    {id: 'slate', displayName: 'Slate', hex: '#1e2430'},
    {id: 'charcoal', displayName: 'Charcoal', hex: '#18181b'},
    {id: 'ink', displayName: 'Ink', hex: '#0b1020'},
    {id: 'forest', displayName: 'Forest', hex: '#0f1f1a'},
]

export type Appearance = {
    themeName: string
    accent: string
    base: string
}

export const defaultAppearance: Appearance = {themeName: defaultThemeName, accent: defaultAccentName, base: ''}

const hexPattern = /^#[0-9a-f]{6}$/i

export function isHexColor(value: string | null | undefined): value is string {
    return Boolean(value) && hexPattern.test(value as string)
}

function isThemeName(name: string | null | undefined): name is string {
    return Boolean(name) && themeOptions.some((t) => t.id === name)
}

function isAccentName(name: string | null | undefined): name is string {
    return Boolean(name) && (accentOptions.some((a) => a.id === name) || isHexColor(name))
}

const rgbString = (c: Color): string => c.rgb().round().array().slice(0, 3).join(', ')

// Darkens (on light backgrounds) or lightens (on dark ones) a color until it
// reads well against the background.
function readableOn(fg: Color, bg: Color, minContrast = 3.2): Color {
    let result = fg
    const isDarkBg = bg.isDark()
    for (let i = 0; i < 12 && result.contrast(bg) < minContrast; i++) {
        result = isDarkBg ? result.mix(color('white'), 0.15) : result.mix(color('black'), 0.15)
    }
    return result
}

// Replaces the theme's background with a custom base color and derives the
// text, sidebar and tag colors from it.
function applyBaseColor(theme: Theme, baseHex: string): Theme {
    const base = color(baseHex)
    const isDark = base.isDark()
    const themeMainDark = color(`rgb(${theme.mainBg})`).isDark()
    const themeSidebarDark = color(`rgb(${theme.sidebarBg})`).isDark()
    const fg = isDark ? base.mix(color('white'), 0.9) : base.mix(color('black'), 0.88)

    // Themes with a contrasting sidebar (like Nova) keep it when the base
    // color stays on the same light/dark side.
    const keepSidebar = themeSidebarDark !== themeMainDark && isDark === themeMainDark
    const sidebar = isDark ? base.mix(color('black'), 0.3) : base.mix(fg, 0.045)

    return {
        ...theme,
        ...(isDark ? darkProps : lightProps),
        mainBg: rgbString(base),
        mainFg: rgbString(fg),
        sidebarBg: keepSidebar ? theme.sidebarBg : rgbString(sidebar),
        sidebarFg: keepSidebar ? theme.sidebarFg : rgbString(fg),
        sidebarWhiteLogo: keepSidebar ? theme.sidebarWhiteLogo : String(isDark),
        link: rgbString(readableOn(color(`rgb(${theme.link})`), base)),
        surfaceTint: 'neutral',
    }
}

function prefersDark(): boolean {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

function resolveBaseTheme(themeName: string): Theme {
    if (themeName === systemThemeName) {
        return prefersDark() ? midnightTheme : novaTheme
    }
    return themeOptions.find((t) => t.id === themeName)?.theme || defaultTheme
}

// Builds the final colors from a theme, an accent (preset id or #hex) and an
// optional custom base color (#hex). Dark backgrounds get lighter accent
// shades so links and highlights stay readable.
export function buildTheme(themeName: string, accentName: string, baseHex = ''): Theme {
    let theme = {...resolveBaseTheme(themeName)}
    if (isHexColor(baseHex)) {
        theme = applyBaseColor(theme, baseHex)
    }

    const mainBg = color(`rgb(${theme.mainBg})`)
    const sidebarBg = color(`rgb(${theme.sidebarBg})`)
    const isDark = mainBg.isDark()

    let button: Color | null = null
    let highlight: Color | null = null
    let sidebarHighlight: Color | null = null
    if (isHexColor(accentName)) {
        button = color(accentName)
        highlight = readableOn(button, mainBg)
        sidebarHighlight = readableOn(button, sidebarBg)
    } else {
        const accent = accentOptions.find((a) => a.id === accentName)
        if (accent && accent.id !== themeAccentName) {
            button = color(`rgb(${accent.light})`)
            highlight = readableOn(color(`rgb(${isDark ? accent.dark : accent.light})`), mainBg)
            sidebarHighlight = readableOn(color(`rgb(${sidebarBg.isDark() ? accent.dark : accent.light})`), sidebarBg)
        }
    }

    if (!button || !highlight || !sidebarHighlight) {
        return theme
    }

    return {
        ...theme,
        buttonBg: rgbString(button),
        buttonFg: button.isLight() && button.contrast(color('white')) < 2.6 ? '24, 24, 27' : '255, 255, 255',
        sidebarTextActiveBorder: rgbString(sidebarHighlight),
        link: rgbString(highlight),
        linkVisited: highlight.mix(color(isDark ? 'white' : 'black'), 0.25).hex(),
    }
}

function setBoringBoardThemeVariables(theme: Theme) {
    const mainBg = color(`rgb(${theme.mainBg})`)
    const mainFg = color(`rgb(${theme.mainFg})`)
    const buttonBg = color(`rgb(${theme.buttonBg})`)
    const highlight = color(`rgb(${theme.link})`)
    const isDark = mainBg.isDark()
    const neutral = theme.surfaceTint === 'neutral'

    // Surfaces either pick up a hint of the accent (classic look) or stay
    // neutral gray (modern look).
    const tint = (amount: number) => (neutral ? mainBg.mix(mainFg, amount * 0.55) : mainBg.mix(buttonBg, amount))
    const lift = (amount: number) => (neutral ? mainBg.mix(mainFg, amount * 0.3) : mainBg.lighten(amount))

    const darkBg = mainBg.darken(neutral ? 0.15 : 0.08)
    const bg = isDark ? darkBg : tint(0.035)
    const bgSoft = isDark ? lift(0.06) : tint(0.02).lighten(0.01)
    const panel = isDark ? lift(0.12) : mainBg.lighten(0.06)
    const panelSoft = isDark ? lift(0.18) : tint(0.025)
    const card = isDark ? lift(0.17) : mainBg.lighten(0.08)
    const cardHover = isDark ? lift(0.22) : tint(0.025).lighten(0.02)
    const kanbanColumnFrom = isDark ? lift(0.14) : tint(0.075)
    const kanbanColumnTo = isDark ? lift(0.09) : tint(0.04)
    const border = mainFg.alpha(neutral ? 0.12 : 0.16)
    let borderStrongAlpha = isDark ? 0.24 : 0.26
    if (neutral) {
        borderStrongAlpha = 0.2
    }
    const borderStrong = mainFg.alpha(borderStrongAlpha)
    const shadow = isDark ? 'rgba(0, 0, 0, 0.24)' : 'rgba(15, 23, 42, 0.06)'
    const shadowSoft = isDark ? 'rgba(0, 0, 0, 0.18)' : 'rgba(15, 23, 42, 0.035)'
    let sidebarShadow = neutral ? 'rgba(24, 24, 27, 0.04)' : 'rgba(3, 20, 84, 0.055)'
    if (isDark) {
        sidebarShadow = 'rgba(0, 0, 0, 0.28)'
    }
    const tableHeader = isDark ? lift(0.2) : tint(0.07)
    let tableRow = isDark ? lift(0.11) : mainBg.lighten(0.07)
    if (neutral) {
        // Match the editable cell background so rows read as one surface.
        tableRow = mainBg
    }
    const tableRowAlt = isDark ? lift(0.14) : tint(0.018).lighten(0.04)
    const tableRowHover = isDark ? lift(0.19) : tint(0.045).lighten(0.02)
    const tableBorder = mainFg.alpha(isDark ? 0.18 : 0.16)
    const tableBorderStrong = mainFg.alpha(isDark ? 0.28 : 0.24)
    const purple = color('#673aff')
    const green = color('#16a34a')
    const orange = color('#f97316')

    const root = document.documentElement
    root.style.setProperty('--bb-bg', bg.rgb().string())
    root.style.setProperty('--bb-bg-soft', bgSoft.rgb().string())
    root.style.setProperty('--bb-panel-bg', panel.rgb().string())
    root.style.setProperty('--bb-panel-bg-soft', panelSoft.rgb().string())
    root.style.setProperty('--bb-card-bg', card.rgb().string())
    root.style.setProperty('--bb-card-hover-bg', cardHover.rgb().string())
    root.style.setProperty('--bb-kanban-column-from', kanbanColumnFrom.rgb().string())
    root.style.setProperty('--bb-kanban-column-to', kanbanColumnTo.rgb().string())
    root.style.setProperty('--bb-text', mainFg.rgb().string())
    root.style.setProperty('--bb-text-muted', mainFg.alpha(isDark ? 0.72 : 0.68).rgb().string())
    root.style.setProperty('--bb-text-subtle', mainFg.alpha(isDark ? 0.52 : 0.5).rgb().string())
    root.style.setProperty('--bb-date-text', mainFg.alpha(isDark ? 0.62 : 0.72).rgb().string())
    root.style.setProperty('--bb-border', border.rgb().string())
    root.style.setProperty('--bb-border-strong', borderStrong.rgb().string())
    root.style.setProperty('--bb-shadow', shadow)
    root.style.setProperty('--bb-shadow-soft', shadowSoft)
    root.style.setProperty('--bb-sidebar-shadow', sidebarShadow)
    let sidebarGlow = 'transparent'
    if (theme.sidebarGlow || !neutral) {
        sidebarGlow = buttonBg.alpha(theme.sidebarGlow || isDark ? 0.18 : 0.1).rgb().string()
    }
    root.style.setProperty('--bb-sidebar-glow', sidebarGlow)
    root.style.setProperty('--bb-blue-soft', buttonBg.alpha(isDark ? 0.18 : 0.1).rgb().string())
    root.style.setProperty('--bb-blue-text', (isDark ? highlight : buttonBg).rgb().string())
    root.style.setProperty('--bb-purple-soft', purple.alpha(isDark ? 0.24 : 0.12).rgb().string())
    root.style.setProperty('--bb-purple-text', isDark ? purple.lighten(0.35).rgb().string() : purple.rgb().string())
    root.style.setProperty('--bb-green-soft', green.alpha(isDark ? 0.2 : 0.1).rgb().string())
    root.style.setProperty('--bb-green-text', isDark ? green.lighten(0.32).rgb().string() : green.darken(0.12).rgb().string())
    root.style.setProperty('--bb-orange-soft', orange.alpha(isDark ? 0.22 : 0.12).rgb().string())
    root.style.setProperty('--bb-orange-text', isDark ? orange.lighten(0.22).rgb().string() : orange.rgb().string())
    root.style.setProperty('--bb-assigned-soft', orange.alpha(isDark ? 0.22 : 0.12).rgb().string())
    root.style.setProperty('--bb-assigned-text', isDark ? orange.lighten(0.22).rgb().string() : orange.rgb().string())
    root.style.setProperty('--bb-dashboard-panel-bg', isDark ? panel.rgb().string() : '#ffffff')
    root.style.setProperty('--bb-dashboard-glow', buttonBg.alpha(isDark ? 0.12 : 0.08).rgb().string())
    root.style.setProperty('--bb-template-sidebar-bg', isDark ? lift(0.08).rgb().string() : tint(0.03).rgb().string())
    root.style.setProperty('--bb-template-item-active-bg', buttonBg.alpha(isDark ? 0.18 : 0.12).rgb().string())
    root.style.setProperty('--bb-table-header-bg', tableHeader.rgb().string())
    root.style.setProperty('--bb-table-row-bg', tableRow.rgb().string())
    root.style.setProperty('--bb-table-row-alt-bg', tableRowAlt.rgb().string())
    root.style.setProperty('--bb-table-row-hover-bg', tableRowHover.rgb().string())
    root.style.setProperty('--bb-table-border', tableBorder.rgb().string())
    root.style.setProperty('--bb-table-border-strong', tableBorderStrong.rgb().string())
    root.style.setProperty('--bb-table-shadow', isDark ? 'rgba(0, 0, 0, 0.16)' : 'rgba(15, 23, 42, 0.024)')
    root.style.setProperty('color-scheme', isDark ? 'dark' : 'light')
}

// Writes a theme's colors into the CSS variables the app styles read.
export function applyThemeColors(theme: Theme): Theme {
    const consolidatedTheme = {...defaultTheme, ...theme}
    const root = document.documentElement

    root.style.setProperty('--center-channel-bg-rgb', consolidatedTheme.mainBg)
    root.style.setProperty('--center-channel-color-rgb', consolidatedTheme.mainFg)
    root.style.setProperty('--button-bg-rgb', consolidatedTheme.buttonBg)
    root.style.setProperty('--button-color-rgb', consolidatedTheme.buttonFg)
    root.style.setProperty('--sidebar-bg-rgb', consolidatedTheme.sidebarBg)
    root.style.setProperty('--sidebar-text-rgb', consolidatedTheme.sidebarFg)
    root.style.setProperty('--link-color-rgb', consolidatedTheme.link)
    root.style.setProperty('--sidebar-text-active-border-rgb', consolidatedTheme.sidebarTextActiveBorder)

    root.style.setProperty('--sidebar-white-logo', consolidatedTheme.sidebarWhiteLogo)
    root.style.setProperty('--link-visited-color-rgb', consolidatedTheme.linkVisited)

    root.style.setProperty('--prop-default', consolidatedTheme.propDefault)
    root.style.setProperty('--prop-gray', consolidatedTheme.propGray)
    root.style.setProperty('--prop-brown', consolidatedTheme.propBrown)
    root.style.setProperty('--prop-orange', consolidatedTheme.propOrange)
    root.style.setProperty('--prop-yellow', consolidatedTheme.propYellow)
    root.style.setProperty('--prop-green', consolidatedTheme.propGreen)
    root.style.setProperty('--prop-blue', consolidatedTheme.propBlue)
    root.style.setProperty('--prop-purple', consolidatedTheme.propPurple)
    root.style.setProperty('--prop-pink', consolidatedTheme.propPink)
    root.style.setProperty('--prop-red', consolidatedTheme.propRed)

    setBoringBoardThemeVariables(consolidatedTheme)

    return consolidatedTheme
}

let activeAccentName: string = defaultAccentName
let activeBaseColor = ''

// Applies a theme + accent (+ optional base color) and remembers the choice
// in this browser.
export function setAppearance(themeName: string, accentName: string, baseHex = ''): Theme {
    const name = isThemeName(themeName) ? themeName : defaultThemeName
    const accent = isAccentName(accentName) ? accentName : defaultAccentName
    const base = isHexColor(baseHex) ? baseHex.toLowerCase() : ''

    activeThemeName = name
    activeAccentName = accent
    activeBaseColor = base
    UserSettings.themeName = name
    UserSettings.accentColor = accent
    UserSettings.baseColor = base || null

    document.documentElement.setAttribute('data-bb-theme', name)
    return applyThemeColors(buildTheme(name, accent, base))
}

export function getAppearance(): Appearance {
    return {themeName: getActiveThemeName(), accent: activeAccentName, base: activeBaseColor}
}

// Back-compat: a full theme object is applied as-is; null means "follow the system".
export function setTheme(theme: Theme | null): Theme {
    if (theme === null) {
        return setAppearance(systemThemeName, activeAccentName, activeBaseColor)
    }
    const match = themeOptions.find((t) => t.theme && isEqual(t.theme, theme))
    if (match) {
        return setAppearance(match.id, activeAccentName, activeBaseColor)
    }
    return applyThemeColors(theme)
}

export function setMattermostTheme(theme: any): Theme {
    if (!theme) {
        return setTheme(defaultTheme)
    }

    return applyThemeColors({
        ...defaultTheme,
        mainBg: color(theme.centerChannelBg).rgb().array().join(', '),
        mainFg: color(theme.centerChannelColor).rgb().array().join(', '),
        buttonBg: color(theme.buttonBg).rgb().array().join(', '),
        buttonFg: color(theme.buttonColor).rgb().array().join(', '),
        sidebarBg: color(theme.sidebarBg).rgb().array().join(', '),
        sidebarFg: color(theme.sidebarColor || '#ffffff').rgb().array().join(', '),
        sidebarTextActiveBorder: color(theme.sidebarTextActiveBorder).rgb().array().join(', '),
        link: color(theme.linkColor).rgb().array().join(', '),
        surfaceTint: 'accent',
    })
}

// Older versions stored the whole theme object under the "theme" key.
// A stored dark theme stays dark; anything else moves to the new Modern default.
function migrateLegacyTheme(): string | null {
    const legacy = UserSettings.theme
    if (!legacy) {
        return null
    }
    UserSettings.theme = null
    try {
        const parsed = JSON.parse(legacy)
        if (parsed?.mainBg && color(`rgb(${parsed.mainBg})`).isDark()) {
            return darkThemeName
        }
    } catch (e) {
        // ignore and fall through to the default
    }
    return defaultThemeName
}

export function loadTheme(): Theme {
    let name = UserSettings.themeName
    if (!isThemeName(name)) {
        name = migrateLegacyTheme() || defaultThemeName
    }
    const accent = UserSettings.accentColor
    return setAppearance(name, isAccentName(accent) ? accent : defaultAccentName, UserSettings.baseColor || '')
}

export function initThemes(): void {
    const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)')
    const changeHandler = () => {
        if (activeThemeName === systemThemeName) {
            setAppearance(systemThemeName, activeAccentName, activeBaseColor)
        }
    }
    if (darkThemeMq.addEventListener) {
        darkThemeMq.addEventListener('change', changeHandler)
    } else if (darkThemeMq.addListener) {
        // Safari and Mac app support
        darkThemeMq.addListener(changeHandler)
    }
    loadTheme()
}

export function getSelectBaseStyle() {
    return {
        dropdownIndicator: (provided: CSSObject): CSSObject => ({
            ...provided,
            display: 'none !important',
        }),
        indicatorSeparator: (provided: CSSObject): CSSObject => ({
            ...provided,
            display: 'none',
        }),
        loadingIndicator: (provided: CSSObject): CSSObject => ({
            ...provided,
            display: 'none',
        }),
        clearIndicator: (provided: CSSObject): CSSObject => ({
            ...provided,
            display: 'none',
        }),
        menu: (provided: CSSObject): CSSObject => ({
            ...provided,
            width: 'unset',
            background: 'rgb(var(--center-channel-bg-rgb))',
        }),
        option: (provided: CSSObject, state: { isFocused: boolean }): CSSObject => ({
            ...provided,
            background: state.isFocused ? 'rgba(var(--center-channel-color-rgb), 0.1)' : 'rgb(var(--center-channel-bg-rgb))',
            color: state.isFocused ? 'rgb(var(--center-channel-color-rgb))' : 'rgb(var(--center-channel-color-rgb))',
            padding: '2px 8px',
        }),
        control: (): CSSObject => ({
            border: 0,
            width: '100%',
            margin: '4px 0 0 0',

            // display: 'flex',
            // marginTop: 0,
        }),
        valueContainer: (provided: CSSObject): CSSObject => ({
            ...provided,
            padding: '0 5px',
            overflow: 'unset',
        }),
        singleValue: (provided: CSSObject): CSSObject => ({
            ...provided,
            color: 'rgb(var(--center-channel-color-rgb))',
            overflow: 'unset',
            maxWidth: 'calc(100% - 20px)',
        }),
        input: (provided: CSSObject): CSSObject => ({
            ...provided,
            paddingBottom: 0,
            paddingTop: 0,
            marginBottom: 0,
            marginTop: 0,
        }),
        menuList: (provided: CSSObject): CSSObject => ({
            ...provided,
            overflowY: 'auto',
            overflowX: 'hidden',
        }),
    }
}

export function getActiveThemeName(): string {
    return activeThemeName || defaultThemeName
}

export function getActiveAccentName(): string {
    return activeAccentName || defaultAccentName
}

export function getActiveBaseColor(): string {
    return activeBaseColor
}
