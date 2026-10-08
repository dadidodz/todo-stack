-- Run by the postgres image on first start only (when its data directory is empty).
CREATE TABLE todos (
  id    SERIAL PRIMARY KEY,
  title TEXT    NOT NULL,
  done  BOOLEAN NOT NULL DEFAULT false
);
