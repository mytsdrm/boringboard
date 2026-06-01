// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {useHistory, useRouteMatch} from 'react-router-dom'

import {Block} from '../../blocks/block'
import {Board} from '../../blocks/board'
import {Card} from '../../blocks/card'
import {useWebsockets} from '../../hooks/websockets'
import octoClient from '../../octoClient'
import {getMySortedBoards, updateBoards} from '../../store/boards'
import {useAppDispatch, useAppSelector} from '../../store/hooks'
import {getCurrentTeamId, getFirstTeam} from '../../store/teams'
import {getMe, setMe} from '../../store/users'
import {Utils} from '../../utils'
import CompassIcon from '../../widgets/icons/compassIcon'
import {WSClient} from '../../wsclient'

import './dashboard.scss'

type BoardStats = {
    total: number
    invitedUserIds: string[]
    latestActivityAt: number
}

const getCardStats = (board: Board, cards: Card[]) => {
    const latestActivityAt = cards.reduce((latest, card) => {
        return Math.max(latest, card.updateAt || card.createAt || 0)
    }, board.updateAt || board.createAt || 0)

    return {
        latestActivityAt,
        total: cards.length,
    }
}

const Dashboard = (): JSX.Element => {
    const intl = useIntl()
    const dispatch = useAppDispatch()
    const history = useHistory()
    const match = useRouteMatch<{boardId: string, viewId?: string, cardId?: string, teamId?: string}>()
    const boards = useAppSelector(getMySortedBoards)
    const currentTeamId = useAppSelector(getCurrentTeamId)
    const firstTeam = useAppSelector(getFirstTeam)
    const me = useAppSelector(getMe)
    const [statsByBoard, setStatsByBoard] = useState<{[boardId: string]: BoardStats}>({})
    const taskBoards = useMemo(() => boards.filter((board) => !board.isTemplate), [boards])
    const taskBoardsById = useMemo(() => new Map(taskBoards.map((board) => [board.id, board])), [taskBoards])
    const websocketTeamId = currentTeamId || firstTeam?.id || taskBoards[0]?.teamId || ''
    const personalTaskBoards = useMemo(() => {
        if (!me?.id) {
            return taskBoards
        }
        return taskBoards.filter((board) => board.createdBy === me.id)
    }, [me?.id, taskBoards])
    const joinedTaskBoards = useMemo(() => {
        if (!me?.id) {
            return []
        }
        return taskBoards.filter((board) => board.createdBy !== me.id)
    }, [me?.id, taskBoards])
    const recentlyUpdatedBoards = useMemo(() => {
        return [...taskBoards].
            sort((a, b) => {
                const aActivityAt = statsByBoard[a.id]?.latestActivityAt || a.updateAt || a.createAt
                const bActivityAt = statsByBoard[b.id]?.latestActivityAt || b.updateAt || b.createAt
                return bActivityAt - aActivityAt
            }).
            slice(0, 3)
    }, [statsByBoard, taskBoards])

    const refreshBoardCardStats = useCallback(async (boardIds: string[]) => {
        const uniqueBoardIds = Array.from(new Set(boardIds))
        const entries = await Promise.all(uniqueBoardIds.map(async (boardId) => {
            const board = taskBoardsById.get(boardId)
            if (!board) {
                return null
            }

            const blocks = await octoClient.getAllBlocks(board.id)
            const cards = blocks.filter((block) => block.type === 'card' && !block.fields.isTemplate) as Card[]
            return [board.id, getCardStats(board, cards)] as [string, ReturnType<typeof getCardStats>]
        }))

        setStatsByBoard((previous) => {
            const next = {...previous}
            entries.forEach((entry) => {
                if (!entry) {
                    return
                }
                const [boardId, cardStats] = entry
                next[boardId] = {
                    invitedUserIds: previous[boardId]?.invitedUserIds || [],
                    ...cardStats,
                }
            })
            return next
        })
    }, [taskBoardsById])

    useEffect(() => {
        let canceled = false

        async function loadStats() {
            const entries = await Promise.all(taskBoards.map(async (board) => {
                const [blocks, members] = await Promise.all([
                    octoClient.getAllBlocks(board.id),
                    octoClient.getBoardMembers(board.teamId, board.id),
                ])
                const cards = blocks.filter((block) => block.type === 'card' && !block.fields.isTemplate) as Card[]
                const invitedUserIds = members.
                    filter((member) => !member.synthetic && member.userId !== board.createdBy).
                    map((member) => member.userId)
                const cardStats = getCardStats(board, cards)

                return [board.id, {...cardStats, invitedUserIds}] as [string, BoardStats]
            }))

            if (!canceled) {
                setStatsByBoard(Object.fromEntries(entries))
            }
        }

        loadStats()

        return () => {
            canceled = true
        }
    }, [taskBoards])

    useWebsockets(websocketTeamId, (wsClient) => {
        const incrementalBlockUpdate = (_: WSClient, blocks: Block[]) => {
            const boardIds = blocks.
                filter((block) => block.type === 'card' && !block.fields.isTemplate).
                map((block) => block.boardId)

            if (boardIds.length > 0) {
                refreshBoardCardStats(boardIds)
            }
        }

        const incrementalBoardUpdate = (_: WSClient, updatedBoards: Board[]) => {
            dispatch(updateBoards(updatedBoards))
        }

        wsClient.addOnChange(incrementalBlockUpdate, 'block')
        wsClient.addOnChange(incrementalBoardUpdate, 'board')

        return () => {
            wsClient.removeOnChange(incrementalBlockUpdate, 'block')
            wsClient.removeOnChange(incrementalBoardUpdate, 'board')
        }
    }, [refreshBoardCardStats])

    const totalTasks = useMemo(() => {
        return taskBoards.reduce((result, board) => {
            const stats = statsByBoard[board.id]
            return result + (stats?.total || 0)
        }, 0)
    }, [taskBoards, statsByBoard])

    const assignedUsers = useMemo(() => {
        const userIds = new Set<string>()
        taskBoards.forEach((board) => {
            statsByBoard[board.id]?.invitedUserIds.forEach((userId) => userIds.add(userId))
        })
        return userIds.size
    }, [taskBoards, statsByBoard])

    const formatRelativeTime = (timestamp: number): string => {
        const ageMs = Math.max(Date.now() - timestamp, 0)
        const hours = Math.floor(ageMs / (60 * 60 * 1000))
        const days = Math.floor(hours / 24)

        if (days > 0) {
            return intl.formatMessage({id: 'Dashboard.time-days-ago', defaultMessage: '{count}d ago'}, {count: days})
        }
        if (hours > 0) {
            return intl.formatMessage({id: 'Dashboard.time-hours-ago', defaultMessage: '{count}h ago'}, {count: hours})
        }
        return intl.formatMessage({id: 'Dashboard.time-just-now', defaultMessage: 'Just now'})
    }

    const greetingName = me?.username || intl.formatMessage({
        id: 'Dashboard.default-greeting-name',
        defaultMessage: 'Procrastinator',
    })

    const handleLogout = async () => {
        await octoClient.logout()
        dispatch(setMe(null))
        history.push('/login')
    }

    const showBoard = useCallback((boardId: string) => {
        Utils.showBoard(boardId, match, history)
    }, [history, match])

    return (
        <div className='Dashboard'>
            <div className='dashboard-header'>
                <div>
                    <div className='dashboard-eyebrow'>
                        <FormattedMessage
                            id='Dashboard.eyebrow'
                            defaultMessage='Dashboard'
                        />
                    </div>
                    <h1>
                        <FormattedMessage
                            id='Dashboard.title'
                            defaultMessage='Workspace summary'
                        />
                    </h1>
                    <p>
                        <FormattedMessage
                            id='Dashboard.description'
                            defaultMessage={'BoringBoard, A place for all those "I\'ll do it later" tasks'}
                        />
                    </p>
                </div>
                <div className='dashboard-actions'>
                    <details className='dashboard-user-menu'>
                        <summary className='dashboard-greeting'>
                            <span className='dashboard-greeting-icon'>{'😎'}</span>
                            <FormattedMessage
                                id='Dashboard.greeting'
                                defaultMessage='Hello, {name}!'
                                values={{name: greetingName}}
                            />
                            <CompassIcon icon='chevron-down'/>
                        </summary>
                        <div className='dashboard-user-dropdown'>
                            <button
                                type='button'
                                onClick={handleLogout}
                            >
                                <CompassIcon icon='logout-variant'/>
                                <FormattedMessage
                                    id='Sidebar.logout'
                                    defaultMessage='Log out'
                                />
                            </button>
                        </div>
                    </details>
                </div>
            </div>

            <section className='dashboard-metric-grid'>
                <div className='dashboard-metric-card board-count'>
                    <div className='metric-icon'>
                        <CompassIcon icon='product-boards'/>
                    </div>
                    <div className='metric-content'>
                        <span>
                            <FormattedMessage
                                id='Dashboard.personal-task-boards'
                                defaultMessage='Personal Task Boards'
                            />
                        </span>
                        <strong>{personalTaskBoards.length}</strong>
                        <p>
                            <FormattedMessage
                                id='Dashboard.personal-task-boards-description'
                                defaultMessage='Task Boards created by you.'
                            />
                        </p>
                    </div>
                </div>

                <div className='dashboard-metric-card joined-count'>
                    <div className='metric-icon'>
                        <CompassIcon icon='share-variant-outline'/>
                    </div>
                    <div className='metric-content'>
                        <span>
                            <FormattedMessage
                                id='Dashboard.joined-task-boards'
                                defaultMessage='Joined Task Boards'
                            />
                        </span>
                        <strong>{joinedTaskBoards.length}</strong>
                        <p>
                            <FormattedMessage
                                id='Dashboard.joined-task-boards-description'
                                defaultMessage='Task Boards shared with you by others.'
                            />
                        </p>
                    </div>
                </div>

                <div className='dashboard-metric-card task-count'>
                    <div className='metric-icon'>
                        <CompassIcon icon='checkbox-multiple-marked-outline'/>
                    </div>
                    <div className='metric-content'>
                        <span>
                            <FormattedMessage
                                id='Dashboard.total-tasks'
                                defaultMessage='Total Tasks'
                            />
                        </span>
                        <strong>{totalTasks}</strong>
                        <p>
                            <FormattedMessage
                                id='Dashboard.total-tasks-description'
                                defaultMessage='Cards counted across all Task Boards.'
                            />
                        </p>
                    </div>
                </div>

                <div className='dashboard-metric-card assigned-count'>
                    <div className='metric-icon'>
                        <CompassIcon icon='account-multiple-outline'/>
                    </div>
                    <div className='metric-content'>
                        <span>
                            <FormattedMessage
                                id='Dashboard.task-boards-member'
                                defaultMessage='Task Boards Member'
                            />
                        </span>
                        <strong>{assignedUsers}</strong>
                        <p>
                            <FormattedMessage
                                id='Dashboard.task-boards-member-description'
                                defaultMessage='Users invited through sharing across Task Boards.'
                            />
                        </p>
                    </div>
                </div>
            </section>

            <section className='dashboard-widget-grid'>
                <div className='dashboard-widget recent-boards'>
                    <div className='dashboard-widget-title'>
                        <span className='dashboard-widget-icon blue'>
                            <CompassIcon icon='clock-outline'/>
                        </span>
                        <h2>
                            <FormattedMessage
                                id='Dashboard.recently-updated-boards'
                                defaultMessage='Recently updated boards'
                            />
                        </h2>
                    </div>
                    <div className='dashboard-widget-list'>
                        {recentlyUpdatedBoards.map((board) => (
                            <button
                                className='dashboard-widget-row'
                                key={board.id}
                                type='button'
                                onClick={() => showBoard(board.id)}
                            >
                                <span className='dashboard-board-icon'>{board.icon || <CompassIcon icon='product-boards'/>}</span>
                                <span className='dashboard-board-name'>{board.title}</span>
                                <span className='dashboard-time-pill'>{formatRelativeTime(statsByBoard[board.id]?.latestActivityAt || board.updateAt || board.createAt)}</span>
                            </button>
                        ))}
                        {recentlyUpdatedBoards.length === 0 &&
                            <div className='dashboard-empty-state'>
                                <FormattedMessage
                                    id='Dashboard.no-recent-boards'
                                    defaultMessage='No task boards yet.'
                                />
                            </div>
                        }
                    </div>
                </div>

                <div className='dashboard-widget recent-activity'>
                    <div className='dashboard-widget-title'>
                        <span className='dashboard-widget-icon orange'>
                            <CompassIcon icon='lightning-bolt-outline'/>
                        </span>
                        <h2>
                            <FormattedMessage
                                id='Dashboard.recent-activity'
                                defaultMessage='Recent activity'
                            />
                        </h2>
                    </div>
                    <div className='dashboard-empty-state activity-empty'>
                        <FormattedMessage
                            id='Dashboard.no-recent-activity'
                            defaultMessage='No recent activity yet.'
                        />
                    </div>
                </div>
            </section>
        </div>
    )
}

export default React.memo(Dashboard)
