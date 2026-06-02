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

func (a *App) getActivityBlocksForBoards(boards []*model.Board, limit uint64, beforeUpdateAt int64, afterUpdateAt int64) ([]*model.Block, error) {
	if limit == 0 {
		limit = 20
	}

	historyLimitPerBoard := limit * 4
	if historyLimitPerBoard < 40 {
		historyLimitPerBoard = 40
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
