{{if .sqlite}}
SELECT 1;
{{else}}
ALTER TABLE {{.prefix}}users DROP COLUMN roles;
{{end}}
