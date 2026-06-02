// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {IconEyeSearch} from '@tabler/icons-react'

import octoClient, {AdminAISettings, TaskBoardPreview} from '../../octoClient'
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

const CreateTaskBoardFromCommand = (props: Props): JSX.Element => {
    const intl = useIntl()
    const [command, setCommand] = useState('')
    const [preview, setPreview] = useState<TaskBoardPreview|null>(null)
    const [error, setError] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [aiSettings, setAISettings] = useState<AdminAISettings|null>(getStoredProjectSystemSettings().ai)

    useEffect(() => {
        let canceled = false
        async function loadAISettings() {
            const settings = await octoClient.getSystemSettings()
            if (!canceled) {
                setAISettings(settings.ai)
            }
        }

        const handleSystemSettingsUpdated = (event: Event) => {
            const settings = (event as CustomEvent<ProjectSystemSettings>).detail
            setAISettings(settings?.ai || getStoredProjectSystemSettings().ai)
        }

        window.addEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSystemSettingsUpdated)
        loadAISettings()
        return () => {
            canceled = true
            window.removeEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSystemSettingsUpdated)
        }
    }, [])

    const closeModal = () => {
        if (isGenerating || isCreating) {
            return
        }
        setIsOpen(false)
        setCommand('')
        setPreview(null)
        setError('')
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

        setError('')
        setIsGenerating(true)
        try {
            const nextPreview = await octoClient.createTaskBoardPreview(trimmedCommand)
            if (!nextPreview) {
                setPreview(null)
                setError(intl.formatMessage({id: 'CreateTaskBoardFromCommand.preview-error', defaultMessage: 'Unable to generate a preview. Check AI settings and try again.'}))
                return
            }
            setPreview(nextPreview)
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
                        {error &&
                            <div className='ai-command-error'>
                                {error}
                            </div>}
                        {preview &&
                            <div className='ai-preview'>
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
                                        <strong>{taskBoardDefaultStatusColumns.length}</strong>
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
                                        {taskBoardDefaultStatusColumns.map((column, index) => (
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
