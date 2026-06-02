package ai

import (
	"fmt"
	"strings"
)

const defaultTaskBoardColumnGuidance = "Create a task board with planning, execution, review, and done columns."
const defaultTaskBoardViewGuidance = "Always include these views: board, table, calendar."

func createTaskBoardPrompt(command string) string {
	command = appendDefaultColumnGuidance(command)
	return fmt.Sprintf(`You generate safe, practical task board previews for BoringBoard.

Return exactly one valid JSON object and nothing else.
Do not include markdown, code fences, comments, explanations, prose, or trailing text.
The first character of your response must be { and the last character must be }.

The JSON must match this shape:
{
  "title": "short task board title",
  "description": "one concise project description",
  "views": ["board", "table", "calendar"],
  "columns": [
    {"name": "Backlog", "color": "propColorGray"},
    {"name": "In Progress", "color": "propColorBlue"},
    {"name": "Done", "color": "propColorGreen"}
  ],
  "tasks": [
    {"title": "Task title", "description": "Optional task detail", "column": "Backlog"}
  ]
}

Rules:
- Use only these view values: board, table, calendar, gallery.
- Always include board, table, and calendar views.
- Include 3 to 6 columns.
- Include 0 to 12 starter tasks.
- Every task column must match one returned column name.
- Use only these colors: propColorGray, propColorBrown, propColorOrange, propColorYellow, propColorGreen, propColorBlue, propColorPurple, propColorPink, propColorRed.
- Do not assume a fixed software workflow unless the command asks for one.
- Generate suggestions only. Do not claim anything has been created.

Command:
%s`, command)
}

func appendDefaultColumnGuidance(command string) string {
	command = strings.TrimSpace(command)
	if command == "" || commandHasColumnGuidance(command) {
		return command
	}
	return command + "\n\nAdditional board structure guidance:\n" + defaultTaskBoardColumnGuidance + "\n" + defaultTaskBoardViewGuidance
}

func commandHasColumnGuidance(command string) bool {
	command = strings.ToLower(command)
	keywords := []string{
		"column",
		"columns",
		"status",
		"statuses",
		"workflow",
		"kanban",
		"planning",
		"execution",
		"review",
		"done",
	}
	for _, keyword := range keywords {
		if strings.Contains(command, keyword) {
			return true
		}
	}
	return false
}

func repairTaskBoardPreviewPrompt(content string) string {
	return fmt.Sprintf(`Convert the following response into exactly one valid JSON object for a BoringBoard task board preview.

Return only JSON. Do not include markdown, code fences, comments, explanations, prose, or trailing text.
The first character of your response must be { and the last character must be }.

The JSON must match this shape:
{
  "title": "short task board title",
  "description": "one concise project description",
  "views": ["board", "table", "calendar"],
  "columns": [
    {"name": "Backlog", "color": "propColorGray"},
    {"name": "In Progress", "color": "propColorBlue"},
    {"name": "Done", "color": "propColorGreen"}
  ],
  "tasks": [
    {"title": "Task title", "description": "Optional task detail", "column": "Backlog"}
  ]
}

Rules:
- Use only these view values: board, table, calendar, gallery.
- Always include board, table, and calendar views.
- Include 3 to 6 columns.
- Include 0 to 12 starter tasks.
- Every task column must match one returned column name.
- Use only these colors: propColorGray, propColorBrown, propColorOrange, propColorYellow, propColorGreen, propColorBlue, propColorPurple, propColorPink, propColorRed.

Response to convert:
%s`, content)
}
