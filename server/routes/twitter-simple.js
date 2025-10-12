const express = require('express');
const router = express.Router();

// Simple Twitter connection (mock for now)
router.get('/auth/:clerkId', async (req, res) => {
  try {
    // For now, return a mock success to test the flow
    const mockAuthUrl = `${process.env.CLIENT_URL}/dashboard?twitter=mock_connected&user=${req.params.clerkId}`;
    res.json({ authUrl: mockAuthUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status/:clerkId', async (req, res) => {
  res.json({ connected: false, username: null });
});

module.exports = router;