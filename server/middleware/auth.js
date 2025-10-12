const User = require('../models/User');

// Middleware to ensure user exists in database
const ensureUser = async (req, res, next) => {
  try {
    const { clerkId } = req.params;
    
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID required' });
    }

    // Check if user exists, create if not
    let user = await User.findOne({ clerkId });
    if (!user) {
      user = new User({
        clerkId,
        email: `user-${clerkId}@temp.com` // Will be updated via webhook
      });
      await user.save();
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Ensure user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { ensureUser };