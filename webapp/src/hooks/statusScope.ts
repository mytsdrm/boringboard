// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react'

import {Board, NoStatusScopeOptionId} from '../blocks/board'
import {Card} from '../blocks/card'
import {getCurrentBoardMembers} from '../store/boards'
import {getMe} from '../store/users'
import {IUser} from '../user'
import {useAppSelector} from '../store/hooks'

export const useCanEditCardInStatusScope = (board: Board, canEditCards: boolean, readonly = false): (card: Card, nextStatusOptionId?: string) => boolean => {
    const members = useAppSelector(getCurrentBoardMembers)
    const me = useAppSelector<IUser|null>(getMe)
    const myMember = me ? members[me.id] : undefined
    const statusProperty = board.cardProperties.find((property) => property.type === 'select')

    return useCallback((card: Card, nextStatusOptionId?: string): boolean => {
        if (readonly || !canEditCards) {
            return false
        }
        if (!myMember?.statusScopeEnabled || myMember.schemeAdmin || !statusProperty) {
            return true
        }

        const allowedOptionIds = myMember.statusScopeOptionIds || []
        const currentOptionId = card.fields.properties[statusProperty.id] as string | undefined
        const normalizedCurrentOptionId = currentOptionId || NoStatusScopeOptionId
        const normalizedNextOptionId = nextStatusOptionId === undefined ? normalizedCurrentOptionId : (nextStatusOptionId || NoStatusScopeOptionId)
        return allowedOptionIds.includes(normalizedCurrentOptionId) && allowedOptionIds.includes(normalizedNextOptionId)
    }, [canEditCards, myMember, readonly, statusProperty])
}
