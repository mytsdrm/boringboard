// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState, useCallback, useLayoutEffect, useRef} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {BlockIcons} from '../blockIcons'
import {Board} from '../blocks/board'
import mutator from '../mutator'
import Button from '../widgets/buttons/button'
import Editable from '../widgets/editable'
import CompassIcon from '../widgets/icons/compassIcon'
import {Permission} from '../constants'
import {useHasCurrentBoardPermissions} from '../hooks/permissions'
import {useAppSelector} from '../store/hooks'
import {getMyBoardMembership} from '../store/boards'

import BoardIconSelector from './boardIconSelector'
import {MarkdownEditor} from './markdownEditor'
import './viewTitle.scss'

type Props = {
    board: Board
    readonly: boolean
    onShowFullTextChanged?: (showFullText: boolean) => void
}

type TaskBoardSettings = {
    repoUrl: string
    devBranch: string
    prodBranch: string
    developmentUrl: string
    productionUrl: string
}

type TaskBoardInfoItem = {
    id: string
    defaultMessage: string
    value: string
    isUrl?: boolean
}

const TASK_BOARD_SETTINGS_PROPERTY = 'boardIntegration'

const getTaskBoardSettings = (board: Board): TaskBoardSettings => {
    const value = board.properties?.[TASK_BOARD_SETTINGS_PROPERTY]
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {
            repoUrl: '',
            devBranch: '',
            prodBranch: '',
            developmentUrl: '',
            productionUrl: '',
        }
    }

    const settings = value as Partial<TaskBoardSettings & {branchFilter: string}>
    return {
        repoUrl: settings.repoUrl || '',
        devBranch: settings.devBranch || settings.branchFilter || '',
        prodBranch: settings.prodBranch || '',
        developmentUrl: settings.developmentUrl || '',
        productionUrl: settings.productionUrl || '',
    }
}

const ViewTitle = (props: Props) => {
    const {board} = props

    const viewTitleRef = useRef<HTMLDivElement | null>(null)
    const descriptionRef = useRef<HTMLDivElement | null>(null)
    const [title, setTitle] = useState(board.title)
    const [showFullText, setShowFullText] = useState(false)
    const [hasHiddenText, setHasHiddenText] = useState(false)
    const updateShowFullText = useCallback((nextShowFullText: boolean) => {
        setShowFullText(nextShowFullText)
        props.onShowFullTextChanged?.(nextShowFullText)
    }, [props.onShowFullTextChanged])
    const onEditTitleSave = useCallback(() => mutator.changeBoardTitle(board.id, board.title, title), [board.id, board.title, title])
    const onEditTitleCancel = useCallback(() => setTitle(board.title), [board.title])
    const onDescriptionBlur = useCallback((text) => mutator.changeBoardDescription(board.id, board.id, board.description, text), [board.id, board.description])
    const onAddRandomIcon = useCallback(() => {
        const newIcon = BlockIcons.shared.randomIcon()
        mutator.changeBoardIcon(board.id, board.icon, newIcon)
    }, [board.id, board.icon])
    const onShowDescription = useCallback(() => mutator.showBoardDescription(board.id, Boolean(board.showDescription), true), [board.id, board.showDescription])
    const onHideDescription = useCallback(() => mutator.showBoardDescription(board.id, Boolean(board.showDescription), false), [board.id, board.showDescription])
    const canEditBoardProperties = useHasCurrentBoardPermissions([Permission.ManageBoardProperties])
    const myBoardMembership = useAppSelector(getMyBoardMembership(board.id))
    const isInvitedNonAdminMember = Boolean(myBoardMembership && !myBoardMembership.synthetic && !myBoardMembership.schemeAdmin)

    const propertyReadonly = props.readonly || !canEditBoardProperties
    const titleDescriptionReadonly = propertyReadonly || isInvitedNonAdminMember

    const intl = useIntl()
    const taskBoardSettings = getTaskBoardSettings(board)
    const taskBoardInfoItems: TaskBoardInfoItem[] = [
        {
            id: 'ViewTitle.task-board-info.repository-url',
            defaultMessage: 'Repository URL',
            value: taskBoardSettings.repoUrl,
            isUrl: true,
        },
        {
            id: 'ViewTitle.task-board-info.dev-branch',
            defaultMessage: 'Dev Branch',
            value: taskBoardSettings.devBranch,
        },
        {
            id: 'ViewTitle.task-board-info.prod-branch',
            defaultMessage: 'Prod Branch',
            value: taskBoardSettings.prodBranch,
        },
        {
            id: 'ViewTitle.task-board-info.development-url',
            defaultMessage: 'Development URL',
            value: taskBoardSettings.developmentUrl,
            isUrl: true,
        },
        {
            id: 'ViewTitle.task-board-info.production-url',
            defaultMessage: 'Production URL',
            value: taskBoardSettings.productionUrl,
            isUrl: true,
        },
    ].filter((item) => item.value.trim() !== '')
    useLayoutEffect(() => {
        const updateHiddenText = () => {
            const viewTitleElement = viewTitleRef.current
            if (!viewTitleElement || showFullText) {
                setHasHiddenText(false)
                return
            }

            const descriptionElement = descriptionRef.current
            const hasHeaderOverflow = viewTitleElement.scrollHeight > viewTitleElement.clientHeight + 1
            const hasDescriptionOverflow = Boolean(descriptionElement && descriptionElement.scrollHeight > descriptionElement.clientHeight + 1)
            const hasOverflow = hasHeaderOverflow || hasDescriptionOverflow
            setHasHiddenText(hasOverflow)
        }

        updateHiddenText()
        window.addEventListener('resize', updateHiddenText)
        return () => window.removeEventListener('resize', updateHiddenText)
    }, [
        board.description,
        board.showDescription,
        showFullText,
        taskBoardSettings.developmentUrl,
        taskBoardSettings.devBranch,
        taskBoardSettings.productionUrl,
        taskBoardSettings.prodBranch,
        taskBoardSettings.repoUrl,
        title,
    ])
    const canExpandText = showFullText || hasHiddenText

    const viewTitleClassName = [
        'ViewTitle',
        showFullText ? 'ViewTitle--expanded' : '',
        taskBoardInfoItems.length > 0 ? 'ViewTitle--withInfo' : '',
    ].filter(Boolean).join(' ')

    return (
        <div
            ref={viewTitleRef}
            className={viewTitleClassName}
        >
            <div className='add-buttons add-visible'>
                {!propertyReadonly && !board.icon &&
                    <Button
                        emphasis='default'
                        size='xsmall'
                        onClick={onAddRandomIcon}
                        icon={
                            <CompassIcon
                                icon='emoticon-outline'
                            />}
                    >
                        <FormattedMessage
                            id='TableComponent.add-icon'
                            defaultMessage='Add icon'
                        />
                    </Button>
                }
                {!titleDescriptionReadonly && board.showDescription &&
                    <Button
                        emphasis='default'
                        size='xsmall'
                        onClick={onHideDescription}
                        icon={
                            <CompassIcon
                                icon='eye-off-outline'
                            />}
                    >
                        <FormattedMessage
                            id='ViewTitle.hide-description'
                            defaultMessage='hide description'
                        />
                    </Button>
                }
                {!titleDescriptionReadonly && !board.showDescription &&
                    <Button
                        emphasis='default'
                        size='xsmall'
                        onClick={onShowDescription}
                        icon={
                            <CompassIcon
                                icon='eye-outline'
                            />}
                    >
                        <FormattedMessage
                            id='ViewTitle.show-description'
                            defaultMessage='show description'
                        />
                    </Button>
                }
            </div>

            <div className='ViewTitle__columns'>
                <div className='ViewTitle__main'>
                    <div className='title'>
                        <BoardIconSelector
                            board={board}
                            readonly={propertyReadonly}
                        />
                        <Editable
                            className='title'
                            value={title}
                            placeholderText={intl.formatMessage({id: 'ViewTitle.untitled-board', defaultMessage: 'Untitled board'})}
                            onChange={(newTitle) => setTitle(newTitle)}
                            saveOnEsc={true}
                            onSave={onEditTitleSave}
                            onCancel={onEditTitleCancel}
                            readonly={titleDescriptionReadonly}
                            spellCheck={true}
                        />
                    </div>

                    {board.showDescription &&
                        <div
                            ref={descriptionRef}
                            className='description'
                        >
                            <MarkdownEditor
                                text={board.description}
                                placeholderText='Add a description...'
                                onBlur={onDescriptionBlur}
                                readonly={titleDescriptionReadonly}
                            />
                        </div>
                    }
                    {canExpandText &&
                        <Button
                            emphasis='link'
                            size='xsmall'
                            className='ViewTitle__showMore'
                            onClick={() => updateShowFullText(!showFullText)}
                        >
                            {showFullText ? (
                                <FormattedMessage
                                    id='ViewTitle.show-less'
                                    defaultMessage='Show less'
                                />
                            ) : (
                                <FormattedMessage
                                    id='ViewTitle.show-more'
                                    defaultMessage='Show more'
                                />
                            )}
                        </Button>
                    }
                </div>

                {taskBoardInfoItems.length > 0 &&
                    <div className='ViewTitle__info'>
                        <div className='ViewTitle__infoTitle'>
                            <FormattedMessage
                                id='ViewTitle.task-board-info-title'
                                defaultMessage='Task Board Info'
                            />
                        </div>
                        <div className='ViewTitle__infoList'>
                            {taskBoardInfoItems.map((item) => (
                                <div
                                    className='ViewTitle__infoItem'
                                    key={item.id}
                                >
                                    <span className='ViewTitle__infoLabel'>
                                        <FormattedMessage
                                            id={item.id}
                                            defaultMessage={item.defaultMessage}
                                        />
                                    </span>
                                    {item.isUrl ? (
                                        <a
                                            href={item.value}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='ViewTitle__infoValue'
                                        >
                                            {item.value}
                                        </a>
                                    ) : (
                                        <span className='ViewTitle__infoValue'>
                                            {item.value}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                }
            </div>
        </div>
    )
}

export default React.memo(ViewTitle)
