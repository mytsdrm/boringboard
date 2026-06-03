// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {IconEyeSearch} from '@tabler/icons-react'

import octoClient, {AdminAISettings, TaskBoardColumnPreview, TaskBoardPreview, TaskBoardPreviewLanguage} from '../../octoClient'
import mutator from '../../mutator'
import Dialog from '../dialog'
import Button from '../../widgets/buttons/button'
import CompassIcon from '../../widgets/icons/compassIcon'
import {buildTaskBoardFromPreview, taskBoardDefaultStatusColumns, taskBoardPreviewIcon, taskBoardTaskIcon} from '../../ai/taskBoardBuilder'
import {StoredIcon} from '../icons/storedIcon'
import {getStoredProjectSystemSettings, ProjectSystemSettings, SYSTEM_SETTINGS_UPDATED_EVENT} from '../../systemSettings'

import './createTaskBoardFromCommand.scss'

type Props = {
    channelId?: string
    className?: string
    teamId: string
    triggerLabel?: React.ReactNode
    onCreated: (boardId: string) => Promise<void>
}

const taskBoardViewOptions = [
    {value: 'board', label: 'Board View'},
    {value: 'calendar', label: 'Calendar View'},
    {value: 'table', label: 'Table View'},
    {value: 'gallery', label: 'Gallery View'},
]

const defaultTaskBoardViews = taskBoardViewOptions.map((view) => view.value)
const languageOptions: TaskBoardPreviewLanguage[] = ['English', 'Indonesia']
const defaultTaskBoardLanguage: TaskBoardPreviewLanguage = 'English'
const statusColorOptions = [
    {value: 'propColorGray', label: 'Gray'},
    {value: 'propColorPurple', label: 'Purple'},
    {value: 'propColorBlue', label: 'Blue'},
    {value: 'propColorOrange', label: 'Orange'},
    {value: 'propColorYellow', label: 'Yellow'},
    {value: 'propColorGreen', label: 'Green'},
    {value: 'propColorPink', label: 'Pink'},
    {value: 'propColorRed', label: 'Red'},
    {value: 'propColorBrown', label: 'Brown'},
]
const defaultTaskBoardStatuses: TaskBoardColumnPreview[] = taskBoardDefaultStatusColumns.map((status) => ({...status}))
const maxTaskBoardStatuses = 12

const normalizeTaskBoardLanguage = (language?: string): TaskBoardPreviewLanguage => {
    return language === 'Indonesia' ? 'Indonesia' : defaultTaskBoardLanguage
}

const CreateTaskBoardFromCommand = (props: Props): JSX.Element => {
    const intl = useIntl()
    const [command, setCommand] = useState('')
    const [preview, setPreview] = useState<TaskBoardPreview|null>(null)
    const [error, setError] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [aiSettings, setAISettings] = useState<AdminAISettings|null>(getStoredProjectSystemSettings().ai)
    const [selectedViews, setSelectedViews] = useState<string[]>(defaultTaskBoardViews)
    const [language, setLanguage] = useState<TaskBoardPreviewLanguage>(normalizeTaskBoardLanguage(aiSettings?.outputLanguagePreference))
    const [statusOptions, setStatusOptions] = useState<TaskBoardColumnPreview[]>(defaultTaskBoardStatuses)
    const [selectedStatusNames, setSelectedStatusNames] = useState<string[]>(defaultTaskBoardStatuses.map((status) => status.name))
    const [newStatusName, setNewStatusName] = useState('')
    const [shouldScrollToPreview, setShouldScrollToPreview] = useState(false)
    const previewRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let canceled = false
        async function loadAISettings() {
            const settings = await octoClient.getSystemSettings()
            if (!canceled) {
                setAISettings(settings.ai)
                setLanguage(normalizeTaskBoardLanguage(settings.ai.outputLanguagePreference))
            }
        }

        const handleSystemSettingsUpdated = (event: Event) => {
            const settings = (event as CustomEvent<ProjectSystemSettings>).detail
            const nextAISettings = settings?.ai || getStoredProjectSystemSettings().ai
            setAISettings(nextAISettings)
            setLanguage(normalizeTaskBoardLanguage(nextAISettings.outputLanguagePreference))
        }

        window.addEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSystemSettingsUpdated)
        loadAISettings()
        return () => {
            canceled = true
            window.removeEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSystemSettingsUpdated)
        }
    }, [])

    useEffect(() => {
        if (!preview || !shouldScrollToPreview) {
            return
        }
        previewRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'})
        setShouldScrollToPreview(false)
    }, [preview, shouldScrollToPreview])

    const resetForm = () => {
        setCommand('')
        setPreview(null)
        setError('')
        setSelectedViews(defaultTaskBoardViews)
        setLanguage(normalizeTaskBoardLanguage(aiSettings?.outputLanguagePreference))
        setStatusOptions(defaultTaskBoardStatuses)
        setSelectedStatusNames(defaultTaskBoardStatuses.map((status) => status.name))
        setNewStatusName('')
        setShouldScrollToPreview(false)
    }

    const closeModal = () => {
        if (isGenerating || isCreating) {
            return
        }
        setIsOpen(false)
        resetForm()
    }

    const clearPreviewForOptionChange = () => {
        setPreview(null)
        setError('')
    }

    const toggleSelectedView = (view: string) => {
        setSelectedViews((currentViews) => {
            const nextViews = currentViews.includes(view) ? currentViews.filter((currentView) => currentView !== view) : [...currentViews, view]
            return taskBoardViewOptions.map((option) => option.value).filter((option) => nextViews.includes(option))
        })
        clearPreviewForOptionChange()
    }

    const updateLanguage = (nextLanguage: TaskBoardPreviewLanguage) => {
        setLanguage(nextLanguage)
        clearPreviewForOptionChange()
    }

    const selectedStatuses = statusOptions.filter((status) => selectedStatusNames.includes(status.name))

    const toggleSelectedStatus = (statusName: string) => {
        setSelectedStatusNames((currentStatusNames) => {
            if (currentStatusNames.includes(statusName)) {
                return currentStatusNames.filter((currentStatusName) => currentStatusName !== statusName)
            }
            return statusOptions.map((status) => status.name).filter((name) => [...currentStatusNames, statusName].includes(name))
        })
        clearPreviewForOptionChange()
    }

    const updateStatusColor = (statusName: string, color: string) => {
        setStatusOptions((currentStatuses) => currentStatuses.map((status) => {
            if (status.name !== statusName) {
                return status
            }
            return {...status, color}
        }))
        clearPreviewForOptionChange()
    }

    const addStatus = () => {
        const name = newStatusName.trim()
        if (!name || statusOptions.length >= maxTaskBoardStatuses || statusOptions.some((status) => status.name.toLowerCase() === name.toLowerCase())) {
            return
        }
        const nextColor = statusColorOptions[statusOptions.length % statusColorOptions.length].value
        setStatusOptions((currentStatuses) => [...currentStatuses, {color: nextColor, name}])
        setSelectedStatusNames((currentStatusNames) => [...currentStatusNames, name])
        setNewStatusName('')
        clearPreviewForOptionChange()
    }

    const generatePreview = async () => {
        const trimmedCommand = command.trim()
        if (isGenerating) {
            return
        }
        if (!trimmedCommand) {
            setError(intl.formatMessage({id: 'CreateTaskBoardFromCommand.command-required', defaultMessage: 'Enter a command first.'}))
            return
        }
        if (selectedViews.length === 0) {
            setError(intl.formatMessage({id: 'CreateTaskBoardFromCommand.views-required', defaultMessage: 'Select at least one view.'}))
            return
        }
        if (selectedStatuses.length === 0) {
            setError(intl.formatMessage({id: 'CreateTaskBoardFromCommand.statuses-required', defaultMessage: 'Select at least one status.'}))
            return
        }

        setError('')
        setIsGenerating(true)
        try {
            const nextPreview = await octoClient.createTaskBoardPreview(trimmedCommand, selectedViews, language, selectedStatuses)
            if (!nextPreview) {
                setPreview(null)
                setError(intl.formatMessage({id: 'CreateTaskBoardFromCommand.preview-error', defaultMessage: 'Unable to generate a preview. Check AI settings and try again.'}))
                return
            }
            setPreview(nextPreview)
            setShouldScrollToPreview(true)
        } catch {
            setPreview(null)
            setError(intl.formatMessage({id: 'CreateTaskBoardFromCommand.preview-error', defaultMessage: 'Unable to generate a preview. Check AI settings and try again.'}))
        } finally {
            setIsGenerating(false)
        }
    }

    const updatePreviewTitle = (title: string) => {
        if (!preview || !preview.title.trim()) {
            return
        }
        setPreview({
            ...preview,
            title,
        })
    }

    const createBoard = async () => {
        if (!preview) {
            return
        }
        setIsCreating(true)
        setError('')
        const boardsAndBlocks = await mutator.createBoardsAndBlocks(
            buildTaskBoardFromPreview(preview, props.teamId),
            intl.formatMessage({id: 'CreateTaskBoardFromCommand.create-description', defaultMessage: 'create ai task board'}),
            async (createdBoardsAndBlocks) => {
                const board = createdBoardsAndBlocks.boards[0]
                if (board && props.channelId) {
                    await mutator.updateBoard({...board, channelId: props.channelId}, board, 'linked channel')
                }
                await props.onCreated(board?.id || '')
                setIsOpen(false)
                resetForm()
            },
        )
        setIsCreating(false)
        if (!boardsAndBlocks?.boards?.length) {
            setError(intl.formatMessage({id: 'CreateTaskBoardFromCommand.create-error', defaultMessage: 'Unable to create task board from preview.'}))
        }
    }

    return (
        <div className={`CreateTaskBoardFromCommand ${props.className || ''}`}>
            <Button
                emphasis='secondary'
                size='medium'
                className='ai-open-button'
                onClick={() => setIsOpen(true)}
                icon={<CompassIcon icon='sparkles'/>}
            >
                {props.triggerLabel || (
                    <FormattedMessage
                        id='CreateTaskBoardFromCommand.title'
                        defaultMessage='Create With AI'
                    />
                )}
            </Button>
            {isOpen &&
                <Dialog
                    className='CreateTaskBoardFromCommandModal'
                    onClose={closeModal}
                    title={(
                        <FormattedMessage
                            id='CreateTaskBoardFromCommand.title'
                            defaultMessage='Create With AI'
                        />
                    )}
                    subtitle={(
                        <React.Fragment>
                            <FormattedMessage
                                id='CreateTaskBoardFromCommand.description'
                                defaultMessage='Describe the task board you want. AI will generate a preview before anything is created.'
                            />
                            {aiSettings &&
                                <div className='ai-command-provider-meta'>
                                    <span>
                                        <FormattedMessage
                                            id='CreateTaskBoardFromCommand.provider'
                                            defaultMessage='Provider'
                                        />
                                        {': '}
                                        <strong>{aiSettings.provider}</strong>
                                    </span>
                                    <span>
                                        <FormattedMessage
                                            id='CreateTaskBoardFromCommand.model'
                                            defaultMessage='Model'
                                        />
                                        {': '}
                                        <strong>{aiSettings.model || '-'}</strong>
                                    </span>
                                </div>}
                        </React.Fragment>
                    )}
                >
                    {isGenerating &&
                        <div
                            className='ai-command-loader'
                            role='status'
                        >
                            <span/>
                            <FormattedMessage
                                id='CreateTaskBoardFromCommand.generating'
                                defaultMessage='Generating...'
                            />
                        </div>}
                    <div className='ai-command-modal-body'>
                        <div className='ai-command-input-area'>
                            <textarea
                                value={command}
                                onChange={(event) => setCommand(event.target.value)}
                                placeholder={intl.formatMessage({id: 'CreateTaskBoardFromCommand.placeholder', defaultMessage: 'Create a product launch task board with planning, execution, review, and done columns.'})}
                            />
                        </div>
                        <div className='ai-command-options'>
                            <div className='ai-command-option-group'>
                                <span>
                                    <FormattedMessage
                                        id='CreateTaskBoardFromCommand.view-options'
                                        defaultMessage='Views'
                                    />
                                </span>
                                <div className='ai-command-view-list'>
                                    {taskBoardViewOptions.map((view) => (
                                        <label key={view.value}>
                                            <input
                                                type='checkbox'
                                                checked={selectedViews.includes(view.value)}
                                                onChange={() => toggleSelectedView(view.value)}
                                                disabled={isGenerating || isCreating}
                                            />
                                            {view.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <label className='ai-command-option-group ai-command-language-option'>
                                <span>
                                    <FormattedMessage
                                        id='CreateTaskBoardFromCommand.language'
                                        defaultMessage='Language preference'
                                    />
                                </span>
                                <select
                                    value={language}
                                    onChange={(event) => updateLanguage(event.target.value as TaskBoardPreviewLanguage)}
                                    disabled={isGenerating || isCreating}
                                >
                                    {languageOptions.map((option) => (
                                        <option
                                            key={option}
                                            value={option}
                                        >
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className='ai-command-option-group ai-command-status-option'>
                            <span>
                                <FormattedMessage
                                    id='CreateTaskBoardFromCommand.status-options'
                                    defaultMessage='Statuses'
                                />
                            </span>
                            <div className='ai-command-status-list'>
                                {statusOptions.map((status) => (
                                    <div
                                        className='ai-command-status-row'
                                        key={status.name}
                                    >
                                        <label>
                                            <input
                                                type='checkbox'
                                                checked={selectedStatusNames.includes(status.name)}
                                                onChange={() => toggleSelectedStatus(status.name)}
                                                disabled={isGenerating || isCreating}
                                            />
                                            {status.name}
                                        </label>
                                        <span className={`ai-command-status-color-swatch ${status.color}`}/>
                                        <select
                                            value={status.color}
                                            onChange={(event) => updateStatusColor(status.name, event.target.value)}
                                            disabled={isGenerating || isCreating}
                                            aria-label={intl.formatMessage({id: 'CreateTaskBoardFromCommand.status-color', defaultMessage: 'Status color'})}
                                        >
                                            {statusColorOptions.map((color) => (
                                                <option
                                                    key={color.value}
                                                    value={color.value}
                                                >
                                                    {color.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className='ai-command-add-status'>
                                <input
                                    value={newStatusName}
                                    onChange={(event) => setNewStatusName(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault()
                                            addStatus()
                                        }
                                    }}
                                    placeholder={intl.formatMessage({id: 'CreateTaskBoardFromCommand.add-status-placeholder', defaultMessage: 'Add status'})}
                                    disabled={isGenerating || isCreating}
                                />
                                <Button
                                    size='small'
                                    onClick={addStatus}
                                    disabled={!newStatusName.trim() || statusOptions.length >= maxTaskBoardStatuses || isGenerating || isCreating}
                                >
                                    <FormattedMessage
                                        id='CreateTaskBoardFromCommand.add-status'
                                        defaultMessage='Add'
                                    />
                                </Button>
                            </div>
                        </div>
                        {error &&
                            <div className='ai-command-error'>
                                {error}
                            </div>}
                        {preview &&
                            <div
                                className='ai-preview'
                                ref={previewRef}
                            >
                                <div className='ai-preview-heading'>
                                    <div className='ai-preview-board-icon'>
                                        <StoredIcon icon={taskBoardPreviewIcon(preview)}/>
                                    </div>
                                    <div>
                                        <span className='ai-preview-kicker'>
                                            <FormattedMessage
                                                id='CreateTaskBoardFromCommand.preview'
                                                defaultMessage='Preview'
                                            />
                                        </span>
                                        <input
                                            className='ai-preview-title-input'
                                            value={preview.title}
                                            onChange={(event) => updatePreviewTitle(event.target.value)}
                                            placeholder={intl.formatMessage({id: 'CreateTaskBoardFromCommand.preview-title-placeholder', defaultMessage: 'Task board title'})}
                                            aria-label={intl.formatMessage({id: 'CreateTaskBoardFromCommand.preview-title', defaultMessage: 'Preview title'})}
                                            disabled={isCreating}
                                        />
                                        <p>{preview.description}</p>
                                    </div>
                                </div>
                                <div className='ai-preview-metrics'>
                                    <div>
                                        <strong>{preview.views.length}</strong>
                                        <span>
                                            <FormattedMessage
                                                id='CreateTaskBoardFromCommand.views'
                                                defaultMessage='Views'
                                            />
                                        </span>
                                    </div>
                                    <div>
                                        <strong>{preview.columns.length}</strong>
                                        <span>
                                            <FormattedMessage
                                                id='CreateTaskBoardFromCommand.columns'
                                                defaultMessage='Columns'
                                            />
                                        </span>
                                    </div>
                                    <div>
                                        <strong>{preview.tasks.length}</strong>
                                        <span>
                                            <FormattedMessage
                                                id='CreateTaskBoardFromCommand.tasks'
                                                defaultMessage='Starter tasks'
                                            />
                                        </span>
                                    </div>
                                </div>
                                <div className='ai-preview-section'>
                                    <span>
                                        <FormattedMessage
                                            id='CreateTaskBoardFromCommand.views'
                                            defaultMessage='Views'
                                        />
                                    </span>
                                    <div className='ai-preview-pills'>
                                        {preview.views.map((view) => <strong key={view}>{view}</strong>)}
                                    </div>
                                </div>
                                <div className='ai-preview-section'>
                                    <span>
                                        <FormattedMessage
                                            id='CreateTaskBoardFromCommand.columns'
                                            defaultMessage='Columns'
                                        />
                                    </span>
                                    <div className='ai-preview-columns'>
                                        {preview.columns.map((column, index) => (
                                            <div
                                                className='ai-preview-column'
                                                key={column.name}
                                            >
                                                <span>{index + 1}</span>
                                                <strong>{column.name}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className='ai-preview-section'>
                                    <span>
                                        <FormattedMessage
                                            id='CreateTaskBoardFromCommand.tasks'
                                            defaultMessage='Starter tasks'
                                        />
                                    </span>
                                    <div className='ai-preview-tasks'>
                                        {preview.tasks.length === 0 &&
                                            <em>
                                                <FormattedMessage
                                                    id='CreateTaskBoardFromCommand.no-tasks'
                                                    defaultMessage='No starter tasks suggested.'
                                                />
                                            </em>}
                                        {preview.tasks.map((task) => (
                                            <div
                                                className='ai-preview-task'
                                                key={`${task.column}-${task.title}`}
                                            >
                                                <div className='ai-preview-task-title'>
                                                    <span>
                                                        <StoredIcon icon={taskBoardTaskIcon(task.title)}/>
                                                    </span>
                                                    <strong>{task.title}</strong>
                                                </div>
                                                <span>{task.column}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>}
                    </div>
                    <div className='ai-preview-actions'>
                        <Button
                            size='medium'
                            className='ai-action-cancel'
                            onClick={closeModal}
                            disabled={isGenerating || isCreating}
                            icon={<CompassIcon icon='close'/>}
                        >
                            <FormattedMessage
                                id='CreateTaskBoardFromCommand.cancel-preview'
                                defaultMessage='Cancel'
                            />
                        </Button>
                        <Button
                            size='medium'
                            filled={true}
                            className='ai-action-generate'
                            disabled={isGenerating || isCreating}
                            onClick={generatePreview}
                            icon={<IconEyeSearch/>}
                        >
                            {isGenerating ? (
                                <FormattedMessage
                                    id='CreateTaskBoardFromCommand.generating'
                                    defaultMessage='Generating...'
                                />
                            ) : (
                                <FormattedMessage
                                    id='CreateTaskBoardFromCommand.generate'
                                    defaultMessage='Generate preview'
                                />
                            )}
                        </Button>
                        <Button
                            size='medium'
                            filled={true}
                            className='ai-action-create'
                            disabled={!preview || !preview.title.trim() || isGenerating || isCreating}
                            onClick={createBoard}
                            icon={<CompassIcon icon='check'/>}
                        >
                            {isCreating ? (
                                <FormattedMessage
                                    id='CreateTaskBoardFromCommand.creating'
                                    defaultMessage='Creating...'
                                />
                            ) : (
                                <FormattedMessage
                                    id='CreateTaskBoardFromCommand.create'
                                    defaultMessage='Create task board'
                                />
                            )}
                        </Button>
                    </div>
                </Dialog>}
        </div>
    )
}

export default React.memo(CreateTaskBoardFromCommand)
