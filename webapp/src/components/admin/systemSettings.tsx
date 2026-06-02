// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {applySystemBranding, getBrandingFromSettings} from '../../branding'
import octoClient, {AdminSystemSettings} from '../../octoClient'
import {applyProjectSystemSettings, DEFAULT_PROJECT_TIME_ZONE} from '../../systemSettings'

import './adminPages.scss'

const PROVIDERS = ['OpenAI', 'Gemini', 'Ollama']

const providerLabelIds: {[key: string]: string} = {
    Gemini: 'SystemSettings.provider-gemini',
    Ollama: 'SystemSettings.provider-ollama',
    OpenAI: 'SystemSettings.provider-openai',
}

const defaultProviderHintIds: {[key: string]: string} = {
    Gemini: 'SystemSettings.provider-gemini-hint',
    Ollama: 'SystemSettings.provider-ollama-hint',
    OpenAI: 'SystemSettings.provider-openai-hint',
}

const defaultProviderHintMessages: {[key: string]: string} = {
    Gemini: 'Model: gemini-1.5-flash',
    Ollama: 'Endpoint: http://localhost:11434',
    OpenAI: 'Model: gpt-4o-mini',
}

const defaultSettings: AdminSystemSettings = {
    appName: 'BoringBoard',
    logo: '/static/boringboard-logo.webp',
    timeZone: DEFAULT_PROJECT_TIME_ZONE,
    ai: {
        apiKey: '',
        enabled: false,
        provider: 'OpenAI',
    },
}

const fallbackTimeZones = [
    'Asia/Jakarta',
    'Asia/Singapore',
    'Asia/Kuala_Lumpur',
    'Asia/Bangkok',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Dubai',
    'Australia/Sydney',
    'Europe/London',
    'Europe/Paris',
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
]

const getTimeZoneOptions = (selectedTimeZone: string): string[] => {
    const intlWithSupportedValues = Intl as typeof Intl & {
        supportedValuesOf?: (key: 'timeZone') => string[]
    }
    const timeZones = intlWithSupportedValues.supportedValuesOf?.('timeZone') || fallbackTimeZones
    const normalizedSelectedTimeZone = selectedTimeZone || DEFAULT_PROJECT_TIME_ZONE

    return Array.from(new Set([normalizedSelectedTimeZone, ...timeZones])).sort((a, b) => a.localeCompare(b))
}

const SystemSettings = (): JSX.Element => {
    const intl = useIntl()
    const [settings, setSettings] = useState<AdminSystemSettings>(defaultSettings)
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
    const branding = getBrandingFromSettings(settings)

    useEffect(() => {
        let canceled = false
        async function loadSettings() {
            const nextSettings = await octoClient.getAdminSystemSettings()
            if (!canceled) {
                setSettings(nextSettings)
                applySystemBranding(nextSettings)
                applyProjectSystemSettings(nextSettings)
            }
        }
        loadSettings()
        return () => {
            canceled = true
        }
    }, [])

    const saveSettings = async () => {
        setSaveState('saving')
        const saved = await octoClient.saveAdminSystemSettings(settings)
        if (saved) {
            setSettings(saved)
            applySystemBranding(saved)
            applyProjectSystemSettings(saved)
            setSaveState('saved')
            window.setTimeout(() => setSaveState('idle'), 1500)
        } else {
            setSaveState('idle')
        }
    }
    const timeZoneOptions = getTimeZoneOptions(settings.timeZone)
    const uploadLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            const logo = typeof reader.result === 'string' ? reader.result : ''
            if (logo) {
                setSettings((currentSettings) => ({...currentSettings, logo}))
            }
        }
        reader.readAsDataURL(file)
    }
    let saveButtonText = intl.formatMessage({
        id: 'SystemSettings.save',
        defaultMessage: 'Save',
    })
    if (saveState === 'saving') {
        saveButtonText = intl.formatMessage({
            id: 'SystemSettings.saving',
            defaultMessage: 'Saving...',
        })
    } else if (saveState === 'saved') {
        saveButtonText = intl.formatMessage({
            id: 'SystemSettings.saved',
            defaultMessage: 'Saved',
        })
    }

    return (
        <div className='AdminPage'>
            <div className='admin-page-header'>
                <div className='admin-page-eyebrow'>
                    <FormattedMessage
                        id='SystemSettings.eyebrow'
                        defaultMessage='System Settings'
                    />
                </div>
                <h1>
                    <FormattedMessage
                        id='SystemSettings.title'
                        defaultMessage='System Settings'
                    />
                </h1>
            </div>
            <section className='admin-page-card admin-settings-form'>
                <div className='admin-settings-section admin-settings-branding'>
                    <div className='admin-settings-section-header'>
                        <h2>
                            <FormattedMessage
                                id='SystemSettings.branding-title'
                                defaultMessage='Branding'
                            />
                        </h2>
                        <p>
                            <FormattedMessage
                                id='SystemSettings.branding-description'
                                defaultMessage='Update the app name and logo used across the workspace.'
                            />
                        </p>
                    </div>
                    <div className='admin-settings-field-grid'>
                        <label>
                            <input
                                aria-label={intl.formatMessage({
                                    id: 'SystemSettings.app-name',
                                    defaultMessage: 'App Name',
                                })}
                                onChange={(event) => setSettings({...settings, appName: event.target.value})}
                                placeholder={intl.formatMessage({
                                    id: 'SystemSettings.app-name',
                                    defaultMessage: 'App Name',
                                })}
                                value={settings.appName}
                            />
                        </label>
                        <div className='admin-logo-upload'>
                            <span className='admin-settings-label'>
                                <FormattedMessage
                                    id='SystemSettings.logo'
                                    defaultMessage='Logo'
                                />
                            </span>
                            <div className='admin-logo-upload-body'>
                                <div className='admin-logo-preview'>
                                    <img
                                        src={branding.logo}
                                        alt={branding.appName}
                                    />
                                </div>
                                <div className='admin-logo-upload-actions'>
                                    <label className='admin-logo-upload-button'>
                                        <input
                                            accept='image/*'
                                            type='file'
                                            onChange={uploadLogo}
                                        />
                                        <FormattedMessage
                                            id='SystemSettings.upload-logo'
                                            defaultMessage='Upload logo'
                                        />
                                    </label>
                                    <button
                                        className='admin-logo-reset-button'
                                        type='button'
                                        onClick={() => setSettings({...settings, logo: defaultSettings.logo})}
                                    >
                                        <FormattedMessage
                                            id='SystemSettings.reset-logo'
                                            defaultMessage='Reset'
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='admin-settings-section'>
                    <div className='admin-settings-section-header'>
                        <h2>
                            <FormattedMessage
                                id='SystemSettings.time-zone'
                                defaultMessage='Time zone'
                            />
                        </h2>
                        <p>
                            <FormattedMessage
                                id='SystemSettings.time-zone-description'
                                defaultMessage='Choose the timezone used for project dates and activity logs.'
                            />
                        </p>
                    </div>
                    <div className='admin-settings-field-grid'>
                        <label>
                            <select
                                aria-label={intl.formatMessage({
                                    id: 'SystemSettings.time-zone',
                                    defaultMessage: 'Time zone',
                                })}
                                onChange={(event) => setSettings({...settings, timeZone: event.target.value})}
                                value={settings.timeZone || DEFAULT_PROJECT_TIME_ZONE}
                            >
                                {timeZoneOptions.map((timeZone) => (
                                    <option
                                        key={timeZone}
                                        value={timeZone}
                                    >
                                        {timeZone}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>
                <div className='admin-settings-section'>
                    <div className='admin-settings-section-header'>
                        <h2>
                            <FormattedMessage
                                id='SystemSettings.ai-title'
                                defaultMessage='AI'
                            />
                        </h2>
                        <p>
                            <FormattedMessage
                                id='SystemSettings.ai-description'
                                defaultMessage='Configure optional AI provider access.'
                            />
                        </p>
                    </div>
                    <div className='admin-ai-controls'>
                        <label className='admin-settings-checkbox'>
                            <input
                                checked={settings.ai.enabled}
                                onChange={(event) => setSettings({...settings, ai: {...settings.ai, enabled: event.target.checked}})}
                                type='checkbox'
                            />
                            <span>
                                <FormattedMessage
                                    id='SystemSettings.enable-ai'
                                    defaultMessage='Enable AI'
                                />
                            </span>
                        </label>
                        {settings.ai.enabled &&
                            <div className='admin-ai-settings'>
                                <label>
                                    <span>
                                        <FormattedMessage
                                            id='SystemSettings.provider'
                                            defaultMessage='Provider'
                                        />
                                    </span>
                                    <select
                                        onChange={(event) => setSettings({...settings, ai: {...settings.ai, provider: event.target.value}})}
                                        value={settings.ai.provider}
                                    >
                                        {PROVIDERS.map((provider) => (
                                            <option
                                                key={provider}
                                                value={provider}
                                            >
                                                {intl.formatMessage({
                                                    id: providerLabelIds[provider],
                                                    defaultMessage: provider,
                                                })}
                                            </option>
                                        ))}
                                    </select>
                                    <small>
                                        {intl.formatMessage({
                                            id: defaultProviderHintIds[settings.ai.provider],
                                            defaultMessage: defaultProviderHintMessages[settings.ai.provider],
                                        })}
                                    </small>
                                </label>
                                <label>
                                    <span>
                                        <FormattedMessage
                                            id='SystemSettings.api-key'
                                            defaultMessage='Api Key'
                                        />
                                    </span>
                                    <input
                                        onChange={(event) => setSettings({...settings, ai: {...settings.ai, apiKey: event.target.value}})}
                                        type='password'
                                        value={settings.ai.apiKey}
                                    />
                                </label>
                            </div>}
                    </div>
                </div>
                <div className='admin-page-actions'>
                    <button
                        disabled={saveState === 'saving'}
                        onClick={saveSettings}
                        type='button'
                    >
                        {saveButtonText}
                    </button>
                </div>
            </section>
        </div>
    )
}

export default React.memo(SystemSettings)
