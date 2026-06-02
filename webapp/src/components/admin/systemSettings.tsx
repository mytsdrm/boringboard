// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {applySystemBranding, getBrandingFromSettings} from '../../branding'
import octoClient, {AdminSystemSettings} from '../../octoClient'
import {applyProjectSystemSettings, DEFAULT_PROJECT_TIME_ZONE} from '../../systemSettings'

import './adminPages.scss'

const PROVIDERS = ['OpenAI', 'Gemini', 'Ollama', 'Cline', 'Anything LLM']

const providerModelOptions: {[key: string]: string[]} = {
    'Anything LLM': ['anythingllm'],
    Cline: ['anthropic/claude-sonnet-4-6', 'openai/gpt-4o', 'google/gemini-2.5-pro', 'deepseek/deepseek-chat', 'minimax/minimax-m2.5'],
    Gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    Ollama: ['llama3.1'],
    OpenAI: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
}

const providerLabelIds: {[key: string]: string} = {
    'Anything LLM': 'SystemSettings.provider-anythingllm',
    Cline: 'SystemSettings.provider-cline',
    Gemini: 'SystemSettings.provider-gemini',
    Ollama: 'SystemSettings.provider-ollama',
    OpenAI: 'SystemSettings.provider-openai',
}

const defaultProviderHintIds: {[key: string]: string} = {
    'Anything LLM': 'SystemSettings.provider-anythingllm-hint',
    Cline: 'SystemSettings.provider-cline-hint',
    Gemini: 'SystemSettings.provider-gemini-hint',
    Ollama: 'SystemSettings.provider-ollama-hint',
    OpenAI: 'SystemSettings.provider-openai-hint',
}

const defaultProviderHintMessages: {[key: string]: string} = {
    'Anything LLM': 'OpenAI-compatible AnythingLLM endpoint',
    Cline: 'OpenAI-compatible Cline endpoint',
    Gemini: 'Gemini hosted model',
    Ollama: 'Loaded from Ollama endpoint',
    OpenAI: 'OpenAI hosted model',
}

const defaultSettings: AdminSystemSettings = {
    appName: 'BoringBoard',
    logo: '/static/boringboard-logo.webp',
    timeZone: DEFAULT_PROJECT_TIME_ZONE,
    ai: {
        apiKey: '',
        enabled: false,
        model: providerModelOptions.OpenAI[0],
        ollamaEndpoint: 'http://localhost:11434',
        anythingLLMEndpoint: 'http://localhost:3001/api/v1',
        provider: 'OpenAI',
    },
    taskBoards: {
        enableInvitedUserEditProperty: false,
        enableInvitedUserShare: true,
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

const mergeWithDefaultSettings = (settings: AdminSystemSettings): AdminSystemSettings => ({
    ...defaultSettings,
    ...settings,
    ai: {
        ...defaultSettings.ai,
        ...(settings.ai || {}),
    },
    taskBoards: {
        ...defaultSettings.taskBoards,
        ...(settings.taskBoards || {}),
    },
})

const SystemSettings = (): JSX.Element => {
    const intl = useIntl()
    const [settings, setSettings] = useState<AdminSystemSettings>(defaultSettings)
    const [ollamaModels, setOllamaModels] = useState<string[]>(providerModelOptions.Ollama)
    const [providerModels, setProviderModels] = useState<{[key: string]: string[]}>({})
    const [isLoadingOllamaModels, setIsLoadingOllamaModels] = useState(false)
    const [isLoadingProviderModels, setIsLoadingProviderModels] = useState(false)
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
    const [saveError, setSaveError] = useState('')
    const branding = getBrandingFromSettings(settings)

    useEffect(() => {
        let canceled = false
        async function loadSettings() {
            const nextSettings = await octoClient.getAdminSystemSettings()
            if (!canceled) {
                const mergedSettings = mergeWithDefaultSettings(nextSettings)
                setSettings(mergedSettings)
                applySystemBranding(mergedSettings)
                applyProjectSystemSettings(mergedSettings)
            }
        }
        loadSettings()
        return () => {
            canceled = true
        }
    }, [])

    useEffect(() => {
        let canceled = false
        async function loadOllamaModels() {
            if (settings.ai.provider !== 'Ollama' || !settings.ai.enabled) {
                return
            }
            setIsLoadingOllamaModels(true)
            const models = await octoClient.getOllamaModels(settings.ai.ollamaEndpoint || defaultSettings.ai.ollamaEndpoint)
            if (!canceled) {
                const nextModels = models.length > 0 ? models : providerModelOptions.Ollama
                setOllamaModels(nextModels)
                setSettings((currentSettings) => {
                    if (currentSettings.ai.provider !== 'Ollama') {
                        return currentSettings
                    }
                    if (nextModels.includes(currentSettings.ai.model)) {
                        return currentSettings
                    }
                    return {...currentSettings, ai: {...currentSettings.ai, model: nextModels[0]}}
                })
                setIsLoadingOllamaModels(false)
            }
        }
        loadOllamaModels()
        return () => {
            canceled = true
        }
    }, [settings.ai.enabled, settings.ai.ollamaEndpoint, settings.ai.provider])

    useEffect(() => {
        let canceled = false
        const provider = settings.ai.provider
        const apiKey = settings.ai.apiKey.trim()

        if (!settings.ai.enabled || provider === 'Ollama' || !apiKey) {
            setIsLoadingProviderModels(false)
            return () => {
                canceled = true
            }
        }

        setIsLoadingProviderModels(true)
        const timeout = window.setTimeout(async () => {
            const models = await octoClient.getAIProviderModels(
                provider,
                apiKey,
                settings.ai.ollamaEndpoint || defaultSettings.ai.ollamaEndpoint,
                settings.ai.anythingLLMEndpoint || defaultSettings.ai.anythingLLMEndpoint,
            )
            if (canceled) {
                return
            }
            setProviderModels((currentModels) => ({...currentModels, [provider]: models}))
            if (models.length > 0) {
                setSettings((currentSettings) => {
                    if (currentSettings.ai.provider !== provider) {
                        return currentSettings
                    }
                    if (models.includes(currentSettings.ai.model)) {
                        return currentSettings
                    }
                    return {...currentSettings, ai: {...currentSettings.ai, model: models[0]}}
                })
            }
            setIsLoadingProviderModels(false)
        }, 500)

        return () => {
            canceled = true
            window.clearTimeout(timeout)
        }
    }, [settings.ai.anythingLLMEndpoint, settings.ai.apiKey, settings.ai.enabled, settings.ai.ollamaEndpoint, settings.ai.provider])

    const saveSettings = async () => {
        if (settings.ai.enabled && settings.ai.provider !== 'Ollama' && !settings.ai.apiKey.trim()) {
            setSaveError(intl.formatMessage({
                id: 'SystemSettings.api-key-required',
                defaultMessage: 'API key is required for this provider.',
            }))
            return
        }

        setSaveError('')
        setSaveState('saving')
        const aiSettings = settings.ai.enabled ? {
            ...settings.ai,
            anythingLLMEndpoint: settings.ai.anythingLLMEndpoint || defaultSettings.ai.anythingLLMEndpoint,
            model: settings.ai.model || providerModelOptions[settings.ai.provider]?.[0] || defaultSettings.ai.model,
            ollamaEndpoint: settings.ai.ollamaEndpoint || defaultSettings.ai.ollamaEndpoint,
        } : defaultSettings.ai
        const saved = await octoClient.saveAdminSystemSettings({
            ...settings,
            ai: aiSettings,
            taskBoards: {
                ...defaultSettings.taskBoards,
                ...settings.taskBoards,
            },
        })
        if (saved) {
            const mergedSettings = mergeWithDefaultSettings(saved)
            setSettings(mergedSettings)
            applySystemBranding(mergedSettings)
            applyProjectSystemSettings(mergedSettings)
            setSaveState('saved')
            window.setTimeout(() => setSaveState('idle'), 1500)
        } else {
            setSaveError(intl.formatMessage({
                id: 'SystemSettings.save-error',
                defaultMessage: 'Unable to save system settings.',
            }))
            setSaveState('idle')
        }
    }
    const timeZoneOptions = getTimeZoneOptions(settings.timeZone)
    const modelOptions = settings.ai.provider === 'Ollama' ? ollamaModels : (providerModels[settings.ai.provider] || [])
    const canShowModelSelect = settings.ai.provider === 'Ollama' || modelOptions.length > 0
    const updateAIProvider = (provider: string) => {
        const model = provider === 'Ollama' ? (ollamaModels[0] || providerModelOptions.Ollama[0]) : providerModelOptions[provider][0]
        setProviderModels({})
        setIsLoadingProviderModels(false)
        setSettings({...settings, ai: {...settings.ai, apiKey: '', model, provider}})
    }
    const updateAIApiKey = (apiKey: string) => {
        setProviderModels((currentModels) => {
            const remainingModels = {...currentModels}
            delete remainingModels[settings.ai.provider]
            return remainingModels
        })
        setSettings({...settings, ai: {...settings.ai, apiKey}})
    }
    const updateAIEnabled = (enabled: boolean) => {
        setProviderModels({})
        setIsLoadingProviderModels(false)
        setSettings({...settings, ai: enabled ? {...settings.ai, enabled} : defaultSettings.ai})
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
        <div className='AdminPage admin-system-settings-page'>
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
                <div className='admin-settings-scroll'>
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
                                    onChange={(event) => updateAIEnabled(event.target.checked)}
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
                                            onChange={(event) => updateAIProvider(event.target.value)}
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
                                    {canShowModelSelect &&
                                    <label>
                                        <span>
                                            <FormattedMessage
                                                id='SystemSettings.model'
                                                defaultMessage='Model'
                                            />
                                        </span>
                                        <select
                                            onChange={(event) => setSettings({...settings, ai: {...settings.ai, model: event.target.value}})}
                                            value={settings.ai.model || modelOptions[0]}
                                        >
                                            {modelOptions.map((model) => (
                                                <option
                                                    key={model}
                                                    value={model}
                                                >
                                                    {model}
                                                </option>
                                            ))}
                                        </select>
                                        {settings.ai.provider === 'Ollama' &&
                                            <small>
                                                {isLoadingOllamaModels ? (
                                                    <FormattedMessage
                                                        id='SystemSettings.loading-models'
                                                        defaultMessage='Loading models from endpoint...'
                                                    />
                                                ) : (
                                                    <FormattedMessage
                                                        id='SystemSettings.ollama-models-hint'
                                                        defaultMessage='Models are loaded from the Ollama endpoint.'
                                                    />
                                                )}
                                            </small>}
                                    </label>}
                                    {!canShowModelSelect && settings.ai.provider !== 'Ollama' &&
                                    <div className='admin-ai-model-status'>
                                        {isLoadingProviderModels ? (
                                            <FormattedMessage
                                                id='SystemSettings.validating-api-key'
                                                defaultMessage='Validating API key and loading models...'
                                            />
                                        ) : (
                                            <FormattedMessage
                                                id='SystemSettings.valid-api-key-required'
                                                defaultMessage='Enter a valid API key to load model options.'
                                            />
                                        )}
                                    </div>}
                                    <label>
                                        <span>
                                            <FormattedMessage
                                                id='SystemSettings.api-key'
                                                defaultMessage='Api Key'
                                            />
                                        </span>
                                        <input
                                            aria-required={settings.ai.enabled && settings.ai.provider !== 'Ollama'}
                                            onChange={(event) => updateAIApiKey(event.target.value)}
                                            required={settings.ai.enabled && settings.ai.provider !== 'Ollama'}
                                            type='password'
                                            value={settings.ai.apiKey}
                                        />
                                    </label>
                                    {settings.ai.provider === 'Ollama' &&
                                        <label className='admin-ai-ollama-endpoint'>
                                            <span>
                                                <FormattedMessage
                                                    id='SystemSettings.ollama-endpoint'
                                                    defaultMessage='Endpoint server'
                                                />
                                            </span>
                                            <input
                                                onChange={(event) => setSettings({...settings, ai: {...settings.ai, ollamaEndpoint: event.target.value}})}
                                                placeholder={defaultSettings.ai.ollamaEndpoint}
                                                required={settings.ai.provider === 'Ollama'}
                                                value={settings.ai.ollamaEndpoint || defaultSettings.ai.ollamaEndpoint}
                                            />
                                        </label>}
                                    {settings.ai.provider === 'Anything LLM' &&
                                        <label className='admin-ai-anythingllm-endpoint'>
                                            <span>
                                                <FormattedMessage
                                                    id='SystemSettings.anythingllm-endpoint'
                                                    defaultMessage='Anything LLM endpoint'
                                                />
                                            </span>
                                            <input
                                                onChange={(event) => setSettings({...settings, ai: {...settings.ai, anythingLLMEndpoint: event.target.value}})}
                                                placeholder={defaultSettings.ai.anythingLLMEndpoint}
                                                required={settings.ai.provider === 'Anything LLM'}
                                                value={settings.ai.anythingLLMEndpoint || defaultSettings.ai.anythingLLMEndpoint}
                                            />
                                        </label>}
                                </div>}
                        </div>
                    </div>
                    <div className='admin-settings-section'>
                        <div className='admin-settings-section-header'>
                            <h2>
                                <FormattedMessage
                                    id='SystemSettings.task-boards-title'
                                    defaultMessage='Task Boards'
                                />
                            </h2>
                        </div>
                        <div className='admin-task-board-controls'>
                            <label className='admin-settings-checkbox'>
                                <input
                                    checked={settings.taskBoards.enableInvitedUserShare}
                                    onChange={(event) => setSettings({
                                        ...settings,
                                        taskBoards: {
                                            ...settings.taskBoards,
                                            enableInvitedUserShare: event.target.checked,
                                        },
                                    })}
                                    type='checkbox'
                                />
                                <span>
                                    <FormattedMessage
                                        id='SystemSettings.enable-invited-user-share'
                                        defaultMessage='Enable Invited user to share task board'
                                    />
                                </span>
                            </label>
                            <label className='admin-settings-checkbox'>
                                <input
                                    checked={settings.taskBoards.enableInvitedUserEditProperty}
                                    onChange={(event) => setSettings({
                                        ...settings,
                                        taskBoards: {
                                            ...settings.taskBoards,
                                            enableInvitedUserEditProperty: event.target.checked,
                                        },
                                    })}
                                    type='checkbox'
                                />
                                <span>
                                    <FormattedMessage
                                        id='SystemSettings.enable-invited-user-edit-property'
                                        defaultMessage='Enable Invited to edit task board property'
                                    />
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
                {saveError &&
                    <div className='admin-settings-error'>
                        {saveError}
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
