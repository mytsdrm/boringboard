// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Archiver} from '../../archiver'
import {
    accentOptions,
    getActiveAccentName,
    setAppearance,
    themeAccentName,
    themeOptions,
} from '../../theme'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'
import {useAppDispatch, useAppSelector} from '../../store/hooks'
import {storeLanguage} from '../../store/language'
import {getCurrentTeam, Team} from '../../store/teams'
import {initialLoad} from '../../store/initialLoad'
import {fetchSidebarCategories} from '../../store/sidebar'
import {UserSettings} from '../../userSettings'
import {getMe, patchProps} from '../../store/users'
import octoClient from '../../octoClient'

import './sidebarSettingsMenu.scss'
import CheckIcon from '../../widgets/icons/check'
import {Constants} from '../../constants'

import TelemetryClient, {TelemetryCategory, TelemetryActions} from '../../telemetry/telemetryClient'

type Props = {
    activeTheme: string
}

const SidebarSettingsMenu = (props: Props) => {
    const intl = useIntl()
    const dispatch = useAppDispatch()
    const currentTeam = useAppSelector<Team|null>(getCurrentTeam)

    const me = useAppSelector(getMe)

    // we need this as the sidebar doesn't always need to re-render
    // on theme change. This can cause props and the actual
    // active theme can go out of sync
    const [themeName, setThemeName] = useState(props.activeTheme)
    const [accentName, setAccentName] = useState(getActiveAccentName())

    // Applies the choice right away and saves it to the user's profile so it
    // follows them to other browsers and devices.
    const updateAppearance = async (newThemeName: string, newAccentName: string) => {
        setAppearance(newThemeName, newAccentName)
        setThemeName(newThemeName)
        setAccentName(newAccentName)
        if (me) {
            const patchedProps = await octoClient.patchUserConfig(me.id, {
                updatedFields: {themeName: newThemeName, accentColor: newAccentName},
            })
            if (patchedProps) {
                dispatch(patchProps(patchedProps))
            }
        }
    }

    const [randomIcons, setRandomIcons] = useState(UserSettings.prefillRandomIcons)
    const toggleRandomIcons = () => {
        UserSettings.prefillRandomIcons = !UserSettings.prefillRandomIcons
        setRandomIcons(!randomIcons)
    }

    return (
        <div className='SidebarSettingsMenu'>
            <MenuWrapper>
                <div className='menu-entry'>
                    <FormattedMessage
                        id='Sidebar.settings'
                        defaultMessage='Settings'
                    />
                </div>
                <Menu position='top'>
                    <Menu.SubMenu
                        id='import'
                        name={intl.formatMessage({id: 'Sidebar.import', defaultMessage: 'Import'})}
                        position='top'
                    >
                        <Menu.Text
                            id='import_archive'
                            name={intl.formatMessage({id: 'Sidebar.import-archive', defaultMessage: 'Import archive'})}
                            onClick={async () => {
                                TelemetryClient.trackEvent(TelemetryCategory, TelemetryActions.ImportArchive)
                                Archiver.importFullArchive(() => {
                                    dispatch(initialLoad())
                                    if (currentTeam) {
                                        dispatch(fetchSidebarCategories(currentTeam.id))
                                    }
                                })
                            }}
                        />
                        {
                            Constants.imports.map((i) => (
                                <Menu.Text
                                    key={`${i.id}-import`}
                                    id={`${i.id}-import`}
                                    name={i.displayName}
                                    onClick={() => {
                                        TelemetryClient.trackEvent(TelemetryCategory, i.telemetryName)
                                        window.open(i.href)
                                    }}
                                />
                            ))
                        }
                    </Menu.SubMenu>
                    <Menu.Text
                        id='export'
                        name={intl.formatMessage({id: 'Sidebar.export-archive', defaultMessage: 'Export archive'})}
                        onClick={async () => {
                            if (currentTeam) {
                                TelemetryClient.trackEvent(TelemetryCategory, TelemetryActions.ExportArchive)
                                Archiver.exportFullArchive(currentTeam.id)
                            }
                        }}
                    />
                    <Menu.SubMenu
                        id='lang'
                        name={intl.formatMessage({id: 'Sidebar.set-language', defaultMessage: 'Set language'})}
                        position='top'
                    >
                        {
                            Constants.languages.map((language) => (
                                <Menu.Text
                                    key={language.code}
                                    id={`${language.name}-lang`}
                                    name={language.displayName}
                                    onClick={async () => dispatch(storeLanguage(language.code))}
                                    rightIcon={intl.locale.toLowerCase() === language.code ? <CheckIcon/> : null}
                                />
                            ))
                        }
                    </Menu.SubMenu>
                    <Menu.SubMenu
                        id='theme'
                        name={intl.formatMessage({id: 'Sidebar.set-theme', defaultMessage: 'Set theme'})}
                        position='top'
                    >
                        {
                            themeOptions.map((theme) =>
                                (
                                    <Menu.Text
                                        key={theme.id}
                                        id={theme.id}
                                        name={intl.formatMessage({id: `Sidebar.${theme.id}`, defaultMessage: theme.displayName})}
                                        icon={
                                            <span
                                                className='SidebarSettingsMenu__theme-preview'
                                                style={{background: `linear-gradient(135deg, ${theme.preview[1]} 0 50%, ${theme.preview[0]} 50% 100%)`}}
                                            >
                                                <span style={{background: theme.preview[2]}}/>
                                            </span>
                                        }
                                        onClick={async () => updateAppearance(theme.id, accentName)}
                                        rightIcon={themeName === theme.id ? <CheckIcon/> : null}
                                    />
                                ),
                            )
                        }
                    </Menu.SubMenu>
                    <Menu.SubMenu
                        id='accent'
                        name={intl.formatMessage({id: 'Sidebar.accent-color', defaultMessage: 'Accent color'})}
                        position='top'
                    >
                        {
                            accentOptions.map((accent) =>
                                (
                                    <Menu.Text
                                        key={accent.id}
                                        id={`accent-${accent.id}`}
                                        name={intl.formatMessage({id: `Sidebar.accent-${accent.id}`, defaultMessage: accent.displayName})}
                                        icon={
                                            <span
                                                className={`SidebarSettingsMenu__accent-swatch${accent.id === themeAccentName ? ' SidebarSettingsMenu__accent-swatch--theme' : ''}`}
                                                style={accent.light ? {background: `rgb(${accent.light})`} : undefined}
                                            />
                                        }
                                        onClick={async () => updateAppearance(themeName, accent.id)}
                                        rightIcon={accentName === accent.id ? <CheckIcon/> : null}
                                    />
                                ),
                            )
                        }
                    </Menu.SubMenu>
                    <Menu.Switch
                        id='random-icons'
                        name={intl.formatMessage({id: 'Sidebar.random-icons', defaultMessage: 'Random icons'})}
                        isOn={randomIcons}
                        onClick={async () => toggleRandomIcons()}
                        suppressItemClicked={true}
                    />
                </Menu>
            </MenuWrapper>
        </div>
    )
}

export default React.memo(SidebarSettingsMenu)
