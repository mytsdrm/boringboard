// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CSSObject} from '@emotion/serialize'
import isEqual from 'lodash/isEqual'
import color from 'color'

let activeThemeName: string

import {UserSettings} from './userSettings'

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
}

export const systemThemeName = 'system-theme'

export const defaultThemeName = 'default-theme'

export const defaultTheme = {
    mainBg: '248, 250, 252',
    mainFg: '31, 41, 55',
    buttonBg: '18, 98, 255',
    buttonFg: '255, 255, 255',
    sidebarBg: '248, 250, 252',
    sidebarFg: '3, 20, 84',
    sidebarTextActiveBorder: '18, 98, 255',
    sidebarWhiteLogo: 'false',

    link: '18, 98, 255',
    linkVisited: '#551a8b',

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

export const darkThemeName = 'dark-theme'

export const darkTheme = {
    ...defaultTheme,

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

export const lightThemeName = 'light-theme'

export const lightTheme = {
    ...defaultTheme,

    mainBg: '248, 250, 252',
    mainFg: '31, 41, 55',
    buttonBg: '18, 98, 255',
    buttonFg: '255, 255, 255',
    sidebarBg: '248, 250, 252',
    sidebarFg: '3, 20, 84',
    sidebarTextActiveBorder: '18, 98, 255',
    sidebarWhiteLogo: 'false',
}

function setBoringBoardThemeVariables(theme: Theme) {
    const mainBg = color(`rgb(${theme.mainBg})`)
    const mainFg = color(`rgb(${theme.mainFg})`)
    const buttonBg = color(`rgb(${theme.buttonBg})`)
    const isDark = mainBg.isDark()

    const bg = isDark ? mainBg.darken(0.08) : mainBg.mix(buttonBg, 0.035)
    const bgSoft = isDark ? mainBg.lighten(0.06) : mainBg.mix(buttonBg, 0.02).lighten(0.01)
    const panel = isDark ? mainBg.lighten(0.12) : mainBg.lighten(0.06)
    const panelSoft = isDark ? mainBg.lighten(0.18) : mainBg.mix(buttonBg, 0.025)
    const card = isDark ? mainBg.lighten(0.17) : mainBg.lighten(0.08)
    const cardHover = isDark ? mainBg.lighten(0.22) : mainBg.mix(buttonBg, 0.025).lighten(0.02)
    const kanbanColumnFrom = isDark ? mainBg.lighten(0.14) : mainBg.mix(buttonBg, 0.075)
    const kanbanColumnTo = isDark ? mainBg.lighten(0.09) : mainBg.mix(buttonBg, 0.04)
    const border = mainFg.alpha(isDark ? 0.16 : 0.16)
    const borderStrong = mainFg.alpha(isDark ? 0.24 : 0.26)
    const shadow = isDark ? 'rgba(0, 0, 0, 0.24)' : 'rgba(15, 23, 42, 0.06)'
    const shadowSoft = isDark ? 'rgba(0, 0, 0, 0.18)' : 'rgba(15, 23, 42, 0.035)'
    const sidebarShadow = isDark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(3, 20, 84, 0.055)'
    const tableHeader = isDark ? mainBg.lighten(0.2) : mainBg.mix(buttonBg, 0.07)
    const tableRow = isDark ? mainBg.lighten(0.11) : mainBg.lighten(0.07)
    const tableRowAlt = isDark ? mainBg.lighten(0.14) : mainBg.mix(buttonBg, 0.018).lighten(0.04)
    const tableRowHover = isDark ? mainBg.lighten(0.19) : mainBg.mix(buttonBg, 0.045).lighten(0.02)
    const tableBorder = mainFg.alpha(isDark ? 0.18 : 0.16)
    const tableBorderStrong = mainFg.alpha(isDark ? 0.28 : 0.24)

    document.documentElement.style.setProperty('--bb-bg', bg.rgb().string())
    document.documentElement.style.setProperty('--bb-bg-soft', bgSoft.rgb().string())
    document.documentElement.style.setProperty('--bb-panel-bg', panel.rgb().string())
    document.documentElement.style.setProperty('--bb-panel-bg-soft', panelSoft.rgb().string())
    document.documentElement.style.setProperty('--bb-card-bg', card.rgb().string())
    document.documentElement.style.setProperty('--bb-card-hover-bg', cardHover.rgb().string())
    document.documentElement.style.setProperty('--bb-kanban-column-from', kanbanColumnFrom.rgb().string())
    document.documentElement.style.setProperty('--bb-kanban-column-to', kanbanColumnTo.rgb().string())
    document.documentElement.style.setProperty('--bb-text', mainFg.rgb().string())
    document.documentElement.style.setProperty('--bb-text-muted', mainFg.alpha(isDark ? 0.72 : 0.68).rgb().string())
    document.documentElement.style.setProperty('--bb-text-subtle', mainFg.alpha(isDark ? 0.52 : 0.5).rgb().string())
    document.documentElement.style.setProperty('--bb-border', border.rgb().string())
    document.documentElement.style.setProperty('--bb-border-strong', borderStrong.rgb().string())
    document.documentElement.style.setProperty('--bb-shadow', shadow)
    document.documentElement.style.setProperty('--bb-shadow-soft', shadowSoft)
    document.documentElement.style.setProperty('--bb-sidebar-shadow', sidebarShadow)
    document.documentElement.style.setProperty('--bb-blue-soft', buttonBg.alpha(isDark ? 0.18 : 0.1).rgb().string())
    document.documentElement.style.setProperty('--bb-green-soft', isDark ? 'rgba(34, 197, 94, 0.16)' : 'rgba(22, 163, 74, 0.1)')
    document.documentElement.style.setProperty('--bb-green-text', isDark ? '#86efac' : '#15803d')
    document.documentElement.style.setProperty('--bb-template-sidebar-bg', isDark ? mainBg.lighten(0.08).rgb().string() : '#f6f9fd')
    document.documentElement.style.setProperty('--bb-template-item-active-bg', buttonBg.alpha(isDark ? 0.18 : 0.12).rgb().string())
    document.documentElement.style.setProperty('--bb-table-header-bg', tableHeader.rgb().string())
    document.documentElement.style.setProperty('--bb-table-row-bg', tableRow.rgb().string())
    document.documentElement.style.setProperty('--bb-table-row-alt-bg', tableRowAlt.rgb().string())
    document.documentElement.style.setProperty('--bb-table-row-hover-bg', tableRowHover.rgb().string())
    document.documentElement.style.setProperty('--bb-table-border', tableBorder.rgb().string())
    document.documentElement.style.setProperty('--bb-table-border-strong', tableBorderStrong.rgb().string())
    document.documentElement.style.setProperty('--bb-table-shadow', isDark ? 'rgba(0, 0, 0, 0.16)' : 'rgba(15, 23, 42, 0.024)')
}

export function setTheme(theme: Theme | null): Theme {
    let consolidatedTheme = defaultTheme
    if (theme) {
        consolidatedTheme = {...defaultTheme, ...theme}
        UserSettings.theme = JSON.stringify(consolidatedTheme)
    } else {
        UserSettings.theme = ''
        const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)')
        if (darkThemeMq.matches) {
            consolidatedTheme = {...defaultTheme, ...darkTheme}
        }
    }

    setActiveThemeName(consolidatedTheme, theme)

    // for personal server and desktop, BoringBoard is responsible for managing the theme,
    // so we set all the color variables here.
    document.documentElement.style.setProperty('--center-channel-bg-rgb', consolidatedTheme.mainBg)
    document.documentElement.style.setProperty('--center-channel-color-rgb', consolidatedTheme.mainFg)
    document.documentElement.style.setProperty('--button-bg-rgb', consolidatedTheme.buttonBg)
    document.documentElement.style.setProperty('--button-color-rgb', consolidatedTheme.buttonFg)
    document.documentElement.style.setProperty('--sidebar-bg-rgb', consolidatedTheme.sidebarBg)
    document.documentElement.style.setProperty('--sidebar-text-rgb', consolidatedTheme.sidebarFg)
    document.documentElement.style.setProperty('--link-color-rgb', consolidatedTheme.link)
    document.documentElement.style.setProperty('--sidebar-text-active-border-rgb', consolidatedTheme.sidebarTextActiveBorder)

    document.documentElement.style.setProperty('--sidebar-white-logo', consolidatedTheme.sidebarWhiteLogo)
    document.documentElement.style.setProperty('--link-visited-color-rgb', consolidatedTheme.linkVisited)

    document.documentElement.style.setProperty('--prop-default', consolidatedTheme.propDefault)
    document.documentElement.style.setProperty('--prop-gray', consolidatedTheme.propGray)
    document.documentElement.style.setProperty('--prop-brown', consolidatedTheme.propBrown)
    document.documentElement.style.setProperty('--prop-orange', consolidatedTheme.propOrange)
    document.documentElement.style.setProperty('--prop-yellow', consolidatedTheme.propYellow)
    document.documentElement.style.setProperty('--prop-green', consolidatedTheme.propGreen)
    document.documentElement.style.setProperty('--prop-blue', consolidatedTheme.propBlue)
    document.documentElement.style.setProperty('--prop-purple', consolidatedTheme.propPurple)
    document.documentElement.style.setProperty('--prop-pink', consolidatedTheme.propPink)
    document.documentElement.style.setProperty('--prop-red', consolidatedTheme.propRed)

    setBoringBoardThemeVariables(consolidatedTheme)

    return consolidatedTheme
}

export function setMattermostTheme(theme: any): Theme {
    if (!theme) {
        return setTheme(defaultTheme)
    }

    document.documentElement.style.setProperty('--center-channel-bg-rgb', color(theme.centerChannelBg).rgb().array().join(', '))
    document.documentElement.style.setProperty('--center-channel-color-rgb', color(theme.centerChannelColor).rgb().array().join(', '))
    document.documentElement.style.setProperty('--button-bg-rgb', color(theme.buttonBg).rgb().array().join(', '))
    document.documentElement.style.setProperty('--button-color-rgb', color(theme.buttonColor).rgb().array().join(', '))
    document.documentElement.style.setProperty('--sidebar-bg-rgb', color(theme.sidebarBg).rgb().array().join(', '))
    document.documentElement.style.setProperty('--sidebar-text-rgb', color(theme.sidebarText).rgb().array().join(', '))
    document.documentElement.style.setProperty('--link-color-rgb', theme.linkColor)
    document.documentElement.style.setProperty('--sidebar-text-active-border-rgb', color(theme.sidebarTextActiveBorder).rgb().array().join(', '))

    return setTheme({
        ...defaultTheme,
        mainBg: color(theme.centerChannelBg).rgb().array().join(', '),
        mainFg: color(theme.centerChannelColor).rgb().array().join(', '),
        buttonBg: color(theme.buttonBg).rgb().array().join(', '),
        buttonFg: color(theme.buttonColor).rgb().array().join(', '),
        sidebarBg: color(theme.sidebarBg).rgb().array().join(', '),
        sidebarFg: color(theme.sidebarColor || '#ffffff').rgb().array().join(', '),
        sidebarTextActiveBorder: color(theme.sidebarTextActiveBorder).rgb().array().join(', '),
        link: theme.linkColor,
    })
}

function setActiveThemeName(consolidatedTheme: Theme, theme: Theme | null) {
    if (theme === null) {
        activeThemeName = systemThemeName
    } else if (isEqual(consolidatedTheme, darkTheme)) {
        activeThemeName = darkThemeName
    } else if (isEqual(consolidatedTheme, lightTheme)) {
        activeThemeName = lightThemeName
    } else {
        activeThemeName = defaultThemeName
    }
}

export function loadTheme(): Theme {
    const themeStr = UserSettings.theme
    if (themeStr) {
        try {
            const theme = JSON.parse(themeStr)
            const consolidatedTheme = setTheme(theme)
            setActiveThemeName(consolidatedTheme, theme)
            return consolidatedTheme
        } catch (e) {
            return setTheme(null)
        }
    } else {
        return setTheme(null)
    }
}

export function initThemes(): void {
    const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)')
    const changeHandler = () => {
        const themeStr = UserSettings.theme
        if (!themeStr) {
            setTheme(null)
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
