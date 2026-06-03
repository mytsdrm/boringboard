package ai

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const defaultGenerateTimeoutSeconds = 180

const (
	defaultOpenAIModel      = "gpt-4o-mini"
	defaultGeminiModel      = "gemini-1.5-flash"
	defaultOllamaModel      = "llama3.1"
	defaultClineModel       = "anthropic/claude-sonnet-4-6"
	defaultAnythingLLMModel = "anythingllm"
)

var defaultClineModels = []string{
	"anthropic/claude-sonnet-4-6",
	"openai/gpt-4o",
	"google/gemini-2.5-pro",
	"deepseek/deepseek-chat",
	"minimax/minimax-m2.5",
}

var errUnsupportedProvider = errors.New("unsupported ai provider")

type httpProvider struct {
	client *http.Client
}

func newProvider(name string) (provider, error) {
	base := httpProvider{client: &http.Client{Timeout: generateTimeout()}}
	switch name {
	case ProviderOpenAI:
		return openAIProvider{httpProvider: base}, nil
	case ProviderCline:
		return clineProvider{httpProvider: base}, nil
	case ProviderAnythingLLM:
		return anythingLLMProvider{httpProvider: base}, nil
	case ProviderGemini:
		return geminiProvider{httpProvider: base}, nil
	case ProviderOllama:
		return ollamaProvider{httpProvider: base}, nil
	default:
		return nil, errUnsupportedProvider
	}
}

type openAIProvider struct {
	httpProvider
}

func (p openAIProvider) GenerateJSON(request providerRequest) (string, error) {
	return p.generateOpenAICompatibleJSON(
		strings.TrimRight(envOrDefault("BORINGBOARD_AI_OPENAI_ENDPOINT", "https://api.openai.com/v1"), "/"),
		defaultOpenAIModel,
		true,
		request,
	)
}

type clineProvider struct {
	httpProvider
}

func (p clineProvider) GenerateJSON(request providerRequest) (string, error) {
	return p.generateOpenAICompatibleJSON(
		strings.TrimRight(envOrDefault("BORINGBOARD_AI_CLINE_ENDPOINT", "https://api.cline.bot/api/v1"), "/"),
		defaultClineModel,
		false,
		request,
	)
}

type anythingLLMProvider struct {
	httpProvider
}

func (p anythingLLMProvider) GenerateJSON(request providerRequest) (string, error) {
	endpoint := request.Settings.AnythingLLMEndpoint
	if strings.TrimSpace(endpoint) == "" {
		endpoint = envOrDefault("BORINGBOARD_AI_ANYTHINGLLM_ENDPOINT", "http://localhost:3001/api/v1")
	}
	return p.generateOpenAICompatibleJSON(
		anythingLLMOpenAIEndpoint(endpoint),
		defaultAnythingLLMModel,
		false,
		request,
	)
}

func (p httpProvider) generateOpenAICompatibleJSON(endpoint string, defaultModel string, includeResponseFormat bool, request providerRequest) (string, error) {
	model := strings.TrimSpace(request.Settings.Model)
	if model == "" {
		model = defaultModel
	}
	payload := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": "You return only valid JSON for task board previews."},
			{"role": "user", "content": request.Prompt},
		},
		"stream":      false,
		"temperature": 0.4,
	}
	if includeResponseFormat {
		payload["response_format"] = map[string]string{"type": "json_object"}
	}

	body, err := p.postJSON(endpoint+"/chat/completions", request.Settings.APIKey, payload)
	if err != nil {
		return "", err
	}

	return openAICompatibleResponseContent(body)
}

func openAICompatibleResponseContent(body []byte) (string, error) {
	var response struct {
		Choices []struct {
			Message struct {
				Content json.RawMessage `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Data struct {
			Choices []struct {
				Message struct {
					Content json.RawMessage `json:"content"`
				} `json:"message"`
			} `json:"choices"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return "", invalidProviderPreviewError(body, "could not parse chat completion response")
	}
	if len(response.Choices) == 0 && len(response.Data.Choices) > 0 {
		response.Choices = response.Data.Choices
	}
	if len(response.Choices) == 0 {
		return "", invalidProviderPreviewError(body, "response has no choices")
	}
	content, err := openAICompatibleMessageContent(response.Choices[0].Message.Content)
	if err != nil || strings.TrimSpace(content) == "" {
		return "", invalidProviderPreviewError(body, "response choice has no usable message content")
	}
	return content, nil
}

type geminiProvider struct {
	httpProvider
}

func (p geminiProvider) GenerateJSON(request providerRequest) (string, error) {
	model := strings.TrimSpace(request.Settings.Model)
	if model == "" {
		model = defaultGeminiModel
	}
	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"role": "user",
				"parts": []map[string]string{
					{"text": request.Prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":      0.4,
			"responseMimeType": "application/json",
		},
	}

	url := fmt.Sprintf("%s/models/%s:generateContent?key=%s", strings.TrimRight(envOrDefault("BORINGBOARD_AI_GEMINI_ENDPOINT", "https://generativelanguage.googleapis.com/v1beta"), "/"), model, request.Settings.APIKey)
	body, err := p.postJSON(url, "", payload)
	if err != nil {
		return "", err
	}

	var response struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err = json.Unmarshal(body, &response); err != nil {
		return "", err
	}
	if len(response.Candidates) == 0 || len(response.Candidates[0].Content.Parts) == 0 {
		return "", ErrInvalidAIPreview
	}
	return response.Candidates[0].Content.Parts[0].Text, nil
}

type ollamaProvider struct {
	httpProvider
}

func (p ollamaProvider) GenerateJSON(request providerRequest) (string, error) {
	endpoint := strings.TrimRight(request.Settings.OllamaEndpoint, "/")
	if endpoint == "" {
		endpoint = envOrDefault("BORINGBOARD_AI_OLLAMA_ENDPOINT", "http://localhost:11434")
	}
	model := strings.TrimSpace(request.Settings.Model)
	if model == "" {
		model = defaultOllamaModel
	}
	payload := map[string]interface{}{
		"model":  model,
		"prompt": request.Prompt,
		"format": "json",
		"stream": false,
		"options": map[string]interface{}{
			"temperature": 0.4,
		},
	}

	body, err := p.postJSON(endpoint+"/api/generate", "", payload)
	if err != nil {
		return "", err
	}

	var response struct {
		Response string `json:"response"`
	}
	if err = json.Unmarshal(body, &response); err != nil {
		return "", err
	}
	if strings.TrimSpace(response.Response) == "" {
		return "", ErrInvalidAIPreview
	}
	return response.Response, nil
}

func ListOllamaModels(endpoint string) ([]string, error) {
	endpoint = strings.TrimRight(strings.TrimSpace(endpoint), "/")
	if endpoint == "" {
		endpoint = envOrDefault("BORINGBOARD_AI_OLLAMA_ENDPOINT", "http://localhost:11434")
	}

	provider := httpProvider{client: &http.Client{Timeout: 15 * time.Second}}
	body, err := provider.getJSON(endpoint + "/api/tags")
	if err != nil {
		return nil, err
	}

	var response struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	if err = json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	models := []string{}
	for _, model := range response.Models {
		name := strings.TrimSpace(model.Name)
		if name != "" {
			models = append(models, name)
		}
	}
	return models, nil
}

func ListProviderModels(request ProviderModelListRequest) ([]string, error) {
	switch request.Provider {
	case ProviderOpenAI:
		return listOpenAICompatibleModels(request.APIKey, envOrDefault("BORINGBOARD_AI_OPENAI_ENDPOINT", "https://api.openai.com/v1"))
	case ProviderCline:
		return listClineModels(request.APIKey)
	case ProviderAnythingLLM:
		endpoint := request.AnythingLLMEndpoint
		if strings.TrimSpace(endpoint) == "" {
			endpoint = envOrDefault("BORINGBOARD_AI_ANYTHINGLLM_ENDPOINT", "http://localhost:3001/api/v1")
		}
		return listOpenAICompatibleModels(request.APIKey, anythingLLMOpenAIEndpoint(endpoint))
	case ProviderGemini:
		return listGeminiModels(request.APIKey)
	case ProviderOllama:
		return ListOllamaModels(request.OllamaEndpoint)
	default:
		return nil, errUnsupportedProvider
	}
}

func listClineModels(apiKey string) ([]string, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, errors.New("api key is required")
	}
	return append([]string{}, defaultClineModels...), nil
}

func anythingLLMOpenAIEndpoint(endpoint string) string {
	endpoint = strings.TrimRight(strings.TrimSpace(endpoint), "/")
	if strings.HasSuffix(endpoint, "/openai") {
		return endpoint
	}
	return endpoint + "/openai"
}

func listOpenAICompatibleModels(apiKey string, endpoint string) ([]string, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, errors.New("api key is required")
	}

	provider := httpProvider{client: &http.Client{Timeout: 15 * time.Second}}
	body, err := provider.getJSONWithAPIKey(strings.TrimRight(endpoint, "/")+"/models", apiKey)
	if err != nil {
		return nil, err
	}

	var response struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err = json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	models := []string{}
	for _, model := range response.Data {
		id := strings.TrimSpace(model.ID)
		if id != "" {
			models = append(models, id)
		}
	}
	return models, nil
}

func listGeminiModels(apiKey string) ([]string, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, errors.New("api key is required")
	}

	provider := httpProvider{client: &http.Client{Timeout: 15 * time.Second}}
	body, err := provider.getJSON(fmt.Sprintf("%s/models?key=%s", strings.TrimRight(envOrDefault("BORINGBOARD_AI_GEMINI_ENDPOINT", "https://generativelanguage.googleapis.com/v1beta"), "/"), apiKey))
	if err != nil {
		return nil, err
	}

	var response struct {
		Models []struct {
			Name                       string   `json:"name"`
			SupportedGenerationMethods []string `json:"supportedGenerationMethods"`
		} `json:"models"`
	}
	if err = json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	models := []string{}
	for _, model := range response.Models {
		if !supportsGenerateContent(model.SupportedGenerationMethods) {
			continue
		}
		name := strings.TrimPrefix(strings.TrimSpace(model.Name), "models/")
		if name != "" {
			models = append(models, name)
		}
	}
	return models, nil
}

func supportsGenerateContent(methods []string) bool {
	for _, method := range methods {
		if method == "generateContent" {
			return true
		}
	}
	return false
}

func openAICompatibleMessageContent(content json.RawMessage) (string, error) {
	var text string
	if err := json.Unmarshal(content, &text); err == nil {
		return text, nil
	}

	var parts []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	}
	if err := json.Unmarshal(content, &parts); err != nil {
		return "", err
	}

	builder := strings.Builder{}
	for _, part := range parts {
		if part.Type != "" && part.Type != "text" {
			continue
		}
		builder.WriteString(part.Text)
	}
	return builder.String(), nil
}

func (p httpProvider) getJSON(url string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	return p.doJSON(req)
}

func (p httpProvider) getJSONWithAPIKey(url string, apiKey string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	return p.doJSON(req)
}

func (p httpProvider) doJSON(req *http.Request) ([]byte, error) {
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, providerStatusError(resp.StatusCode, body)
	}
	return body, nil
}

func (p httpProvider) postJSON(url string, apiKey string, payload interface{}) ([]byte, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, providerStatusError(resp.StatusCode, body)
	}
	return body, nil
}

func providerStatusError(statusCode int, body []byte) error {
	bodyText := strings.TrimSpace(string(body))
	if len(bodyText) > 500 {
		bodyText = bodyText[:500]
	}
	if bodyText == "" {
		return fmt.Errorf("ai provider request failed with status %d", statusCode)
	}
	return fmt.Errorf("ai provider request failed with status %d: %s", statusCode, bodyText)
}

func invalidProviderPreviewError(body []byte, reason string) error {
	return fmt.Errorf("%w: %s: %s", ErrInvalidAIPreview, reason, providerBodySnippet(body))
}

func providerBodySnippet(body []byte) string {
	bodyText := strings.Join(strings.Fields(string(body)), " ")
	if len(bodyText) > 1000 {
		return bodyText[:1000] + "..."
	}
	if bodyText == "" {
		return "empty provider response"
	}
	return bodyText
}

func envOrDefault(key string, defaultValue string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue
	}
	return value
}

func generateTimeout() time.Duration {
	timeoutString := strings.TrimSpace(os.Getenv("BORINGBOARD_AI_TIMEOUT"))
	if timeoutString == "" {
		return defaultGenerateTimeoutSeconds * time.Second
	}
	timeoutSeconds, err := time.ParseDuration(timeoutString + "s")
	if err != nil || timeoutSeconds <= 0 {
		return defaultGenerateTimeoutSeconds * time.Second
	}
	return timeoutSeconds
}
