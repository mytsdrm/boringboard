// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useRef, useState} from 'react'
import {generatePath, useRouteMatch, useHistory} from 'react-router-dom'
import {FormattedMessage} from 'react-intl'

import {DatePropertyType} from '../properties/types'

import {getCurrentBoard, isLoadingBoard, getTemplates} from '../store/boards'
import {refreshCards, getCardLimitTimestamp, getCurrentBoardHiddenCardsCount, setLimitTimestamp, getCurrentViewCardsSortedFilteredAndGrouped, setCurrent as setCurrentCard} from '../store/cards'
import {
    getCurrentBoardViews,
    getCurrentViewGroupBy,
    getCurrentViewId,
    getCurrentViewDisplayBy,
    getCurrentView,
} from '../store/views'
import {useAppSelector, useAppDispatch} from '../store/hooks'

import {getClientConfig, setClientConfig} from '../store/clientConfig'

import wsClient, {WSClient} from '../wsclient'
import {ClientConfig} from '../config/clientConfig'
import {AdminSystemSettings} from '../octoClient'
import {Utils} from '../utils'
import {IUser} from '../user'
import propsRegistry from '../properties'
import {applyProjectSystemSettings} from '../systemSettings'

import {getMe} from '../store/users'
import {loadBoardData} from '../store/initialLoad'

import {getHiddenBoardIDs} from '../store/sidebar'

import CenterPanel from './centerPanel'
import BoardTemplateSelector from './boardTemplateSelector/boardTemplateSelector'
import GuestNoBoards from './guestNoBoards'

import Sidebar from './sidebar/sidebar'
import Dashboard from './dashboard/dashboard'
import ActivityLogs from './activityLogs/activityLogs'
import AdminUsers from './admin/adminUsers'
import SystemSettings from './admin/systemSettings'

import './workspace.scss'

type Props = {
    readonly: boolean
    dashboard?: boolean
    systemSettings?: boolean
    activityLogs?: boolean
    templates?: boolean
    users?: boolean
}

function CenterContent(props: Props) {
    const isLoading = useAppSelector(isLoadingBoard)
    const match = useRouteMatch<{boardId: string, viewId: string, cardId?: string, channelId?: string}>()
    const board = useAppSelector(getCurrentBoard)
    const templates = useAppSelector(getTemplates)
    const cards = useAppSelector(getCurrentViewCardsSortedFilteredAndGrouped)
    const activeView = useAppSelector(getCurrentView)
    const views = useAppSelector(getCurrentBoardViews)
    const groupByProperty = useAppSelector(getCurrentViewGroupBy)
    const dateDisplayProperty = useAppSelector(getCurrentViewDisplayBy)
    const clientConfig = useAppSelector(getClientConfig)
    const hiddenCardsCount = useAppSelector(getCurrentBoardHiddenCardsCount)
    const cardLimitTimestamp = useAppSelector(getCardLimitTimestamp)
    const history = useHistory()
    const dispatch = useAppDispatch()
    const me = useAppSelector<IUser|null>(getMe)
    const hiddenBoardIDs = useAppSelector(getHiddenBoardIDs)
    const isSystemAdmin = Boolean(me?.roles && Utils.isSystemAdmin(me.roles)) || Boolean(me?.permissions?.includes('manage_system'))
    const retriedBoardLoads = useRef<Set<string>>(new Set())

    const isBoardHidden = () => {
        return hiddenBoardIDs.includes(board.id)
    }

    const showCard = useCallback((cardId?: string) => {
        const params = {...match.params, cardId}
        let newPath = generatePath(Utils.getBoardPagePath(match.path), params)
        if (props.readonly) {
            newPath += `?r=${Utils.getReadToken()}`
        }
        if (cardId) {
            history.push(newPath)
        } else {
            history.replace(newPath)
        }
        dispatch(setCurrentCard(cardId || ''))
    }, [match, history])

    useEffect(() => {
        const onConfigChangeHandler = (_: WSClient, config: ClientConfig) => {
            dispatch(setClientConfig(config))
        }
        wsClient.addOnConfigChange(onConfigChangeHandler)

        const onSystemSettingsChangeHandler = (_: WSClient, settings: AdminSystemSettings) => {
            applyProjectSystemSettings(settings)
        }
        wsClient.addOnSystemSettingsChange(onSystemSettingsChangeHandler)

        const onCardLimitTimestampChangeHandler = (_: WSClient, timestamp: number) => {
            dispatch(setLimitTimestamp({timestamp, templates}))
            if (cardLimitTimestamp > timestamp) {
                dispatch(refreshCards(timestamp))
            }
        }
        wsClient.addOnCardLimitTimestampChange(onCardLimitTimestampChangeHandler)

        return () => {
            wsClient.removeOnConfigChange(onConfigChangeHandler)
            wsClient.removeOnSystemSettingsChange(onSystemSettingsChangeHandler)
        }
    }, [cardLimitTimestamp, match.params.boardId, templates])

    useEffect(() => {
        if ((props.users || props.systemSettings) && me && !isSystemAdmin) {
            history.replace('/dashboard')
        }
    }, [props.users, props.systemSettings, me, isSystemAdmin, history])

    useEffect(() => {
        if (!match.params.boardId || props.readonly || props.dashboard || props.activityLogs || props.systemSettings || props.templates || props.users) {
            return
        }

        if (isLoading || !board || activeView || views.length > 0 || retriedBoardLoads.current.has(match.params.boardId)) {
            return
        }

        retriedBoardLoads.current.add(match.params.boardId)
        dispatch(loadBoardData(match.params.boardId))
    }, [match.params.boardId, props.readonly, props.dashboard, props.activityLogs, props.systemSettings, props.templates, props.users, isLoading, board, activeView, views.length, dispatch])

    const templateSelector = (
        <BoardTemplateSelector
            title={
                <FormattedMessage
                    id='BoardTemplateSelector.plugin.no-content-title'
                    defaultMessage='Create a board'
                />
            }
            description={
                <FormattedMessage
                    id='BoardTemplateSelector.plugin.no-content-description'
                    defaultMessage='Add a board to the sidebar using any of the templates defined below or start from scratch.'
                />
            }
            channelId={match.params.channelId}
        />
    )

    if (props.dashboard) {
        return <Dashboard/>
    }

    if (props.users) {
        if (!me || !isSystemAdmin) {
            return null
        }
        return <AdminUsers/>
    }

    if (props.systemSettings) {
        if (!me || !isSystemAdmin) {
            return null
        }
        return <SystemSettings/>
    }

    if (props.activityLogs) {
        return <ActivityLogs adminMode={isSystemAdmin}/>
    }

    if (match.params.channelId) {
        if (me?.is_guest) {
            return <GuestNoBoards/>
        }
        return templateSelector
    }

    if (props.templates) {
        return templateSelector
    }

    if (isLoading) {
        return (
            <div
                className='workspace-loader'
                role='status'
            >
                <span
                    aria-hidden={true}
                    className='spinner-border spinner-border-sm'
                />
                <FormattedMessage
                    id='Workspace.loading-board'
                    defaultMessage='Loading board...'
                />
            </div>
        )
    }

    if (board && !isBoardHidden() && activeView) {
        let property = groupByProperty
        if ((!property || !propsRegistry.get(property.type).canGroup) && activeView.fields.viewType === 'board') {
            property = board?.cardProperties.find((o) => propsRegistry.get(o.type).canGroup)
        }

        let displayProperty = dateDisplayProperty
        if (!displayProperty && activeView.fields.viewType === 'calendar') {
            displayProperty = board.cardProperties.find((o) => propsRegistry.get(o.type) instanceof DatePropertyType)
        }

        return (
            <CenterPanel
                clientConfig={clientConfig}
                readonly={props.readonly}
                board={board}
                cards={cards}
                shownCardId={match.params.cardId}
                showCard={showCard}
                activeView={activeView}
                groupByProperty={property}
                dateDisplayProperty={displayProperty}
                views={views}
                hiddenCardsCount={hiddenCardsCount}
            />
        )
    }

    if (board && !isBoardHidden()) {
        return null
    }

    if (me?.is_guest) {
        return <GuestNoBoards/>
    }

    return templateSelector
}

const Workspace = (props: Props) => {
    const board = useAppSelector(getCurrentBoard)
    const match = useRouteMatch<{boardId?: string}>()

    const viewId = useAppSelector(getCurrentViewId)
    const [boardTemplateSelectorOpen, setBoardTemplateSelectorOpen] = useState(false)

    const closeBoardTemplateSelector = useCallback(() => {
        setBoardTemplateSelectorOpen(false)
    }, [])
    const openBoardTemplateSelector = useCallback(() => {
        setBoardTemplateSelectorOpen(true)
    }, [])
    useEffect(() => {
        setBoardTemplateSelectorOpen(false)
    }, [board, viewId])

    return (
        <div className='Workspace'>
            {!props.readonly &&
                <Sidebar
                    onBoardTemplateSelectorOpen={openBoardTemplateSelector}
                    onBoardTemplateSelectorClose={closeBoardTemplateSelector}
                    activeBoardId={(props.activityLogs || props.dashboard || props.systemSettings || props.templates || props.users) ? undefined : (match.params.boardId || board?.id)}
                    activityLogsActive={props.activityLogs || false}
                    dashboardActive={props.dashboard || false}
                    systemSettingsActive={props.systemSettings || false}
                    templatesActive={props.templates || false}
                    usersActive={props.users || false}
                />
            }
            <div className='mainFrame'>
                {(board?.isTemplate) &&
                <div className='banner'>
                    <FormattedMessage
                        id='Workspace.editing-board-template'
                        defaultMessage="You're editing a board template."
                    />
                </div>}
                <CenterContent
                    readonly={props.readonly}
                    activityLogs={props.activityLogs || false}
                    dashboard={props.dashboard || false}
                    systemSettings={props.systemSettings || false}
                    templates={props.templates || false}
                    users={props.users || false}
                />
            </div>
            {boardTemplateSelectorOpen &&
                <BoardTemplateSelector onClose={closeBoardTemplateSelector}/>}
        </div>
    )
}

export default React.memo(Workspace)
