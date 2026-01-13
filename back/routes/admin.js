const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const fem_names = require('../utils/fem_names.json')
const masc_names = require('../utils/masc_names.json')
const lastnames = require('../utils/last_names.json')

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const router = express.Router();
router.post('/create-users', authenticateToken, async (req, res) => {
  try {
    const { number_of_users, password } = req.body;

    if (number_of_users <= 0){
      return res.status(400).json({ error: 'Number of users should be a positive integer' });
    }
        
    if (password == null || password == undefined){
      return res.status(400).json({ error: 'Password can not be null or undefined' });
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    
    let values = [];
    
    let insertQuerry = `INSERT INTO users (username, firstname, lastname, email, password_hash)
       VALUES `
    
    for (let i = 0; i < number_of_users; i++){
      if (i > 0){
        insertQuerry += ", ";
      }
      insertQuerry += "(?, ?, ?, ?, ?)"
      const gender = getRandomInt(0, 4);
      let randomListToTakeFrom = gender; getRandomInt(0, 1);
      if (gender > 1){ // if gender is neither women or men
        randomListToTakeFrom = getRandomInt(0, 1);
      }
      let firstname = "";
      if (randomListToTakeFrom == 0){
        firstname = fem_names[getRandomInt(0, fem_names.length - 1)];
      }
      else{
        firstname = masc_names[getRandomInt(0, masc_names.length - 1)];
      }
      const lastname = lastnames[getRandomInt(0, lastnames.length - 1)];
      const username = (firstname[0]+lastname+((new Date).getTime())).substring(0,50);
      values.push(username);
      values.push(firstname);
      values.push(lastname);
      values.push(username+"@matcha.com");
      values.push(passwordHash);
    }
    
    const [result] = await db.execute(insertQuerry, values);

    return res.status(201).json({
      message: 'Users created successfully',
      users_ids: result,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l’inscription' });
  } 
});


module.exports = router;
