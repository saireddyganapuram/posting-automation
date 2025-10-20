const express = require('express');
const LinkedInAutomation = require('../services/linkedinAutomation');
const router = express.Router();

router.post('/like', async (req, res) => {
  const { email, password, postUrl } = req.body;
  
  console.log('Like request received:', { email: email ? 'provided' : 'missing', postUrl });
  
  if (!email || !password || !postUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const bot = new LinkedInAutomation();
  
  try {
    console.log('Starting LinkedIn automation...');
    await bot.login(email, password);
    const success = await bot.likePost(postUrl);
    await bot.close();
    
    if (success) {
      res.json({ success: true, message: 'Post liked successfully' });
    } else {
      res.status(400).json({ error: 'Failed to like post - button not found' });
    }
  } catch (error) {
    console.error('Engagement error:', error);
    await bot.close();
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

router.post('/comment', async (req, res) => {
  const { email, password, postUrl, comment } = req.body;
  
  if (!email || !password || !postUrl || !comment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const bot = new LinkedInAutomation();
  
  try {
    await bot.login(email, password);
    const success = await bot.commentOnPost(postUrl, comment);
    await bot.close();
    
    if (success) {
      res.json({ success: true, message: 'Comment posted successfully' });
    } else {
      res.status(400).json({ error: 'Failed to post comment' });
    }
  } catch (error) {
    await bot.close();
    res.status(500).json({ error: error.message });
  }
});

router.post('/share', async (req, res) => {
  const { email, password, postUrl, commentary } = req.body;
  
  if (!email || !password || !postUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const bot = new LinkedInAutomation();
  
  try {
    await bot.login(email, password);
    const success = await bot.sharePost(postUrl, commentary || '');
    await bot.close();
    
    if (success) {
      res.json({ success: true, message: 'Post shared successfully' });
    } else {
      res.status(400).json({ error: 'Failed to share post' });
    }
  } catch (error) {
    await bot.close();
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
