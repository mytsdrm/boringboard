// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useState} from 'react'
import {FormattedMessage} from 'react-intl'

import {applySystemBranding, getBrandingFromSettings} from '../../branding'
import octoClient, {AdminSystemSettings} from '../../octoClient'

import './adminPages.scss'

const PROVIDERS = ['OpenAI', 'Gemini', 'Ollama']

const defaultProviderHints: {[key: string]: string} = {
    Gemini: 'Model: gemini-1.5-flash',
    Ollama: 'Endpoint: http://localhost:11434',
    OpenAI: 'Model: gpt-4o-mini',
}

const defaultSettings: AdminSystemSettings = {
    appName: 'BoringBoard',
    logo: '/static/boringboard-logo.webp',
    ai: {
        apiKey: '',
        enabled: false,
        provider: 'OpenAI',
    },
}

const SystemSettings = (): JSX.Element => {
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
            setSaveState('saved')
            window.setTimeout(() => setSaveState('idle'), 1500)
        } else {
            setSaveState('idle')
        }
    }
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
    let saveButtonText = 'Save'
    if (saveState === 'saving') {
        saveButtonText = 'Saving...'
    } else if (saveState === 'saved') {
        saveButtonText = 'Saved'
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
                            <span>
                                <FormattedMessage
                                    id='SystemSettings.app-name'
                                    defaultMessage='App Name'
                                />
                            </span>
                            <input
                                onChange={(event) => setSettings({...settings, appName: event.target.value})}
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
                                            {provider}
                                        </option>
                                    ))}
                                </select>
                                <small>{defaultProviderHints[settings.ai.provider]}</small>
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
