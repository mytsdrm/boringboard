package api

import "github.com/mattermost/focalboard/server/model"

func (a *API) canInvitedUserShareTaskBoard(userID, boardID string) bool {
	settings, err := a.app.GetAdminSystemSettings()
	if err != nil || !settings.TaskBoards.EnableInvitedUserShare {
		return false
	}

	member, err := a.app.GetMemberForBoard(boardID, userID)
	if err != nil || member == nil {
		return false
	}

	return !member.Synthetic && !member.SchemeAdmin
}

func (a *API) isInvitedNonAdminTaskBoardMember(userID, boardID string) bool {
	member, err := a.app.GetMemberForBoard(boardID, userID)
	if err != nil || member == nil {
		return false
	}

	return !member.Synthetic && !member.SchemeAdmin
}

func (a *API) canInvitedUserEditTaskBoardProperties(userID, boardID string) bool {
	settings, err := a.app.GetAdminSystemSettings()
	if err != nil || settings.TaskBoards.EnableInvitedUserEditProperty {
		return true
	}

	return !a.isInvitedNonAdminTaskBoardMember(userID, boardID)
}

func (a *API) hasPermissionToShareTaskBoard(userID, boardID string) bool {
	return a.permissions.HasPermissionToBoard(userID, boardID, model.PermissionShareBoard) ||
		a.canInvitedUserShareTaskBoard(userID, boardID)
}

func (a *API) hasPermissionToManageTaskBoardProperties(userID, boardID string) bool {
	return a.permissions.HasPermissionToBoard(userID, boardID, model.PermissionManageBoardProperties) &&
		a.canInvitedUserEditTaskBoardProperties(userID, boardID)
}

func (a *API) hasPermissionToEditTaskBoardMetadata(userID, boardID string) bool {
	return a.permissions.HasPermissionToBoard(userID, boardID, model.PermissionManageBoardProperties) &&
		!a.isInvitedNonAdminTaskBoardMember(userID, boardID)
}
