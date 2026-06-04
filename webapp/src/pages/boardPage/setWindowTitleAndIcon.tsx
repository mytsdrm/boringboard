// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {useEffect} from 'react'

import {BRANDING_UPDATED_EVENT, getStoredBranding, getStoredCustomBranding, SystemBranding} from '../../branding'
import {Utils} from '../../utils'
import {getCurrentBoard} from '../../store/boards'
import {getCurrentView} from '../../store/views'
import {useAppSelector} from '../../store/hooks'

const SetWindowTitleAndIcon = (): null => {
    const board = useAppSelector(getCurrentBoard)
    const activeView = useAppSelector(getCurrentView)

    useEffect(() => {
        if (board?.icon) {
            Utils.setFavicon(board.icon)
            return
        }

        const customBranding = getStoredCustomBranding()
        if (!customBranding) {
            return
        }

        const link = document.createElement('link') as HTMLLinkElement
        document.querySelectorAll("link[rel*='icon']").forEach((node) => node.remove())
        link.rel = 'shortcut icon'
        link.href = customBranding.logo
        document.getElementsByTagName('head')[0].appendChild(link)
    }, [board?.icon])

    useEffect(() => {
        if (board?.icon) {
            return undefined
        }

        const handleBrandingUpdated = (event: Event) => {
            const branding = (event as CustomEvent<SystemBranding>).detail || getStoredCustomBranding()
            if (!branding) {
                return
            }

            const link = document.createElement('link') as HTMLLinkElement
            document.querySelectorAll("link[rel*='icon']").forEach((node) => node.remove())
            link.rel = 'shortcut icon'
            link.href = branding.logo
            document.getElementsByTagName('head')[0].appendChild(link)
        }

        window.addEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdated)
        return () => window.removeEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdated)
    }, [board?.icon])

    useEffect(() => {
        if (board) {
            let title = `${board.title}`
            if (activeView?.title) {
                title += ` | ${activeView.title}`
            }
            document.title = title
        } else {
            document.title = getStoredBranding().appName
        }
    }, [board?.title, activeView?.title])

    return null
}

export default SetWindowTitleAndIcon
