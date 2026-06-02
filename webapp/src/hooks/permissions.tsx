// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react'

import {useAppSelector} from '../store/hooks'
import {getMyBoardMembership, getCurrentBoardId, getBoard} from '../store/boards'
import {getCurrentTeam} from '../store/teams'
import {Permission} from '../constants'
import {MemberRole} from '../blocks/board'
import {getStoredProjectSystemSettings, ProjectSystemSettings, SYSTEM_SETTINGS_UPDATED_EVENT} from '../systemSettings'

export const useHasPermissions = (teamId: string, boardId: string, permissions: Permission[]): boolean => {
    const member = useAppSelector(getMyBoardMembership(boardId))
    const board = useAppSelector(getBoard(boardId))
    const [projectSettings, setProjectSettings] = useState<ProjectSystemSettings>(getStoredProjectSystemSettings)

    useEffect(() => {
        const handleSystemSettingsUpdated = (event: Event) => {
            setProjectSettings((event as CustomEvent<ProjectSystemSettings>).detail || getStoredProjectSystemSettings())
        }

        window.addEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSystemSettingsUpdated)
        return () => {
            window.removeEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSystemSettingsUpdated)
        }
    }, [])

    if (!boardId || !teamId) {
        return false
    }

    if (!board) {
        return false
    }

    if (!member) {
        return false
    }

    const adminPermissions = [Permission.ManageBoardType, Permission.DeleteBoard, Permission.ShareBoard, Permission.ManageBoardRoles, Permission.DeleteOthersComments]
    const editorPermissions = [Permission.ManageBoardCards, Permission.ManageBoardProperties]
    const commenterPermissions = [Permission.CommentBoardCards]
    const viewerPermissions = [Permission.ViewBoard]
    const invitedUserSharePermissions = [Permission.ShareBoard]
    const canInvitedUserShare = projectSettings.taskBoards.enableInvitedUserShare && member && !member.synthetic && !member.schemeAdmin
    const isInvitedNonAdminMember = member && !member.synthetic && !member.schemeAdmin
    const canInvitedUserEditBoardProperties = projectSettings.taskBoards.enableInvitedUserEditProperty

    for (const permission of permissions) {
        if (invitedUserSharePermissions.includes(permission) && canInvitedUserShare) {
            return true
        }
        if (permission === Permission.ManageBoardProperties && isInvitedNonAdminMember && !canInvitedUserEditBoardProperties) {
            continue
        }
        if (adminPermissions.includes(permission) && member.schemeAdmin) {
            return true
        }
        if (editorPermissions.includes(permission) && (member.schemeAdmin || member.schemeEditor || board.minimumRole === MemberRole.Editor)) {
            return true
        }
        if (commenterPermissions.includes(permission) && (member.schemeAdmin || member.schemeEditor || member.schemeCommenter || board.minimumRole === MemberRole.Commenter || board.minimumRole === MemberRole.Editor)) {
            return true
        }
        if (viewerPermissions.includes(permission) && (member.schemeAdmin || member.schemeEditor || member.schemeCommenter || member.schemeViewer || board.minimumRole === MemberRole.Viewer || board.minimumRole === MemberRole.Commenter || board.minimumRole === MemberRole.Editor)) {
            return true
        }
    }
    return false
}

export const useHasCurrentTeamPermissions = (boardId: string, permissions: Permission[]): boolean => {
    const currentTeam = useAppSelector(getCurrentTeam)
    return useHasPermissions(currentTeam?.id || '', boardId, permissions)
}

export const useHasCurrentBoardPermissions = (permissions: Permission[]): boolean => {
    const currentBoardId = useAppSelector(getCurrentBoardId)

    return useHasCurrentTeamPermissions(currentBoardId || '', permissions)
}
