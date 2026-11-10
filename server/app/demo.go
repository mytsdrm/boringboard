package app

import (
	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/focalboard/server/services/auth"
	"github.com/mattermost/focalboard/server/utils"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const demoBoardTitle = "Demo Project"

type demoTask struct {
	title    string
	status   string
	priority string
}

var demoTasks = []demoTask{
	{"Write project brief", "Done", "High"},
	{"Set up the team board", "Done", "Medium"},
	{"Design the landing page", "In Progress", "High"},
	{"Collect feedback from beta users", "In Progress", "Medium"},
	{"Plan the launch announcement", "To Do", "Medium"},
	{"Fix login page typos", "To Do", "Low"},
}

// ensureDemoUser creates the demo account on first start and seeds it with a
// sample project board and tasks. It does nothing once the account exists, so
// changes the demo user makes are kept across restarts.
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

	_, err := a.store.GetUserByUsername(username)
	if err == nil {
		return nil
	}
	if !model.IsErrNotFound(err) {
		return err
	}

	user, err := a.store.CreateUser(&model.User{
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

	if err := a.seedDemoProject(user.ID); err != nil {
		return err
	}

	a.logger.Info("Created demo user with a sample project", mlog.String("username", username))
	return nil
}

func (a *App) seedDemoProject(userID string) error {
	now := utils.GetMillis()
	boardID := utils.NewID(utils.IDTypeBoard)

	statusID := utils.NewID(utils.IDTypeBlock)
	priorityID := utils.NewID(utils.IDTypeBlock)
	statusOptions := map[string]string{}
	priorityOptions := map[string]string{}

	makeOptions := func(ids map[string]string, values []string, colors []string) []interface{} {
		opts := make([]interface{}, 0, len(values))
		for i, v := range values {
			id := utils.NewID(utils.IDTypeBlock)
			ids[v] = id
			opts = append(opts, map[string]interface{}{"id": id, "value": v, "color": colors[i]})
		}
		return opts
	}

	board := &model.Board{
		ID:          boardID,
		TeamID:      model.GlobalTeamID,
		Type:        model.BoardTypePrivate,
		MinimumRole: model.BoardRoleNone,
		Title:       demoBoardTitle,
		Description: "A sample project to explore BoringBoard. Drag tasks between columns, open them, or add your own.",
		Icon:        "🚀",
		CreatedBy:   userID,
		ModifiedBy:  userID,
		CreateAt:    now,
		UpdateAt:    now,
		CardProperties: []map[string]interface{}{
			{
				"id":   statusID,
				"name": "Status",
				"type": "select",
				"options": makeOptions(statusOptions,
					[]string{"To Do", "In Progress", "Done"},
					[]string{"propColorGray", "propColorYellow", "propColorGreen"}),
			},
			{
				"id":   priorityID,
				"name": "Priority",
				"type": "select",
				"options": makeOptions(priorityOptions,
					[]string{"High", "Medium", "Low"},
					[]string{"propColorRed", "propColorOrange", "propColorBlue"}),
			},
		},
	}

	blocks := make([]*model.Block, 0, len(demoTasks)+1)
	cardOrder := make([]interface{}, 0, len(demoTasks))
	for _, task := range demoTasks {
		cardID := utils.NewID(utils.IDTypeCard)
		cardOrder = append(cardOrder, cardID)
		blocks = append(blocks, &model.Block{
			ID:         cardID,
			ParentID:   boardID,
			BoardID:    boardID,
			CreatedBy:  userID,
			ModifiedBy: userID,
			Schema:     1,
			Type:       model.TypeCard,
			Title:      task.title,
			Fields: map[string]interface{}{
				"icon":         "",
				"isTemplate":   false,
				"contentOrder": []interface{}{},
				"properties": map[string]interface{}{
					statusID:   statusOptions[task.status],
					priorityID: priorityOptions[task.priority],
				},
			},
			CreateAt: now,
			UpdateAt: now,
		})
	}

	view := &model.Block{
		ID:         utils.NewID(utils.IDTypeView),
		ParentID:   boardID,
		BoardID:    boardID,
		CreatedBy:  userID,
		ModifiedBy: userID,
		Schema:     1,
		Type:       model.TypeView,
		Title:      "Board view",
		Fields: map[string]interface{}{
			"viewType":           "board",
			"groupById":          statusID,
			"sortOptions":        []interface{}{},
			"visiblePropertyIds": []interface{}{priorityID},
			"visibleOptionIds":   []interface{}{},
			"hiddenOptionIds":    []interface{}{},
			"collapsedOptionIds": []interface{}{},
			"filter":             map[string]interface{}{"operation": "and", "filters": []interface{}{}},
			"cardOrder":          cardOrder,
			"columnWidths":       map[string]interface{}{},
			"columnCalculations": map[string]interface{}{},
			"kanbanCalculations": map[string]interface{}{},
			"defaultTemplateId":  "",
		},
		CreateAt: now,
		UpdateAt: now,
	}
	blocks = append([]*model.Block{view}, blocks...)

	bab, _, err := a.store.CreateBoardsAndBlocksWithAdmin(&model.BoardsAndBlocks{
		Boards: []*model.Board{board},
		Blocks: blocks,
	}, userID)
	if err != nil {
		return err
	}

	return a.addBoardsToDefaultCategory(userID, model.GlobalTeamID, bab.Boards)
}
