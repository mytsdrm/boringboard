// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useState} from 'react'
import {FormattedMessage} from 'react-intl'

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
    logo: '',
    ai: {
        apiKey: '',
        enabled: false,
        provider: 'OpenAI',
    },
}

const SystemSettings = (): JSX.Element => {
    const [settings, setSettings] = useState<AdminSystemSettings>(defaultSettings)
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

    useEffect(() => {
        let canceled = false
        async function loadSettings() {
            const nextSettings = await octoClient.getAdminSystemSettings()
            if (!canceled) {
                setSettings(nextSettings)
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
            setSaveState('saved')
            window.setTimeout(() => setSaveState('idle'), 1500)
        } else {
            setSaveState('idle')
        }
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
                <label>
                    <span>
                        <FormattedMessage
                            id='SystemSettings.logo'
                            defaultMessage='Logo'
                        />
                    </span>
                    <input
                        onChange={(event) => setSettings({...settings, logo: event.target.value})}
                        placeholder='/static/boringboard-logo.webp'
                        value={settings.logo}
                    />
                </label>
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
