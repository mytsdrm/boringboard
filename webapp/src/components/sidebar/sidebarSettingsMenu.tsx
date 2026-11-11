// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react'
import {IconPalette} from '@tabler/icons-react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Archiver} from '../../archiver'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'
import {useAppDispatch, useAppSelector} from '../../store/hooks'
import {storeLanguage} from '../../store/language'
import {getCurrentTeam, Team} from '../../store/teams'
import {initialLoad} from '../../store/initialLoad'
import {fetchSidebarCategories} from '../../store/sidebar'
import {UserSettings} from '../../userSettings'

import './sidebarSettingsMenu.scss'
import CheckIcon from '../../widgets/icons/check'
import {Constants} from '../../constants'

import TelemetryClient, {TelemetryCategory, TelemetryActions} from '../../telemetry/telemetryClient'

type Props = {
    activeTheme?: string
    onAppearanceOpen?: () => void
}

const SidebarSettingsMenu = (props: Props) => {
    const intl = useIntl()
    const dispatch = useAppDispatch()
    const currentTeam = useAppSelector<Team|null>(getCurrentTeam)

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
                    <Menu.Text
                        id='appearance'
                        icon={<IconPalette size={16}/>}
                        name={intl.formatMessage({id: 'Sidebar.appearance', defaultMessage: 'Appearance'})}
                        onClick={() => props.onAppearanceOpen?.()}
                    />
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
