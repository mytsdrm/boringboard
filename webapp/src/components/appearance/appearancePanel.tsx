// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useRef, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {IconCheck, IconPalette, IconRefresh} from '@tabler/icons-react'
import color from 'color'

import AppModal from '../appModal'
import octoClient from '../../octoClient'
import {useAppDispatch, useAppSelector} from '../../store/hooks'
import {getMe, patchProps} from '../../store/users'
import {
    accentOptions,
    Appearance,
    baseOptions,
    buildTheme,
    defaultAppearance,
    defaultThemeName,
    getAppearance,
    isHexColor,
    midnightThemeName,
    setAppearance,
    systemThemeName,
    themeAccentName,
    themeOptions,
} from '../../theme'

import './appearancePanel.scss'

type Props = {
    onClose: () => void
}

const rgb = (triplet: string) => `rgb(${triplet})`

// Small mock of the app (sidebar, header and two cards) drawn in a theme's colors.
const ThemePreview = (props: {themeName: string, accent: string, base: string}) => {
    const theme = buildTheme(props.themeName, props.accent, props.base)
    return (
        <span
            className='AppearancePanel__preview'
            style={{background: rgb(theme.mainBg)}}
        >
            <span
                className='AppearancePanel__previewSidebar'
                style={{background: rgb(theme.sidebarBg)}}
            >
                <i style={{background: rgb(theme.sidebarTextActiveBorder)}}/>
                <i style={{background: rgb(theme.sidebarFg)}}/>
                <i style={{background: rgb(theme.sidebarFg)}}/>
            </span>
            <span className='AppearancePanel__previewMain'>
                <i
                    className='AppearancePanel__previewTitle'
                    style={{background: rgb(theme.mainFg)}}
                />
                <span className='AppearancePanel__previewCards'>
                    <i style={{borderColor: `rgba(${theme.mainFg}, 0.12)`}}/>
                    <i style={{borderColor: `rgba(${theme.mainFg}, 0.12)`}}/>
                </span>
                <i
                    className='AppearancePanel__previewButton'
                    style={{background: rgb(theme.buttonBg)}}
                />
            </span>
        </span>
    )
}

type CustomColorProps = {
    value: string
    active: boolean
    label: string
    onChange: (hex: string) => void
}

// A swatch that opens the browser color picker, plus a hex field.
const CustomColor = (props: CustomColorProps) => {
    const [text, setText] = useState(props.value)
    useEffect(() => setText(props.value), [props.value])

    return (
        <span className='AppearancePanel__custom'>
            <label
                className={`AppearancePanel__swatch AppearancePanel__swatch--custom${props.active ? ' active' : ''}`}
                style={props.active ? {background: props.value} : undefined}
                title={props.label}
            >
                <input
                    type='color'
                    aria-label={props.label}
                    value={isHexColor(props.value) ? props.value : '#6c47ff'}
                    onChange={(e) => props.onChange(e.target.value)}
                />
                {props.active && <IconCheck size={14}/>}
            </label>
            <input
                className='AppearancePanel__hex'
                type='text'
                spellCheck={false}
                placeholder='#rrggbb'
                aria-label={`${props.label} hex`}
                value={text}
                maxLength={7}
                onChange={(e) => {
                    let next = e.target.value.trim()
                    if (next && !next.startsWith('#')) {
                        next = `#${next}`
                    }
                    setText(next)
                    if (isHexColor(next)) {
                        props.onChange(next.toLowerCase())
                    }
                }}
            />
        </span>
    )
}

const AppearancePanel = (props: Props): JSX.Element => {
    const intl = useIntl()
    const dispatch = useAppDispatch()
    const me = useAppSelector(getMe)
    const [appearance, setAppearanceState] = useState<Appearance>(getAppearance())
    const saveTimer = useRef<ReturnType<typeof setTimeout>>()

    // Save to the user's profile (debounced: the color picker fires on every drag).
    const saveToProfile = (next: Appearance) => {
        if (!me) {
            return
        }
        if (saveTimer.current) {
            clearTimeout(saveTimer.current)
        }
        saveTimer.current = setTimeout(async () => {
            const patchedProps = await octoClient.patchUserConfig(me.id, {
                updatedFields: {themeName: next.themeName, accentColor: next.accent, baseColor: next.base},
            })
            if (patchedProps) {
                dispatch(patchProps(patchedProps))
            }
        }, 500)
    }

    const update = (patch: Partial<Appearance>) => {
        const next = {...appearance, ...patch}
        setAppearance(next.themeName, next.accent, next.base)
        setAppearanceState(next)
        saveToProfile(next)
    }

    const customAccent = isHexColor(appearance.accent) ? appearance.accent : ''
    const isPresetBase = baseOptions.some((b) => b.hex === appearance.base)
    const customBase = appearance.base && !isPresetBase ? appearance.base : ''
    const label = (id: string, defaultMessage: string) => intl.formatMessage({id, defaultMessage})

    return (
        <AppModal
            className='AppearancePanel'
            title={label('Appearance.title', 'Appearance')}
            titleIcon={<IconPalette size={18}/>}
            width='720px'
            onClose={props.onClose}
            footerContent={(
                <>
                    <button
                        type='button'
                        className='AppearancePanel__reset'
                        onClick={() => update(defaultAppearance)}
                    >
                        <IconRefresh size={16}/>
                        <FormattedMessage
                            id='Appearance.reset'
                            defaultMessage='Reset to default'
                        />
                    </button>
                    <span className='AppearancePanel__spacer'/>
                    <button
                        type='button'
                        className='AppModal__save'
                        onClick={props.onClose}
                    >
                        <IconCheck size={17}/>
                        <FormattedMessage
                            id='Appearance.done'
                            defaultMessage='Done'
                        />
                    </button>
                </>
            )}
        >
            <section className='AppearancePanel__section'>
                <h3>
                    <FormattedMessage
                        id='Appearance.theme'
                        defaultMessage='Theme'
                    />
                </h3>
                <div className='AppearancePanel__themes'>
                    {themeOptions.map((option) => {
                        const active = appearance.themeName === option.id
                        return (
                            <button
                                key={option.id}
                                type='button'
                                className={`AppearancePanel__theme${active ? ' active' : ''}`}
                                aria-pressed={active}
                                onClick={() => update({themeName: option.id})}
                            >
                                {option.id === systemThemeName ? (
                                    <span className='AppearancePanel__previewSplit'>
                                        <ThemePreview
                                            themeName={defaultThemeName}
                                            accent={appearance.accent}
                                            base=''
                                        />
                                        <span className='AppearancePanel__previewSplitDark'>
                                            <ThemePreview
                                                themeName={midnightThemeName}
                                                accent={appearance.accent}
                                                base=''
                                            />
                                        </span>
                                    </span>
                                ) : (
                                    <ThemePreview
                                        themeName={option.id}
                                        accent={appearance.accent}
                                        base=''
                                    />
                                )}
                                <span className='AppearancePanel__themeName'>
                                    {label(`Sidebar.${option.id}`, option.displayName)}
                                    {active && <IconCheck size={14}/>}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </section>

            <section className='AppearancePanel__section'>
                <h3>
                    <FormattedMessage
                        id='Appearance.accent'
                        defaultMessage='Accent color'
                    />
                </h3>
                <p>
                    <FormattedMessage
                        id='Appearance.accent-help'
                        defaultMessage='Buttons, links, highlights and the active item in the sidebar.'
                    />
                </p>
                <div className='AppearancePanel__swatches'>
                    {accentOptions.map((option) => {
                        const active = appearance.accent === option.id
                        const name = label(`Sidebar.accent-${option.id}`, option.displayName)
                        return (
                            <button
                                key={option.id}
                                type='button'
                                title={name}
                                aria-label={name}
                                aria-pressed={active}
                                className={`AppearancePanel__swatch${option.id === themeAccentName ? ' AppearancePanel__swatch--theme' : ''}${active ? ' active' : ''}`}
                                style={option.light ? {background: rgb(option.light)} : undefined}
                                onClick={() => update({accent: option.id})}
                            >
                                {active && <IconCheck size={14}/>}
                            </button>
                        )
                    })}
                    <CustomColor
                        value={customAccent}
                        active={Boolean(customAccent)}
                        label={label('Appearance.custom-accent', 'Custom accent color')}
                        onChange={(hex) => update({accent: hex})}
                    />
                </div>
            </section>

            <section className='AppearancePanel__section'>
                <h3>
                    <FormattedMessage
                        id='Appearance.base'
                        defaultMessage='Base color'
                    />
                </h3>
                <p>
                    <FormattedMessage
                        id='Appearance.base-help'
                        defaultMessage='The background of the app. Text and surfaces adjust to stay readable.'
                    />
                </p>
                <div className='AppearancePanel__swatches'>
                    <button
                        type='button'
                        title={label('Appearance.base-theme', 'Theme default')}
                        aria-label={label('Appearance.base-theme', 'Theme default')}
                        aria-pressed={!appearance.base}
                        className={`AppearancePanel__swatch AppearancePanel__swatch--base AppearancePanel__swatch--themeBase${appearance.base ? '' : ' active'}`}
                        onClick={() => update({base: ''})}
                    >
                        {!appearance.base && <IconCheck size={14}/>}
                    </button>
                    {baseOptions.map((option) => {
                        const active = appearance.base === option.hex
                        const name = label(`Appearance.base-${option.id}`, option.displayName)
                        return (
                            <button
                                key={option.id}
                                type='button'
                                title={name}
                                aria-label={name}
                                aria-pressed={active}
                                className={`AppearancePanel__swatch AppearancePanel__swatch--base${active ? ' active' : ''}`}
                                style={{background: option.hex, color: color(option.hex).isDark() ? '#fff' : '#18181b'}}
                                onClick={() => update({base: option.hex})}
                            >
                                {active && <IconCheck size={14}/>}
                            </button>
                        )
                    })}
                    <CustomColor
                        value={customBase}
                        active={Boolean(customBase)}
                        label={label('Appearance.custom-base', 'Custom base color')}
                        onChange={(hex) => update({base: hex})}
                    />
                </div>
            </section>
        </AppModal>
    )
}

export default React.memo(AppearancePanel)
