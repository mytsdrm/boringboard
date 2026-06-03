package ai

import "github.com/mattermost/focalboard/server/model"

const (
	ProviderOpenAI      = "OpenAI"
	ProviderGemini      = "Gemini"
	ProviderOllama      = "Ollama"
	ProviderCline       = "Cline"
	ProviderAnythingLLM = "Anything LLM"
)

type CreateTaskBoardRequest struct {
	Command  string                   `json:"command"`
	Views    []string                 `json:"views"`
	Language string                   `json:"language"`
	Statuses []TaskBoardColumnPreview `json:"statuses"`
}

type OllamaModelListRequest struct {
	Endpoint string `json:"endpoint"`
}

type ProviderModelListRequest struct {
	Provider            string `json:"provider"`
	APIKey              string `json:"apiKey"`
	OllamaEndpoint      string `json:"ollamaEndpoint"`
	AnythingLLMEndpoint string `json:"anythingLLMEndpoint"`
}

type OllamaModelListResponse struct {
	Models []string `json:"models"`
}

type TaskBoardColumnPreview struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type TaskBoardTaskPreview struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Column      string `json:"column"`
}

type TaskBoardPreview struct {
	Title       string                   `json:"title"`
	Description string                   `json:"description"`
	Views       []string                 `json:"views"`
	Columns     []TaskBoardColumnPreview `json:"columns"`
	Tasks       []TaskBoardTaskPreview   `json:"tasks"`
}

type GenerateTaskBoardPreviewOptions struct {
	Command  string
	Views    []string
	Language string
	Statuses []TaskBoardColumnPreview
	Settings model.AdminSystemSettings
}

type providerRequest struct {
	Settings model.AdminAISettings
	Prompt   string
}

type provider interface {
	GenerateJSON(request providerRequest) (string, error)
}
