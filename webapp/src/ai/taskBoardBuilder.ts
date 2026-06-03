// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Board, BoardsAndBlocks, IPropertyTemplate, createBoard} from '../blocks/board'
import {BoardView, createBoardView} from '../blocks/boardView'
import {Block, createBlock} from '../blocks/block'
import {Card, createCard} from '../blocks/card'
import {Constants} from '../constants'
import {IDType, Utils} from '../utils'
import {TaskBoardPreview} from '../octoClient'

const statusPropertyName = 'Status'
const dueDatePropertyName = 'Due Date'
const taskValuePropertyName = 'Task Value'
const userPropertyName = 'User'
const storedIconPrefix = 'bb-icon:'

export const taskBoardDefaultStatusColumns = [
    {color: 'propColorGray', name: 'Backlog'},
    {color: 'propColorPurple', name: 'Assigned'},
    {color: 'propColorBlue', name: 'Execution'},
    {color: 'propColorOrange', name: 'Review'},
    {color: 'propColorYellow', name: 'Testing'},
    {color: 'propColorGreen', name: 'Done'},
]

export function buildTaskBoardFromPreview(preview: TaskBoardPreview, teamId: string): BoardsAndBlocks {
    const board = createBoard()
    board.teamId = teamId
    board.title = preview.title
    board.description = preview.description
    board.icon = taskBoardPreviewIcon(preview)
    board.showDescription = Boolean(preview.description)

    const statusColumns = preview.columns.length > 0 ? preview.columns : taskBoardDefaultStatusColumns
    const statusProperty: IPropertyTemplate = {
        id: Utils.createGuid(IDType.BlockID),
        name: statusPropertyName,
        type: 'select',
        options: statusColumns.map((column) => ({
            color: column.color || 'propColorBlue',
            id: Utils.createGuid(IDType.BlockID),
            value: column.name,
        })),
    }
    const dueDateProperty: IPropertyTemplate = {
        id: Utils.createGuid(IDType.BlockID),
        name: dueDatePropertyName,
        type: 'date',
        options: [],
    }
    const taskValueProperty: IPropertyTemplate = {
        id: Utils.createGuid(IDType.BlockID),
        name: taskValuePropertyName,
        type: 'number',
        options: [],
    }
    const userProperty: IPropertyTemplate = {
        id: Utils.createGuid(IDType.BlockID),
        name: userPropertyName,
        type: 'person',
        options: [],
    }
    board.cardProperties = [statusProperty, dueDateProperty, taskValueProperty, userProperty]

    const blocks: Block[] = []
    const cards = preview.tasks.map((task, index): Card => {
        const card = createCard()
        card.boardId = board.id
        card.parentId = board.id
        card.title = task.title
        card.fields.icon = taskBoardTaskIcon(task.title)
        card.fields.properties[dueDateProperty.id] = dueDateValue(index)
        if (task.description) {
            const descriptionBlock = createBlock()
            descriptionBlock.type = 'text'
            descriptionBlock.boardId = board.id
            descriptionBlock.parentId = card.id
            descriptionBlock.title = task.description
            card.fields.contentOrder = [descriptionBlock.id]
            blocks.push(descriptionBlock)
        }
        return card
    })

    const views = buildViews(preview, board, statusProperty, dueDateProperty, taskValueProperty, userProperty, cards)
    blocks.unshift(...views)
    blocks.push(...cards)

    return {boards: [board], blocks}
}

function buildViews(preview: TaskBoardPreview, board: Board, statusProperty: IPropertyTemplate, dueDateProperty: IPropertyTemplate, taskValueProperty: IPropertyTemplate, userProperty: IPropertyTemplate, cards: Card[]): BoardView[] {
    return preview.views.map((viewType) => {
        const view = createBoardView()
        view.boardId = board.id
        view.parentId = board.id
        view.fields.viewType = viewType as BoardView['fields']['viewType']
        view.fields.visiblePropertyIds = [statusProperty.id, dueDateProperty.id, taskValueProperty.id, userProperty.id]
        view.fields.cardOrder = cards.map((card) => card.id)
        view.title = viewTitle(viewType)
        if (viewType === 'table') {
            view.fields.columnWidths = {
                [Constants.titleColumnId]: 460,
                [statusProperty.id]: 180,
                [dueDateProperty.id]: 180,
                [taskValueProperty.id]: 140,
                [userProperty.id]: 180,
            }
        }
        if (viewType === 'calendar') {
            view.fields.dateDisplayPropertyId = dueDateProperty.id
        }
        if (viewType === 'board') {
            view.fields.groupById = statusProperty.id
        }
        return view
    })
}

function viewTitle(viewType: string): string {
    switch (viewType) {
    case 'table':
        return 'Table view'
    case 'calendar':
        return 'Calendar view'
    case 'gallery':
        return 'Gallery view'
    default:
        return 'Board view'
    }
}

function dueDateValue(index: number): string {
    const dueDate = new Date()
    dueDate.setHours(12, 0, 0, 0)
    dueDate.setDate(dueDate.getDate() + Math.floor(index / 4))
    return JSON.stringify({from: dueDate.getTime()})
}

export function taskBoardPreviewIcon(preview: TaskBoardPreview): string {
    const text = `${preview.title} ${preview.description}`.toLowerCase()
    if (text.includes('android') || text.includes('mobile') || text.includes('device')) {
        return icon('brand-android')
    }
    if (text.includes('automation') || text.includes('ai')) {
        return icon('ops-zap')
    }
    if (text.includes('launch')) {
        return icon('ops-rocket')
    }
    return icon('work-board')
}

export function taskBoardTaskIcon(title: string): string {
    const text = title.toLowerCase()
    const platformIcon = taskPlatformIcon(text)
    if (platformIcon) {
        return platformIcon
    }

    if (text.includes('register') || text.includes('sign up')) {
        return icon('action-edit')
    }
    if (text.includes('login') || text.includes('log in')) {
        return icon('action-login')
    }
    if (text.includes('logout') || text.includes('log out')) {
        return icon('action-logout')
    }
    if (text.includes('media') || text.includes('image') || text.includes('video')) {
        return icon('action-media')
    }
    if (text.includes('post')) {
        return icon('action-post')
    }
    if (text.includes('repost') || text.includes('share')) {
        return icon('action-repost')
    }
    if (text.includes('dislike')) {
        return '👎'
    }
    if (text.includes('like')) {
        return icon('action-like')
    }
    if (text.includes('subscribe')) {
        return icon('work-bell')
    }
    if (text.includes('follow')) {
        return icon('action-follow')
    }
    if (text.includes('report')) {
        return icon('action-report')
    }
    if (text.includes('surfing') || text.includes('flow')) {
        return icon('action-globe')
    }
    if (text.includes('test') || text.includes('qa') || text.includes('review')) {
        return icon('ops-test')
    }
    if (text.includes('setup') || text.includes('infrastructure') || text.includes('automation')) {
        return icon('ops-wrench')
    }
    return icon('work-task')
}

function taskPlatformIcon(text: string): string {
    if (text.includes('facebook')) {
        return icon('brand-facebook')
    }
    if (text.includes('twitter') || text.includes('x -') || text.includes('x/')) {
        return icon('brand-twitter-x')
    }
    if (text.includes('instagram thread') || text.includes('threads')) {
        return icon('brand-threads')
    }
    if (text.includes('instagram')) {
        return icon('brand-instagram')
    }
    if (text.includes('tiktok') || text.includes('tik tok')) {
        return icon('brand-tiktok')
    }
    if (text.includes('youtube') || text.includes('you tube')) {
        return icon('brand-youtube')
    }
    if (text.includes('android') || text.includes('device farm')) {
        return icon('brand-android')
    }
    if (text.includes('github')) {
        return icon('brand-github')
    }
    if (text.includes('gitlab')) {
        return icon('brand-gitlab')
    }
    if (text.includes('docker')) {
        return icon('brand-docker')
    }
    if (text.includes('kubernetes')) {
        return icon('tech-kubernetes')
    }
    return ''
}

function icon(id: string): string {
    return `${storedIconPrefix}${id}`
}
