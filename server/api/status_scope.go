package api

import (
	"fmt"

	"github.com/mattermost/focalboard/server/model"
)

const noStatusScopeOptionID = "__no_status__"

func (a *API) requireBlockStatusScope(userID string, boardID string, currentBlock *model.Block, targetBlock *model.Block) error {
	currentBlock, err := a.statusScopeCardBlock(currentBlock)
	if err != nil {
		return err
	}
	targetBlock, err = a.statusScopeCardBlock(targetBlock)
	if err != nil {
		return err
	}

	member, err := a.app.GetMemberForBoard(boardID, userID)
	if err != nil {
		return err
	}
	if !member.StatusScopeEnabled || member.SchemeAdmin || member.Synthetic {
		return nil
	}

	board, err := a.app.GetBoard(boardID)
	if err != nil {
		return err
	}
	statusPropertyID := boardStatusPropertyID(board)
	if statusPropertyID == "" {
		return nil
	}

	allowed := map[string]bool{}
	for _, optionID := range member.StatusScopeOptionIDs {
		allowed[optionID] = true
	}
	if len(allowed) == 0 {
		return model.NewErrPermission("access denied to card status scope")
	}

	if currentBlock != nil && currentBlock.Type == model.TypeCard {
		if !allowed[blockStatusOptionID(currentBlock, statusPropertyID)] {
			return model.NewErrPermission("access denied to card status scope")
		}
	}
	if targetBlock != nil && targetBlock.Type == model.TypeCard {
		if !allowed[blockStatusOptionID(targetBlock, statusPropertyID)] {
			return model.NewErrPermission("access denied to card status scope")
		}
	}
	return nil
}

func (a *API) statusScopeCardBlock(block *model.Block) (*model.Block, error) {
	if block == nil {
		return nil, nil
	}
	if block.Type == model.TypeCard {
		return block, nil
	}
	if !isStatusScopedChildBlock(block) {
		return nil, nil
	}
	if block.ParentID == "" {
		return nil, nil
	}
	parentBlock, err := a.app.GetBlockByID(block.ParentID)
	if err != nil {
		return nil, err
	}
	if parentBlock.Type != model.TypeCard {
		return nil, nil
	}
	return parentBlock, nil
}

func isStatusScopedChildBlock(block *model.Block) bool {
	if block == nil {
		return false
	}
	switch block.Type {
	case model.TypeText,
		model.TypeCheckbox,
		model.TypeComment,
		model.TypeImage,
		model.TypeAttachment,
		model.TypeDivider,
		"h1",
		"h2",
		"h3",
		"list-item",
		"quote",
		"video":
		return true
	default:
		return false
	}
}

func (a *API) requireCardStatusScope(userID string, boardID string, currentCard *model.Card, targetCard *model.Card) error {
	var currentBlock *model.Block
	var targetBlock *model.Block
	if currentCard != nil {
		currentBlock = model.Card2Block(currentCard)
	}
	if targetCard != nil {
		targetBlock = model.Card2Block(targetCard)
	}
	return a.requireBlockStatusScope(userID, boardID, currentBlock, targetBlock)
}

func boardStatusPropertyID(board *model.Board) string {
	for _, property := range board.CardProperties {
		propertyType, _ := property["type"].(string)
		if propertyType != "select" {
			continue
		}
		propertyID, _ := property["id"].(string)
		return propertyID
	}
	return ""
}

func blockStatusOptionID(block *model.Block, statusPropertyID string) string {
	properties := blockProperties(block)
	value, ok := properties[statusPropertyID]
	if !ok {
		return noStatusScopeOptionID
	}
	switch typedValue := value.(type) {
	case string:
		if typedValue != "" {
			return typedValue
		}
	case []string:
		if len(typedValue) > 0 && typedValue[0] != "" {
			return typedValue[0]
		}
	case []interface{}:
		if len(typedValue) > 0 {
			if optionID, ok := typedValue[0].(string); ok && optionID != "" {
				return optionID
			}
		}
	default:
		optionID := fmt.Sprint(typedValue)
		if optionID != "" && optionID != "<nil>" {
			return optionID
		}
	}
	return noStatusScopeOptionID
}

func blockProperties(block *model.Block) map[string]interface{} {
	if block == nil || block.Fields == nil {
		return map[string]interface{}{}
	}
	properties, ok := block.Fields["properties"].(map[string]interface{})
	if ok {
		return properties
	}
	return map[string]interface{}{}
}

func patchedBlock(block *model.Block, patch *model.BlockPatch) *model.Block {
	nextBlock := *block
	nextFields := map[string]interface{}{}
	for key, value := range block.Fields {
		if key == "properties" {
			if properties, ok := value.(map[string]interface{}); ok {
				nextProperties := map[string]interface{}{}
				for propertyID, propertyValue := range properties {
					nextProperties[propertyID] = propertyValue
				}
				nextFields[key] = nextProperties
				continue
			}
		}
		nextFields[key] = value
	}
	nextBlock.Fields = nextFields
	if patch != nil {
		patch.Patch(&nextBlock)
	}
	return &nextBlock
}
