package api

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

func (a *API) registerSystemRoutes(r *mux.Router) {
	// System APIs
	r.HandleFunc("/hello", a.handleHello).Methods("GET")
	r.HandleFunc("/ping", a.handlePing).Methods("GET")
	r.HandleFunc("/system-branding/logo/{filename}", a.handleSystemBrandingLogo).Methods("GET")
}

func (a *API) handleHello(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /hello hello
	//
	// Responds with `Hello` if the web service is running.
	//
	// ---
	// produces:
	// - text/plain
	// responses:
	//   '200':
	//     description: success
	stringResponse(w, "Hello")
}

func (a *API) handlePing(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /ping ping
	//
	// Responds with server metadata if the web service is running.
	//
	// ---
	// produces:
	// - application/json
	// responses:
	//   '200':
	//     description: success
	serverMetadata := a.app.GetServerMetadata()

	if a.singleUserToken != "" {
		serverMetadata.SKU = "personal_desktop"
	}

	if serverMetadata.Edition == "plugin" {
		serverMetadata.SKU = "suite"
	}

	bytes, err := json.Marshal(serverMetadata)
	if err != nil {
		a.errorResponse(w, r, err)
	}

	jsonStringResponse(w, 200, string(bytes))
}

func (a *API) handleSystemBrandingLogo(w http.ResponseWriter, r *http.Request) {
	settings, err := a.app.GetAdminSystemSettings()
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	contentType, logoBytes, ok := parseDataURL(settings.Logo)
	if !ok {
		http.NotFound(w, r)
		return
	}

	hash := fmt.Sprintf("%x", sha256.Sum256(logoBytes))
	filename := mux.Vars(r)["filename"]
	if !strings.HasPrefix(filename, hash) {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.WriteHeader(http.StatusOK)
	if _, err = w.Write(logoBytes); err != nil {
		a.logger.Error(err.Error())
	}
}

func systemBrandingLogoPath(logo string) string {
	contentType, logoBytes, ok := parseDataURL(logo)
	if !ok {
		return logo
	}

	hash := fmt.Sprintf("%x", sha256.Sum256(logoBytes))
	return fmt.Sprintf("/system-branding/logo/%s%s", hash, extensionForContentType(contentType))
}

func parseDataURL(value string) (string, []byte, bool) {
	if !strings.HasPrefix(value, "data:") {
		return "", nil, false
	}

	metadataAndData := strings.SplitN(strings.TrimPrefix(value, "data:"), ",", 2)
	if len(metadataAndData) != 2 || !strings.Contains(metadataAndData[0], ";base64") {
		return "", nil, false
	}

	contentType := strings.Split(metadataAndData[0], ";")[0]
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	decoded, err := base64.StdEncoding.DecodeString(metadataAndData[1])
	if err != nil {
		return "", nil, false
	}

	return contentType, decoded, true
}

func extensionForContentType(contentType string) string {
	switch contentType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/svg+xml":
		return ".svg"
	case "image/webp":
		return ".webp"
	}

	extensions, err := mime.ExtensionsByType(contentType)
	if err != nil || len(extensions) == 0 {
		return ""
	}

	return extensions[0]
}
