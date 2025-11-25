const jwt = require('jsonwebtoken');
require('dotenv').config(); // Make sure to read the .env file

module.exports = function(req, res, next) {
  // Get the token from the request header
  const token = req.header('x-auth-token');

  // Check if no token is provided
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify the token
  try {
    // --- THIS IS THE CORRECTED LINE ---
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded.user;
    next(); // Move on to the next piece of middleware or the route handler
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};