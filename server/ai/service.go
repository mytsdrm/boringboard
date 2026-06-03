package ai

import (
	"encoding/json"
	"fmt"
	"strings"
)

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) GenerateTaskBoardPreview(options GenerateTaskBoardPreviewOptions) (TaskBoardPreview, error) {
	if !options.Settings.AI.Enabled {
		return TaskBoardPreview{}, ErrAIIsDisabled
	}
	if err := validateCommand(options.Command); err != nil {
		return TaskBoardPreview{}, err
	}

	selectedProvider, err := newProvider(options.Settings.AI.Provider)
	if err != nil {
		return TaskBoardPreview{}, err
	}

	language := strings.TrimSpace(options.Language)
	if language == "" {
		language = options.Settings.AI.OutputLanguagePreference
	}

	content, err := selectedProvider.GenerateJSON(providerRequest{
		Settings: options.Settings.AI,
		Prompt:   createTaskBoardPrompt(strings.TrimSpace(options.Command), options.Views, language, options.Statuses),
	})
	if err != nil {
		return TaskBoardPreview{}, err
	}

	preview, err := parseTaskBoardPreview(content, options.Views, options.Statuses)
	if err == nil {
		return preview, nil
	}

	return TaskBoardPreview{}, err
}

func parseTaskBoardPreview(content string, requestedViews []string, requestedColumns []TaskBoardColumnPreview) (TaskBoardPreview, error) {
	jsonContent := []byte(extractJSONObject(content))
	var preview TaskBoardPreview
	if err := json.Unmarshal(jsonContent, &preview); err != nil {
		return TaskBoardPreview{}, invalidPreviewError(content, "could not parse json")
	}

	normalizedPreview, err := normalizePreview(preview, requestedViews, requestedColumns)
	if err == nil {
		return normalizedPreview, nil
	}

	var genericPreview map[string]interface{}
	if err = json.Unmarshal(jsonContent, &genericPreview); err != nil {
		return TaskBoardPreview{}, invalidPreviewError(content, "could not parse flexible json")
	}

	normalizedPreview, err = normalizePreview(coerceTaskBoardPreview(genericPreview), requestedViews, requestedColumns)
	if err != nil {
		return TaskBoardPreview{}, invalidPreviewError(content, "missing usable title or columns")
	}
	return normalizedPreview, nil
}

func coerceTaskBoardPreview(data map[string]interface{}) TaskBoardPreview {
	if nested := firstObject(data, "board", "preview", "taskBoard", "task_board", "taskBoardPreview", "task_board_preview"); nested != nil {
		data = nested
	}

	columnsValue := firstValue(data, "columns", "statuses", "status", "lists", "lanes", "sections", "stages", "phases", "workflow", "properties", "categories")
	tasksValue := firstValue(data, "tasks", "cards", "items", "starterTasks", "starter_tasks")
	preview := TaskBoardPreview{
		Title:       firstString(data, "title", "name", "boardTitle", "board_title", "project", "projectName", "project_name"),
		Description: firstString(data, "description", "summary", "subtitle", "overview"),
		Views:       coerceStringList(firstValue(data, "views", "viewTypes", "view_types")),
		Columns:     coerceColumns(columnsValue),
		Tasks:       coerceTasks(tasksValue, ""),
	}

	if preview.Description == "" {
		preview.Description = preview.Title
	}
	if len(preview.Views) == 0 {
		preview.Views = []string{"board", "table"}
	}
	if len(preview.Columns) == 0 && preview.Title != "" {
		preview.Columns = []TaskBoardColumnPreview{
			{Name: "Backlog", Color: "propColorGray"},
			{Name: "In Progress", Color: "propColorBlue"},
			{Name: "Done", Color: "propColorGreen"},
		}
	}
	if len(preview.Tasks) == 0 {
		preview.Tasks = coerceTasksFromColumns(columnsValue)
	}
	return preview
}

func extractJSONObject(content string) string {
	content = strings.TrimSpace(content)
	if strings.HasPrefix(content, "```") {
		content = strings.TrimPrefix(content, "```json")
		content = strings.TrimPrefix(content, "```")
		content = strings.TrimSuffix(content, "```")
	}
	start := strings.Index(content, "{")
	if start < 0 {
		return content
	}

	depth := 0
	inString := false
	escaped := false
	for index := start; index < len(content); index++ {
		character := content[index]
		if escaped {
			escaped = false
			continue
		}
		if character == '\\' && inString {
			escaped = true
			continue
		}
		if character == '"' {
			inString = !inString
			continue
		}
		if inString {
			continue
		}
		switch character {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return content[start : index+1]
			}
		}
	}
	return content
}

func firstValue(data map[string]interface{}, keys ...string) interface{} {
	for _, key := range keys {
		if value, ok := data[key]; ok {
			return value
		}
	}
	return nil
}

func firstObject(data map[string]interface{}, keys ...string) map[string]interface{} {
	value := firstValue(data, keys...)
	object, _ := value.(map[string]interface{})
	return object
}

func firstString(data map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		value, ok := data[key]
		if !ok {
			continue
		}
		if text, ok := value.(string); ok {
			return text
		}
	}
	return ""
}

func coerceStringList(value interface{}) []string {
	if stringsValue, ok := value.([]string); ok {
		return stringsValue
	}
	items, ok := value.([]interface{})
	if !ok {
		return nil
	}

	result := []string{}
	for _, item := range items {
		if text, ok := item.(string); ok {
			result = append(result, text)
		}
	}
	return result
}

func coerceColumns(value interface{}) []TaskBoardColumnPreview {
	if columnsByKey, ok := value.(map[string]interface{}); ok {
		columns := []TaskBoardColumnPreview{}
		for key, item := range columnsByKey {
			name := key
			color := ""
			if column, ok := item.(map[string]interface{}); ok {
				name = firstString(column, "name", "title", "label", "status")
				if name == "" {
					name = key
				}
				color = firstString(column, "color")
			}
			columns = append(columns, TaskBoardColumnPreview{Name: name, Color: color})
		}
		return columns
	}

	items, ok := value.([]interface{})
	if !ok {
		return nil
	}
	columns := []TaskBoardColumnPreview{}
	for _, item := range items {
		switch column := item.(type) {
		case string:
			columns = append(columns, TaskBoardColumnPreview{Name: column})
		case map[string]interface{}:
			columns = append(columns, TaskBoardColumnPreview{
				Name:  firstString(column, "name", "title", "label", "status", "stage", "phase"),
				Color: firstString(column, "color"),
			})
		}
	}
	return columns
}

func coerceTasks(value interface{}, fallbackColumn string) []TaskBoardTaskPreview {
	items, ok := value.([]interface{})
	if !ok {
		return nil
	}

	tasks := []TaskBoardTaskPreview{}
	for _, item := range items {
		if title, ok := item.(string); ok {
			tasks = append(tasks, TaskBoardTaskPreview{
				Title:  title,
				Column: fallbackColumn,
			})
			continue
		}
		task, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		column := firstString(task, "column", "status", "list", "lane", "section", "stage", "phase")
		if column == "" {
			column = fallbackColumn
		}
		tasks = append(tasks, TaskBoardTaskPreview{
			Title:       firstString(task, "title", "name", "task", "card", "summary"),
			Description: firstString(task, "description", "summary", "details"),
			Column:      column,
		})
	}
	return tasks
}

func coerceTasksFromColumns(value interface{}) []TaskBoardTaskPreview {
	items, ok := value.([]interface{})
	if !ok {
		return nil
	}

	tasks := []TaskBoardTaskPreview{}
	for _, item := range items {
		column, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		columnName := firstString(column, "name", "title", "label", "status", "stage", "phase")
		tasks = append(tasks, coerceTasks(firstValue(column, "tasks", "cards", "items"), columnName)...)
	}
	return tasks
}

func invalidPreviewError(content string, reason string) error {
	return fmt.Errorf("%w: %s: %s", ErrInvalidAIPreview, reason, previewSnippet(content))
}

func previewSnippet(content string) string {
	content = strings.Join(strings.Fields(content), " ")
	if len(content) > 300 {
		return content[:300] + "..."
	}
	if content == "" {
		return "empty response"
	}
	return content
}
