package app

import (
	"encoding/json"
	"strings"

	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/focalboard/server/services/auth"
	"github.com/mattermost/focalboard/server/utils"
)

const adminSystemSettingsKey = "boringboard_admin_system_settings"

func defaultAdminSystemSettings() model.AdminSystemSettings {
	return model.AdminSystemSettings{
		AppName:  "BoringBoard",
		Logo:     "",
		TimeZone: "Asia/Jakarta",
		AI: model.AdminAISettings{
			Enabled:        false,
			Provider:       "OpenAI",
			APIKey:         "",
			OllamaEndpoint: "http://localhost:11434",
		},
	}
}

func (a *App) GetRegisteredUsers() ([]*model.User, error) {
	return a.store.GetUsersByTeam(model.GlobalTeamID, "", true, true)
}

func adminGroupRoles(group string) string {
	if group == model.GroupSuperAdmin {
		return model.RoleSystemAdmin + " " + model.GroupSuperAdmin
	}

	return model.RoleSystemUser + " " + model.GroupPublicUser
}

func normalizeAdminGroup(group string) string {
	if group == model.GroupSuperAdmin {
		return model.GroupSuperAdmin
	}

	return model.GroupPublicUser
}

func (a *App) CreateManagedUser(request model.AdminUserRequest) (*model.User, error) {
	username := strings.TrimSpace(request.Username)
	email := strings.TrimSpace(request.Email)
	nickname := strings.TrimSpace(request.Nickname)
	password := request.Password
	if username == "" {
		return nil, model.NewErrBadRequest("username is required")
	}
	if password == "" {
		return nil, model.NewErrBadRequest("password is required")
	}

	if _, err := a.store.GetUserByUsername(username); err == nil {
		return nil, model.NewErrBadRequest("username already exists")
	} else if !model.IsErrNotFound(err) {
		return nil, err
	}
	if email != "" {
		if _, err := a.store.GetUserByEmail(email); err == nil {
			return nil, model.NewErrBadRequest("email already exists")
		} else if !model.IsErrNotFound(err) {
			return nil, err
		}
	}
	if err := auth.IsPasswordValid(password, auth.PasswordSettings{MinimumLength: 6}); err != nil {
		return nil, model.NewErrBadRequest("invalid password: " + err.Error())
	}

	user, err := a.store.CreateUser(&model.User{
		ID:          utils.NewID(utils.IDTypeUser),
		Username:    username,
		Email:       email,
		Nickname:    nickname,
		Password:    auth.HashPassword(password),
		MfaSecret:   "",
		AuthService: a.config.AuthMode,
		AuthData:    "",
		Roles:       adminGroupRoles(normalizeAdminGroup(request.Group)),
	})
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (a *App) UpdateManagedUser(userID string, request model.AdminUserRequest) (*model.User, error) {
	user, err := a.store.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	username := strings.TrimSpace(request.Username)
	email := strings.TrimSpace(request.Email)
	nickname := strings.TrimSpace(request.Nickname)
	if username == "" {
		return nil, model.NewErrBadRequest("username is required")
	}

	if existing, err := a.store.GetUserByUsername(username); err == nil && existing.ID != userID {
		return nil, model.NewErrBadRequest("username already exists")
	} else if err != nil && !model.IsErrNotFound(err) {
		return nil, err
	}
	if email != "" {
		if existing, err := a.store.GetUserByEmail(email); err == nil && existing.ID != userID {
			return nil, model.NewErrBadRequest("email already exists")
		} else if err != nil && !model.IsErrNotFound(err) {
			return nil, err
		}
	}
	if request.Password != "" {
		if err := auth.IsPasswordValid(request.Password, auth.PasswordSettings{MinimumLength: 6}); err != nil {
			return nil, model.NewErrBadRequest("invalid password: " + err.Error())
		}
	}

	user.Username = username
	user.Email = email
	user.Nickname = nickname
	user.Roles = adminGroupRoles(normalizeAdminGroup(request.Group))

	updatedUser, err := a.store.UpdateUser(user)
	if err != nil {
		return nil, err
	}
	if request.Password != "" {
		if err := a.store.UpdateUserPasswordByID(userID, auth.HashPassword(request.Password)); err != nil {
			return nil, err
		}
	}

	return updatedUser, nil
}

func (a *App) DeleteManagedUser(userID string) error {
	if userID == "" {
		return model.NewErrBadRequest("user ID is required")
	}

	return a.store.DeleteUser(userID)
}

func (a *App) GetAdminBoards(teamID string) ([]*model.Board, error) {
	boards, _, err := a.store.GetBoardsForCompliance(model.QueryBoardsForComplianceOptions{
		TeamID: teamID,
	})
	if err != nil {
		return nil, err
	}

	filteredBoards := []*model.Board{}
	for _, board := range boards {
		if !board.IsTemplate {
			filteredBoards = append(filteredBoards, board)
		}
	}
	return filteredBoards, nil
}

func (a *App) GetAdminSystemSettings() (model.AdminSystemSettings, error) {
	settings := defaultAdminSystemSettings()
	value, err := a.store.GetSystemSetting(adminSystemSettingsKey)
	if err != nil {
		return settings, err
	}
	if value == "" {
		return settings, nil
	}
	if err = json.Unmarshal([]byte(value), &settings); err != nil {
		return defaultAdminSystemSettings(), err
	}
	return settings, nil
}

func (a *App) SaveAdminSystemSettings(settings model.AdminSystemSettings) (model.AdminSystemSettings, error) {
	if settings.AppName == "" {
		settings.AppName = defaultAdminSystemSettings().AppName
	}
	if settings.AI.Provider == "" {
		settings.AI.Provider = defaultAdminSystemSettings().AI.Provider
	}
	if settings.AI.OllamaEndpoint == "" {
		settings.AI.OllamaEndpoint = defaultAdminSystemSettings().AI.OllamaEndpoint
	}
	if settings.AI.Enabled && settings.AI.Provider != "Ollama" && strings.TrimSpace(settings.AI.APIKey) == "" {
		return settings, model.NewErrBadRequest("api key is required")
	}
	if settings.TimeZone == "" {
		settings.TimeZone = defaultAdminSystemSettings().TimeZone
	}

	data, err := json.Marshal(settings)
	if err != nil {
		return settings, err
	}
	return settings, a.store.SetSystemSetting(adminSystemSettingsKey, string(data))
}
