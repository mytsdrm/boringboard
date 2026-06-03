// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {IconCalendarEvent, IconChevronDown, IconChevronLeft, IconChevronRight, IconPencil, IconSearch} from '@tabler/icons-react'
import {FormattedMessage, useIntl} from 'react-intl'
import {DateUtils} from 'react-day-picker'
import DayPicker from 'react-day-picker/DayPicker'

import {Block} from '../../blocks/block'
import {Board, BoardMember, IPropertyTemplate} from '../../blocks/board'
import {Card} from '../../blocks/card'
import {useWebsockets} from '../../hooks/websockets'
import octoClient, {BoardMemberActivityEntry} from '../../octoClient'
import {getMySortedBoards} from '../../store/boards'
import {useAppDispatch, useAppSelector} from '../../store/hooks'
import {getCurrentTeamId, getFirstTeam} from '../../store/teams'
import {addBoardUsers, getBoardUsers, getMe} from '../../store/users'
import {applyProjectSystemSettings, getStoredProjectSystemSettings, ProjectSystemSettings, SYSTEM_SETTINGS_UPDATED_EVENT} from '../../systemSettings'
import {WSClient} from '../../wsclient'
import TableModule from '../tableModule/tableModule'

import 'react-day-picker/lib/style.css'
import '@tabler/core/dist/css/tabler.min.css'
import '../admin/adminPages.scss'
import './activityLogs.scss'

type ActivityAction =
    'created' |
    'deleted' |
    'renamed' |
    'moved' |
    'edited' |
    'updated' |
    'comment-added' |
    'comment-deleted' |
    'content-added' |
    'content-deleted' |
    'property-changed' |
    'assigned-person' |
    'unassigned-person' |
    'invited-admin' |
    'invited-editor' |
    'invited-commenter' |
    'invited-viewer' |
    'invited-member'

type ActivityLog = {
    id: string
    action: ActivityAction
    actorId: string
    boardId: string
    boardTitle: string
    cardId: string
    cardTitle: string
    fromValue?: string
    propertyName?: string
    propertyType?: string
    timestamp: number
    toValue?: string
}

const ACTIVITY_LOG_PAGE_SIZE = 20
const ACTIVITY_LOG_HISTORY_PAGE_LIMIT = 200

const toDateInputValue = (date: Date): string => {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
}

const getDefaultMonthRange = (): {endDate: string, startDate: string} => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    return {
        endDate: toDateInputValue(lastDay),
        startDate: toDateInputValue(firstDay),
    }
}

const toLocalDate = (dateValue: string): Date | undefined => {
    if (!dateValue) {
        return undefined
    }

    return new Date(`${dateValue}T12:00:00`)
}

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

const getChangedProperty = (board: Board, card: Card, previousCard?: Card): IPropertyTemplate | null => {
    if (!previousCard) {
        return null
    }

    return board.cardProperties.find((property) => {
        const oldValue = JSON.stringify(previousCard.fields.properties[property.id] || '')
        const newValue = JSON.stringify(card.fields.properties[property.id] || '')
        return oldValue !== newValue
    }) || null
}

const getMoveDetails = (board: Board, card: Card, previousCard?: Card): Pick<ActivityLog, 'fromValue' | 'propertyName' | 'toValue'> | null => {
    const changedProperty = getChangedProperty(board, card, previousCard)

    if (!changedProperty || changedProperty.options.length === 0) {
        return null
    }

    return {
        fromValue: getPropertyValueLabel(changedProperty, previousCard.fields.properties[changedProperty.id]),
        propertyName: changedProperty.name,
        toValue: getPropertyValueLabel(changedProperty, card.fields.properties[changedProperty.id]),
    }
}

const valueCount = (value: string | string[] | undefined): number => {
    if (!value) {
        return 0
    }
    return Array.isArray(value) ? value.length : 1
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

    const changedProperty = getChangedProperty(board, card, previousCard)
    if (changedProperty) {
        if (changedProperty.type === 'person' || changedProperty.type === 'multiPerson') {
            const previousCount = valueCount(previousCard?.fields.properties[changedProperty.id])
            const nextCount = valueCount(card.fields.properties[changedProperty.id])
            if (nextCount > previousCount) {
                return 'assigned-person'
            }
            if (nextCount < previousCount) {
                return 'unassigned-person'
            }
        }
        return 'property-changed'
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
    const changedProperty = moveDetails ? null : getChangedProperty(board, card, previousCard)

    return {
        action,
        actorId: sourceBlock?.modifiedBy || card.modifiedBy || card.createdBy,
        boardId: board.id,
        boardTitle: board.title,
        cardId: card.id,
        cardTitle: card.title || previousCard?.title || '',
        fromValue: moveDetails?.fromValue || (changedProperty ? getPropertyValueLabel(changedProperty, previousCard?.fields.properties[changedProperty.id]) : undefined),
        id: `${sourceBlock?.id || card.id}-${timestamp}-${action}`,
        propertyName: moveDetails?.propertyName || changedProperty?.name,
        propertyType: changedProperty?.type,
        timestamp,
        toValue: moveDetails?.toValue || (changedProperty ? getPropertyValueLabel(changedProperty, card.fields.properties[changedProperty.id]) : undefined),
    }
}

const getMemberInviteAction = (role: string): ActivityAction => {
    switch (role) {
    case 'admin':
        return 'invited-admin'
    case 'editor':
        return 'invited-editor'
    case 'commenter':
        return 'invited-commenter'
    case 'viewer':
        return 'invited-viewer'
    default:
        return 'invited-member'
    }
}

const getMemberRole = (member: BoardMember): string => {
    if (member.schemeAdmin) {
        return 'admin'
    }
    if (member.schemeEditor) {
        return 'editor'
    }
    if (member.schemeCommenter) {
        return 'commenter'
    }
    if (member.schemeViewer) {
        return 'viewer'
    }
    return 'member'
}

const createMemberInviteActivityLog = (member: BoardMember, board: Board): ActivityLog => {
    const timestamp = Date.now()
    const action = getMemberInviteAction(getMemberRole(member))

    return {
        action,
        actorId: member.userId,
        boardId: board.id,
        boardTitle: board.title,
        cardId: member.userId,
        cardTitle: '',
        id: `${board.id}-${member.userId}-${timestamp}-${action}`,
        timestamp,
    }
}

const createMemberInviteActivityLogFromHistory = (entry: BoardMemberActivityEntry, board: Board): ActivityLog => {
    const timestamp = new Date(entry.insertAt).getTime()
    const action = getMemberInviteAction(entry.action)

    return {
        action,
        actorId: entry.userId,
        boardId: board.id,
        boardTitle: board.title,
        cardId: entry.userId,
        cardTitle: '',
        id: `${board.id}-${entry.userId}-${timestamp}-${action}`,
        timestamp,
    }
}

const isRealBoardMember = (member: BoardMember): boolean => {
    return Boolean(!member.synthetic && (member.schemeAdmin || member.schemeEditor || member.schemeCommenter || member.schemeViewer))
}

const isMemberInviteHistoryAction = (action: string): boolean => {
    return ['admin', 'editor', 'commenter', 'viewer', 'created'].includes(action)
}

const getRelatedUserIdsFromLog = (log: ActivityLog): string[] => {
    if (log.propertyType !== 'person' && log.propertyType !== 'multiPerson') {
        return []
    }

    return [log.fromValue, log.toValue].
        filter(Boolean).
        flatMap((value) => (value || '').split(',').map((part) => part.trim())).
        filter(Boolean)
}

const getHistoryPreviousBlock = (historyById: Map<string, Block[]>, block: Block): Block | undefined => {
    return historyById.get(block.id)?.find((historyBlock) => historyBlock.updateAt < block.updateAt)
}

const areBoardListsEqual = (previousBoards: Board[], nextBoards: Board[]): boolean => {
    if (previousBoards.length !== nextBoards.length) {
        return false
    }

    return previousBoards.every((board, index) => {
        const nextBoard = nextBoards[index]
        return nextBoard &&
            board.id === nextBoard.id &&
            board.updateAt === nextBoard.updateAt &&
            board.title === nextBoard.title
    })
}

const isAdminUser = (user?: {permissions?: string[], roles?: string}): boolean => {
    return Boolean(user?.roles?.includes('SuperAdmin')) ||
        Boolean(user?.roles?.includes('system_admin')) ||
        Boolean(user?.permissions?.includes('manage_system'))
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

    const logs = historyBlocks.reduce<ActivityLog[]>((result, block) => {
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

        if (block.type === 'comment') {
            const parentCard = cardsById[block.parentId]
            if (parentCard) {
                const previousComment = getHistoryPreviousBlock(historyById, block)
                let action: ActivityAction = 'comment-added'
                if (block.deleteAt !== 0) {
                    action = 'comment-deleted'
                } else if (previousComment) {
                    action = 'edited'
                }
                result.push(createActivityLog(parentCard, board, action, parentCard, block))
            }
            return result
        }

        if (isCardContentBlock(block)) {
            const parentCard = cardsById[block.parentId]
            if (parentCard) {
                const previousContent = getHistoryPreviousBlock(historyById, block)
                let action: ActivityAction = 'edited'
                if (block.deleteAt !== 0) {
                    action = 'content-deleted'
                } else if (!previousContent) {
                    action = 'content-added'
                }
                result.push(createActivityLog(parentCard, board, action, parentCard, block))
            }
        }

        return result
    }, [])

    const specificEventKeys = new Set(logs.
        filter((log) => log.action !== 'updated').
        map((log) => `${log.actorId}:${log.boardId}:${log.cardId}:${log.timestamp}`))
    const seenLogKeys = new Set<string>()

    return logs.filter((log) => {
        const eventKey = `${log.actorId}:${log.boardId}:${log.cardId}:${log.timestamp}`
        if (log.action === 'updated' && specificEventKeys.has(eventKey)) {
            return false
        }

        const logKey = [
            eventKey,
            log.action,
            log.fromValue || '',
            log.toValue || '',
            log.cardTitle,
        ].join(':')
        if (seenLogKeys.has(logKey)) {
            return false
        }
        seenLogKeys.add(logKey)
        return true
    })
}

const activityLogsCache = {
    adminBoards: [] as Board[],
    cardsSnapshot: {} as {[cardId: string]: Card},
    hasNextPage: false,
    logs: [] as ActivityLog[],
    memberUserIds: [] as string[],
    pageCursors: [0] as number[],
}

type Props = {
    adminMode?: boolean
}

const ActivityLogs = (props: Props): JSX.Element => {
    const intl = useIntl()
    const dispatch = useAppDispatch()
    const boards = useAppSelector(getMySortedBoards)
    const currentTeamId = useAppSelector(getCurrentTeamId)
    const firstTeam = useAppSelector(getFirstTeam)
    const me = useAppSelector(getMe)
    const boardUsers = useAppSelector(getBoardUsers)
    const [hasNextPage, setHasNextPage] = useState(activityLogsCache.hasNextPage)
    const [isLoading, setIsLoading] = useState(false)
    const [logs, setLogs] = useState<ActivityLog[]>(activityLogsCache.logs)
    const [pageCursors, setPageCursors] = useState<number[]>(activityLogsCache.pageCursors)
    const [pageIndex, setPageIndex] = useState(0)
    const [projectSettings, setProjectSettings] = useState<ProjectSystemSettings>(getStoredProjectSystemSettings)
    const [memberUserIds, setMemberUserIds] = useState<string[]>(activityLogsCache.memberUserIds)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedUserId, setSelectedUserId] = useState('')
    const [showDateRangePicker, setShowDateRangePicker] = useState(false)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const cardsSnapshot = useRef<{[cardId: string]: Card}>({...activityLogsCache.cardsSnapshot})
    const [adminBoards, setAdminBoards] = useState<Board[]>(activityLogsCache.adminBoards)
    const taskBoards = useMemo(() => {
        if (props.adminMode) {
            return adminBoards
        }
        return boards.filter((board) => !board.isTemplate)
    }, [adminBoards, boards, props.adminMode])
    const taskBoardKey = useMemo(() => {
        return taskBoards.map((board) => `${board.id}:${board.updateAt}:${board.title}`).join('|')
    }, [taskBoards])
    const boardsById = useMemo(() => new Map(taskBoards.map((board) => [board.id, board])), [taskBoards])
    const websocketTeamId = currentTeamId || firstTeam?.id || taskBoards[0]?.teamId || ''
    const currentPageCursor = pageCursors[pageIndex] || 0
    const startDateAfter = useMemo(() => {
        if (!startDate) {
            return 0
        }

        return new Date(`${startDate}T00:00:00`).getTime() - 1
    }, [startDate])
    const endDateBefore = useMemo(() => {
        if (!endDate) {
            return 0
        }

        return new Date(`${endDate}T23:59:59.999`).getTime() + 1
    }, [endDate])
    const requestBefore = useMemo(() => {
        if (currentPageCursor > 0 && endDateBefore > 0) {
            return Math.min(currentPageCursor, endDateBefore)
        }

        return currentPageCursor || endDateBefore
    }, [currentPageCursor, endDateBefore])
    const selectedDateRange = useMemo(() => {
        return {
            from: toLocalDate(startDate),
            to: toLocalDate(endDate),
        }
    }, [endDate, startDate])
    const dateRangeLabel = useMemo(() => {
        const from = toLocalDate(startDate)
        const to = toLocalDate(endDate)
        if (!from && !to) {
            return intl.formatMessage({
                id: 'ActivityLogs.select-date-range',
                defaultMessage: 'Select date range',
            })
        }
        if (from && to) {
            return `${intl.formatDate(from)} - ${intl.formatDate(to)}`
        }
        if (from) {
            return intl.formatDate(from)
        }
        return intl.formatDate(to as Date)
    }, [endDate, intl, startDate])
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
        async function loadSystemSettings() {
            const nextSettings = await octoClient.getSystemSettings()
            if (!canceled) {
                setProjectSettings(applyProjectSystemSettings(nextSettings))
            }
        }
        const handleSystemSettingsUpdated = (event: Event) => {
            setProjectSettings((event as CustomEvent<ProjectSystemSettings>).detail || getStoredProjectSystemSettings())
        }

        window.addEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSystemSettingsUpdated)
        loadSystemSettings()
        return () => {
            canceled = true
            window.removeEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSystemSettingsUpdated)
        }
    }, [])

    useEffect(() => {
        activityLogsCache.pageCursors = [0]
        setPageIndex(0)
        setPageCursors([0])
    }, [endDateBefore, searchQuery, selectedUserId, startDateAfter])

    const handleDateRangeDayClick = (day: Date) => {
        const range = DateUtils.addDayToRange(day, selectedDateRange)
        setStartDate(range.from ? toDateInputValue(range.from) : '')
        setEndDate(range.to ? toDateInputValue(range.to) : '')
    }

    const resetDateRangeToCurrentMonth = () => {
        const currentMonthRange = getDefaultMonthRange()
        setStartDate(currentMonthRange.startDate)
        setEndDate(currentMonthRange.endDate)
    }

    useEffect(() => {
        let canceled = false

        async function loadLogs() {
            setIsLoading(true)
            const [nextAdminBoards, entries, teamUsers] = await Promise.all([
                props.adminMode && websocketTeamId ? octoClient.getAdminBoards(websocketTeamId) : Promise.resolve([]),
                props.adminMode ? Promise.resolve([]) : Promise.all(taskBoards.map(async (board) => {
                    const [blocks, members] = await Promise.all([
                        octoClient.getAllBlocks(board.id),
                        octoClient.getBoardMembers(board.teamId, board.id),
                    ])
                    const cards = blocks.filter((block) => block.type === 'card' && block.deleteAt === 0 && !block.fields.isTemplate) as Card[]
                    const userIds = Array.from(new Set([
                        ...members.map((member) => member.userId),
                        board.createdBy,
                    ]))

                    const users = userIds.length > 0 ? await octoClient.getTeamUsersList(userIds, board.teamId) : []

                    return {cards, userIds, users}
                })),
                props.adminMode ? octoClient.getAdminUsers() : octoClient.getTeamUsers(true),
            ])
            if (props.adminMode) {
                setAdminBoards((previousBoards) => {
                    const boardsToStore = areBoardListsEqual(previousBoards, nextAdminBoards) ? previousBoards : nextAdminBoards
                    activityLogsCache.adminBoards = boardsToStore
                    return boardsToStore
                })
            }
            const effectiveBoardsById = new Map((props.adminMode ? nextAdminBoards : taskBoards).map((board) => [board.id, board]))

            const nextCardsSnapshot = {...cardsSnapshot.current}
            entries.flatMap((entry) => entry.cards).forEach((card) => {
                nextCardsSnapshot[card.id] = card
            })

            let historyBlocks: Block[] = []
            let memberHistoryEntries: BoardMemberActivityEntry[] = []
            if (websocketTeamId) {
                const historyLimit = props.adminMode ? 50 : ACTIVITY_LOG_HISTORY_PAGE_LIMIT
                const [nextHistoryBlocks, nextMemberHistoryEntries] = props.adminMode ? await Promise.all([
                    octoClient.getAdminActivityBlocks(websocketTeamId, historyLimit, requestBefore, startDateAfter),
                    octoClient.getAdminMemberActivity(websocketTeamId, historyLimit, requestBefore, startDateAfter),
                ]) : await Promise.all([
                    octoClient.getDashboardActivityBlocks(websocketTeamId, ACTIVITY_LOG_HISTORY_PAGE_LIMIT, requestBefore, startDateAfter),
                    octoClient.getDashboardMemberActivity(websocketTeamId, ACTIVITY_LOG_HISTORY_PAGE_LIMIT, requestBefore, startDateAfter),
                ])
                historyBlocks = nextHistoryBlocks
                memberHistoryEntries = nextMemberHistoryEntries
            }
            if (canceled) {
                return
            }
            historyBlocks.filter((block) => block.type === 'card').forEach((block) => {
                nextCardsSnapshot[block.id] = block as Card
            })

            const nextUsers = [...entries.flatMap((entry) => entry.users), ...teamUsers]
            if (nextUsers.length > 0) {
                dispatch(addBoardUsers(nextUsers))
            }

            const nextMemberUserIds = new Set<string>()
            if (me?.id) {
                nextMemberUserIds.add(me.id)
            }
            entries.forEach((entry) => {
                entry.userIds.forEach((userId) => nextMemberUserIds.add(userId))
            })
            teamUsers.forEach((user) => nextMemberUserIds.add(user.id))

            const memberHistoryLogs = memberHistoryEntries.reduce<ActivityLog[]>((result, entry) => {
                const board = effectiveBoardsById.get(entry.boardId)
                if (board && isMemberInviteHistoryAction(entry.action)) {
                    result.push(createMemberInviteActivityLogFromHistory(entry, board))
                }
                return result
            }, [])

            const pageLogs = [
                ...buildActivityLogsFromHistory(historyBlocks, effectiveBoardsById, nextCardsSnapshot),
                ...memberHistoryLogs,
            ].
                filter((log) => !selectedUserId || log.actorId === selectedUserId).
                sort((a, b) => b.timestamp - a.timestamp)
            pageLogs.forEach((log) => {
                nextMemberUserIds.add(log.actorId)
                getRelatedUserIdsFromLog(log).forEach((userId) => nextMemberUserIds.add(userId))
            })
            const nextMemberUserIdList = Array.from(nextMemberUserIds)
            setMemberUserIds(nextMemberUserIdList)
            const currentLogs = pageLogs.slice(0, ACTIVITY_LOG_PAGE_SIZE)
            const nextCursor = currentLogs[currentLogs.length - 1]?.timestamp || 0

            const nextHasNextPage = pageLogs.length > ACTIVITY_LOG_PAGE_SIZE && nextCursor > 0
            setHasNextPage(nextHasNextPage)
            setPageCursors((previousCursors) => {
                if (pageLogs.length <= ACTIVITY_LOG_PAGE_SIZE || nextCursor === 0) {
                    activityLogsCache.pageCursors = previousCursors
                    return previousCursors
                }

                const nextCursors = [...previousCursors]
                nextCursors[pageIndex + 1] = nextCursor
                activityLogsCache.pageCursors = nextCursors
                return nextCursors
            })
            cardsSnapshot.current = nextCardsSnapshot
            activityLogsCache.cardsSnapshot = nextCardsSnapshot
            activityLogsCache.hasNextPage = nextHasNextPage
            activityLogsCache.logs = currentLogs
            activityLogsCache.memberUserIds = nextMemberUserIdList
            setLogs(currentLogs)
            setIsLoading(false)
        }

        loadLogs()

        return () => {
            canceled = true
        }
    }, [dispatch, me?.id, pageIndex, props.adminMode, requestBefore, selectedUserId, startDateAfter, taskBoardKey, websocketTeamId])

    useWebsockets(websocketTeamId, (wsClient) => {
        const incrementalBlockUpdate = (_: WSClient, blocks: Block[]) => {
            const cardUpdates = blocks.filter((block) => block.type === 'card' && !block.fields.isTemplate) as Card[]
            const contentUpdates = blocks.filter((block) => block.type === 'comment' || isCardContentBlock(block))
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
                    if (block.type === 'comment') {
                        const action: ActivityAction = block.deleteAt === 0 ? 'comment-added' : 'comment-deleted'
                        nextLogs.push(createActivityLog(parentCard, board, action, parentCard, block))
                    } else {
                        const action: ActivityAction = block.deleteAt === 0 ? 'edited' : 'content-deleted'
                        nextLogs.push(createActivityLog(parentCard, board, action, parentCard, block))
                    }
                }
            })

            const filteredNextLogs = nextLogs.filter((log) => {
                if (selectedUserId && log.actorId !== selectedUserId) {
                    return false
                }
                if (startDateAfter > 0 && log.timestamp <= startDateAfter) {
                    return false
                }
                if (endDateBefore > 0 && log.timestamp >= endDateBefore) {
                    return false
                }
                return true
            })

            if (filteredNextLogs.length > 0 && pageIndex === 0) {
                setLogs((previousLogs) => {
                    const seen = new Set<string>()
                    const mergedLogs = [...filteredNextLogs, ...previousLogs].
                        filter((log) => {
                            if (seen.has(log.id)) {
                                return false
                            }
                            seen.add(log.id)
                            return true
                        }).
                        sort((a, b) => b.timestamp - a.timestamp).
                        slice(0, ACTIVITY_LOG_PAGE_SIZE)
                    activityLogsCache.logs = mergedLogs
                    activityLogsCache.cardsSnapshot = cardsSnapshot.current
                    return mergedLogs
                })
                setMemberUserIds((previousMemberUserIds) => {
                    const mergedUserIds = Array.from(new Set([
                        ...previousMemberUserIds,
                        ...filteredNextLogs.map((log) => log.actorId),
                        ...filteredNextLogs.flatMap(getRelatedUserIdsFromLog),
                    ]))
                    activityLogsCache.memberUserIds = mergedUserIds
                    return mergedUserIds
                })
            }
        }

        wsClient.addOnChange(incrementalBlockUpdate, 'block')

        const incrementalBoardMemberUpdate = async (_: WSClient, members: BoardMember[]) => {
            const nextLogs = members.reduce<ActivityLog[]>((result, member) => {
                const board = boardsById.get(member.boardId)
                if (!board || !isRealBoardMember(member)) {
                    return result
                }

                result.push(createMemberInviteActivityLog(member, board))
                return result
            }, [])

            const filteredNextLogs = nextLogs.filter((log) => {
                if (selectedUserId && log.actorId !== selectedUserId) {
                    return false
                }
                if (startDateAfter > 0 && log.timestamp <= startDateAfter) {
                    return false
                }
                if (endDateBefore > 0 && log.timestamp >= endDateBefore) {
                    return false
                }
                return true
            })

            if (filteredNextLogs.length > 0 && pageIndex === 0) {
                const userIdsByTeamId = new Map<string, Set<string>>()
                filteredNextLogs.forEach((log) => {
                    const board = boardsById.get(log.boardId)
                    if (!board || boardUsers[log.actorId]) {
                        return
                    }
                    userIdsByTeamId.set(board.teamId, userIdsByTeamId.get(board.teamId) || new Set<string>())
                    userIdsByTeamId.get(board.teamId)?.add(log.actorId)
                })
                const nextUsers = (await Promise.all(Array.from(userIdsByTeamId.entries()).map(([teamId, userIds]) => (
                    octoClient.getTeamUsersList(Array.from(userIds), teamId)
                )))).flat()
                if (nextUsers.length > 0) {
                    dispatch(addBoardUsers(nextUsers))
                }

                setLogs((previousLogs) => {
                    const seen = new Set<string>()
                    const mergedLogs = [...filteredNextLogs, ...previousLogs].
                        filter((log) => {
                            if (seen.has(log.id)) {
                                return false
                            }
                            seen.add(log.id)
                            return true
                        }).
                        sort((a, b) => b.timestamp - a.timestamp).
                        slice(0, ACTIVITY_LOG_PAGE_SIZE)
                    activityLogsCache.logs = mergedLogs
                    return mergedLogs
                })
                setMemberUserIds((previousMemberUserIds) => {
                    const mergedUserIds = Array.from(new Set([
                        ...previousMemberUserIds,
                        ...filteredNextLogs.map((log) => log.actorId),
                    ]))
                    activityLogsCache.memberUserIds = mergedUserIds
                    return mergedUserIds
                })
            }
        }

        wsClient.addOnChange(incrementalBoardMemberUpdate, 'boardMembers')

        return () => {
            wsClient.removeOnChange(incrementalBlockUpdate, 'block')
            wsClient.removeOnChange(incrementalBoardMemberUpdate, 'boardMembers')
        }
    }, [boardsById, boardUsers, dispatch, endDateBefore, pageIndex, selectedUserId, startDateAfter])

    const getUserDisplayName = useCallback((userId: string): string => {
        if (me?.id === userId) {
            return me.nickname || me.username || me.email
        }

        const user = boardUsers[userId]
        return user?.nickname || user?.username || user?.email || intl.formatMessage({
            id: 'Dashboard.unknown-user',
            defaultMessage: 'Someone',
        })
    }, [boardUsers, intl, me])
    const getActivityValueDisplay = useCallback((log: ActivityLog, value?: string): string => {
        if (!value) {
            return ''
        }
        if (log.propertyType !== 'person' && log.propertyType !== 'multiPerson') {
            return value
        }
        return value.split(',').map((userId) => getUserDisplayName(userId.trim())).join(', ')
    }, [getUserDisplayName])

    const userFilterOptions = useMemo(() => {
        return Array.from(new Set([
            ...(me?.id ? [me.id] : []),
            ...memberUserIds,
            ...logs.map((log) => log.actorId),
        ])).
            filter((userId) => props.adminMode || !isAdminUser(boardUsers[userId])).
            sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b)))
    }, [boardUsers, getUserDisplayName, logs, me?.id, memberUserIds, props.adminMode])

    const formatAuditDate = (timestamp: number): string => {
        const date = [
            intl.formatDate(timestamp, {
                day: '2-digit',
                timeZone: projectSettings.timeZone,
            }),
            intl.formatDate(timestamp, {
                month: 'long',
                timeZone: projectSettings.timeZone,
            }),
            intl.formatDate(timestamp, {
                timeZone: projectSettings.timeZone,
                year: 'numeric',
            }),
        ].join(' ')
        const time = intl.formatTime(timestamp, {
            hour: '2-digit',
            hour12: false,
            minute: '2-digit',
            second: '2-digit',
            timeZone: projectSettings.timeZone,
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
            source: getActivityValueDisplay(log, log.fromValue) || emptyValue,
            target: getActivityValueDisplay(log, log.toValue) || emptyValue,
            property: log.propertyName || intl.formatMessage({
                id: 'ActivityLogs.unknown-property',
                defaultMessage: 'a property',
            }),
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
        case 'comment-added':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-comment-added'
                    defaultMessage='<b>{user}</b> commented on <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'comment-deleted':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-comment-deleted'
                    defaultMessage='<b>{user}</b> deleted a comment on <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'content-added':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-content-added'
                    defaultMessage='<b>{user}</b> added content to <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'content-deleted':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-content-deleted'
                    defaultMessage='<b>{user}</b> deleted content from <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'property-changed':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-property-changed'
                    defaultMessage='<b>{user}</b> changed <b>{property}</b> on <b>{card}</b> from <b>{source}</b> to <b>{target}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'assigned-person':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-assigned-person'
                    defaultMessage='<b>{user}</b> assigned <b>{target}</b> to <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'unassigned-person':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-unassigned-person'
                    defaultMessage='<b>{user}</b> removed <b>{source}</b> from <b>{card}</b> in <b>{board}</b>'
                    values={values}
                />
            )
        case 'invited-admin':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-invited-admin'
                    defaultMessage='<b>{user}</b> was invited as an admin to <b>{board}</b>'
                    values={values}
                />
            )
        case 'invited-editor':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-invited-editor'
                    defaultMessage='<b>{user}</b> was invited as an editor to <b>{board}</b>'
                    values={values}
                />
            )
        case 'invited-commenter':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-invited-commenter'
                    defaultMessage='<b>{user}</b> was invited as a commenter to <b>{board}</b>'
                    values={values}
                />
            )
        case 'invited-viewer':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-invited-viewer'
                    defaultMessage='<b>{user}</b> was invited as a viewer to <b>{board}</b>'
                    values={values}
                />
            )
        case 'invited-member':
            return (
                <FormattedMessage
                    id='ActivityLogs.activity-invited-member'
                    defaultMessage='<b>{user}</b> was invited to <b>{board}</b>'
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

    const getActivitySearchText = useCallback((log: ActivityLog): string => {
        const user = getUserDisplayName(log.actorId)
        const action = intl.formatMessage({
            id: `ActivityLogs.search-action-${log.action}`,
            defaultMessage: log.action,
        })

        return [
            user,
            action,
            log.boardTitle,
            log.cardTitle,
            log.propertyName,
            log.fromValue,
            log.toValue,
            log.timestamp,
        ].join(' ').toLowerCase()
    }, [getUserDisplayName, intl])
    const visibleLogs = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase()
        if (!normalizedSearch) {
            return logs
        }

        return logs.filter((log) => getActivitySearchText(log).includes(normalizedSearch))
    }, [getActivitySearchText, logs, searchQuery])

    return (
        <div className='AdminPage admin-users-page ActivityLogs'>
            <div className='admin-page-header admin-page-header-row'>
                <div>
                    <div className='admin-page-eyebrow'>
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
                        {props.adminMode ? (
                            <FormattedMessage
                                id='ActivityLogs.admin-description'
                                defaultMessage='Recent board activity from all registered users.'
                            />
                        ) : (
                            <FormattedMessage
                                id='ActivityLogs.description'
                                defaultMessage='Recent board activity related to your Task Boards.'
                            />
                        )}
                    </p>
                </div>
                <div className='admin-header-actions'>
                    <label>
                        <select
                            aria-label={intl.formatMessage({
                                id: 'ActivityLogs.filter-user',
                                defaultMessage: 'User',
                            })}
                            className='form-select'
                            disabled={isLoading}
                            onChange={(event) => setSelectedUserId(event.target.value)}
                            value={selectedUserId}
                        >
                            <option value=''>
                                {intl.formatMessage({
                                    id: 'ActivityLogs.all-users',
                                    defaultMessage: 'All users',
                                })}
                            </option>
                            {userFilterOptions.map((userId) => (
                                <option
                                    key={userId}
                                    value={userId}
                                >
                                    {getUserDisplayName(userId)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className='activity-logs-date-range'>
                        <button
                            aria-label={intl.formatMessage({
                                id: 'ActivityLogs.filter-date-range',
                                defaultMessage: 'Date range',
                            })}
                            className='form-control activity-logs-date-range-button'
                            disabled={isLoading}
                            onClick={() => setShowDateRangePicker((showPicker) => !showPicker)}
                            type='button'
                        >
                            <span className='activity-logs-date-range-label'>
                                <IconCalendarEvent size={18}/>
                                <span>{dateRangeLabel}</span>
                            </span>
                            <IconChevronDown
                                className='activity-logs-date-range-chevron'
                                size={18}
                            />
                        </button>
                        {showDateRangePicker &&
                            <div className='activity-logs-date-range-popover'>
                                <DayPicker
                                    initialMonth={selectedDateRange.from || new Date()}
                                    modifiers={{
                                        end: selectedDateRange.to,
                                        start: selectedDateRange.from,
                                    }}
                                    onDayClick={handleDateRangeDayClick}
                                    selectedDays={[
                                        selectedDateRange.from,
                                        {
                                            from: selectedDateRange.from,
                                            to: selectedDateRange.to,
                                        },
                                    ]}
                                />
                                <div className='activity-logs-date-range-actions'>
                                    <button
                                        className='btn btn-outline-secondary'
                                        disabled={isLoading}
                                        onClick={resetDateRangeToCurrentMonth}
                                        type='button'
                                    >
                                        <FormattedMessage
                                            id='ActivityLogs.this-month'
                                            defaultMessage='This month'
                                        />
                                    </button>
                                    <button
                                        className='btn btn-primary'
                                        disabled={isLoading}
                                        onClick={() => setShowDateRangePicker(false)}
                                        type='button'
                                    >
                                        <FormattedMessage
                                            id='ActivityLogs.close'
                                            defaultMessage='Close'
                                        />
                                    </button>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </div>

            <TableModule
                className='admin-users-table-card activity-logs-table-card'
                fileName='activity-logs'
                printTitle={intl.formatMessage({
                    id: 'ActivityLogs.title',
                    defaultMessage: 'User activity logs',
                })}
                toolbarLeft={(
                    <label className='admin-users-search'>
                        <div className='input-icon'>
                            <span className='input-icon-addon'>
                                <IconSearch size={18}/>
                            </span>
                            <input
                                aria-label={intl.formatMessage({
                                    id: 'ActivityLogs.search',
                                    defaultMessage: 'Search',
                                })}
                                className='form-control'
                                disabled={isLoading}
                                placeholder={intl.formatMessage({
                                    id: 'ActivityLogs.search-placeholder',
                                    defaultMessage: 'Search activity',
                                })}
                                type='search'
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                    </label>
                )}
            >
                <div className='table-responsive'>
                    <table className='table table-vcenter card-table activity-logs-table'>
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
                            {visibleLogs.map((log) => (
                                <tr key={log.id}>
                                    <td className='activity-log-time'>{formatAuditDate(log.timestamp)}</td>
                                    <td className='activity-log-user'>{getUserDisplayName(log.actorId)}</td>
                                    <td>
                                        <div className='activity-log-message'>
                                            <span className='activity-log-icon'>
                                                <IconPencil size={18}/>
                                            </span>
                                            <span>{renderLogMessage(log)}</span>
                                        </div>
                                    </td>
                                    <td className='activity-log-board'>{log.boardTitle}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!isLoading && visibleLogs.length === 0 &&
                        <div className='admin-page-empty'>
                            <FormattedMessage
                                id='ActivityLogs.empty'
                                defaultMessage='No activity logs yet.'
                            />
                        </div>}
                    {isLoading && visibleLogs.length === 0 &&
                        <div className='admin-page-empty'>
                            <FormattedMessage
                                id='ActivityLogs.loading'
                                defaultMessage='Loading activity logs...'
                            />
                        </div>}
                </div>
                {(logs.length > 0 || pageIndex > 0 || hasNextPage) &&
                    <div className='card-footer admin-users-pagination'>
                        <div className='admin-users-pagination-inner'>
                            <div className='activity-logs-pagination-status'>
                                <span className='text-secondary admin-users-pagination-summary'>
                                    <FormattedMessage
                                        id='ActivityLogs.pagination-summary'
                                        defaultMessage='Page {page}'
                                        values={{page: pageIndex + 1}}
                                    />
                                </span>
                                {isLoading && visibleLogs.length > 0 &&
                                    <span className='activity-logs-inline-loader'>
                                        <span
                                            aria-hidden={true}
                                            className='spinner-border spinner-border-sm'
                                        />
                                        <FormattedMessage
                                            id='ActivityLogs.refreshing'
                                            defaultMessage='Loading...'
                                        />
                                    </span>}
                            </div>
                            <ul className='pagination m-0'>
                                <li className={`page-item ${pageIndex === 0 ? 'disabled' : ''}`}>
                                    <button
                                        aria-label={intl.formatMessage({
                                            id: 'ActivityLogs.previous',
                                            defaultMessage: 'Previous',
                                        })}
                                        className='page-link'
                                        disabled={isLoading || pageIndex === 0}
                                        onClick={() => setPageIndex((previousPageIndex) => Math.max(previousPageIndex - 1, 0))}
                                        type='button'
                                    >
                                        <IconChevronLeft
                                            className='icon'
                                            size={18}
                                        />
                                    </button>
                                </li>
                                {visiblePageNumbers.map((pageNumber, index) => (
                                    <React.Fragment key={pageNumber}>
                                        {index > 0 && pageNumber - visiblePageNumbers[index - 1] > 1 &&
                                            <li className='page-item disabled'>
                                                <span className='page-link'>{'...'}</span>
                                            </li>}
                                        <li className={`page-item ${pageNumber === pageIndex + 1 ? 'active' : ''}`}>
                                            <button
                                                className='page-link'
                                                disabled={isLoading || pageNumber === pageIndex + 1}
                                                onClick={() => setPageIndex(pageNumber - 1)}
                                                type='button'
                                            >
                                                {pageNumber}
                                            </button>
                                        </li>
                                    </React.Fragment>
                                ))}
                                <li className={`page-item ${hasNextPage ? '' : 'disabled'}`}>
                                    <button
                                        aria-label={intl.formatMessage({
                                            id: 'ActivityLogs.next',
                                            defaultMessage: 'Next',
                                        })}
                                        className='page-link'
                                        disabled={isLoading || !hasNextPage}
                                        onClick={() => setPageIndex((previousPageIndex) => previousPageIndex + 1)}
                                        type='button'
                                    >
                                        <IconChevronRight
                                            className='icon'
                                            size={18}
                                        />
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>}
            </TableModule>
        </div>
    )
}

export default React.memo(ActivityLogs)
