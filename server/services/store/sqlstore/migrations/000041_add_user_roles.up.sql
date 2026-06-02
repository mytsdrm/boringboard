ALTER TABLE {{.prefix}}users ADD COLUMN roles VARCHAR(255) DEFAULT 'system_user PublicUser';

UPDATE {{.prefix}}users
   SET roles = 'system_user PublicUser'
 WHERE roles IS NULL OR roles = '';
