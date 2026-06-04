// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {useHistory, useRouteMatch} from 'react-router-dom'

import {Block} from '../../blocks/block'
import {Board, BoardMember, IPropertyTemplate} from '../../blocks/board'
import {Card} from '../../blocks/card'
import {useWebsockets} from '../../hooks/websockets'
import octoClient, {BoardMemberActivityEntry} from '../../octoClient'
import {getMySortedBoards, updateBoards} from '../../store/boards'
import {useAppDispatch, useAppSelector} from '../../store/hooks'
import {getCurrentTeamId, getFirstTeam} from '../../store/teams'
import {addBoardUsers, getBoardUsers, getMe, setMe} from '../../store/users'
import {applyProjectSystemSettings, getStoredProjectSystemSettings, ProjectSystemSettings, SYSTEM_SETTINGS_UPDATED_EVENT} from '../../systemSettings'
import {Utils} from '../../utils'
import CompassIcon from '../../widgets/icons/compassIcon'
import {WSClient} from '../../wsclient'
import AppModal from '../appModal'
import RegistrationLink from '../sidebar/registrationLink'
import {StoredIcon} from '../icons/storedIcon'

import './dashboard.scss'

type BoardStats = {
    total: number
    invitedUserIds: string[]
    latestActivityAt: number
}

type DashboardActivityAction =
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

type DashboardActivity = {
    id: string
    action: DashboardActivityAction
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

const DASHBOARD_ACTIVITY_LIMIT = 20
const DASHBOARD_ACTIVITY_HISTORY_LIMIT = 120

const getCardStats = (board: Board, cards: Card[]) => {
    const latestActivityAt = cards.reduce((latest, card) => {
        return Math.max(latest, card.updateAt || card.createAt || 0)
    }, board.updateAt || board.createAt || 0)

    return {
        latestActivityAt,
        total: cards.length,
    }
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

const getMoveDetails = (board: Board, card: Card, previousCard?: Card): Pick<DashboardActivity, 'fromValue' | 'propertyName' | 'toValue'> | null => {
    if (!previousCard) {
        return null
    }

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

const getActivityAction = (board: Board, card: Card, previousCard?: Card): DashboardActivityAction => {
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

const createDashboardActivity = (
    card: Card,
    board: Board,
    action: DashboardActivityAction,
    previousCard?: Card,
    sourceBlock?: Block,
): DashboardActivity => {
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

const getMemberInviteAction = (role: string): DashboardActivityAction => {
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

const createMemberInviteActivity = (member: BoardMember, board: Board): DashboardActivity => {
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

const createMemberInviteActivityFromHistory = (entry: BoardMemberActivityEntry, board: Board): DashboardActivity => {
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

const getHistoryPreviousBlock = (historyById: Map<string, Block[]>, block: Block): Block | undefined => {
    return historyById.get(block.id)?.find((historyBlock) => historyBlock.updateAt < block.updateAt)
}

const buildActivitiesFromHistory = (
    historyBlocks: Block[],
    taskBoardsById: Map<string, Board>,
    cardsById: {[cardId: string]: Card},
): DashboardActivity[] => {
    const historyById = new Map<string, Block[]>()
    historyBlocks.forEach((block) => {
        historyById.set(block.id, [...(historyById.get(block.id) || []), block])
    })
    historyById.forEach((blocks) => blocks.sort((a, b) => b.updateAt - a.updateAt))

    return historyBlocks.reduce<DashboardActivity[]>((result, block) => {
        const board = taskBoardsById.get(block.boardId)
        if (!board) {
            return result
        }

        if (block.type === 'card') {
            const card = block as Card
            const previousCard = getHistoryPreviousBlock(historyById, block) as Card | undefined
            result.push(createDashboardActivity(card, board, getActivityAction(board, card, previousCard), previousCard))
            return result
        }

        if (block.type === 'comment') {
            const parentCard = cardsById[block.parentId]
            if (parentCard) {
                const previousComment = getHistoryPreviousBlock(historyById, block)
                let action: DashboardActivityAction = 'comment-added'
                if (block.deleteAt !== 0) {
                    action = 'comment-deleted'
                } else if (previousComment) {
                    action = 'edited'
                }
                result.push(createDashboardActivity(parentCard, board, action, parentCard, block))
            }
            return result
        }

        if (isCardContentBlock(block)) {
            const parentCard = cardsById[block.parentId]
            if (parentCard) {
                const previousContent = getHistoryPreviousBlock(historyById, block)
                let action: DashboardActivityAction = 'edited'
                if (block.deleteAt !== 0) {
                    action = 'content-deleted'
                } else if (!previousContent) {
                    action = 'content-added'
                }
                result.push(createDashboardActivity(parentCard, board, action, parentCard, block))
            }
        }

        return result
    }, [])
}

const dashboardCache = {
    activities: [] as DashboardActivity[],
    cardsSnapshot: {} as {[cardId: string]: Card},
    statsByBoard: {} as {[boardId: string]: BoardStats},
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
    const boardUsers = useAppSelector(getBoardUsers)
    const [statsByBoard, setStatsByBoard] = useState<{[boardId: string]: BoardStats}>(dashboardCache.statsByBoard)
    const [activities, setActivities] = useState<DashboardActivity[]>(dashboardCache.activities)
    const [projectSettings, setProjectSettings] = useState<ProjectSystemSettings>(getStoredProjectSystemSettings)
    const [profileModalOpen, setProfileModalOpen] = useState(false)
    const [passwordModalOpen, setPasswordModalOpen] = useState(false)
    const [inviteModalOpen, setInviteModalOpen] = useState(false)
    const [profileForm, setProfileForm] = useState({
        username: '',
        email: '',
        nickname: '',
        phoneNumber: '',
        phoneWhatsAppEnabled: false,
        phoneTelegramEnabled: false,
    })
    const [profileError, setProfileError] = useState('')
    const [profileSaving, setProfileSaving] = useState(false)
    const [passwordForm, setPasswordForm] = useState({confirm: '', next: ''})
    const [passwordError, setPasswordError] = useState('')
    const [passwordSaving, setPasswordSaving] = useState(false)
    const [passwordSucceeded, setPasswordSucceeded] = useState(false)
    const cardsSnapshot = useRef<{[cardId: string]: Card}>({...dashboardCache.cardsSnapshot})
    const userMenuRef = useRef<HTMLDetailsElement|null>(null)

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

    const refreshBoardCardStats = useCallback(async (boardIds: string[]) => {
        const uniqueBoardIds = Array.from(new Set(boardIds))
        const entries = await Promise.all(uniqueBoardIds.map(async (boardId) => {
            const board = taskBoardsById.get(boardId)
            if (!board) {
                return null
            }

            const blocks = await octoClient.getAllBlocks(board.id)
            const cards = blocks.filter((block) => block.type === 'card' && block.deleteAt === 0 && !block.fields.isTemplate) as Card[]
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
            dashboardCache.statsByBoard = next
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
                const cards = blocks.filter((block) => block.type === 'card' && block.deleteAt === 0 && !block.fields.isTemplate) as Card[]
                const realMembers = members.filter((member) => !member.synthetic)
                const invitedUserIds = realMembers.
                    filter((member) => member.userId !== board.createdBy).
                    map((member) => member.userId)
                const cardStats = getCardStats(board, cards)
                const userIds = Array.from(new Set([...realMembers.map((member) => member.userId), board.createdBy]))

                if (userIds.length > 0) {
                    const users = await octoClient.getTeamUsersList(userIds, board.teamId)
                    dispatch(addBoardUsers(users))
                }

                return [board.id, {...cardStats, invitedUserIds}, cards] as [string, BoardStats, Card[]]
            }))

            const nextCardsSnapshot = {...cardsSnapshot.current}
            entries.forEach(([, , cards]) => {
                cards.forEach((card) => {
                    nextCardsSnapshot[card.id] = card
                })
            })

            const [historyBlocks, memberHistoryEntries] = websocketTeamId ? await Promise.all([
                octoClient.getDashboardActivityBlocks(websocketTeamId, DASHBOARD_ACTIVITY_HISTORY_LIMIT),
                octoClient.getDashboardMemberActivity(websocketTeamId, DASHBOARD_ACTIVITY_HISTORY_LIMIT),
            ]) : [[], [] as BoardMemberActivityEntry[]]
            if (canceled) {
                return
            }

            const memberHistoryActivities = memberHistoryEntries.reduce<DashboardActivity[]>((result, entry) => {
                const board = taskBoardsById.get(entry.boardId)
                if (board && isMemberInviteHistoryAction(entry.action)) {
                    result.push(createMemberInviteActivityFromHistory(entry, board))
                }
                return result
            }, [])
            const seededActivities = [
                ...buildActivitiesFromHistory(historyBlocks, taskBoardsById, nextCardsSnapshot),
                ...memberHistoryActivities,
            ]
            const nextActivities = seededActivities.
                sort((a, b) => b.timestamp - a.timestamp).
                slice(0, DASHBOARD_ACTIVITY_LIMIT)
            cardsSnapshot.current = nextCardsSnapshot
            dashboardCache.cardsSnapshot = nextCardsSnapshot
            dashboardCache.statsByBoard = Object.fromEntries(entries.map(([boardId, stats]) => [boardId, stats]))
            dashboardCache.activities = nextActivities
            setStatsByBoard(dashboardCache.statsByBoard)
            setActivities(nextActivities)
        }

        loadStats()

        return () => {
            canceled = true
        }
    }, [dispatch, taskBoards, taskBoardsById, websocketTeamId])

    useWebsockets(websocketTeamId, (wsClient) => {
        const incrementalBlockUpdate = (_: WSClient, blocks: Block[]) => {
            const cardUpdates = blocks.
                filter((block) => block.type === 'card' && !block.fields.isTemplate) as Card[]
            const boardIds = cardUpdates.map((block) => block.boardId)
            const contentUpdates = blocks.filter((block) => block.type === 'comment' || isCardContentBlock(block))

            if (boardIds.length > 0) {
                refreshBoardCardStats(boardIds)
            }

            const nextActivities = cardUpdates.reduce<DashboardActivity[]>((result, card) => {
                const board = taskBoardsById.get(card.boardId)
                if (!board) {
                    return result
                }

                const previousCard = cardsSnapshot.current[card.id]
                result.push(createDashboardActivity(card, board, getActivityAction(board, card, previousCard), previousCard))

                if (card.deleteAt === 0) {
                    cardsSnapshot.current[card.id] = card
                } else {
                    delete cardsSnapshot.current[card.id]
                }

                return result
            }, [])

            contentUpdates.forEach((block) => {
                const board = taskBoardsById.get(block.boardId)
                const parentCard = cardsSnapshot.current[block.parentId]
                if (board && parentCard) {
                    if (block.type === 'comment') {
                        const action: DashboardActivityAction = block.deleteAt === 0 ? 'comment-added' : 'comment-deleted'
                        nextActivities.push(createDashboardActivity(parentCard, board, action, parentCard, block))
                    } else {
                        const action: DashboardActivityAction = block.deleteAt === 0 ? 'edited' : 'content-deleted'
                        nextActivities.push(createDashboardActivity(parentCard, board, action, parentCard, block))
                    }
                }
            })

            if (nextActivities.length > 0) {
                setActivities((previousActivities) => {
                    const seen = new Set<string>()
                    const mergedActivities = [...nextActivities, ...previousActivities].
                        filter((activity) => {
                            if (seen.has(activity.id)) {
                                return false
                            }
                            seen.add(activity.id)
                            return true
                        }).
                        sort((a, b) => b.timestamp - a.timestamp).
                        slice(0, DASHBOARD_ACTIVITY_LIMIT)
                    dashboardCache.activities = mergedActivities
                    dashboardCache.cardsSnapshot = cardsSnapshot.current
                    return mergedActivities
                })
            }
        }

        const incrementalBoardUpdate = (_: WSClient, updatedBoards: Board[]) => {
            dispatch(updateBoards(updatedBoards))
        }

        const incrementalBoardMemberUpdate = async (_: WSClient, members: BoardMember[]) => {
            const nextActivities = members.reduce<DashboardActivity[]>((result, member) => {
                const board = taskBoardsById.get(member.boardId)
                if (!board || !isRealBoardMember(member)) {
                    return result
                }

                result.push(createMemberInviteActivity(member, board))
                return result
            }, [])

            if (nextActivities.length === 0) {
                return
            }

            const userIdsByTeamId = new Map<string, Set<string>>()
            nextActivities.forEach((activity) => {
                const board = taskBoardsById.get(activity.boardId)
                if (!board || boardUsers[activity.actorId]) {
                    return
                }
                userIdsByTeamId.set(board.teamId, userIdsByTeamId.get(board.teamId) || new Set<string>())
                userIdsByTeamId.get(board.teamId)?.add(activity.actorId)
            })
            const nextUsers = (await Promise.all(Array.from(userIdsByTeamId.entries()).map(([teamId, userIds]) => (
                octoClient.getTeamUsersList(Array.from(userIds), teamId)
            )))).flat()
            if (nextUsers.length > 0) {
                dispatch(addBoardUsers(nextUsers))
            }

            setActivities((previousActivities) => {
                const seen = new Set<string>()
                const mergedActivities = [...nextActivities, ...previousActivities].
                    filter((activity) => {
                        if (seen.has(activity.id)) {
                            return false
                        }
                        seen.add(activity.id)
                        return true
                    }).
                    sort((a, b) => b.timestamp - a.timestamp).
                    slice(0, DASHBOARD_ACTIVITY_LIMIT)
                dashboardCache.activities = mergedActivities
                return mergedActivities
            })
        }

        wsClient.addOnChange(incrementalBlockUpdate, 'block')
        wsClient.addOnChange(incrementalBoardUpdate, 'board')
        wsClient.addOnChange(incrementalBoardMemberUpdate, 'boardMembers')

        return () => {
            wsClient.removeOnChange(incrementalBlockUpdate, 'block')
            wsClient.removeOnChange(incrementalBoardUpdate, 'board')
            wsClient.removeOnChange(incrementalBoardMemberUpdate, 'boardMembers')
        }
    }, [boardUsers, dispatch, refreshBoardCardStats, taskBoardsById])

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

    const greetingName = me?.nickname || me?.username || intl.formatMessage({
        id: 'Dashboard.default-greeting-name',
        defaultMessage: 'Procrastinator',
    })

    const handleLogout = async () => {
        await octoClient.logout()
        dispatch(setMe(null))
        history.push('/login')
    }

    const closeUserMenu = () => {
        if (userMenuRef.current) {
            userMenuRef.current.open = false
        }
    }

    const currentUserIsAdmin = Boolean(me?.roles?.includes('SuperAdmin')) ||
        Boolean(me?.roles?.includes('system_admin')) ||
        Boolean(me?.permissions?.includes('manage_system'))

    const openProfileModal = async () => {
        let profileUser = me
        const freshMe = await octoClient.getMe()
        if (freshMe) {
            profileUser = freshMe
            dispatch(setMe(freshMe))
        }
        if (currentUserIsAdmin && profileUser?.id && !profileUser.email) {
            const adminUsers = await octoClient.getAdminUsers()
            profileUser = adminUsers.find((user) => user.id === profileUser?.id) || profileUser
        }

        setProfileForm({
            email: profileUser?.email || '',
            nickname: profileUser?.nickname || '',
            phoneNumber: profileUser?.phoneNumber || '',
            phoneTelegramEnabled: profileUser?.phoneTelegramEnabled || false,
            phoneWhatsAppEnabled: profileUser?.phoneWhatsAppEnabled || false,
            username: profileUser?.username || '',
        })
        setProfileError('')
        setProfileModalOpen(true)
        closeUserMenu()
    }

    const openPasswordModal = () => {
        setPasswordForm({confirm: '', next: ''})
        setPasswordError('')
        setPasswordSucceeded(false)
        setPasswordModalOpen(true)
        closeUserMenu()
    }

    const openInviteModal = () => {
        setInviteModalOpen(true)
        closeUserMenu()
    }

    const saveProfile = async () => {
        if (!profileForm.username.trim()) {
            setProfileError(intl.formatMessage({id: 'Dashboard.profile-username-required', defaultMessage: 'Username is required.'}))
            return
        }

        setProfileSaving(true)
        setProfileError('')
        const response = await octoClient.updateMyProfile({
            email: profileForm.email.trim(),
            nickname: profileForm.nickname.trim(),
            phoneNumber: profileForm.phoneNumber.trim(),
            phoneTelegramEnabled: profileForm.phoneTelegramEnabled,
            phoneWhatsAppEnabled: profileForm.phoneWhatsAppEnabled,
            username: profileForm.username.trim(),
        })
        setProfileSaving(false)

        if (response.code === 200 && 'id' in response.json) {
            dispatch(setMe(response.json))
            setProfileModalOpen(false)
            return
        }

        setProfileError(intl.formatMessage(
            {id: 'Dashboard.profile-save-failed', defaultMessage: 'Profile update failed: {error}'},
            {error: 'error' in response.json ? response.json.error || response.code : response.code},
        ))
    }

    const savePassword = async () => {
        if (!me) {
            return
        }
        if (!passwordForm.next || !passwordForm.confirm) {
            setPasswordError(intl.formatMessage({id: 'changePassword.error-missing-new-confirm', defaultMessage: 'Please enter and confirm your new password.'}))
            return
        }
        if (passwordForm.next !== passwordForm.confirm) {
            setPasswordError(intl.formatMessage({id: 'changePassword.error-password-mismatch', defaultMessage: 'New password and confirm password do not match.'}))
            return
        }

        setPasswordSaving(true)
        setPasswordError('')
        setPasswordSucceeded(false)
        const response = await octoClient.setMyPassword(passwordForm.next)
        setPasswordSaving(false)

        if (response.code === 200) {
            setPasswordForm({confirm: '', next: ''})
            setPasswordSucceeded(true)
            return
        }

        setPasswordError(intl.formatMessage(
            {id: 'changePassword.error-failed', defaultMessage: 'Change password failed: {error}'},
            {error: response.json?.error || response.code},
        ))
    }

    const showBoard = useCallback((boardId: string) => {
        Utils.showBoard(boardId, match, history)
    }, [history, match])

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

    const getActivityValueDisplay = useCallback((activity: DashboardActivity, value?: string): string => {
        if (!value) {
            return ''
        }
        if (activity.propertyType !== 'person' && activity.propertyType !== 'multiPerson') {
            return value
        }
        return value.split(',').map((userId) => getUserDisplayName(userId.trim())).join(', ')
    }, [getUserDisplayName])

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

    const renderActivityMessage = (activity: DashboardActivity) => {
        const values = {
            board: activity.boardTitle,
            card: activity.cardTitle || intl.formatMessage({
                id: 'Dashboard.untitled-card',
                defaultMessage: 'Untitled card',
            }),
            b: (chunks: React.ReactNode) => <strong className='dashboard-activity-user'>{chunks}</strong>,
            from: activity.fromValue || intl.formatMessage({
                id: 'Dashboard.empty-value',
                defaultMessage: 'Empty',
            }),
            property: activity.propertyName || intl.formatMessage({
                id: 'ActivityLogs.unknown-property',
                defaultMessage: 'a property',
            }),
            source: getActivityValueDisplay(activity, activity.fromValue) || intl.formatMessage({
                id: 'Dashboard.empty-value',
                defaultMessage: 'Empty',
            }),
            target: getActivityValueDisplay(activity, activity.toValue) || intl.formatMessage({
                id: 'Dashboard.empty-value',
                defaultMessage: 'Empty',
            }),
            to: activity.toValue || intl.formatMessage({
                id: 'Dashboard.empty-value',
                defaultMessage: 'Empty',
            }),
            user: getUserDisplayName(activity.actorId),
        }

        switch (activity.action) {
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
                    <details
                        ref={userMenuRef}
                        className='dashboard-user-menu'
                    >
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
                                onClick={openInviteModal}
                            >
                                <CompassIcon icon='account-plus-outline'/>
                                <FormattedMessage
                                    id='Sidebar.invite-users'
                                    defaultMessage='Invite users'
                                />
                            </button>
                            <button
                                type='button'
                                onClick={openProfileModal}
                            >
                                <CompassIcon icon='account-outline'/>
                                <FormattedMessage
                                    id='Dashboard.profile'
                                    defaultMessage='Profile'
                                />
                            </button>
                            <button
                                type='button'
                                onClick={openPasswordModal}
                            >
                                <CompassIcon icon='lock-outline'/>
                                <FormattedMessage
                                    id='Sidebar.changePassword'
                                    defaultMessage='Change password'
                                />
                            </button>
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

            {inviteModalOpen &&
                <RegistrationLink
                    onClose={() => setInviteModalOpen(false)}
                />}

            {profileModalOpen &&
                <AppModal
                    className='DashboardAccountDialog'
                    title={(
                        <FormattedMessage
                            id='Dashboard.profile'
                            defaultMessage='Profile'
                        />
                    )}
                    bodyClassName='dashboard-account-form'
                    cancelText={(
                        <FormattedMessage
                            id='Button.cancel'
                            defaultMessage='Cancel'
                        />
                    )}
                    saveDisabled={profileSaving}
                    saveText={(
                        <FormattedMessage
                            id='Button.save'
                            defaultMessage='Save'
                        />
                    )}
                    width='560px'
                    onClose={() => setProfileModalOpen(false)}
                    onSubmit={(e) => {
                        e.preventDefault()
                        saveProfile()
                    }}
                >
                    {profileError &&
                        <div className='dashboard-account-error'>
                            {profileError}
                        </div>}
                    <div className='dashboard-account-fields'>
                        <input
                            type='text'
                            value={profileForm.username}
                            placeholder={intl.formatMessage({id: 'Dashboard.profile-username', defaultMessage: 'Username'})}
                            aria-label={intl.formatMessage({id: 'Dashboard.profile-username', defaultMessage: 'Username'})}
                            onChange={(e) => {
                                setProfileForm({...profileForm, username: e.target.value})
                                setProfileError('')
                            }}
                        />
                        <input
                            type='email'
                            value={profileForm.email}
                            placeholder={intl.formatMessage({id: 'Dashboard.profile-email', defaultMessage: 'Email'})}
                            aria-label={intl.formatMessage({id: 'Dashboard.profile-email', defaultMessage: 'Email'})}
                            onChange={(e) => {
                                setProfileForm({...profileForm, email: e.target.value})
                                setProfileError('')
                            }}
                        />
                        <input
                            type='text'
                            value={profileForm.nickname}
                            placeholder={intl.formatMessage({id: 'Dashboard.profile-nickname', defaultMessage: 'Display name'})}
                            aria-label={intl.formatMessage({id: 'Dashboard.profile-nickname', defaultMessage: 'Display name'})}
                            onChange={(e) => {
                                setProfileForm({...profileForm, nickname: e.target.value})
                                setProfileError('')
                            }}
                        />
                        <input
                            type='tel'
                            inputMode='tel'
                            value={profileForm.phoneNumber}
                            placeholder={intl.formatMessage({id: 'Dashboard.profile-phone-number', defaultMessage: 'Phone Number'})}
                            aria-label={intl.formatMessage({id: 'Dashboard.profile-phone-number', defaultMessage: 'Phone Number'})}
                            onChange={(e) => {
                                setProfileForm({...profileForm, phoneNumber: e.target.value})
                                setProfileError('')
                            }}
                        />
                        <label className='dashboard-account-checkbox'>
                            <input
                                type='checkbox'
                                checked={profileForm.phoneWhatsAppEnabled}
                                onChange={(e) => {
                                    setProfileForm({...profileForm, phoneWhatsAppEnabled: e.target.checked})
                                    setProfileError('')
                                }}
                            />
                            <span>
                                <FormattedMessage
                                    id='Dashboard.profile-whatsapp'
                                    defaultMessage='WhatsApp'
                                />
                            </span>
                        </label>
                        <label className='dashboard-account-checkbox'>
                            <input
                                type='checkbox'
                                checked={profileForm.phoneTelegramEnabled}
                                onChange={(e) => {
                                    setProfileForm({...profileForm, phoneTelegramEnabled: e.target.checked})
                                    setProfileError('')
                                }}
                            />
                            <span>
                                <FormattedMessage
                                    id='Dashboard.profile-telegram'
                                    defaultMessage='Telegram'
                                />
                            </span>
                        </label>
                    </div>
                </AppModal>}

            {passwordModalOpen &&
                <AppModal
                    className='DashboardAccountDialog'
                    title={(
                        <FormattedMessage
                            id='Sidebar.changePassword'
                            defaultMessage='Change password'
                        />
                    )}
                    bodyClassName='dashboard-account-form'
                    cancelText={(
                        <FormattedMessage
                            id='Button.cancel'
                            defaultMessage='Cancel'
                        />
                    )}
                    saveDisabled={passwordSaving}
                    saveText={(
                        <FormattedMessage
                            id='changePassword.submit-button'
                            defaultMessage='Change password'
                        />
                    )}
                    width='560px'
                    onClose={() => setPasswordModalOpen(false)}
                    onSubmit={(e) => {
                        e.preventDefault()
                        savePassword()
                    }}
                >
                    {passwordError &&
                        <div className='dashboard-account-error'>
                            {passwordError}
                        </div>}
                    {passwordSucceeded &&
                        <div className='dashboard-account-success'>
                            <FormattedMessage
                                id='changePassword.success-short'
                                defaultMessage='Password changed.'
                            />
                        </div>}
                    <div className='dashboard-account-fields'>
                        <input
                            type='password'
                            value={passwordForm.next}
                            placeholder={intl.formatMessage({id: 'changePassword.new-password-label', defaultMessage: 'New password'})}
                            aria-label={intl.formatMessage({id: 'changePassword.new-password-label', defaultMessage: 'New password'})}
                            onChange={(e) => {
                                setPasswordForm({...passwordForm, next: e.target.value})
                                setPasswordError('')
                                setPasswordSucceeded(false)
                            }}
                        />
                        <input
                            type='password'
                            value={passwordForm.confirm}
                            placeholder={intl.formatMessage({id: 'changePassword.confirm-password-label', defaultMessage: 'Confirm password'})}
                            aria-label={intl.formatMessage({id: 'changePassword.confirm-password-label', defaultMessage: 'Confirm password'})}
                            onChange={(e) => {
                                setPasswordForm({...passwordForm, confirm: e.target.value})
                                setPasswordError('')
                                setPasswordSucceeded(false)
                            }}
                        />
                    </div>
                </AppModal>}

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
                                <span className='dashboard-board-icon'>{board.icon ? <StoredIcon icon={board.icon}/> : <CompassIcon icon='product-boards'/>}</span>
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
                    {activities.length > 0 ? (
                        <div className='dashboard-activity-list'>
                            {activities.map((activity) => (
                                <div
                                    className='dashboard-activity-row'
                                    key={activity.id}
                                >
                                    <span className='dashboard-activity-icon'>
                                        <CompassIcon icon='pencil-outline'/>
                                    </span>
                                    <div>
                                        <p>{renderActivityMessage(activity)}</p>
                                        <time dateTime={new Date(activity.timestamp).toISOString()}>
                                            {formatAuditDate(activity.timestamp)}
                                        </time>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className='dashboard-empty-state activity-empty'>
                            <FormattedMessage
                                id='Dashboard.no-recent-activity'
                                defaultMessage='No recent activity yet.'
                            />
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}

export default React.memo(Dashboard)
