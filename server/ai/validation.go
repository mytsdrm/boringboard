package ai

import (
	"errors"
	"strings"
)

const (
	maxCommandLength     = 2000
	maxTitleLength       = 120
	maxDescriptionLength = 600
	maxColumnNameLength  = 40
	maxTaskTitleLength   = 140
	maxTaskDescription   = 500
	maxColumns           = 8
	maxTasks             = 24
)

var defaultTaskBoardViews = []string{"board", "table", "calendar"}

var (
	ErrAIIsDisabled     = errors.New("ai is disabled")
	ErrCommandRequired  = errors.New("command is required")
	ErrCommandTooLong   = errors.New("command is too long")
	ErrInvalidAIPreview = errors.New("invalid ai task board preview")
)

func validateCommand(command string) error {
	command = strings.TrimSpace(command)
	if command == "" {
		return ErrCommandRequired
	}
	if len(command) > maxCommandLength {
		return ErrCommandTooLong
	}
	return nil
}

func normalizePreview(preview TaskBoardPreview) (TaskBoardPreview, error) {
	preview.Title = trimTo(strings.TrimSpace(preview.Title), maxTitleLength)
	preview.Description = trimTo(strings.TrimSpace(preview.Description), maxDescriptionLength)
	if preview.Title == "" {
		return TaskBoardPreview{}, ErrInvalidAIPreview
	}

	normalizedColumns := []TaskBoardColumnPreview{}
	seenColumns := map[string]bool{}
	for _, column := range preview.Columns {
		name := trimTo(strings.TrimSpace(column.Name), maxColumnNameLength)
		if name == "" {
			continue
		}
		key := strings.ToLower(name)
		if seenColumns[key] {
			continue
		}
		seenColumns[key] = true
		normalizedColumns = append(normalizedColumns, TaskBoardColumnPreview{
			Name:  name,
			Color: normalizeColor(column.Color),
		})
		if len(normalizedColumns) >= maxColumns {
			break
		}
	}
	if len(normalizedColumns) == 0 {
		return TaskBoardPreview{}, ErrInvalidAIPreview
	}
	preview.Columns = normalizedColumns

	normalizedViews := append([]string{}, defaultTaskBoardViews...)
	seenViews := map[string]bool{}
	for _, view := range normalizedViews {
		seenViews[view] = true
	}
	for _, view := range preview.Views {
		view = strings.ToLower(strings.TrimSpace(view))
		if view != "board" && view != "table" && view != "calendar" && view != "gallery" {
			continue
		}
		if seenViews[view] {
			continue
		}
		seenViews[view] = true
		normalizedViews = append(normalizedViews, view)
	}
	preview.Views = normalizedViews

	knownColumns := map[string]string{}
	for _, column := range preview.Columns {
		knownColumns[strings.ToLower(column.Name)] = column.Name
	}

	normalizedTasks := []TaskBoardTaskPreview{}
	for _, task := range preview.Tasks {
		title := trimTo(strings.TrimSpace(task.Title), maxTaskTitleLength)
		if title == "" {
			continue
		}
		column := knownColumns[strings.ToLower(strings.TrimSpace(task.Column))]
		if column == "" {
			column = preview.Columns[0].Name
		}
		normalizedTasks = append(normalizedTasks, TaskBoardTaskPreview{
			Title:       title,
			Description: trimTo(strings.TrimSpace(task.Description), maxTaskDescription),
			Column:      column,
		})
		if len(normalizedTasks) >= maxTasks {
			break
		}
	}
	preview.Tasks = normalizedTasks

	return preview, nil
}

func trimTo(value string, maxLength int) string {
	if len(value) <= maxLength {
		return value
	}
	return strings.TrimSpace(value[:maxLength])
}

func normalizeColor(color string) string {
	switch strings.TrimSpace(color) {
	case "propColorGray", "propColorBrown", "propColorOrange", "propColorYellow", "propColorGreen", "propColorBlue", "propColorPurple", "propColorPink", "propColorRed":
		return color
	default:
		return "propColorBlue"
	}
}
