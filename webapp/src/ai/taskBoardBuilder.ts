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

export function buildTaskBoardFromPreview(preview: TaskBoardPreview, teamId: string): BoardsAndBlocks {
    const board = createBoard()
    board.teamId = teamId
    board.title = preview.title
    board.description = preview.description
    board.icon = boardIcon(preview)
    board.showDescription = Boolean(preview.description)

    const statusProperty: IPropertyTemplate = {
        id: Utils.createGuid(IDType.BlockID),
        name: statusPropertyName,
        type: 'select',
        options: preview.columns.map((column) => ({
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
    board.cardProperties = [statusProperty, dueDateProperty]

    const blocks: Block[] = []
    const cards = preview.tasks.map((task, index): Card => {
        const card = createCard()
        card.boardId = board.id
        card.parentId = board.id
        card.title = task.title
        card.fields.icon = taskIcon(task.title)
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

    const views = buildViews(preview, board, statusProperty, dueDateProperty, cards)
    blocks.unshift(...views)
    blocks.push(...cards)

    return {boards: [board], blocks}
}

function buildViews(preview: TaskBoardPreview, board: Board, statusProperty: IPropertyTemplate, dueDateProperty: IPropertyTemplate, cards: Card[]): BoardView[] {
    return preview.views.map((viewType) => {
        const view = createBoardView()
        view.boardId = board.id
        view.parentId = board.id
        view.fields.viewType = viewType as BoardView['fields']['viewType']
        view.fields.visiblePropertyIds = [statusProperty.id, dueDateProperty.id]
        view.fields.cardOrder = cards.map((card) => card.id)
        view.title = viewTitle(viewType)
        if (viewType === 'table') {
            view.fields.columnWidths = {
                [Constants.titleColumnId]: 460,
                [statusProperty.id]: 180,
                [dueDateProperty.id]: 180,
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

function boardIcon(preview: TaskBoardPreview): string {
    const text = `${preview.title} ${preview.description}`.toLowerCase()
    if (text.includes('android') || text.includes('mobile') || text.includes('device')) {
        return '📱'
    }
    if (text.includes('automation') || text.includes('ai')) {
        return '⚙️'
    }
    if (text.includes('launch')) {
        return '🚀'
    }
    return '📋'
}

function taskIcon(title: string): string {
    const text = title.toLowerCase()
    if (text.includes('register') || text.includes('sign up')) {
        return '📝'
    }
    if (text.includes('login') || text.includes('log in')) {
        return '🔐'
    }
    if (text.includes('logout') || text.includes('log out')) {
        return '🚪'
    }
    if (text.includes('media') || text.includes('image') || text.includes('video')) {
        return '🖼️'
    }
    if (text.includes('post')) {
        return '✍️'
    }
    if (text.includes('repost') || text.includes('share')) {
        return '🔁'
    }
    if (text.includes('dislike')) {
        return '👎'
    }
    if (text.includes('like')) {
        return '👍'
    }
    if (text.includes('subscribe')) {
        return '🔔'
    }
    if (text.includes('follow')) {
        return '➕'
    }
    if (text.includes('report')) {
        return '🚩'
    }
    if (text.includes('surfing') || text.includes('flow')) {
        return '🧭'
    }
    if (text.includes('test') || text.includes('qa') || text.includes('review')) {
        return '✅'
    }
    if (text.includes('setup') || text.includes('infrastructure') || text.includes('automation')) {
        return '🛠️'
    }
    return '📌'
}
