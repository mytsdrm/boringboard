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
	require.Len(t, board.CardProperties, 2)

	blocks, resp := th.Client.GetAllBlocksForBoard(board.ID)
	th.CheckOK(resp)
	cards, views := 0, 0
	for _, b := range blocks {
		switch b.Type {
		case model.TypeCard:
			cards++
		case model.TypeView:
			views++
		}
	}
	require.Equal(t, 6, cards)
	require.Equal(t, 1, views)

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
