const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/user.model.js'); 

module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'username' }, (username, password, done) => {
      // match user by username
      User.findOne({ username: username })
        .then(user => {
          if (!user) {
            // no user found
            return done(null, false, { message: 'That username is not registered' });
          }

          // match password
          bcrypt.compare(password, user.passwordHash, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
              // password matches
              return done(null, user);
            } else {
              // password does not match
              return done(null, false, { message: 'Password incorrect' });
            }
          });
        })
        .catch(err => console.log(err));
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};