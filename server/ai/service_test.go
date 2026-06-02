package ai

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestParseTaskBoardPreviewCoercesNestedPreview(t *testing.T) {
	content := `{
		"task_board": {
			"name": "Android Farm",
			"summary": "Device lab operations board",
			"viewTypes": ["board", "table"],
			"statuses": [
				{"title": "Queue"},
				{"title": "Running"},
				{"title": "Done"}
			],
			"cards": [
				{"name": "Prepare test devices", "status": "Queue"},
				{"name": "Run nightly suite", "status": "Running"}
			]
		}
	}`

	preview, err := parseTaskBoardPreview(content)
	if err != nil {
		t.Fatalf("expected preview, got %v", err)
	}
	if preview.Title != "Android Farm" {
		t.Fatalf("expected coerced title, got %q", preview.Title)
	}
	if len(preview.Columns) != 3 {
		t.Fatalf("expected 3 columns, got %d", len(preview.Columns))
	}
	if len(preview.Tasks) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(preview.Tasks))
	}
}

func TestNormalizePreviewAlwaysIncludesDefaultViews(t *testing.T) {
	preview, err := normalizePreview(TaskBoardPreview{
		Title: "Android Farm",
		Views: []string{"gallery"},
		Columns: []TaskBoardColumnPreview{
			{Name: "Planning"},
			{Name: "Done"},
		},
	})
	if err != nil {
		t.Fatalf("expected preview, got %v", err)
	}

	expectedViews := []string{"board", "table", "calendar", "gallery"}
	if strings.Join(preview.Views, ",") != strings.Join(expectedViews, ",") {
		t.Fatalf("expected default views %v, got %v", expectedViews, preview.Views)
	}
}

func TestOpenAICompatibleMessageContentSupportsParts(t *testing.T) {
	raw, err := json.Marshal([]map[string]string{
		{"type": "text", "text": `{"title":"Android Farm"`},
		{"type": "text", "text": `,"columns":["Backlog","Done"]}`},
	})
	if err != nil {
		t.Fatal(err)
	}

	content, err := openAICompatibleMessageContent(raw)
	if err != nil {
		t.Fatalf("expected content, got %v", err)
	}
	if content != `{"title":"Android Farm","columns":["Backlog","Done"]}` {
		t.Fatalf("unexpected content %q", content)
	}
}

func TestOpenAICompatibleProviderReadsClineDataWrappedChoices(t *testing.T) {
	body := []byte(`{
		"data": {
			"choices": [
				{
					"message": {
						"content": "{\"title\":\"Android Farm\",\"columns\":[\"Backlog\",\"Done\"]}"
					}
				}
			]
		}
	}`)

	content, err := openAICompatibleResponseContent(body)
	if err != nil {
		t.Fatalf("expected content, got %v", err)
	}
	if content != `{"title":"Android Farm","columns":["Backlog","Done"]}` {
		t.Fatalf("unexpected content %q", content)
	}
}

func TestAppendDefaultColumnGuidanceForUnclearCommand(t *testing.T) {
	command := appendDefaultColumnGuidance("Android device farm")
	if !strings.Contains(command, defaultTaskBoardColumnGuidance) {
		t.Fatalf("expected default guidance, got %q", command)
	}
}

func TestAppendDefaultColumnGuidanceKeepsExplicitColumns(t *testing.T) {
	command := appendDefaultColumnGuidance("Android device farm with Backlog, QA, and Done columns")
	if strings.Contains(command, "Additional board structure guidance") {
		t.Fatalf("did not expect default guidance, got %q", command)
	}
}
