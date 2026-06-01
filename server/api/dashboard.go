// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func (a *API) registerDashboardRoutes(r *mux.Router) {
	r.HandleFunc("/teams/{teamID}/dashboard/activity", a.sessionRequired(a.handleGetDashboardActivity)).Methods("GET")
}

func (a *API) handleGetDashboardActivity(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	teamID := mux.Vars(r)["teamID"]
	beforeUpdateAt := int64(0)
	limit := uint64(20)
	maxLimit := uint64(200)

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

	blocks, err := a.app.GetDashboardActivityBlocks(userID, teamID, limit, beforeUpdateAt)
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
