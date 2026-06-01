// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Block} from '../../blocks/block'
import {Board, IPropertyTemplate} from '../../blocks/board'
import {Card} from '../../blocks/card'
import {useWebsockets} from '../../hooks/websockets'
import octoClient from '../../octoClient'
import {getMySortedBoards} from '../../store/boards'
import {useAppDispatch, useAppSelector} from '../../store/hooks'
import {getCurrentTeamId, getFirstTeam} from '../../store/teams'
import {addBoardUsers, getBoardUsers, getMe} from '../../store/users'
import CompassIcon from '../../widgets/icons/compassIcon'
import {WSClient} from '../../wsclient'

import './activityLogs.scss'

type ActivityAction = 'created' | 'deleted' | 'renamed' | 'moved' | 'edited' | 'updated'

type ActivityLog = {
    id: string
    action: ActivityAction
    actorId: string
    boardId: string
    boardTitle: string
    cardId: string
    cardTitle: string
    fromValue?: string
    timestamp: number
    toValue?: string
}

const ACTIVITY_LOG_PAGE_SIZE = 20
const ACTIVITY_LOG_HISTORY_PAGE_LIMIT = 240
const ACTIVITY_LOG_TIME_ZONE = 'Asia/Jakarta'

const isCardContentBlock = (block: Block): boolean => {
    return block.type !== 'card' &&
        block.type !== 'view' &&
        block.type !== 'comment' &&
        block.type !== 'attachment' &&
        block.type !== 'board' &&
        block.type !== 'unknown'
}

const getPropertyValueLabel = (property: IPropertyTemplate, value: string | string[] | undefined): string => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
        return ''
    }

    const valueIds = Array.isArray(value) ? value : [value]
    return valueIds.map((valueId) => {
        return property.options.find((option) => option.id === valueId)?.value || valueId
    }).join(', ')
}

const getMoveDetails = (board: Board, card: Card, previousCard?: Card): Pick<ActivityLog, 'fromValue' | 'toValue'> | null => {
    if (!previousCard) {
        return null
    }

    const changedProperty = board.cardProperties.find((property) => {
        const oldValue = JSON.stringify(previousCard.fields.properties[property.id] || '')
        const newValue = JSON.stringify(card.fields.properties[property.id] || '')
        return oldValue !== newValue && property.options.length > 0
    })

    if (!changedProperty) {
        return null
    }

    return {
        fromValue: getPropertyValueLabel(changedProperty, previousCard.fields.properties[changedProperty.id]),
        toValue: getPropertyValueLabel(changedProperty, card.fields.properties[changedProperty.id]),
    }
}

const getActivityAction = (board: Board, card: Card, previousCard?: Card): ActivityAction => {
    if (card.deleteAt !== 0) {
        return 'deleted'
    }

    if (!previousCard) {
        return 'created'
    }

    if (previousCard.title !== card.title) {
        return 'renamed'
    }

    if (getMoveDetails(board, card, previousCard)) {
        return 'moved'
    }

    return 'updated'
}

const createActivityLog = (
    card: Card,
    board: Board,
    action: ActivityAction,
    previousCard?: Card,
    sourceBlock?: Block,
): ActivityLog => {
    const timestamp = sourceBlock?.updateAt || card.updateAt || Date.now()
    const moveDetails = action === 'moved' ? getMoveDetails(board, card, previousCard) : null

    return {
        action,
        actorId: sourceBlock?.modifiedBy || card.modifiedBy || card.createdBy,
        boardId: board.id,
        boardTitle: board.title,
        cardId: card.id,
        cardTitle: card.title || previousCard?.title || '',
        fromValue: moveDetails?.fromValue,
        id: `${sourceBlock?.id || card.id}-${timestamp}-${action}`,
        timestamp,
        toValue: moveDetails?.toValue,
    }
}

const getHistoryPreviousBlock = (historyById: Map<string, Block[]>, block: Block): Block | undefined => {
    return historyById.get(block.id)?.find((historyBlock) => historyBlock.updateAt < block.updateAt)
}

const buildActivityLogsFromHistory = (
    historyBlocks: Block[],
    boardsById: Map<string, Board>,
    cardsById: {[cardId: string]: Card},
): ActivityLog[] => {
    const historyById = new Map<string, Block[]>()
    historyBlocks.forEach((block) => {
        historyById.set(block.id, [...(historyById.get(block.id) || []), block])
    })
    historyById.forEach((blocks) => blocks.sort((a, b) => b.updateAt - a.updateAt))

    return historyBlocks.reduce<ActivityLog[]>((result, block) => {
        const board = boardsById.get(block.boardId)
        if (!board) {
            return result
        }

        if (block.type === 'card') {
            const card = block as Card
            const previousCard = getHistoryPreviousBlock(historyById, block) as Card | undefined
            result.push(createActivityLog(card, board, getActivityAction(board, card, previousCard), previousCard))
            return result
        }

        if (isCardContentBlock(block)) {
            const parentCard = cardsById[block.parentId]
            if (parentCard) {
                result.push(createActivityLog(parentCard, board, 'edited', parentCard, block))
            }
        }

        return result
    }, [])
}

const ActivityLogs = (): JSX.Element => {
    const intl = useIntl()
    const dispatch = useAppDispatch()
    const boards = useAppSelector(getMySortedBoards)
    const currentTeamId = useAppSelector(getCurrentTeamId)
    const firstTeam = useAppSelector(getFirstTeam)
    const me = useAppSelector(getMe)
    const boardUsers = useAppSelector(getBoardUsers)
    const [hasNextPage, setHasNextPage] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [pageCursors, setPageCursors] = useState<number[]>([0])
    const [pageIndex, setPageIndex] = useState(0)
    const cardsSnapshot = useRef<{[cardId: string]: Card}>({})
    const taskBoards = useMemo(() => boards.filter((board) => !board.isTemplate), [boards])
    const boardsById = useMemo(() => new Map(taskBoards.map((board) => [board.id, board])), [taskBoards])
    const websocketTeamId = currentTeamId || firstTeam?.id || taskBoards[0]?.teamId || ''
    const currentPageCursor = pageCursors[pageIndex] || 0
    const visiblePageNumbers = useMemo(() => {
        const pageCount = pageIndex + (hasNextPage ? 2 : 1)
        const pages = new Set<number>([1, pageCount, pageIndex + 1])

        if (pageIndex > 0) {
            pages.add(pageIndex)
        }
        if (pageIndex + 2 <= pageCount) {
            pages.add(pageIndex + 2)
        }

        return Array.from(pages).
            filter((page) => page >= 1 && page <= pageCount).
            sort((a, b) => a - b)
    }, [hasNextPage, pageIndex])

    useEffect(() => {
        let canceled = false

        async function loadLogs() {
            setIsLoading(true)
            const entries = await Promise.all(taskBoards.map(async (board) => {
                const [blocks, members] = await Promise.all([
                    octoClient.getAllBlocks(board.id),
                    octoClient.getBoardMembers(board.teamId, board.id),
                ])
                const cards = blocks.filter((block) => block.type === 'card' && block.deleteAt === 0 && !block.fields.isTemplate) as Card[]
                const realMembers = members.filter((member) => !member.synthetic)
                const userIds = Array.from(new Set([...realMembers.map((member) => member.userId), board.createdBy]))

                if (userIds.length > 0) {
                    const users = await octoClient.getTeamUsersList(userIds, board.teamId)
                    dispatch(addBoardUsers(users))
                }

                return cards
            }))

            const nextCardsSnapshot = {...cardsSnapshot.current}
            entries.flat().forEach((card) => {
                nextCardsSnapshot[card.id] = card
            })

            const historyBlocks = websocketTeamId ? await octoClient.getDashboardActivityBlocks(websocketTeamId, ACTIVITY_LOG_HISTORY_PAGE_LIMIT, currentPageCursor) : []
            if (canceled) {
                return
            }

            const pageLogs = buildActivityLogsFromHistory(historyBlocks, boardsById, nextCardsSnapshot).
                sort((a, b) => b.timestamp - a.timestamp)
            const currentLogs = pageLogs.slice(0, ACTIVITY_LOG_PAGE_SIZE)
            const nextCursor = currentLogs[currentLogs.length - 1]?.timestamp || 0

            setHasNextPage(pageLogs.length > ACTIVITY_LOG_PAGE_SIZE && nextCursor > 0)
            setPageCursors((previousCursors) => {
                if (pageLogs.length <= ACTIVITY_LOG_PAGE_SIZE || nextCursor === 0) {
                    return previousCursors
                }

                const nextCursors = [...previousCursors]
                nextCursors[pageIndex + 1] = nextCursor
                return nextCursors
            })
            cardsSnapshot.current = nextCardsSnapshot
            setLogs(currentLogs)
            setIsLoading(false)
        }

        loadLogs()

        return () => {
            canceled = true
        }
    }, [boardsById, currentPageCursor, dispatch, pageIndex, taskBoards, websocketTeamId])

    useWebsockets(websocketTeamId, (wsClient) => {
        const incrementalBlockUpdate = (_: WSClient, blocks: Block[]) => {
            const cardUpdates = blocks.filter((block) => block.type === 'card' && !block.fields.isTemplate) as Card[]
            const contentUpdates = blocks.filter(isCardContentBlock)
            const nextLogs = cardUpdates.reduce<ActivityLog[]>((result, card) => {
                const board = boardsById.get(card.boardId)
                if (!board) {
                    return result
                }

                const previousCard = cardsSnapshot.current[card.id]
                result.push(createActivityLog(card, board, getActivityAction(board, card, previousCard), previousCard))

                if (card.deleteAt === 0) {
                    cardsSnapshot.current[card.id] = card
                } else {
                    delete cardsSnapshot.current[card.id]
                }

                return result
            }, [])

            contentUpdates.forEach((block) => {
                const board = boardsById.get(block.boardId)
                const parentCard = cardsSnapshot.current[block.parentId]
                if (board && parentCard) {
                    nextLogs.push(createActivityLog(parentCard, board, 'edited', parentCard, block))
                }
            })

            if (nextLogs.length > 0 && pageIndex === 0) {
                setLogs((previousLogs) => {
                    const seen = new Set<string>()
                    return [...nextLogs, ...previousLogs].
                        filter((log) => {
                            if (seen.has(log.id)) {
                                return false
                            }
                            seen.add(log.id)
                            return true
                        }).
                        sort((a, b) => b.timestamp - a.timestamp).
                        slice(0, ACTIVITY_LOG_PAGE_SIZE)
                })
            }
        }

        wsClient.addOnChange(incrementalBlockUpdate, 'block')

        return () => {
            wsClient.removeOnChange(incrementalBlockUpdate, 'block')
        }
    }, [boardsById, pageIndex])

    const getUserDisplayName = useCallback((userId: string): string => {
        if (me?.id === userId) {
            return me.username
        }

        const user = boardUsers[userId]
        return user?.nickname || user?.username || user?.email || intl.formatMessage({
            id: 'Dashboard.unknown-user',
            defaultMessage: 'Someone',
        })
    }, [boardUsers, intl, me])

    const formatAuditDate = (timestamp: number): string => {
        const date = [
            intl.formatDate(timestamp, {
                day: '2-digit',
                timeZone: ACTIVITY_LOG_TIME_ZONE,
            }),
            intl.formatDate(timestamp, {
                month: 'long',
                timeZone: ACTIVITY_LOG_TIME_ZONE,
            }),
            intl.formatDate(timestamp, {
                timeZone: ACTIVITY_LOG_TIME_ZONE,
                year: 'numeric',
            }),
        ].join(' ')
        const time = intl.formatTime(timestamp, {
            hour: '2-digit',
            hour12: false,
            minute: '2-digit',
            second: '2-digit',
            timeZone: ACTIVITY_LOG_TIME_ZONE,
        })

        return `${date}, ${time}`
    }

    const renderLogMessage = (log: ActivityLog) => {
        const emptyValue = intl.formatMessage({
            id: 'Dashboard.empty-value',
            defaultMessage: 'Empty',
        })
        const values = {
            b: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
            board: log.boardTitle,
            card: log.cardTitle || intl.formatMessage({
                id: 'Dashboard.untitled-card',
                defaultMessage: 'Untitled card',
            }),
            source: log.fromValue || emptyValue,
            target: log.toValue || emptyValue,
            user: getUserDisplayName(log.actorId),
        }

        switch (log.action) {
        case 'created':
            return (
                <FormattedMessage
                    id='Dashboard.activity-created'
                    defaultMessage='<b>{user}</b> created <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'deleted':
            return (
                <FormattedMessage
                    id='Dashboard.activity-deleted'
                    defaultMessage='<b>{user}</b> deleted <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'renamed':
            return (
                <FormattedMessage
                    id='Dashboard.activity-renamed'
                    defaultMessage='<b>{user}</b> renamed <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'moved':
            return (
                <FormattedMessage
                    id='Dashboard.activity-moved'
                    defaultMessage='<b>{user}</b> moved <b>{card}</b> from <b>{source}</b> to <b>{target}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'edited':
            return (
                <FormattedMessage
                    id='Dashboard.activity-edited'
                    defaultMessage='<b>{user}</b> edited content in <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        default:
            return (
                <FormattedMessage
                    id='Dashboard.activity-updated'
                    defaultMessage='<b>{user}</b> updated <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        }
    }

    return (
        <div className='ActivityLogs'>
            <div className='activity-logs-header'>
                <div className='activity-logs-eyebrow'>
                    <FormattedMessage
                        id='ActivityLogs.eyebrow'
                        defaultMessage='Activity Logs'
                    />
                </div>
                <h1>
                    <FormattedMessage
                        id='ActivityLogs.title'
                        defaultMessage='User activity logs'
                    />
                </h1>
                <p>
                    <FormattedMessage
                        id='ActivityLogs.description'
                        defaultMessage='Recent board activity related to your Task Boards.'
                    />
                </p>
            </div>

            <section className='activity-logs-card'>
                {(logs.length > 0 || isLoading || pageIndex > 0) &&
                    <div className='activity-logs-table-wrap'>
                        <div className='activity-logs-table-scroll'>
                            {logs.length === 0 && !isLoading &&
                                <div className='activity-logs-empty'>
                                    <FormattedMessage
                                        id='ActivityLogs.empty'
                                        defaultMessage='No activity logs yet.'
                                    />
                                </div>}
                            <table className='activity-logs-table'>
                                <thead>
                                    <tr>
                                        <th>
                                            <FormattedMessage
                                                id='ActivityLogs.column-time'
                                                defaultMessage='Date & time'
                                            />
                                        </th>
                                        <th>
                                            <FormattedMessage
                                                id='ActivityLogs.column-user'
                                                defaultMessage='User'
                                            />
                                        </th>
                                        <th>
                                            <FormattedMessage
                                                id='ActivityLogs.column-activity'
                                                defaultMessage='Activity'
                                            />
                                        </th>
                                        <th>
                                            <FormattedMessage
                                                id='ActivityLogs.column-task-board'
                                                defaultMessage='Task Board'
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td className='activity-log-time'>{formatAuditDate(log.timestamp)}</td>
                                            <td className='activity-log-user'>{getUserDisplayName(log.actorId)}</td>
                                            <td>
                                                <div className='activity-log-message'>
                                                    <span className='activity-log-icon'>
                                                        <CompassIcon icon='pencil-outline'/>
                                                    </span>
                                                    <span>{renderLogMessage(log)}</span>
                                                </div>
                                            </td>
                                            <td className='activity-log-board'>{log.boardTitle}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className='activity-logs-pagination'>
                            <button
                                className='activity-logs-page-arrow'
                                disabled={isLoading || pageIndex === 0}
                                onClick={() => setPageIndex((previousPageIndex) => Math.max(previousPageIndex - 1, 0))}
                                type='button'
                            >
                                <FormattedMessage
                                    id='ActivityLogs.previous'
                                    defaultMessage='Previous'
                                />
                            </button>
                            <div className='activity-logs-page-list'>
                                {visiblePageNumbers.map((pageNumber, index) => (
                                    <React.Fragment key={pageNumber}>
                                        {index > 0 && pageNumber - visiblePageNumbers[index - 1] > 1 &&
                                            <span className='activity-logs-page-ellipsis'>{'...'}</span>}
                                        <button
                                            aria-current={pageNumber === pageIndex + 1 ? 'page' : undefined}
                                            className='activity-logs-page-number'
                                            disabled={isLoading || pageNumber === pageIndex + 1}
                                            onClick={() => setPageIndex(pageNumber - 1)}
                                            type='button'
                                        >
                                            {pageNumber}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>
                            <button
                                className='activity-logs-page-arrow'
                                disabled={isLoading || !hasNextPage}
                                onClick={() => setPageIndex((previousPageIndex) => previousPageIndex + 1)}
                                type='button'
                            >
                                <FormattedMessage
                                    id='ActivityLogs.next'
                                    defaultMessage='Next'
                                />
                            </button>
                        </div>
                    </div>}
                {logs.length === 0 && !isLoading && pageIndex === 0 &&
                    <div className='activity-logs-empty'>
                        <FormattedMessage
                            id='ActivityLogs.empty'
                            defaultMessage='No activity logs yet.'
                        />
                    </div>}
            </section>
        </div>
    )
}

export default React.memo(ActivityLogs)
