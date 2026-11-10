package api

import (
	"testing"

	"github.com/mattermost/focalboard/server/model"
	"github.com/stretchr/testify/require"
)

func TestCapBoardMemberRole(t *testing.T) {
	t.Run("viewer can't grant admin or editor", func(t *testing.T) {
		member := &model.BoardMember{SchemeAdmin: true, SchemeEditor: true}
		capBoardMemberRole(member, boardRoleViewer)
		require.False(t, member.SchemeAdmin)
		require.False(t, member.SchemeEditor)
		require.False(t, member.SchemeCommenter)
		require.True(t, member.SchemeViewer)
	})

	t.Run("editor can grant at most editor", func(t *testing.T) {
		member := &model.BoardMember{SchemeAdmin: true}
		capBoardMemberRole(member, boardRoleEditor)
		require.False(t, member.SchemeAdmin)
		require.True(t, member.SchemeEditor)
		require.Equal(t, boardRoleEditor, boardMemberRoleRank(member))
	})

	t.Run("lower roles are kept", func(t *testing.T) {
		member := &model.BoardMember{SchemeCommenter: true}
		capBoardMemberRole(member, boardRoleEditor)
		require.Equal(t, boardRoleCommenter, boardMemberRoleRank(member))
		require.False(t, member.SchemeEditor)
	})
}
