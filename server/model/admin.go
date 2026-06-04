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
	Reminder     bool `json:"reminder"`
	Announcement bool `json:"announcement"`
}

type AdminNotificationSettings struct {
	TaskBoardActivity bool     `json:"taskBoardActivity"`
	TaskActivity      bool     `json:"taskActivity"`
	EnableForAllUsers bool     `json:"enableForAllUsers"`
	EnabledUserIDs    []string `json:"enabledUserIds"`
	Web               bool     `json:"web"`
	Email             bool     `json:"email"`
	WhatsApp          bool     `json:"whatsApp"`
	Telegram          bool     `json:"telegram"`
}

type AdminAnnouncement struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Message     string `json:"message"`
	Audience    string `json:"audience"`
	Priority    string `json:"priority"`
	PublishAt   string `json:"publishAt"`
	ExpireAt    string `json:"expireAt"`
	Status      string `json:"status"`
	CreateAt    int64  `json:"createAt"`
	DeliveryKey string `json:"deliveryKey"`
}

type AdminSystemSettings struct {
	AppName       string                    `json:"appName"`
	Logo          string                    `json:"logo"`
	TimeZone      string                    `json:"timeZone"`
	AI            AdminAISettings           `json:"ai"`
	TaskBoards    AdminTaskBoardSettings    `json:"taskBoards"`
	Modules       AdminModuleSettings       `json:"modules"`
	Notifications AdminNotificationSettings `json:"notifications"`
	Announcements []AdminAnnouncement       `json:"announcements"`
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
