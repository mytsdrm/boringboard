package integrationtests

import (
	"testing"

	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/focalboard/server/services/config"
	"github.com/stretchr/testify/require"
)

func TestDemoUser(t *testing.T) {
	th := SetupTestHelperWithConfig(t, LicenseNone, func(cfg *config.Configuration) {
		cfg.DemoUserEnabled = true
		cfg.DemoUserUsername = "demo"
		cfg.DemoUserPassword = "demo123456"
	}).Start()
	defer th.TearDown()

	th.Login(th.Client, "demo", "demo123456")

	me, resp := th.Client.GetMe()
	th.CheckOK(resp)
	require.Equal(t, "demo", me.Username)
	require.False(t, me.IsGuest)

	boards, resp := th.Client.GetBoardsForTeam(model.GlobalTeamID)
	th.CheckOK(resp)
	require.Len(t, boards, 1)
	board := boards[0]
	require.Equal(t, "Demo Project", board.Title)
	require.Len(t, board.CardProperties, 16)
	require.NotNil(t, board.Properties["boardIntegration"])

	blocks, resp := th.Client.GetAllBlocksForBoard(board.ID)
	th.CheckOK(resp)
	counts := map[model.BlockType]int{}
	viewTypes := map[string]bool{}
	templates := 0
	for _, b := range blocks {
		counts[b.Type]++
		if b.Type == model.TypeView {
			viewTypes[b.Fields["viewType"].(string)] = true
		}
		if b.Type == model.TypeCard && b.Fields["isTemplate"] == true {
			templates++
		}
	}
	require.Equal(t, 9, counts[model.TypeCard]) // 8 tasks + 1 card template
	require.Equal(t, 1, templates)
	require.Equal(t, 5, counts[model.TypeView])
	require.Equal(t, map[string]bool{"board": true, "table": true, "gallery": true, "calendar": true}, viewTypes)
	require.Positive(t, counts[model.TypeText])
	require.Positive(t, counts[model.TypeCheckbox])
	require.Positive(t, counts[model.TypeDivider])
	require.Positive(t, counts[model.TypeComment])

	categories := th.GetUserCategoryBoards(model.GlobalTeamID)
	found := false
	for _, c := range categories {
		for _, bm := range c.BoardMetadata {
			if bm.BoardID == board.ID {
				found = true
			}
		}
	}
	require.True(t, found, "demo board should appear in the sidebar")
}

func TestDemoUserDisabledByDefaultInTests(t *testing.T) {
	th := SetupTestHelper(t).Start()
	defer th.TearDown()

	_, resp := th.Client.Login(&model.LoginRequest{Type: "normal", Username: "demo", Password: "demo123456"})
	require.Error(t, resp.Error)
}
