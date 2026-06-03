package sqlstore

import (
	"database/sql"
	"errors"
	"fmt"

	mmModel "github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store"

	sq "github.com/Masterminds/squirrel"

	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/focalboard/server/utils"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

var (
	errUnsupportedOperation = errors.New("unsupported operation")
)

type UserNotFoundError struct {
	id string
}

func (unf UserNotFoundError) Error() string {
	return fmt.Sprintf("user not found (%s)", unf.id)
}

func (s *SQLStore) getRegisteredUserCount(db sq.BaseRunner) (int, error) {
	query := s.getQueryBuilder(db).
		Select("count(*)").
		From(s.tablePrefix + "users").
		Where(sq.Eq{"delete_at": 0})
	row := query.QueryRow()

	var count int
	err := row.Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (s *SQLStore) getUserByCondition(db sq.BaseRunner, condition sq.Eq) (*model.User, error) {
	users, err := s.getUsersByCondition(db, condition, 0)
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return nil, model.NewErrNotFound("user")
	}

	return users[0], nil
}

func (s *SQLStore) getUsersByCondition(db sq.BaseRunner, condition interface{}, limit uint64) ([]*model.User, error) {
	query := s.getQueryBuilder(db).
		Select(
			"id",
			"username",
			"email",
			"nickname",
			"phone_number",
			"phone_whatsapp_enabled",
			"phone_telegram_enabled",
			"password",
			"mfa_secret",
			"auth_service",
			"auth_data",
			"roles",
			"create_at",
			"update_at",
			"delete_at",
		).
		From(s.tablePrefix + "users").
		Where(sq.Eq{"delete_at": 0}).
		Where(condition)

	if limit != 0 {
		query = query.Limit(limit)
	}

	rows, err := query.Query()
	if err != nil {
		s.logger.Error(`getUsersByCondition ERROR`, mlog.Err(err))
		return nil, err
	}
	defer s.CloseRows(rows)

	users, err := s.usersFromRows(rows)
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return nil, model.NewErrNotFound("user")
	}

	return users, nil
}

func (s *SQLStore) getUserByID(db sq.BaseRunner, userID string) (*model.User, error) {
	return s.getUserByCondition(db, sq.Eq{"id": userID})
}

func (s *SQLStore) getUsersList(db sq.BaseRunner, userIDs []string, _, _ bool) ([]*model.User, error) {
	users, err := s.getUsersByCondition(db, sq.Eq{"id": userIDs}, 0)
	if err != nil {
		return nil, err
	}

	if len(users) != len(userIDs) {
		return users, model.NewErrNotAllFound("user", userIDs)
	}

	return users, nil
}

func (s *SQLStore) getUserByEmail(db sq.BaseRunner, email string) (*model.User, error) {
	return s.getUserByCondition(db, sq.Eq{"email": email})
}

func (s *SQLStore) getUserByUsername(db sq.BaseRunner, username string) (*model.User, error) {
	return s.getUserByCondition(db, sq.Eq{"username": username})
}

func (s *SQLStore) createUser(db sq.BaseRunner, user *model.User) (*model.User, error) {
	now := utils.GetMillis()
	user.CreateAt = now
	user.UpdateAt = now
	user.DeleteAt = 0

	query := s.getQueryBuilder(db).Insert(s.tablePrefix+"users").
		Columns("id", "username", "email", "nickname", "phone_number", "phone_whatsapp_enabled", "phone_telegram_enabled", "password", "mfa_secret", "auth_service", "auth_data", "roles", "create_at", "update_at", "delete_at").
		Values(user.ID, user.Username, user.Email, user.Nickname, user.PhoneNumber, user.PhoneWhatsAppEnabled, user.PhoneTelegramEnabled, user.Password, user.MfaSecret, user.AuthService, user.AuthData, user.Roles, user.CreateAt, user.UpdateAt, user.DeleteAt)

	_, err := query.Exec()
	return user, err
}

func (s *SQLStore) updateUser(db sq.BaseRunner, user *model.User) (*model.User, error) {
	now := utils.GetMillis()
	user.UpdateAt = now

	query := s.getQueryBuilder(db).Update(s.tablePrefix+"users").
		Set("username", user.Username).
		Set("email", user.Email).
		Set("nickname", user.Nickname).
		Set("phone_number", user.PhoneNumber).
		Set("phone_whatsapp_enabled", user.PhoneWhatsAppEnabled).
		Set("phone_telegram_enabled", user.PhoneTelegramEnabled).
		Set("roles", user.Roles).
		Set("update_at", user.UpdateAt).
		Where(sq.Eq{"id": user.ID})

	result, err := query.Exec()
	if err != nil {
		return nil, err
	}

	rowCount, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}

	if rowCount < 1 {
		return nil, UserNotFoundError{user.ID}
	}

	return user, nil
}

func (s *SQLStore) deleteUser(db sq.BaseRunner, userID string) error {
	if _, err := s.getUserByID(db, userID); err != nil {
		return err
	}

	ownedBoardIDs, err := s.getUserOwnedBoardIDs(db, userID)
	if err != nil {
		return err
	}
	relatedBlockIDs, err := s.getUserRelatedBlockIDs(db, userID, ownedBoardIDs)
	if err != nil {
		return err
	}

	if len(relatedBlockIDs) > 0 {
		if _, err := s.getQueryBuilder(db).
			Delete(s.tablePrefix + "subscriptions").
			Where(sq.Eq{"block_id": relatedBlockIDs}).
			Exec(); err != nil {
			return err
		}
		if _, err := s.getQueryBuilder(db).
			Delete(s.tablePrefix + "notification_hints").
			Where(sq.Eq{"block_id": relatedBlockIDs}).
			Exec(); err != nil {
			return err
		}
		if _, err := s.getQueryBuilder(db).
			Delete(s.tablePrefix + "blocks_history").
			Where(sq.Eq{"id": relatedBlockIDs}).
			Exec(); err != nil {
			return err
		}
		if _, err := s.getQueryBuilder(db).
			Delete(s.tablePrefix + "blocks").
			Where(sq.Eq{"id": relatedBlockIDs}).
			Exec(); err != nil {
			return err
		}
	}

	if len(ownedBoardIDs) > 0 {
		if _, err := s.getQueryBuilder(db).
			Delete(s.tablePrefix + "sharing").
			Where(sq.Eq{"id": ownedBoardIDs}).
			Exec(); err != nil {
			return err
		}
		if _, err := s.getQueryBuilder(db).
			Delete(s.tablePrefix + "category_boards").
			Where(sq.Eq{"board_id": ownedBoardIDs}).
			Exec(); err != nil {
			return err
		}
		if _, err := s.getQueryBuilder(db).
			Delete(s.tablePrefix + "board_members_history").
			Where(sq.Eq{"board_id": ownedBoardIDs}).
			Exec(); err != nil {
			return err
		}
		if _, err := s.getQueryBuilder(db).
			Delete(s.tablePrefix + "board_members").
			Where(sq.Eq{"board_id": ownedBoardIDs}).
			Exec(); err != nil {
			return err
		}
		if _, err := s.getQueryBuilder(db).
			Delete(s.tablePrefix + "boards_history").
			Where(sq.Eq{"id": ownedBoardIDs}).
			Exec(); err != nil {
			return err
		}
		if _, err := s.getQueryBuilder(db).
			Delete(s.tablePrefix + "boards").
			Where(sq.Eq{"id": ownedBoardIDs}).
			Exec(); err != nil {
			return err
		}
	}

	deleteQueries := []sq.DeleteBuilder{
		s.getQueryBuilder(db).Delete(s.tablePrefix + "sessions").Where(sq.Eq{"user_id": userID}),
		s.getQueryBuilder(db).Delete(s.tablePrefix + "preferences").Where(sq.Eq{"userid": userID}),
		s.getQueryBuilder(db).Delete(s.tablePrefix + "subscriptions").Where(sq.Eq{"subscriber_id": userID}),
		s.getQueryBuilder(db).Delete(s.tablePrefix + "notification_hints").Where(sq.Eq{"modified_by_id": userID}),
		s.getQueryBuilder(db).Delete(s.tablePrefix + "category_boards").Where(sq.Eq{"user_id": userID}),
		s.getQueryBuilder(db).Delete(s.tablePrefix + "categories").Where(sq.Eq{"user_id": userID}),
		s.getQueryBuilder(db).Delete(s.tablePrefix + "board_members_history").Where(sq.Eq{"user_id": userID}),
		s.getQueryBuilder(db).Delete(s.tablePrefix + "board_members").Where(sq.Eq{"user_id": userID}),
		s.getQueryBuilder(db).Delete(s.tablePrefix + "users").Where(sq.Eq{"id": userID}),
	}
	for _, query := range deleteQueries {
		if _, err := query.Exec(); err != nil {
			return err
		}
	}

	return nil
}

func (s *SQLStore) getUserOwnedBoardIDs(db sq.BaseRunner, userID string) ([]string, error) {
	query := s.getQueryBuilder(db).
		Select("id").
		From(s.tablePrefix + "boards").
		Where(sq.Eq{"created_by": userID})

	rows, err := query.Query()
	if err != nil {
		return nil, err
	}
	defer s.CloseRows(rows)

	boardIDs := []string{}
	for rows.Next() {
		var boardID string
		if err := rows.Scan(&boardID); err != nil {
			return nil, err
		}
		boardIDs = append(boardIDs, boardID)
	}
	return boardIDs, nil
}

func (s *SQLStore) getUserRelatedBlockIDs(db sq.BaseRunner, userID string, boardIDs []string) ([]string, error) {
	conditions := sq.Or{
		sq.Eq{"created_by": userID},
		sq.Eq{"modified_by": userID},
	}
	if len(boardIDs) > 0 {
		conditions = append(conditions, sq.Eq{"board_id": boardIDs})
	}

	query := s.getQueryBuilder(db).
		Select("id").
		From(s.tablePrefix + "blocks").
		Where(conditions)

	rows, err := query.Query()
	if err != nil {
		return nil, err
	}
	defer s.CloseRows(rows)

	blockIDsByID := map[string]bool{}
	for rows.Next() {
		var blockID string
		if err := rows.Scan(&blockID); err != nil {
			return nil, err
		}
		blockIDsByID[blockID] = true
	}

	blockIDs := make([]string, 0, len(blockIDsByID))
	for blockID := range blockIDsByID {
		blockIDs = append(blockIDs, blockID)
	}
	return blockIDs, nil
}

func (s *SQLStore) updateUserPassword(db sq.BaseRunner, username, password string) error {
	now := utils.GetMillis()

	query := s.getQueryBuilder(db).Update(s.tablePrefix+"users").
		Set("password", password).
		Set("update_at", now).
		Where(sq.Eq{"username": username})

	result, err := query.Exec()
	if err != nil {
		return err
	}

	rowCount, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowCount < 1 {
		return UserNotFoundError{username}
	}

	return nil
}

func (s *SQLStore) updateUserPasswordByID(db sq.BaseRunner, userID, password string) error {
	now := utils.GetMillis()

	query := s.getQueryBuilder(db).Update(s.tablePrefix+"users").
		Set("password", password).
		Set("update_at", now).
		Where(sq.Eq{"id": userID})

	result, err := query.Exec()
	if err != nil {
		return err
	}

	rowCount, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowCount < 1 {
		return UserNotFoundError{userID}
	}

	return nil
}

func (s *SQLStore) getUsersByTeam(db sq.BaseRunner, _ string, _ string, _, _ bool) ([]*model.User, error) {
	users, err := s.getUsersByCondition(db, nil, 0)
	if model.IsErrNotFound(err) {
		return []*model.User{}, nil
	}

	return users, err
}

func (s *SQLStore) searchUsersByTeam(db sq.BaseRunner, _ string, searchQuery string, _ string, _, _, _ bool) ([]*model.User, error) {
	users, err := s.getUsersByCondition(db, &sq.Like{"username": "%" + searchQuery + "%"}, 10)
	if model.IsErrNotFound(err) {
		return []*model.User{}, nil
	}

	return users, err
}

func (s *SQLStore) usersFromRows(rows *sql.Rows) ([]*model.User, error) {
	users := []*model.User{}

	for rows.Next() {
		var user model.User

		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Email,
			&user.Nickname,
			&user.PhoneNumber,
			&user.PhoneWhatsAppEnabled,
			&user.PhoneTelegramEnabled,
			&user.Password,
			&user.MfaSecret,
			&user.AuthService,
			&user.AuthData,
			&user.Roles,
			&user.CreateAt,
			&user.UpdateAt,
			&user.DeleteAt,
		)
		if err != nil {
			return nil, err
		}

		users = append(users, &user)
	}

	return users, nil
}

func (s *SQLStore) patchUserPreferences(db sq.BaseRunner, userID string, patch model.UserPreferencesPatch) (mmModel.Preferences, error) {
	preferences, err := s.getUserPreferences(db, userID)
	if err != nil {
		return nil, err
	}

	if len(patch.UpdatedFields) > 0 {
		for key, value := range patch.UpdatedFields {
			preference := mmModel.Preference{
				UserId:   userID,
				Category: model.PreferencesCategoryFocalboard,
				Name:     key,
				Value:    value,
			}

			if err := s.updateUserPreference(db, preference); err != nil {
				return nil, err
			}

			newPreferences := mmModel.Preferences{}
			for _, existingPreference := range preferences {
				if preference.Name != existingPreference.Name {
					newPreferences = append(newPreferences, existingPreference)
				}
			}
			newPreferences = append(newPreferences, preference)
			preferences = newPreferences
		}
	}

	if len(patch.DeletedFields) > 0 {
		for _, key := range patch.DeletedFields {
			preference := mmModel.Preference{
				UserId:   userID,
				Category: model.PreferencesCategoryFocalboard,
				Name:     key,
			}

			if err := s.deleteUserPreference(db, preference); err != nil {
				return nil, err
			}

			newPreferences := mmModel.Preferences{}
			for _, existingPreference := range preferences {
				if preference.Name != existingPreference.Name {
					newPreferences = append(newPreferences, existingPreference)
				}
			}
			preferences = newPreferences
		}
	}

	return preferences, nil
}

func (s *SQLStore) updateUserPreference(db sq.BaseRunner, preference mmModel.Preference) error {
	query := s.getQueryBuilder(db).
		Insert(s.tablePrefix+"preferences").
		Columns("UserId", "Category", "Name", "Value").
		Values(preference.UserId, preference.Category, preference.Name, preference.Value)

	switch s.dbType {
	case model.MysqlDBType:
		query = query.SuffixExpr(sq.Expr("ON DUPLICATE KEY UPDATE Value = ?", preference.Value))
	case model.PostgresDBType:
		query = query.SuffixExpr(sq.Expr("ON CONFLICT (userid, category, name) DO UPDATE SET Value = ?", preference.Value))
	case model.SqliteDBType:
		query = query.SuffixExpr(sq.Expr(" on conflict(userid, category, name) do update set value = excluded.value"))
	default:
		return store.NewErrNotImplemented("failed to update preference because of missing driver")
	}

	if _, err := query.Exec(); err != nil {
		return fmt.Errorf("failed to upsert user preference in database: userID: %s name: %s value: %s error: %w", preference.UserId, preference.Name, preference.Value, err)
	}

	return nil
}

func (s *SQLStore) deleteUserPreference(db sq.BaseRunner, preference mmModel.Preference) error {
	query := s.getQueryBuilder(db).
		Delete(s.tablePrefix + "preferences").
		Where(sq.Eq{"UserId": preference.UserId}).
		Where(sq.Eq{"Category": preference.Category}).
		Where(sq.Eq{"Name": preference.Name})

	if _, err := query.Exec(); err != nil {
		return fmt.Errorf("failed to delete user preference from database: %w", err)
	}

	return nil
}

func (s *SQLStore) canSeeUser(db sq.BaseRunner, seerID string, seenID string) (bool, error) {
	return true, nil
}

func (s *SQLStore) sendMessage(db sq.BaseRunner, message, postType string, receipts []string) error {
	return errUnsupportedOperation
}

func (s *SQLStore) postMessage(db sq.BaseRunner, message, postType string, channel string) error {
	return errUnsupportedOperation
}

func (s *SQLStore) getUserTimezone(_ sq.BaseRunner, _ string) (string, error) {
	return "", errUnsupportedOperation
}

func (s *SQLStore) getUserPreferences(db sq.BaseRunner, userID string) (mmModel.Preferences, error) {
	query := s.getQueryBuilder(db).
		Select("userid", "category", "name", "value").
		From(s.tablePrefix + "preferences").
		Where(sq.Eq{
			"userid":   userID,
			"category": model.PreferencesCategoryFocalboard,
		})

	rows, err := query.Query()
	if err != nil {
		s.logger.Error("failed to fetch user preferences", mlog.String("user_id", userID), mlog.Err(err))
		return nil, err
	}

	defer rows.Close()

	preferences, err := s.preferencesFromRows(rows)
	if err != nil {
		return nil, err
	}

	return preferences, nil
}

func (s *SQLStore) preferencesFromRows(rows *sql.Rows) ([]mmModel.Preference, error) {
	preferences := []mmModel.Preference{}

	for rows.Next() {
		var preference mmModel.Preference

		err := rows.Scan(
			&preference.UserId,
			&preference.Category,
			&preference.Name,
			&preference.Value,
		)

		if err != nil {
			s.logger.Error("failed to scan row for user preference", mlog.Err(err))
			return nil, err
		}

		preferences = append(preferences, preference)
	}

	return preferences, nil
}
