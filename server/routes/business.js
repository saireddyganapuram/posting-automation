const express = require('express');
const BusinessContext = require('../models/BusinessContext');
const router = express.Router();

// Get business context
router.get('/:userId', async (req, res) => {
  try {
    const context = await BusinessContext.findOne({ userId: req.params.userId });
    res.json(context || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business context' });
  }
});

// Save/Update business context
router.post('/:userId', async (req, res) => {
  try {
    const context = await BusinessContext.findOneAndUpdate(
      { userId: req.params.userId },
      req.body,
      { upsert: true, new: true }
    );
    res.json(context);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save business context' });
  }
});

module.exports = router;