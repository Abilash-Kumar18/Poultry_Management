const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Access denied.' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'biosecurity_secret');
    
    // Find user in MongoDB
    const user = await User.findById(decoded.id).select('id email name role');
    if (!user) return res.status(401).json({ error: 'User not found. Token invalid.' });
    
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired. Please login again.' });
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  next();
};

module.exports = { authenticate, requireAdmin };
