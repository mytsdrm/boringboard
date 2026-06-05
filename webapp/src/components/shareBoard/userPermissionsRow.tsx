// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useRef} from 'react'
import {useIntl} from 'react-intl'

import MenuWrapper from '../../widgets/menuWrapper'
import Menu from '../../widgets/menu'

import CheckIcon from '../../widgets/icons/check'
import CompassIcon from '../../widgets/icons/compassIcon'

import {BoardMember, MemberRole, NoStatusScopeOptionId} from '../../blocks/board'
import {IUser} from '../../user'
import {Utils} from '../../utils'
import {Permission} from '../../constants'
import GuestBadge from '../../widgets/guestBadge'
import AdminBadge from '../../widgets/adminBadge/adminBadge'
import {useAppSelector} from '../../store/hooks'
import {getCurrentBoard} from '../../store/boards'

import BoardPermissionGate from '../permissions/boardPermissionGate'

type Props = {
    user: IUser
    member: BoardMember
    isMe: boolean
    teammateNameDisplay: string
    onDeleteBoardMember: (member: BoardMember) => void
    onUpdateBoardMember: (member: BoardMember, permission: string) => void
    onUpdateBoardMemberScope: (member: BoardMember, statusScopeEnabled: boolean, statusScopeOptionIds: string[]) => void
    hideInvitedAt?: boolean
}

const UserPermissionsRow = (props: Props): JSX.Element => {
    const intl = useIntl()
    const board = useAppSelector(getCurrentBoard)
    const {user, member, isMe, teammateNameDisplay} = props
    let currentRole = MemberRole.Viewer
    let displayRole = intl.formatMessage({id: 'BoardMember.schemeViewer', defaultMessage: 'Viewer'})
    if (member.schemeAdmin) {
        currentRole = MemberRole.Admin
        displayRole = intl.formatMessage({id: 'BoardMember.schemeAdmin', defaultMessage: 'Admin'})
    } else if (member.schemeEditor || member.minimumRole === MemberRole.Editor) {
        currentRole = MemberRole.Editor
        displayRole = intl.formatMessage({id: 'BoardMember.schemeEditor', defaultMessage: 'Editor'})
    } else if (member.schemeCommenter || member.minimumRole === MemberRole.Commenter) {
        currentRole = MemberRole.Commenter
        displayRole = intl.formatMessage({id: 'BoardMember.schemeCommenter', defaultMessage: 'Commenter'})
    }

    const menuWrapperRef = useRef<HTMLDivElement>(null)
    const statusProperty = board.cardProperties.find((property) => property.type === 'select')
    const scopeOptions = [
        {
            id: NoStatusScopeOptionId,
            value: intl.formatMessage({id: 'BoardMember.no-status-scope', defaultMessage: 'No Status'}),
        },
        ...(statusProperty?.options || []),
    ]
    const scopedOptionIds = member.statusScopeOptionIds || []
    const canShowStatusScope = Boolean(statusProperty && !member.schemeAdmin && (member.schemeEditor || member.schemeCommenter))
    const scopeDisplay = member.statusScopeEnabled && scopedOptionIds.length > 0 ?
        intl.formatMessage(
            {id: 'BoardMember.status-scope-count', defaultMessage: '{count, plural, one {# status} other {# statuses}}'},
            {count: scopedOptionIds.length},
        ) :
        intl.formatMessage({id: 'BoardMember.status-scope-all', defaultMessage: 'All statuses'})
    const updateScopeOption = (optionId: string) => {
        const nextOptionIds = scopedOptionIds.includes(optionId) ? scopedOptionIds.filter((currentOptionId) => currentOptionId !== optionId) : [...scopedOptionIds, optionId]
        props.onUpdateBoardMemberScope(member, nextOptionIds.length > 0, nextOptionIds)
    }

    return (
        <div
            className='user-item'
            ref={menuWrapperRef}
        >
            <div className='user-item__content'>
                <div className='ml-3'>
                    <div className='user-item__name'>
                        <strong>{Utils.getUserDisplayName(user, teammateNameDisplay)}</strong>
                        <strong className='ml-2 text-light'>{`@${user.username}`}</strong>
                        {isMe && <strong className='ml-2 text-light'>{intl.formatMessage({id: 'ShareBoard.userPermissionsYouText', defaultMessage: '(You)'})}</strong>}
                        <GuestBadge show={user.is_guest}/>
                        <AdminBadge permissions={user.permissions}/>
                    </div>
                    {Boolean(member.createAt) && !props.hideInvitedAt &&
                        <div className='user-item__invited-at'>
                            {intl.formatMessage(
                                {id: 'ShareBoard.userPermissionsInvitedAt', defaultMessage: 'Invited {datetime}'},
                                {datetime: Utils.displayDateTime(new Date(member.createAt || 0), intl)},
                            )}
                        </div>}
                </div>
            </div>
            <div className='user-item__actions'>
                <BoardPermissionGate permissions={[Permission.ManageBoardRoles]}>
                    <MenuWrapper>
                        <button className='user-item__button'>
                            {displayRole}
                            <CompassIcon
                                icon='chevron-down'
                                className='CompassIcon'
                            />
                        </button>
                        <Menu
                            position='left'
                            parentRef={menuWrapperRef}
                        >
                            {(board.minimumRole === MemberRole.Viewer || board.minimumRole === MemberRole.None) &&
                                <Menu.Text
                                    id={MemberRole.Viewer}
                                    check={true}
                                    icon={currentRole === MemberRole.Viewer ? <CheckIcon/> : <div className='empty-icon'/>}
                                    name={intl.formatMessage({id: 'BoardMember.schemeViewer', defaultMessage: 'Viewer'})}
                                    onClick={() => props.onUpdateBoardMember(member, MemberRole.Viewer)}
                                />}
                            {!board.isTemplate && (board.minimumRole === MemberRole.None || board.minimumRole === MemberRole.Commenter || board.minimumRole === MemberRole.Viewer) &&
                                <Menu.Text
                                    id={MemberRole.Commenter}
                                    check={true}
                                    icon={currentRole === MemberRole.Commenter ? <CheckIcon/> : <div className='empty-icon'/>}
                                    name={intl.formatMessage({id: 'BoardMember.schemeCommenter', defaultMessage: 'Commenter'})}
                                    onClick={() => props.onUpdateBoardMember(member, MemberRole.Commenter)}
                                />}
                            <Menu.Text
                                id={MemberRole.Editor}
                                check={true}
                                icon={currentRole === MemberRole.Editor ? <CheckIcon/> : <div className='empty-icon'/>}
                                name={intl.formatMessage({id: 'BoardMember.schemeEditor', defaultMessage: 'Editor'})}
                                onClick={() => props.onUpdateBoardMember(member, MemberRole.Editor)}
                            />
                            {user.is_guest !== true &&
                                <Menu.Text
                                    id={MemberRole.Admin}
                                    check={true}
                                    icon={currentRole === MemberRole.Admin ? <CheckIcon/> : <div className='empty-icon'/>}
                                    name={intl.formatMessage({id: 'BoardMember.schemeAdmin', defaultMessage: 'Admin'})}
                                    onClick={() => props.onUpdateBoardMember(member, MemberRole.Admin)}
                                />}
                            <Menu.Separator/>
                            <Menu.Text
                                id='Remove'
                                name={intl.formatMessage({id: 'ShareBoard.userPermissionsRemoveMemberText', defaultMessage: 'Remove member'})}
                                onClick={() => props.onDeleteBoardMember(member)}
                            />
                        </Menu>
                    </MenuWrapper>
                </BoardPermissionGate>
                <BoardPermissionGate
                    permissions={[Permission.ManageBoardRoles]}
                    invert={true}
                >
                    {displayRole}
                </BoardPermissionGate>
                {canShowStatusScope &&
                    <BoardPermissionGate permissions={[Permission.ManageBoardRoles]}>
                        <MenuWrapper>
                            <button className='user-item__button user-item__scope-button'>
                                {scopeDisplay}
                                <CompassIcon
                                    icon='chevron-down'
                                    className='CompassIcon'
                                />
                            </button>
                            <Menu
                                position='left'
                                parentRef={menuWrapperRef}
                            >
                                <Menu.Text
                                    id='all-statuses'
                                    check={true}
                                    icon={member.statusScopeEnabled ? <div className='empty-icon'/> : <CheckIcon/>}
                                    name={intl.formatMessage({id: 'BoardMember.status-scope-all', defaultMessage: 'All statuses'})}
                                    onClick={() => props.onUpdateBoardMemberScope(member, false, [])}
                                />
                                <Menu.Separator/>
                                {scopeOptions.map((option) => (
                                    <Menu.Text
                                        id={`status-scope-${option.id}`}
                                        key={option.id}
                                        check={true}
                                        icon={member.statusScopeEnabled && scopedOptionIds.includes(option.id) ? <CheckIcon/> : <div className='empty-icon'/>}
                                        name={option.value}
                                        onClick={() => updateScopeOption(option.id)}
                                    />
                                ))}
                            </Menu>
                        </MenuWrapper>
                    </BoardPermissionGate>}
            </div>
        </div>
    )
}

export default UserPermissionsRow
