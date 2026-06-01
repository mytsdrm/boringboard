// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useMemo, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {useHistory} from 'react-router-dom'

import {Card} from '../../blocks/card'
import octoClient from '../../octoClient'
import {getMySortedBoards} from '../../store/boards'
import {useAppDispatch, useAppSelector} from '../../store/hooks'
import {getMe, setMe} from '../../store/users'
import CompassIcon from '../../widgets/icons/compassIcon'

import './dashboard.scss'

type BoardStats = {
    total: number
    invitedUserIds: string[]
}

const Dashboard = (): JSX.Element => {
    const intl = useIntl()
    const dispatch = useAppDispatch()
    const history = useHistory()
    const boards = useAppSelector(getMySortedBoards)
    const me = useAppSelector(getMe)
    const [statsByBoard, setStatsByBoard] = useState<{[boardId: string]: BoardStats}>({})
    const taskBoards = useMemo(() => boards.filter((board) => !board.isTemplate), [boards])
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
            sort((a, b) => (b.updateAt || b.createAt) - (a.updateAt || a.createAt)).
            slice(0, 3)
    }, [taskBoards])

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

                return [board.id, {total: cards.length, invitedUserIds}] as [string, BoardStats]
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
                            <div
                                className='dashboard-widget-row'
                                key={board.id}
                            >
                                <span className='dashboard-board-icon'>{board.icon || <CompassIcon icon='product-boards'/>}</span>
                                <span className='dashboard-board-name'>{board.title}</span>
                                <span className='dashboard-time-pill'>{formatRelativeTime(board.updateAt || board.createAt)}</span>
                            </div>
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
