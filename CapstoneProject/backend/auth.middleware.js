module.exports = {
  ensureAuthenticated: function(req, res, next) {
    if (req.isAuthenticated()) {
      // If user is logged in, proceed to the next function (the controller)
      return next();
    }
    // If not logged in, send an unauthorized error
    res.status(401).json({ error: 'Please log in to view this resource' });
  }
}; 