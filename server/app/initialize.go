package app

import (
	"context"

	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/focalboard/server/services/auth"
	"github.com/mattermost/focalboard/server/utils"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

// initialize is called when the App is first created.
func (a *App) initialize(skipTemplateInit bool) {
	if err := a.ensureDefaultAdminUser(); err != nil {
		a.logger.Error(`InitializeDefaultAdminUser failed`, mlog.Err(err))
	}

	if !skipTemplateInit {
		if err := a.InitTemplates(); err != nil {
			a.logger.Error(`InitializeTemplates failed`, mlog.Err(err))
		}
	}
}

func (a *App) ensureDefaultAdminUser() error {
	if a.config.AuthMode != "native" {
		return nil
	}

	username := a.config.DefaultAdminUsername
	if username == "" {
		username = model.DefaultAdminUsername
	}
	password := a.config.DefaultAdminPassword
	if password == "" {
		password = model.DefaultAdminPassword
	}

	user, err := a.store.GetUserByUsername(username)
	if err == nil {
		adminRoles := model.RoleSystemAdmin + " " + model.GroupSuperAdmin
		if user.Roles != adminRoles {
			user.Roles = adminRoles
			_, err = a.store.UpdateUser(user)
		}
		return err
	}
	if !model.IsErrNotFound(err) {
		return err
	}

	_, err = a.store.CreateUser(&model.User{
		ID:          utils.NewID(utils.IDTypeUser),
		Username:    username,
		Email:       "",
		Password:    auth.HashPassword(password),
		MfaSecret:   "",
		AuthService: a.config.AuthMode,
		AuthData:    "",
		Roles:       model.RoleSystemAdmin + " " + model.GroupSuperAdmin,
	})
	return err
}

func (a *App) Shutdown() {
	if a.blockChangeNotifier != nil {
		ctx, cancel := context.WithTimeout(context.Background(), blockChangeNotifierShutdownTimeout)
		defer cancel()
		if !a.blockChangeNotifier.Shutdown(ctx) {
			a.logger.Warn("blockChangeNotifier shutdown timed out")
		}
	}
}
