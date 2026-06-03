// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AdminAISettings, AdminSystemSettings} from './octoClient'

export const DEFAULT_PROJECT_TIME_ZONE = 'Asia/Jakarta'
export const SYSTEM_SETTINGS_UPDATED_EVENT = 'boringboard-system-settings-updated'

const SYSTEM_SETTINGS_STORAGE_KEY = 'boringboardSystemSettings'

const DEFAULT_AI_SETTINGS: AdminAISettings = {
    anythingLLMEndpoint: 'http://localhost:3001/api/v1',
    apiKey: '',
    enabled: false,
    model: 'gpt-4o-mini',
    ollamaEndpoint: 'http://localhost:11434',
    outputLanguagePreference: 'English',
    provider: 'OpenAI',
}

export type ProjectSystemSettings = {
    ai: AdminAISettings
    timeZone: string
    taskBoards: {
        enableInvitedUserEditProperty: boolean
        enableInvitedUserShare: boolean
    }
}

const isValidTimeZone = (timeZone: string): boolean => {
    try {
        return Boolean(new Intl.DateTimeFormat(undefined, {timeZone}).resolvedOptions().timeZone)
    } catch {
        return false
    }
}

const normalizeTimeZone = (timeZone?: string): string => {
    const nextTimeZone = timeZone?.trim() || DEFAULT_PROJECT_TIME_ZONE
    return isValidTimeZone(nextTimeZone) ? nextTimeZone : DEFAULT_PROJECT_TIME_ZONE
}

export const getProjectSettingsFromSystemSettings = (settings?: Pick<AdminSystemSettings, 'ai' | 'timeZone' | 'taskBoards'>): ProjectSystemSettings => {
    return {
        ai: {
            ...DEFAULT_AI_SETTINGS,
            ...(settings?.ai || {}),
            apiKey: '',
        },
        taskBoards: {
            enableInvitedUserEditProperty: settings?.taskBoards?.enableInvitedUserEditProperty || false,
            enableInvitedUserShare: settings?.taskBoards?.enableInvitedUserShare ?? true,
        },
        timeZone: normalizeTimeZone(settings?.timeZone),
    }
}

export const getStoredProjectSystemSettings = (): ProjectSystemSettings => {
    try {
        const storedSettings = window.localStorage.getItem(SYSTEM_SETTINGS_STORAGE_KEY)
        if (!storedSettings) {
            return getProjectSettingsFromSystemSettings()
        }

        return getProjectSettingsFromSystemSettings(JSON.parse(storedSettings) as ProjectSystemSettings)
    } catch {
        return getProjectSettingsFromSystemSettings()
    }
}

export const applyProjectSystemSettings = (settings?: Pick<AdminSystemSettings, 'ai' | 'timeZone' | 'taskBoards'>): ProjectSystemSettings => {
    const projectSettings = getProjectSettingsFromSystemSettings(settings)
    window.localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(projectSettings))
    window.dispatchEvent(new CustomEvent<ProjectSystemSettings>(SYSTEM_SETTINGS_UPDATED_EVENT, {detail: projectSettings}))
    return projectSettings
}
