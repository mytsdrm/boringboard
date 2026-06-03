package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/mattermost/focalboard/server/ai"
	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

func (a *API) registerAIRoutes(r *mux.Router) {
	r.HandleFunc("/ai/task-board/preview", a.sessionRequired(a.handleCreateTaskBoardPreview)).Methods(http.MethodPost)
	r.HandleFunc("/admin/ai/models", a.sessionRequired(a.handleListProviderModels)).Methods(http.MethodPost)
	r.HandleFunc("/admin/ai/ollama/models", a.sessionRequired(a.handleListOllamaModels)).Methods(http.MethodPost)
}

func (a *API) handleCreateTaskBoardPreview(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	settings, err := a.app.GetAdminSystemSettings()
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	isGuest, err := a.userIsGuest(userID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	if isGuest {
		a.errorResponse(w, r, model.NewErrPermission("access denied to ai task board preview"))
		return
	}

	var request ai.CreateTaskBoardRequest
	if err = json.NewDecoder(r.Body).Decode(&request); err != nil {
		a.errorResponse(w, r, err)
		return
	}

	preview, err := ai.NewService().GenerateTaskBoardPreview(ai.GenerateTaskBoardPreviewOptions{
		Command:  request.Command,
		Views:    request.Views,
		Language: request.Language,
		Statuses: request.Statuses,
		Settings: settings,
	})
	if err != nil {
		if errors.Is(err, ai.ErrAIIsDisabled) ||
			errors.Is(err, ai.ErrCommandRequired) ||
			errors.Is(err, ai.ErrCommandTooLong) {
			a.errorResponse(w, r, model.NewErrBadRequest(err.Error()))
			return
		}
		if errors.Is(err, ai.ErrInvalidAIPreview) {
			a.logger.Error("AI task board preview parse failed",
				mlog.String("provider", settings.AI.Provider),
				mlog.String("model", settings.AI.Model),
				mlog.String("details", err.Error()),
			)
			a.errorResponse(w, r, model.NewErrBadRequest(err.Error()))
			return
		}
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(preview)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleListProviderModels(w http.ResponseWriter, r *http.Request) {
	if !a.requireSystemAdmin(w, r) {
		return
	}

	var request ai.ProviderModelListRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		a.errorResponse(w, r, err)
		return
	}

	models, err := ai.ListProviderModels(request)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(ai.OllamaModelListResponse{Models: models})
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleListOllamaModels(w http.ResponseWriter, r *http.Request) {
	if !a.requireSystemAdmin(w, r) {
		return
	}

	var request ai.OllamaModelListRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		a.errorResponse(w, r, err)
		return
	}

	models, err := ai.ListOllamaModels(request.Endpoint)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(ai.OllamaModelListResponse{Models: models})
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	jsonBytesResponse(w, http.StatusOK, data)
}
