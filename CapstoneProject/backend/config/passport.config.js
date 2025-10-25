const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/user.model.js'); // Your Mongoose User model

module.exports = function(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
      // 1. Match User
      User.findOne({ email: email })
        .then(user => {
          if (!user) {
            // No user found with that email
            return done(null, false, { message: 'That email is not registered' });
          }

          // 2. Match Password
          bcrypt.compare(password, user.passwordHash, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
              // Password matches, return the user
              return done(null, user);
            } else {
              // Password does not match
              return done(null, false, { message: 'Password incorrect' });
            }
          });
        })
        .catch(err => console.log(err));
    })
  );

  // These functions tell Passport how to store and retrieve user info from the session
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
