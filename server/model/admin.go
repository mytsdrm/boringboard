package model

type AdminAISettings struct {
	Enabled             bool   `json:"enabled"`
	Provider            string `json:"provider"`
	Model               string `json:"model"`
	APIKey              string `json:"apiKey"`
	OllamaEndpoint      string `json:"ollamaEndpoint"`
	AnythingLLMEndpoint string `json:"anythingLLMEndpoint"`
}

type AdminTaskBoardSettings struct {
	EnableInvitedUserShare        bool `json:"enableInvitedUserShare"`
	EnableInvitedUserEditProperty bool `json:"enableInvitedUserEditProperty"`
}

type AdminSystemSettings struct {
	AppName    string                 `json:"appName"`
	Logo       string                 `json:"logo"`
	TimeZone   string                 `json:"timeZone"`
	AI         AdminAISettings        `json:"ai"`
	TaskBoards AdminTaskBoardSettings `json:"taskBoards"`
}

type AdminUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Nickname string `json:"nickname"`
	Password string `json:"password"`
	Group    string `json:"group"`
}
