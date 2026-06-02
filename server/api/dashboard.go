// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/mattermost/focalboard/server/model"
)

func (a *API) registerDashboardRoutes(r *mux.Router) {
	r.HandleFunc("/teams/{teamID}/dashboard/activity", a.sessionRequired(a.handleGetDashboardActivity)).Methods("GET")
	r.HandleFunc("/teams/{teamID}/dashboard/activity/all", a.sessionRequired(a.handleGetDashboardAllActivity)).Methods("GET")
}

func (a *API) handleGetDashboardActivity(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	teamID := mux.Vars(r)["teamID"]
	afterUpdateAt, beforeUpdateAt, limit := parseDashboardActivityQuery(r)

	blocks, err := a.app.GetDashboardActivityBlocks(userID, teamID, limit, beforeUpdateAt, afterUpdateAt)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(blocks)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleGetDashboardAllActivity(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if !a.permissions.HasPermissionTo(userID, model.PermissionManageSystem) {
		a.errorResponse(w, r, model.NewErrPermission("access denied"))
		return
	}

	teamID := mux.Vars(r)["teamID"]
	afterUpdateAt, beforeUpdateAt, limit := parseDashboardActivityQuery(r)

	blocks, err := a.app.GetAdminActivityBlocks(teamID, limit, beforeUpdateAt, afterUpdateAt)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(blocks)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func parseDashboardActivityQuery(r *http.Request) (int64, int64, uint64) {
	afterUpdateAt := int64(0)
	beforeUpdateAt := int64(0)
	limit := uint64(20)
	maxLimit := uint64(200)

	if afterParam := r.URL.Query().Get("after"); afterParam != "" {
		parsedAfter, err := strconv.ParseInt(afterParam, 10, 64)
		if err == nil && parsedAfter > 0 {
			afterUpdateAt = parsedAfter
		}
	}

	if beforeParam := r.URL.Query().Get("before"); beforeParam != "" {
		parsedBefore, err := strconv.ParseInt(beforeParam, 10, 64)
		if err == nil && parsedBefore > 0 {
			beforeUpdateAt = parsedBefore
		}
	}

	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		parsedLimit, err := strconv.ParseUint(limitParam, 10, 64)
		if err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if limit > maxLimit {
		limit = maxLimit
	}

	return afterUpdateAt, beforeUpdateAt, limit
}
