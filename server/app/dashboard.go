// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"sort"

	"github.com/mattermost/focalboard/server/model"
)

// GetDashboardActivityBlocks returns persisted block history for boards visible to the user.
// The dashboard turns these historical block snapshots into user-facing activity rows.
func (a *App) GetDashboardActivityBlocks(userID, teamID string, limit uint64, beforeUpdateAt int64, afterUpdateAt int64) ([]*model.Block, error) {
	boards, err := a.store.GetBoardsForUserAndTeam(userID, teamID, true)
	if err != nil {
		return nil, err
	}

	return a.getActivityBlocksForBoards(boards, limit, beforeUpdateAt, afterUpdateAt)
}

func (a *App) GetAdminActivityBlocks(teamID string, limit uint64, beforeUpdateAt int64, afterUpdateAt int64) ([]*model.Block, error) {
	boards, err := a.GetAdminBoards(teamID)
	if err != nil {
		return nil, err
	}

	return a.getActivityBlocksForBoards(boards, limit, beforeUpdateAt, afterUpdateAt)
}

func (a *App) GetDashboardMemberInviteActivity(userID, teamID string, limit uint64, beforeUpdateAt int64, afterUpdateAt int64) ([]*model.BoardMemberHistoryEntry, error) {
	boards, err := a.store.GetBoardsForUserAndTeam(userID, teamID, true)
	if err != nil {
		return nil, err
	}

	return a.getMemberInviteActivityForBoards(boards, limit, beforeUpdateAt, afterUpdateAt)
}

func (a *App) GetAdminMemberInviteActivity(teamID string, limit uint64, beforeUpdateAt int64, afterUpdateAt int64) ([]*model.BoardMemberHistoryEntry, error) {
	boards, err := a.GetAdminBoards(teamID)
	if err != nil {
		return nil, err
	}

	return a.getMemberInviteActivityForBoards(boards, limit, beforeUpdateAt, afterUpdateAt)
}

func (a *App) getMemberInviteActivityForBoards(boards []*model.Board, limit uint64, beforeUpdateAt int64, afterUpdateAt int64) ([]*model.BoardMemberHistoryEntry, error) {
	if limit == 0 {
		limit = 20
	}

	history := []*model.BoardMemberHistoryEntry{}
	for _, board := range boards {
		members, err := a.store.GetMembersForBoard(board.ID)
		if err != nil {
			return nil, err
		}

		for _, member := range members {
			if member.Synthetic {
				continue
			}

			memberHistory, err := a.store.GetBoardMemberHistory(board.ID, member.UserID, 0)
			if err != nil {
				return nil, err
			}
			for _, entry := range memberHistory {
				entryTime := entry.InsertAt.UnixMilli()
				if !isMemberInviteActivity(entry.Action) {
					continue
				}
				if entry.Action == "created" {
					entry.Action = memberInviteActionForRole(member)
				}
				if beforeUpdateAt > 0 && entryTime >= beforeUpdateAt {
					continue
				}
				if afterUpdateAt > 0 && entryTime <= afterUpdateAt {
					continue
				}
				history = append(history, entry)
			}
		}
	}

	sort.SliceStable(history, func(i, j int) bool {
		if history[i].InsertAt.Equal(history[j].InsertAt) {
			return history[i].BoardID < history[j].BoardID
		}
		return history[i].InsertAt.After(history[j].InsertAt)
	})

	if uint64(len(history)) > limit {
		history = history[:limit]
	}

	return history, nil
}

func isMemberInviteActivity(action string) bool {
	switch action {
	case "admin", "editor", "commenter", "viewer", "created":
		return true
	default:
		return false
	}
}

func memberInviteActionForRole(member *model.BoardMember) string {
	if member.SchemeAdmin {
		return "admin"
	}
	if member.SchemeEditor {
		return "editor"
	}
	if member.SchemeCommenter {
		return "commenter"
	}
	if member.SchemeViewer {
		return "viewer"
	}
	return "created"
}

func (a *App) getActivityBlocksForBoards(boards []*model.Board, limit uint64, beforeUpdateAt int64, afterUpdateAt int64) ([]*model.Block, error) {
	if limit == 0 {
		limit = 20
	}

	historyLimitPerBoard := limit * 4
	if historyLimitPerBoard < 40 {
		historyLimitPerBoard = 40
	}
	if len(boards) > 20 && historyLimitPerBoard > 100 {
		historyLimitPerBoard = 100
	}

	blocks := []*model.Block{}
	for _, board := range boards {
		boardBlocks, err := a.store.GetBlockHistoryDescendants(board.ID, model.QueryBlockHistoryOptions{
			AfterUpdateAt:  afterUpdateAt,
			BeforeUpdateAt: beforeUpdateAt,
			Descending:     true,
			Limit:          historyLimitPerBoard,
		})
		if err != nil {
			return nil, err
		}
		blocks = append(blocks, boardBlocks...)
	}

	sort.SliceStable(blocks, func(i, j int) bool {
		if blocks[i].UpdateAt == blocks[j].UpdateAt {
			return blocks[i].ID < blocks[j].ID
		}
		return blocks[i].UpdateAt > blocks[j].UpdateAt
	})

	if uint64(len(blocks)) > limit*4 {
		blocks = blocks[:limit*4]
	}

	return blocks, nil
}
