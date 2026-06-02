// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Board, BoardsAndBlocks, IPropertyTemplate, createBoard} from '../blocks/board'
import {BoardView, createBoardView} from '../blocks/boardView'
import {Block, createBlock} from '../blocks/block'
import {Card, createCard} from '../blocks/card'
import {IDType, Utils} from '../utils'
import {TaskBoardPreview} from '../octoClient'

const statusPropertyName = 'Status'

export function buildTaskBoardFromPreview(preview: TaskBoardPreview, teamId: string): BoardsAndBlocks {
    const board = createBoard()
    board.teamId = teamId
    board.title = preview.title
    board.description = preview.description
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
    board.cardProperties = [statusProperty]

    const blocks: Block[] = []
    const cards = preview.tasks.map((task): Card => {
        const card = createCard()
        card.boardId = board.id
        card.parentId = board.id
        card.title = task.title
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

    const views = buildViews(preview, board, statusProperty, cards)
    blocks.unshift(...views)
    blocks.push(...cards)

    return {boards: [board], blocks}
}

function buildViews(preview: TaskBoardPreview, board: Board, statusProperty: IPropertyTemplate, cards: Card[]): BoardView[] {
    return preview.views.map((viewType) => {
        const view = createBoardView()
        view.boardId = board.id
        view.parentId = board.id
        view.fields.viewType = viewType as BoardView['fields']['viewType']
        view.fields.visiblePropertyIds = [statusProperty.id]
        view.fields.cardOrder = cards.map((card) => card.id)
        view.title = viewTitle(viewType)
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
