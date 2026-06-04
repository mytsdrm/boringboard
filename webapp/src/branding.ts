// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AdminSystemSettings} from './octoClient'

const DEFAULT_APP_NAME = 'BoringBoard'
const DEFAULT_LOGO = '/static/boringboard-logo.webp'
const BRANDING_STORAGE_KEY = 'boringboardSystemBranding'
export const BRANDING_UPDATED_EVENT = 'boringboard-branding-updated'

export type SystemBranding = {
    appName: string
    logo: string
}

export const getBrandingFromSettings = (settings?: Pick<AdminSystemSettings, 'appName' | 'logo'>): SystemBranding => {
    return {
        appName: settings?.appName?.trim() || DEFAULT_APP_NAME,
        logo: settings?.logo?.trim() || DEFAULT_LOGO,
    }
}

export const getStoredBranding = (): SystemBranding => {
    try {
        const storedBranding = window.localStorage.getItem(BRANDING_STORAGE_KEY)
        if (!storedBranding) {
            return getBrandingFromSettings()
        }

        return getBrandingFromSettings(JSON.parse(storedBranding) as SystemBranding)
    } catch {
        return getBrandingFromSettings()
    }
}

export const getStoredCustomBranding = (): SystemBranding | null => {
    try {
        const storedBranding = window.localStorage.getItem(BRANDING_STORAGE_KEY)
        if (storedBranding) {
            const branding = getBrandingFromSettings(JSON.parse(storedBranding) as SystemBranding)
            return branding.logo === DEFAULT_LOGO ? null : branding
        }

        return null
    } catch {
        return null
    }
}

const setImageFavicon = (logo: string): void => {
    document.querySelectorAll("link[rel*='icon']").forEach((node) => node.remove())

    const link = document.createElement('link') as HTMLLinkElement
    link.rel = 'shortcut icon'
    link.href = logo
    document.getElementsByTagName('head')[0].appendChild(link)
}

export const applySystemBranding = (settings?: Pick<AdminSystemSettings, 'appName' | 'logo'>): SystemBranding => {
    const branding = getBrandingFromSettings(settings)
    document.title = branding.appName
    setImageFavicon(branding.logo)
    window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding))
    window.dispatchEvent(new CustomEvent<SystemBranding>(BRANDING_UPDATED_EVENT, {detail: branding}))
    return branding
}
