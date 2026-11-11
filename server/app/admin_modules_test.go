package app

import (
	"encoding/json"
	"testing"

	"github.com/golang/mock/gomock"
	"github.com/mattermost/focalboard/server/model"
	"github.com/stretchr/testify/require"
)

func TestEnsureAdminModulesEnabled(t *testing.T) {
	t.Run("turns modules on once for saved settings", func(t *testing.T) {
		th, tearDown := SetupTestHelper(t)
		defer tearDown()

		stored := defaultAdminSystemSettings()
		stored.AppName = "Custom"
		stored.Modules = model.AdminModuleSettings{}
		data, err := json.Marshal(stored)
		require.NoError(t, err)

		var saved string
		th.Store.EXPECT().GetSystemSetting(adminModulesDefaultOnKey).Return("", nil)
		th.Store.EXPECT().GetSystemSetting(adminSystemSettingsKey).Return(string(data), nil)
		th.Store.EXPECT().SetSystemSetting(adminSystemSettingsKey, gomock.Any()).DoAndReturn(func(_ string, value string) error {
			saved = value
			return nil
		})
		th.Store.EXPECT().SetSystemSetting(adminModulesDefaultOnKey, "true").Return(nil)

		require.NoError(t, th.App.ensureAdminModulesEnabled())

		var result model.AdminSystemSettings
		require.NoError(t, json.Unmarshal([]byte(saved), &result))
		require.Equal(t, "Custom", result.AppName)
		require.True(t, result.Modules.Reminder)
		require.True(t, result.Modules.Announcement)
		require.True(t, result.Modules.Plugin)
	})

	t.Run("does nothing after it has run", func(t *testing.T) {
		th, tearDown := SetupTestHelper(t)
		defer tearDown()

		th.Store.EXPECT().GetSystemSetting(adminModulesDefaultOnKey).Return("true", nil)

		require.NoError(t, th.App.ensureAdminModulesEnabled())
	})
}
