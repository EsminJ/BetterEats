module.exports = {
  ensureAuthenticated: function(req, res, next) {
    if (req.isAuthenticated()) {
      // if user is logged in proceed to controller
      return next();
    }
    // if not logged in throw error
    res.status(401).json({ error: 'Please log in to view this resource' });
  }
}; 