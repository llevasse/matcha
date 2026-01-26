DROP DATABASE IF EXISTS matcha;

CREATE DATABASE IF NOT EXISTS matcha CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE matcha;

CREATE TABLE genders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO
    genders (label)
VALUES ('man'),
    ('woman'),
    ('non-binary'),
    ('other');

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    firstname VARCHAR(30) NOT NULL,
    lastname VARCHAR(30) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    fame INT DEFAULT 0,
    gender_id INT,
    bio TEXT,
    birthdate DATE,
    last_connection_date DATETIME,
    city VARCHAR(100),
    location_latitude DECIMAL(9, 6),
    location_longitude DECIMAL(9, 6),
    is_confirmed BOOLEAN DEFAULT FALSE,
    is_valid BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    tags_created INT DEFAULT 0,
    FOREIGN KEY (gender_id) REFERENCES genders (id)
);

CREATE TABLE user_preferences (
    user_id INT NOT NULL,
    gender_id INT NOT NULL,
    PRIMARY KEY (user_id, gender_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (gender_id) REFERENCES genders (id) ON DELETE CASCADE
);

CREATE TABLE profile_pictures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    is_main BOOLEAN DEFAULT FALSE,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_match BOOLEAN DEFAULT FALSE,
    is_like BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO
    tags (name)
VALUES ('sports'),
    ('music'),
    ('travel'),
    ('reading'),
    ('gaming'),
    ('cooking'),
    ('fitness'),
    ('art'),
    ('technology'),
    ('movies');

CREATE TABLE user_tags (
    user_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (user_id, tag_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

CREATE TABLE viewing_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    viewer_user_id INT NOT NULL,
    viewed_user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (viewer_user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (viewed_user_id) REFERENCES users (id) ON DELETE CASCADE
);