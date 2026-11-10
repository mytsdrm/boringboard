package sqlstore

import "github.com/go-sql-driver/mysql"

// These helpers used to live in mattermost/server/public/utils/sql, which
// dropped them together with MySQL support.

// ResetMySQLReadTimeout removes the timeout constraint from the MySQL dsn.
func ResetMySQLReadTimeout(dataSource string) (string, error) {
	config, err := mysql.ParseDSN(dataSource)
	if err != nil {
		return "", err
	}
	config.ReadTimeout = 0
	return config.FormatDSN(), nil
}

// AppendMySQLMultipleStatementsFlag enables multiStatements on the MySQL dsn
// so that migrations work.
func AppendMySQLMultipleStatementsFlag(dataSource string) (string, error) {
	config, err := mysql.ParseDSN(dataSource)
	if err != nil {
		return "", err
	}
	if config.Params == nil {
		config.Params = map[string]string{}
	}
	config.Params["multiStatements"] = "true"
	return config.FormatDSN(), nil
}
