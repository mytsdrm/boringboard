package ai

import (
	"encoding/json"
	"fmt"
	"strings"
)

const defaultTaskBoardColumnGuidance = "Create a task board with planning, execution, review, and done columns."
const defaultTaskBoardViewGuidance = "Include only these selected views: board, calendar, table, gallery."
const defaultTaskBoardStatusGuidance = "Use exactly the selected Status groups."
const defaultTaskBoardPropertyGuidance = "Use these task board properties: Status as select, Due Date as date, Task Value as number, and User as person."

func createTaskBoardPrompt(command string, views []string, language string, statuses []TaskBoardColumnPreview) string {
	command = appendDefaultColumnGuidance(command)
	normalizedViews, _ := normalizeRequestedViews(views)
	normalizedStatuses, hasStatuses := normalizeColumns(statuses)
	if !hasStatuses {
		normalizedStatuses, _ = normalizeColumns([]TaskBoardColumnPreview{
			{Name: "Backlog", Color: "propColorGray"},
			{Name: "Assigned", Color: "propColorPurple"},
			{Name: "Execution", Color: "propColorBlue"},
			{Name: "Review", Color: "propColorOrange"},
			{Name: "Testing", Color: "propColorYellow"},
			{Name: "Done", Color: "propColorGreen"},
		})
	}
	viewList := strings.Join(normalizedViews, ", ")
	statusList := strings.Join(columnNames(normalizedStatuses), ", ")
	languageInstruction := taskBoardLanguageInstruction(language)
	return fmt.Sprintf(`You generate safe, practical task board previews for BoringBoard.

Return exactly one valid JSON object and nothing else.
Do not include markdown, code fences, comments, explanations, prose, or trailing text.
The first character of your response must be { and the last character must be }.

The JSON must match this shape:
{
  "title": "short task board title",
  "description": "one concise project description",
  "views": [%s],
  "columns": %s,
  "tasks": [
    {"title": "Task title", "description": "Optional task detail", "column": "Backlog"}
  ]
}

Rules:
- Use only these view values: board, table, calendar, gallery.
- Include exactly these selected views and no others: %s.
- %s
- Use exactly these selected Status groups in this order and no others: %s.
- Preserve the selected Status colors in the JSON columns.
- Use these task board properties: Status as select, Due Date as date, Task Value as number, and User as person.
- Include 3 to 12 columns.
- Include enough starter tasks to satisfy the user's requested scope; use up to 300 tasks when the command lists many platforms, categories, or repeated features.
- If the user gives a list of platforms/categories and a list of features/actions, create tasks for each valid combination instead of summarizing them.
- Every task column must match one returned column name.
- Make every task a real job task, not a vague label.
- Every task description must be detailed enough for a worker to start without asking follow-up questions.
- Task descriptions should include: objective, concrete implementation steps, expected output, validation or acceptance criteria, and important risks or constraints.
- When the command mentions platforms, integrations, devices, APIs, compliance, quality, reliability, or security, include platform-specific notes in the task descriptions.
- Keep descriptions concise but useful: 2 to 4 sentences per task, no bullet formatting, no markdown.
- Prefer action-oriented task titles using the format requested by the user, such as "Platform - Feature" or "Area - Action".
- Use only these colors: propColorGray, propColorBrown, propColorOrange, propColorYellow, propColorGreen, propColorBlue, propColorPurple, propColorPink, propColorRed.
- When tasks belong to a platform, product, tool, app, or domain entity, include that name at the start of the task title so BoringBoard can choose a meaningful icon. Example: "Facebook - Login", not just "Login".
- Prefer specific, recognizable nouns in task titles over generic labels.
- Do not assume a fixed software workflow unless the command asks for one.
- Generate suggestions only. Do not claim anything has been created.

Command:
%s`, quotedViewList(normalizedViews), quotedColumns(normalizedStatuses), viewList, languageInstruction, statusList, command)
}

func taskBoardLanguageInstruction(language string) string {
	switch strings.ToLower(strings.TrimSpace(language)) {
	case "indonesia", "indonesian", "id":
		return "Write the board title, description, task titles, and task descriptions in Indonesian."
	default:
		return "Write the board title, description, task titles, and task descriptions in English."
	}
}

func quotedViewList(views []string) string {
	quotedViews := make([]string, 0, len(views))
	for _, view := range views {
		quotedViews = append(quotedViews, fmt.Sprintf("%q", view))
	}
	return strings.Join(quotedViews, ", ")
}

func quotedColumns(columns []TaskBoardColumnPreview) string {
	data, err := json.Marshal(columns)
	if err != nil {
		return "[]"
	}
	return string(data)
}

func columnNames(columns []TaskBoardColumnPreview) []string {
	names := make([]string, 0, len(columns))
	for _, column := range columns {
		names = append(names, column.Name)
	}
	return names
}

func appendDefaultColumnGuidance(command string) string {
	command = strings.TrimSpace(command)
	if command == "" || commandHasColumnGuidance(command) {
		return command
	}
	return command + "\n\nAdditional board structure guidance:\n" + defaultTaskBoardColumnGuidance + "\n" + defaultTaskBoardViewGuidance + "\n" + defaultTaskBoardStatusGuidance + "\n" + defaultTaskBoardPropertyGuidance
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
    {"name": "Assigned", "color": "propColorPurple"},
    {"name": "Execution", "color": "propColorBlue"},
    {"name": "Review", "color": "propColorOrange"},
    {"name": "Testing", "color": "propColorYellow"},
    {"name": "Done", "color": "propColorGreen"}
  ],
  "tasks": [
    {"title": "Task title", "description": "Optional task detail", "column": "Backlog"}
  ]
}

Rules:
- Use only these view values: board, table, calendar, gallery.
- Always include board, table, and calendar views.
- Use exactly these Status groups in this order: Backlog, Assigned, Execution, Review, Testing, Done.
- Use these task board properties: Status as select, Due Date as date, Task Value as number, and User as person.
- Include 3 to 8 columns.
- Include enough starter tasks to satisfy the user's requested scope; use up to 300 tasks when the response lists many platforms, categories, or repeated features.
- If the source response contains a list of platforms/categories and a list of features/actions, create tasks for each valid combination instead of summarizing them.
- Every task column must match one returned column name.
- Make every task a real job task, not a vague label.
- Every task description must be detailed enough for a worker to start without asking follow-up questions.
- Task descriptions should include: objective, concrete implementation steps, expected output, validation or acceptance criteria, and important risks or constraints.
- When the response mentions platforms, integrations, devices, APIs, compliance, quality, reliability, or security, include platform-specific notes in the task descriptions.
- Keep descriptions concise but useful: 2 to 4 sentences per task, no bullet formatting, no markdown.
- Prefer action-oriented task titles using the format requested by the user, such as "Platform - Feature" or "Area - Action".
- Use only these colors: propColorGray, propColorBrown, propColorOrange, propColorYellow, propColorGreen, propColorBlue, propColorPurple, propColorPink, propColorRed.
- When tasks belong to a platform, product, tool, app, or domain entity, include that name at the start of the task title so BoringBoard can choose a meaningful icon. Example: "Facebook - Login", not just "Login".
- Prefer specific, recognizable nouns in task titles over generic labels.

Response to convert:
%s`, content)
}
