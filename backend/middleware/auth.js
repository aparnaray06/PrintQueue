import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Please log in to continue.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
};

export const shopkeeperOnly = (req, res, next) => {
  if (req.user.role !== 'shopkeeper') {
    return res.status(403).json({ message: 'Access denied. Shopkeeper privileges required.' });
  }
  next();
};