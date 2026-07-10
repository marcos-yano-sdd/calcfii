CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY,
    taxa_ima_b NUMERIC(9,4)
);

INSERT INTO config (id, taxa_ima_b)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
