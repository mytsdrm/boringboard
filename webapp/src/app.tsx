// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect} from 'react'
import {IntlProvider} from 'react-intl'
import {DndProvider} from 'react-dnd'
import {HTML5Backend} from 'react-dnd-html5-backend'
import {TouchBackend} from 'react-dnd-touch-backend'
import {History} from 'history'

import TelemetryClient from './telemetry/telemetryClient'

import {getMessages} from './i18n'
import {FlashMessages} from './components/flashMessages'
import NewVersionBanner from './components/newVersionBanner'
import AnnouncementModal from './components/announcementModal'
import {Utils} from './utils'
import {fetchMe, getMe, getMyConfig} from './store/users'
import {getLanguage, fetchLanguage} from './store/language'
import {useAppSelector, useAppDispatch} from './store/hooks'
import {fetchClientConfig} from './store/clientConfig'
import FocalboardRouter from './router'
import octoClient from './octoClient'
import {applySystemBranding, getStoredCustomBranding} from './branding'
import {getActiveAccentName, getActiveBaseColor, getActiveThemeName, setAppearance} from './theme'
import {getActiveLayoutName, setLayout} from './layout'
import LayoutChrome from './components/appearance/layoutChrome'

import {IUser} from './user'

type Props = {
    history?: History<unknown>
}

const App = (props: Props): JSX.Element => {
    const language = useAppSelector<string>(getLanguage)
    const me = useAppSelector<IUser|null>(getMe)
    const myConfig = useAppSelector(getMyConfig)
    const dispatch = useAppDispatch()

    useEffect(() => {
        dispatch(fetchLanguage())
        dispatch(fetchMe())
        dispatch(fetchClientConfig())

        const cachedCustomBranding = getStoredCustomBranding()
        if (cachedCustomBranding) {
            applySystemBranding(cachedCustomBranding)
        }

        async function loadSystemBranding() {
            const branding = await octoClient.getSystemBranding()
            applySystemBranding(branding)
        }
        loadSystemBranding()
    }, [])

    useEffect(() => {
        if (me) {
            TelemetryClient.setUser(me)
        }
    }, [me])

    // The appearance saved on the user's profile wins over this browser's
    // copy, so the choice follows them across devices.
    const savedThemeName = myConfig.themeName?.value
    const savedAccentName = myConfig.accentColor?.value
    const savedBaseColor = myConfig.baseColor?.value
    useEffect(() => {
        if (!savedThemeName && !savedAccentName && savedBaseColor === undefined) {
            return
        }
        const themeName = savedThemeName || getActiveThemeName()
        const accentName = savedAccentName || getActiveAccentName()
        const baseColor = savedBaseColor ?? getActiveBaseColor()
        if (themeName !== getActiveThemeName() || accentName !== getActiveAccentName() || baseColor !== getActiveBaseColor()) {
            setAppearance(themeName, accentName, baseColor)
        }
    }, [savedThemeName, savedAccentName, savedBaseColor])

    const savedLayoutName = myConfig.layoutName?.value
    useEffect(() => {
        if (savedLayoutName && savedLayoutName !== getActiveLayoutName()) {
            setLayout(savedLayoutName)
        }
    }, [savedLayoutName])

    return (
        <IntlProvider
            locale={language.split(/[_]/)[0]}
            messages={getMessages(language)}
        >
            <DndProvider backend={Utils.isMobile() ? TouchBackend : HTML5Backend}>
                <FlashMessages milliseconds={2000}/>
                <div id='frame'>
                    <div id='main'>
                        <NewVersionBanner/>
                        {me && <LayoutChrome position='top'/>}
                        <FocalboardRouter history={props.history}/>
                        {me && <LayoutChrome position='bottom'/>}
                        <AnnouncementModal me={me}/>
                    </div>
                </div>
            </DndProvider>
        </IntlProvider>
    )
}

export default React.memo(App)
