package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/mattermost/focalboard/server/model"
)

func (a *API) registerAdminDashboardRoutes(r *mux.Router) {
	r.HandleFunc("/system-settings", a.sessionRequired(a.handleGetSystemSettings)).Methods(http.MethodGet)
	r.HandleFunc("/admin/boards", a.sessionRequired(a.handleGetAdminBoards)).Methods(http.MethodGet)
	r.HandleFunc("/admin/users", a.sessionRequired(a.handleGetAdminUsers)).Methods(http.MethodGet)
	r.HandleFunc("/admin/users", a.sessionRequired(a.handleCreateAdminUser)).Methods(http.MethodPost)
	r.HandleFunc("/admin/users/{userID}", a.sessionRequired(a.handleUpdateAdminUser)).Methods(http.MethodPut)
	r.HandleFunc("/admin/users/{userID}", a.sessionRequired(a.handleDeleteAdminUser)).Methods(http.MethodDelete)
	r.HandleFunc("/admin/system-settings", a.sessionRequired(a.handleGetAdminSystemSettings)).Methods(http.MethodGet)
	r.HandleFunc("/admin/system-settings", a.sessionRequired(a.handleSaveAdminSystemSettings)).Methods(http.MethodPut)
}

func sanitizeSystemSettings(settings model.AdminSystemSettings) model.AdminSystemSettings {
	settings.AI.APIKey = ""
	return settings
}

func (a *API) requireSystemAdmin(w http.ResponseWriter, r *http.Request) bool {
	userID := getUserID(r)
	if !a.permissions.HasPermissionTo(userID, model.PermissionManageSystem) {
		a.errorResponse(w, r, model.NewErrPermission("access denied"))
		return false
	}
	return true
}

func (a *API) handleGetAdminUsers(w http.ResponseWriter, r *http.Request) {
	if !a.requireSystemAdmin(w, r) {
		return
	}

	users, err := a.app.GetRegisteredUsers()
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	for _, user := range users {
		a.app.SanitizeProfile(user, true)
	}

	data, err := json.Marshal(users)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleCreateAdminUser(w http.ResponseWriter, r *http.Request) {
	if !a.requireSystemAdmin(w, r) {
		return
	}

	requestBody, err := io.ReadAll(r.Body)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	var request model.AdminUserRequest
	if err = json.Unmarshal(requestBody, &request); err != nil {
		a.errorResponse(w, r, err)
		return
	}

	user, err := a.app.CreateManagedUser(request)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	a.app.SanitizeProfile(user, true)

	data, err := json.Marshal(user)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusCreated, data)
}

func (a *API) handleUpdateAdminUser(w http.ResponseWriter, r *http.Request) {
	if !a.requireSystemAdmin(w, r) {
		return
	}

	userID := mux.Vars(r)["userID"]
	if userID == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("user ID is required"))
		return
	}

	requestBody, err := io.ReadAll(r.Body)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	var request model.AdminUserRequest
	if err = json.Unmarshal(requestBody, &request); err != nil {
		a.errorResponse(w, r, err)
		return
	}

	user, err := a.app.UpdateManagedUser(userID, request)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	a.app.SanitizeProfile(user, true)

	data, err := json.Marshal(user)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleDeleteAdminUser(w http.ResponseWriter, r *http.Request) {
	if !a.requireSystemAdmin(w, r) {
		return
	}

	userID := mux.Vars(r)["userID"]
	if userID == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("user ID is required"))
		return
	}
	if userID == getUserID(r) {
		a.errorResponse(w, r, model.NewErrBadRequest("cannot delete the current user"))
		return
	}

	if err := a.app.DeleteManagedUser(userID); err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonStringResponse(w, http.StatusOK, "{}")
}

func (a *API) handleGetAdminBoards(w http.ResponseWriter, r *http.Request) {
	if !a.requireSystemAdmin(w, r) {
		return
	}

	teamID := r.URL.Query().Get("teamID")
	boards, err := a.app.GetAdminBoards(teamID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(boards)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleGetAdminSystemSettings(w http.ResponseWriter, r *http.Request) {
	if !a.requireSystemAdmin(w, r) {
		return
	}

	settings, err := a.app.GetAdminSystemSettings()
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(settings)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleGetSystemSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := a.app.GetAdminSystemSettings()
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(sanitizeSystemSettings(settings))
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleSaveAdminSystemSettings(w http.ResponseWriter, r *http.Request) {
	if !a.requireSystemAdmin(w, r) {
		return
	}

	requestBody, err := io.ReadAll(r.Body)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	var settings model.AdminSystemSettings
	if err = json.Unmarshal(requestBody, &settings); err != nil {
		a.errorResponse(w, r, err)
		return
	}

	savedSettings, err := a.app.SaveAdminSystemSettings(settings)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(savedSettings)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}
