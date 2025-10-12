const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Create or get user from Clerk webhook
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'user.created') {
      const user = new User({
        clerkId: data.id,
        email: data.email_addresses[0].email_address
      });
      await user.save();
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Auth webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile/:clerkId', async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.params.clerkId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;