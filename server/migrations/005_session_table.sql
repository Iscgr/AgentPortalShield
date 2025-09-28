-- 005_session_table.sql
-- ایجاد جدول session برای express-session با connect-pg-simple (در صورت عدم وجود)
CREATE TABLE IF NOT EXISTS session (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);
