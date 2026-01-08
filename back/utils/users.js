
// SQL statement to return user info (in users table), as well as gender name, genders attracted to names, user tags (their ids and name)
// the only argument needed is the user id
const getUserPrivateInfoByIdSqlStatement = `SELECT u.id, u.username, u.firstname, u.lastname, u.email, u.gender_id, u.bio, u.birthdate,
u.city, u.location_latitude, u.location_longitude, u.fame, u.is_confirmed, u.created_at,
(SELECT g.label FROM genders g WHERE g.id = u.gender_id) as gender,
(SELECT JSON_ARRAYAGG(g.label) FROM user_preferences up JOIN genders g ON up.gender_id = g.id WHERE up.user_id = u.id GROUP BY up.user_id) as preferences,
(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', t.id, 'name', t.name)) FROM user_tags ut JOIN tags t ON ut.tag_id = t.id WHERE ut.user_id = u.id GROUP BY ut.user_id) as tags,
(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', pp.id, 'file_path', pp.file_path, 'is_main', pp.is_main, 'uploaded_at', pp.uploaded_at)) FROM profile_pictures pp WHERE pp.user_id = u.id GROUP BY pp.user_id) as pictures
FROM users u WHERE u.id = ?`

const getUserPublicInfoByIdSqlStatement = `SELECT u.id, u.username, u.firstname, u.lastname, u.gender_id, u.bio, u.birthdate,
u.city, u.location_latitude, u.location_longitude, u.fame, u.is_confirmed, u.created_at,
(SELECT g.label FROM genders g WHERE g.id = u.gender_id) as gender,
(SELECT JSON_ARRAYAGG(g.label) FROM user_preferences up JOIN genders g ON up.gender_id = g.id WHERE up.user_id = u.id GROUP BY up.user_id) as preferences,
(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', t.id, 'name', t.name)) FROM user_tags ut JOIN tags t ON ut.tag_id = t.id WHERE ut.user_id = u.id GROUP BY ut.user_id) as tags,
(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', pp.id, 'file_path', pp.file_path, 'is_main', pp.is_main, 'uploaded_at', pp.uploaded_at)) FROM profile_pictures pp WHERE pp.user_id = u.id GROUP BY pp.user_id) as pictures
FROM users u WHERE u.id = ?`

module.exports = {getUserPrivateInfoByIdSqlStatement, getUserPublicInfoByIdSqlStatement}