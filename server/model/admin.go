package model

type AdminAISettings struct {
	Enabled  bool   `json:"enabled"`
	Provider string `json:"provider"`
	APIKey   string `json:"apiKey"`
}

type AdminSystemSettings struct {
	AppName  string          `json:"appName"`
	Logo     string          `json:"logo"`
	TimeZone string          `json:"timeZone"`
	AI       AdminAISettings `json:"ai"`
}

type AdminUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Nickname string `json:"nickname"`
	Password string `json:"password"`
	Group    string `json:"group"`
}
