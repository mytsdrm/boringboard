package app

import (
	"encoding/json"
	"time"

	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/focalboard/server/services/auth"
	"github.com/mattermost/focalboard/server/utils"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const (
	demoBoardTitle = "Demo Project"

	// demoSeedVersionKey marks boards created by the demo seed. Bump
	// demoSeedVersion when the sample data changes: on the next start the
	// older seeded board is replaced with the new one.
	demoSeedVersionKey = "demoSeedVersion"
	demoSeedVersion    = 2
)

// ensureDemoUser creates the demo account on first start and seeds it with a
// sample project board that shows every property type, view type and card
// content type. Once seeded, the board is left alone across restarts unless
// demoSeedVersion is bumped.
func (a *App) ensureDemoUser() error {
	if a.config.AuthMode != "native" || !a.config.DemoUserEnabled {
		return nil
	}

	username := a.config.DemoUserUsername
	if username == "" {
		username = model.DefaultDemoUsername
	}
	password := a.config.DemoUserPassword
	if password == "" {
		password = model.DefaultDemoPassword
	}

	user, err := a.store.GetUserByUsername(username)
	if err != nil {
		if !model.IsErrNotFound(err) {
			return err
		}
		user, err = a.store.CreateUser(&model.User{
			ID:          utils.NewID(utils.IDTypeUser),
			Username:    username,
			Nickname:    "Demo User",
			Password:    auth.HashPassword(password),
			AuthService: a.config.AuthMode,
			Roles:       model.RoleSystemUser + " " + model.GroupPublicUser,
		})
		if err != nil {
			return err
		}
		a.logger.Info("Created demo user", mlog.String("username", username))
	}

	upToDate, err := a.removeOutdatedDemoBoards(user.ID)
	if err != nil || upToDate {
		return err
	}

	if err := a.seedDemoProject(user.ID); err != nil {
		return err
	}
	a.logger.Info("Seeded demo project", mlog.String("username", username), mlog.Int("version", demoSeedVersion))
	return nil
}

// removeOutdatedDemoBoards deletes demo boards seeded by an older version of
// the sample data. It reports whether a current demo board already exists.
func (a *App) removeOutdatedDemoBoards(userID string) (bool, error) {
	boards, err := a.store.GetBoardsForUserAndTeam(userID, model.GlobalTeamID, false)
	if err != nil {
		return false, err
	}

	upToDate := false
	for _, b := range boards {
		if b.CreatedBy != userID || b.Title != demoBoardTitle {
			continue
		}
		if demoBoardVersion(b) >= demoSeedVersion {
			upToDate = true
			continue
		}
		if err := a.store.DeleteBoard(b.ID, userID); err != nil {
			return false, err
		}
	}
	return upToDate, nil
}

func demoBoardVersion(b *model.Board) int {
	switch v := b.Properties[demoSeedVersionKey].(type) {
	case float64:
		return int(v)
	case int:
		return v
	case int64:
		return int(v)
	}
	// Boards from the first seed have no marker.
	return 1
}

type demoProp struct {
	id      string
	options map[string]string
}

type demoComment struct {
	text string
}

type demoContent struct {
	kind  model.BlockType
	title string
	value bool
}

type demoTask struct {
	icon     string
	title    string
	status   string
	priority string
	labels   []string
	estimate string
	startIn  int // days from today; due dates are a range from startIn to endIn
	endIn    int
	done     bool
	notes    string
	link     string
	email    string
	phone    string
	content  []demoContent
	comments []demoComment
}

var demoTasks = []demoTask{
	{
		icon: "📝", title: "Write project brief", status: "Done", priority: "High",
		labels: []string{"Planning"}, estimate: "3", startIn: -10, endIn: -8, done: true,
		notes: "Approved by the steering group.", link: "https://example.com/brief",
		email: "pm@example.com", phone: "+62 21 555 0101",
		content: []demoContent{
			{kind: model.TypeText, title: "## Goal\nShip the first public version of the product in **four weeks**.\n\n- Who it is for\n- What problem it solves\n- How we measure success"},
			{kind: model.TypeDivider},
			{kind: model.TypeCheckbox, title: "Draft the brief", value: true},
			{kind: model.TypeCheckbox, title: "Review with stakeholders", value: true},
			{kind: model.TypeCheckbox, title: "Publish to the team", value: true},
		},
		comments: []demoComment{{"Looks great, approved!"}},
	},
	{
		icon: "🧭", title: "Set up the team board", status: "Done", priority: "Medium",
		labels: []string{"Planning"}, estimate: "1", startIn: -8, endIn: -7, done: true,
		notes: "Columns follow our workflow.",
	},
	{
		icon: "🎨", title: "Design the landing page", status: "In Progress", priority: "High",
		labels: []string{"Design", "Frontend"}, estimate: "5", startIn: -3, endIn: 2,
		notes: "Hero, features, pricing, footer.", link: "https://example.com/figma",
		email: "design@example.com",
		content: []demoContent{
			{kind: model.TypeText, title: "### Sections\n1. Hero with a clear call to action\n2. Feature grid\n3. Pricing table\n4. Footer\n\n> Keep it light and fast to load."},
			{kind: model.TypeCheckbox, title: "Wireframes", value: true},
			{kind: model.TypeCheckbox, title: "High-fidelity mockups", value: false},
			{kind: model.TypeCheckbox, title: "Hand off to frontend", value: false},
		},
		comments: []demoComment{{"Can we try a darker hero background?"}, {"Sure, I'll add a variant tomorrow."}},
	},
	{
		icon: "🔐", title: "Build sign-up and login API", status: "In Progress", priority: "Urgent",
		labels: []string{"Backend"}, estimate: "8", startIn: -2, endIn: 4,
		notes: "Use bcrypt and session tokens.", link: "https://example.com/api-spec",
		content: []demoContent{
			{kind: model.TypeText, title: "Endpoints:\n\n```\nPOST /api/signup\nPOST /api/login\nPOST /api/logout\n```"},
			{kind: model.TypeCheckbox, title: "Sign-up endpoint", value: true},
			{kind: model.TypeCheckbox, title: "Login endpoint", value: false},
			{kind: model.TypeCheckbox, title: "Rate limiting", value: false},
		},
	},
	{
		icon: "💬", title: "Collect feedback from beta users", status: "In Review", priority: "Medium",
		labels: []string{"Research"}, estimate: "2", startIn: 1, endIn: 3,
		notes: "Survey sent to 40 testers.", email: "beta@example.com", phone: "+62 812 5550 1234",
		comments: []demoComment{{"18 responses so far."}},
	},
	{
		icon: "🐞", title: "Fix login page typos", status: "To Do", priority: "Low",
		labels: []string{"Bug", "Frontend"}, estimate: "1", startIn: 3, endIn: 3,
		notes: "Reported by a beta user.",
	},
	{
		icon: "📣", title: "Plan the launch announcement", status: "To Do", priority: "Medium",
		labels: []string{"Marketing"}, estimate: "3", startIn: 6, endIn: 8,
		notes: "Blog post, newsletter, social.", link: "https://example.com/launch",
	},
	{
		icon: "🚀", title: "Launch v1.0", status: "Backlog", priority: "High",
		labels: []string{"Release"}, estimate: "2", startIn: 14, endIn: 14,
		notes: "Release day checklist below.",
		content: []demoContent{
			{kind: model.TypeCheckbox, title: "Tag the release", value: false},
			{kind: model.TypeCheckbox, title: "Deploy to production", value: false},
			{kind: model.TypeCheckbox, title: "Send the announcement", value: false},
		},
	},
}

type demoSeeder struct {
	userID  string
	boardID string
	now     int64
	blocks  []*model.Block
}

func (s *demoSeeder) block(id, parentID string, kind model.BlockType, title string, fields map[string]interface{}) *model.Block {
	if fields == nil {
		fields = map[string]interface{}{}
	}
	b := &model.Block{
		ID:         id,
		ParentID:   parentID,
		BoardID:    s.boardID,
		CreatedBy:  s.userID,
		ModifiedBy: s.userID,
		Schema:     1,
		Type:       kind,
		Title:      title,
		Fields:     fields,
		CreateAt:   s.now,
		UpdateAt:   s.now,
	}
	s.blocks = append(s.blocks, b)
	return b
}

func selectProp(name, kind string, values, colors []string) (demoProp, map[string]interface{}) {
	p := demoProp{id: utils.NewID(utils.IDTypeBlock), options: map[string]string{}}
	opts := make([]interface{}, 0, len(values))
	for i, v := range values {
		id := utils.NewID(utils.IDTypeBlock)
		p.options[v] = id
		opts = append(opts, map[string]interface{}{"id": id, "value": v, "color": colors[i]})
	}
	return p, map[string]interface{}{"id": p.id, "name": name, "type": kind, "options": opts}
}

func plainProp(name, kind string) (string, map[string]interface{}) {
	id := utils.NewID(utils.IDTypeBlock)
	return id, map[string]interface{}{"id": id, "name": name, "type": kind, "options": []interface{}{}}
}

func demoDate(fromDays, toDays int) string {
	day := func(offset int) int64 {
		t := time.Now().UTC().AddDate(0, 0, offset)
		return time.Date(t.Year(), t.Month(), t.Day(), 12, 0, 0, 0, time.UTC).UnixMilli()
	}
	v := map[string]int64{"from": day(fromDays)}
	if toDays != fromDays {
		v["to"] = day(toDays)
	}
	b, _ := json.Marshal(v)
	return string(b)
}

func (a *App) seedDemoProject(userID string) error {
	s := &demoSeeder{userID: userID, boardID: utils.NewID(utils.IDTypeBoard), now: utils.GetMillis()}

	status, statusDef := selectProp("Status", "select",
		[]string{"Backlog", "To Do", "In Progress", "In Review", "Done"},
		[]string{"propColorDefault", "propColorGray", "propColorYellow", "propColorPurple", "propColorGreen"})
	priority, priorityDef := selectProp("Priority", "select",
		[]string{"Urgent", "High", "Medium", "Low"},
		[]string{"propColorRed", "propColorOrange", "propColorBlue", "propColorBrown"})
	labels, labelsDef := selectProp("Labels", "multiSelect",
		[]string{"Planning", "Design", "Frontend", "Backend", "Research", "Marketing", "Bug", "Release"},
		[]string{"propColorPink", "propColorPurple", "propColorBlue", "propColorGreen", "propColorYellow", "propColorOrange", "propColorRed", "propColorGray"})
	assigneeID, assigneeDef := plainProp("Assignee", "person")
	reviewersID, reviewersDef := plainProp("Reviewers", "multiPerson")
	dueID, dueDef := plainProp("Due date", "date")
	estimateID, estimateDef := plainProp("Estimate (days)", "number")
	doneID, doneDef := plainProp("Done", "checkbox")
	notesID, notesDef := plainProp("Notes", "text")
	linkID, linkDef := plainProp("Link", "url")
	emailID, emailDef := plainProp("Contact email", "email")
	phoneID, phoneDef := plainProp("Contact phone", "phone")
	createdTimeID, createdTimeDef := plainProp("Created", "createdTime")
	createdByID, createdByDef := plainProp("Created by", "createdBy")
	updatedTimeID, updatedTimeDef := plainProp("Last updated", "updatedTime")
	updatedByID, updatedByDef := plainProp("Updated by", "updatedBy")

	board := &model.Board{
		ID:              s.boardID,
		TeamID:          model.GlobalTeamID,
		Type:            model.BoardTypePrivate,
		MinimumRole:     model.BoardRoleNone,
		Title:           demoBoardTitle,
		Description:     "A sample project to explore BoringBoard. Switch between the Board, Table, Gallery and Calendar views, open a task to see its checklist and comments, or add your own.",
		ShowDescription: true,
		Icon:            "🚀",
		CreatedBy:       userID,
		ModifiedBy:      userID,
		CreateAt:        s.now,
		UpdateAt:        s.now,
		Properties: map[string]interface{}{
			demoSeedVersionKey: demoSeedVersion,
			"boardIntegration": map[string]interface{}{
				"repoUrl":        "https://github.com/example/demo-project",
				"devBranch":      "dev",
				"prodBranch":     "main",
				"developmentUrl": "https://dev.example.com",
				"productionUrl":  "https://example.com",
			},
		},
		CardProperties: []map[string]interface{}{
			statusDef, priorityDef, labelsDef, assigneeDef, reviewersDef, dueDef, estimateDef, doneDef,
			notesDef, linkDef, emailDef, phoneDef, createdTimeDef, createdByDef, updatedTimeDef, updatedByDef,
		},
	}

	cardIDs := make([]interface{}, 0, len(demoTasks))
	for _, task := range demoTasks {
		cardID := utils.NewID(utils.IDTypeCard)
		cardIDs = append(cardIDs, cardID)

		props := map[string]interface{}{
			status.id:   status.options[task.status],
			priority.id: priority.options[task.priority],
			assigneeID:  userID,
			reviewersID: []interface{}{userID},
			dueID:       demoDate(task.startIn, task.endIn),
			estimateID:  task.estimate,
			notesID:     task.notes,
		}
		labelIDs := make([]interface{}, 0, len(task.labels))
		for _, l := range task.labels {
			labelIDs = append(labelIDs, labels.options[l])
		}
		props[labels.id] = labelIDs
		if task.done {
			props[doneID] = "true"
		}
		if task.link != "" {
			props[linkID] = task.link
		}
		if task.email != "" {
			props[emailID] = task.email
		}
		if task.phone != "" {
			props[phoneID] = task.phone
		}
		contentOrder := make([]interface{}, 0, len(task.content))
		card := s.block(cardID, s.boardID, model.TypeCard, task.title, map[string]interface{}{
			"icon":       task.icon,
			"isTemplate": false,
			"properties": props,
		})
		for _, c := range task.content {
			fields := map[string]interface{}{}
			if c.kind == model.TypeCheckbox {
				fields["value"] = c.value
			}
			b := s.block(utils.NewID(utils.IDTypeBlock), cardID, c.kind, c.title, fields)
			contentOrder = append(contentOrder, b.ID)
		}
		card.Fields["contentOrder"] = contentOrder

		for _, cm := range task.comments {
			s.block(utils.NewID(utils.IDTypeBlock), cardID, model.TypeComment, cm.text, nil)
		}
	}

	// A card template, used by the board view's "New" button.
	templateID := utils.NewID(utils.IDTypeCard)
	templateText := s.block(utils.NewID(utils.IDTypeBlock), templateID, model.TypeText,
		"### Steps to reproduce\n1. \n\n### Expected\n\n### Actual\n", nil)
	templateCheck := s.block(utils.NewID(utils.IDTypeBlock), templateID, model.TypeCheckbox, "Add a test that covers the fix", map[string]interface{}{"value": false})
	s.block(templateID, s.boardID, model.TypeCard, "Bug report", map[string]interface{}{
		"icon":         "🐞",
		"isTemplate":   true,
		"contentOrder": []interface{}{templateText.ID, templateCheck.ID},
		"properties": map[string]interface{}{
			status.id:   status.options["To Do"],
			priority.id: priority.options["Medium"],
			labels.id:   []interface{}{labels.options["Bug"]},
		},
	})

	emptyFilter := map[string]interface{}{"operation": "and", "filters": []interface{}{}}
	viewFields := func(viewType string, extra map[string]interface{}) map[string]interface{} {
		f := map[string]interface{}{
			"viewType":           viewType,
			"sortOptions":        []interface{}{},
			"visiblePropertyIds": []interface{}{},
			"visibleOptionIds":   []interface{}{},
			"hiddenOptionIds":    []interface{}{},
			"collapsedOptionIds": []interface{}{},
			"filter":             emptyFilter,
			"cardOrder":          cardIDs,
			"columnWidths":       map[string]interface{}{},
			"columnCalculations": map[string]interface{}{},
			"kanbanCalculations": map[string]interface{}{},
			"defaultTemplateId":  "",
		}
		for k, v := range extra {
			f[k] = v
		}
		return f
	}

	// Each Board column header shows the total estimate of its tasks.
	kanbanSums := map[string]interface{}{}
	for _, optionID := range status.options {
		kanbanSums[optionID] = map[string]interface{}{"calculation": "sum", "propertyId": estimateID}
	}

	s.block(utils.NewID(utils.IDTypeView), s.boardID, model.TypeView, "Board", viewFields("board", map[string]interface{}{
		"groupById":          status.id,
		"visiblePropertyIds": []interface{}{priority.id, labels.id, assigneeID, dueID},
		"kanbanCalculations": kanbanSums,
		"defaultTemplateId":  templateID,
	}))
	s.block(utils.NewID(utils.IDTypeView), s.boardID, model.TypeView, "All tasks", viewFields("table", map[string]interface{}{
		"visiblePropertyIds": []interface{}{
			status.id, priority.id, labels.id, assigneeID, reviewersID, dueID, estimateID, doneID,
			notesID, linkID, emailID, phoneID, createdTimeID, createdByID, updatedTimeID, updatedByID,
		},
		"sortOptions":        []interface{}{map[string]interface{}{"propertyId": priority.id, "reversed": false}},
		"columnWidths":       map[string]interface{}{"__title": 280, notesID: 240},
		"columnCalculations": map[string]interface{}{"__title": "count", estimateID: "sum", doneID: "percentChecked"},
	}))
	s.block(utils.NewID(utils.IDTypeView), s.boardID, model.TypeView, "Gallery", viewFields("gallery", map[string]interface{}{
		"visiblePropertyIds": []interface{}{status.id, priority.id, labels.id},
	}))
	s.block(utils.NewID(utils.IDTypeView), s.boardID, model.TypeView, "Calendar", viewFields("calendar", map[string]interface{}{
		"dateDisplayPropertyId": dueID,
		"visiblePropertyIds":    []interface{}{status.id},
	}))
	s.block(utils.NewID(utils.IDTypeView), s.boardID, model.TypeView, "Urgent and high", viewFields("table", map[string]interface{}{
		"visiblePropertyIds": []interface{}{status.id, priority.id, assigneeID, dueID},
		"filter": map[string]interface{}{
			"operation": "and",
			"filters": []interface{}{map[string]interface{}{
				"propertyId": priority.id,
				"condition":  "includes",
				"values":     []interface{}{priority.options["Urgent"], priority.options["High"]},
			}},
		},
	}))

	bab, _, err := a.store.CreateBoardsAndBlocksWithAdmin(&model.BoardsAndBlocks{
		Boards: []*model.Board{board},
		Blocks: s.blocks,
	}, userID)
	if err != nil {
		return err
	}

	return a.addBoardsToDefaultCategory(userID, model.GlobalTeamID, bab.Boards)
}
