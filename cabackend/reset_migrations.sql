-- Drop the django_migrations table
DROP TABLE IF EXISTS django_migrations;

-- Recreate the django_migrations table
CREATE TABLE django_migrations (
    id SERIAL PRIMARY KEY,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied TIMESTAMP NOT NULL
);

-- Insert initial migrations for each app
INSERT INTO django_migrations (app, name, applied) VALUES
('customers', '0001_initial', NOW()),
('documents', '0001_initial', NOW()),
('credentials', '0001_initial', NOW()),
('credentials', '0002_credentialtype_url', NOW()),
('servicetickets', '0001_initial', NOW());
