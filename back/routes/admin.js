const asyncHandler = require('../middleware/asyncHandler');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { adminAuthenticateToken } = require('../middleware/auth');
const fem_names = require('../utils/fem_names.json')
const masc_names = require('../utils/masc_names.json')
const lastnames = require('../utils/last_names.json')
const cities = require('../utils/city.json')

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const router = express.Router();
router.post('/create-users', adminAuthenticateToken, asyncHandler(async (req, res) => {
  try {
    const { number_of_users, password } = req.body;

    if (number_of_users <= 0) {
      return res.status(400).json({ error: 'Number of users should be a positive integer' });
    }

    if (password == null || password == undefined) {
      return res.status(400).json({ error: 'Password can not be null or undefined' });
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const interestQuerry = await db.query(`SELECT JSON_ARRAYAGG(id) as ids FROM tags`);
    let interestIds = interestQuerry[0][0]['ids'];

    const genderQuerry = await db.query(`SELECT JSON_ARRAYAGG(id) as ids FROM genders`);
    let genderIds = genderQuerry[0][0]['ids'];


    for (let i = 0; i < number_of_users; i++) {
      let values = [];

      const insertQuerry = `INSERT INTO users (
          username, firstname, lastname, email, password_hash, bio,
          city, location_latitude, location_longitude,
          gender_id, birthdate, is_confirmed, fame
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`

      const gender = genderIds[getRandomInt(0, genderIds.length - 1)];
      let randomListToTakeFrom = gender; getRandomInt(0, 1);
      if (gender > 1) { // if gender is neither women or men
        randomListToTakeFrom = getRandomInt(0, 1);
      }
      let firstname = "";
      if (randomListToTakeFrom == 0) {
        firstname = fem_names[getRandomInt(0, fem_names.length - 1)];
      }
      else {
        firstname = masc_names[getRandomInt(0, masc_names.length - 1)];
      }
      const lastname = lastnames[getRandomInt(0, lastnames.length - 1)];
      const username = (firstname[0] + lastname + ((new Date).getTime())).substring(0, 50);
      let dob = new Date(Date.parse((new Date()).toDateString()));
      dob.setFullYear(dob.getFullYear() - getRandomInt(18, 99));
      dob = dob.toISOString().substring(0, 10);

      const bio = "Lorem ipsum dolor";
      const city_obj = cities[getRandomInt(0, cities.length - 1)];

      values.push(username);
      values.push(firstname);
      values.push(lastname);
      values.push(username + "@matcha.com");
      values.push(passwordHash);
      values.push(bio);
      values.push(city_obj.name)
      values.push(city_obj.lat)
      values.push(city_obj.lon)
      values.push(gender)
      values.push(dob)
      values.push(getRandomInt(0, 1000))
      console.log("Add User with values : ", values);

      const [insertUserResult] = await db.execute(insertQuerry, values);

      const gendersIdAttractedTo = [];
      let userPrefencesInsertQuery = `INSERT INTO user_preferences (user_id, gender_id) VALUES `
      for (let j = 0; j < 4; j++) {
        let nb = genderIds[getRandomInt(0, genderIds.length - 1)];
        if (gendersIdAttractedTo.find((curVal) => nb == curVal) == undefined) {
          gendersIdAttractedTo.push(insertUserResult.insertId);
          gendersIdAttractedTo.push(nb);
          if (j > 0) {
            userPrefencesInsertQuery += ", ";
          }
          userPrefencesInsertQuery += "(?, ?)";
        }
      }
      console.log("Set user gender preferences with values : ", gendersIdAttractedTo);

      await db.execute(userPrefencesInsertQuery, gendersIdAttractedTo);

      const nbOfInterest = getRandomInt(0, 10);
      const interestIdList = [];
      let userInterestInsertQuery = `INSERT IGNORE INTO user_tags (user_id, tag_id) VALUES `
      for (let j = 0; j < nbOfInterest; j++) {
        let nb = interestIds[getRandomInt(0, interestIds.length - 1)];
        if (interestIdList.find((curVal) => nb == curVal) == undefined) {
          interestIdList.push(insertUserResult.insertId);
          interestIdList.push(nb);
          if (j > 0) {
            userInterestInsertQuery += ", ";
          }
          userInterestInsertQuery += "(?, ?)";
        }
      }
      if (interestIdList.length > 0) {
        console.log("Set user interest with values : ", gendersIdAttractedTo);
        await db.execute(userInterestInsertQuery, interestIdList);
      }

      const pfpPath = `/default_profile_pictures/thisPersonDoesNotExist0${getRandomInt(1, 6)}.png`
      await db.execute('INSERT INTO profile_pictures (user_id, file_path, is_main) VALUES (?, ?, TRUE)',
        [insertUserResult.insertId, pfpPath]
      );
    }


    return res.status(201).json({
      message: 'Users created successfully',
      // users_ids: insertUserResult,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l’inscription' });
  }
}));


module.exports = router;
