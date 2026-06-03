package model

type AdminAISettings struct {
	Enabled                  bool     `json:"enabled"`
	Provider                 string   `json:"provider"`
	Model                    string   `json:"model"`
	APIKey                   string   `json:"apiKey"`
	OllamaEndpoint           string   `json:"ollamaEndpoint"`
	AnythingLLMEndpoint      string   `json:"anythingLLMEndpoint"`
	OutputLanguagePreference string   `json:"outputLanguagePreference"`
	EnableForAllUsers        bool     `json:"enableForAllUsers"`
	EnabledUserIDs           []string `json:"enabledUserIds"`
}

type AdminTaskBoardSettings struct {
	EnableInvitedUserShare        bool `json:"enableInvitedUserShare"`
	EnableInvitedUserEditProperty bool `json:"enableInvitedUserEditProperty"`
}

type AdminModuleSettings struct {
	Reminder      bool `json:"reminder"`
	Announcement  bool `json:"announcement"`
	Reports       bool `json:"reports"`
	AuditLog      bool `json:"auditLog"`
	Notifications bool `json:"notifications"`
	Calendar      bool `json:"calendar"`
}

type AdminSystemSettings struct {
	AppName    string                 `json:"appName"`
	Logo       string                 `json:"logo"`
	TimeZone   string                 `json:"timeZone"`
	AI         AdminAISettings        `json:"ai"`
	TaskBoards AdminTaskBoardSettings `json:"taskBoards"`
	Modules    AdminModuleSettings    `json:"modules"`
}

type AdminUserRequest struct {
	Username             string `json:"username"`
	Email                string `json:"email"`
	Nickname             string `json:"nickname"`
	PhoneNumber          string `json:"phoneNumber"`
	PhoneWhatsAppEnabled bool   `json:"phoneWhatsAppEnabled"`
	PhoneTelegramEnabled bool   `json:"phoneTelegramEnabled"`
	Password             string `json:"password"`
	Group                string `json:"group"`
}
