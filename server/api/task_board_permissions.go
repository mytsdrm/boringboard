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

func (a *API) hasPermissionToShareTaskBoard(userID, boardID string) bool {
	return a.permissions.HasPermissionToBoard(userID, boardID, model.PermissionShareBoard) ||
		a.canInvitedUserShareTaskBoard(userID, boardID)
}
