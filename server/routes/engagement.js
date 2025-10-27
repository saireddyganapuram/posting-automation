const express = require('express');
const LinkedInAutomation = require('../services/linkedinAutomation');
const LinkedInAccount = require('../models/LinkedInAccount');
const router = express.Router();

router.post('/like', async (req, res) => {
  let bot;
  try {
    const { accountId, postUrl, userId } = req.body;
    
    if (!accountId || !postUrl) {
      return res.status(400).json({ error: 'Account ID and Post URL are required' });
    }
    
    const account = await LinkedInAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'LinkedIn account not found' });
    }
    
    if (!account.linkedinEmail || !account.linkedinPassword) {
      return res.status(400).json({ error: 'Credentials required. Please add email/password in Engagement Hub.' });
    }
    
    const password = account.decryptPassword();
    if (!password) {
      return res.status(400).json({ error: 'Failed to decrypt password. Please re-enter credentials.' });
    }
    
    bot = new LinkedInAutomation(accountId);
    await bot.login(account.linkedinEmail, password);
    await bot.likePost(postUrl);
    
    res.json({ success: true, message: 'Post liked successfully' });
  } catch (error) {
    console.error('Like error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to like post' });
  } finally {
    if (bot) await bot.close().catch(e => console.error('Close error:', e.message));
  }
});

router.post('/comment', async (req, res) => {
  let bot;
  try {
    const { accountId, postUrl, comment, userId } = req.body;
    
    if (!accountId || !postUrl || !comment) {
      return res.status(400).json({ error: 'Account ID, Post URL and comment are required' });
    }
    
    const account = await LinkedInAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'LinkedIn account not found' });
    }
    
    if (!account.linkedinEmail || !account.linkedinPassword) {
      return res.status(400).json({ error: 'Credentials required. Please add email/password in Engagement Hub.' });
    }
    
    const password = account.decryptPassword();
    if (!password) {
      return res.status(400).json({ error: 'Failed to decrypt password. Please re-enter credentials.' });
    }
    
    bot = new LinkedInAutomation(accountId);
    await bot.login(account.linkedinEmail, password);
    await bot.commentOnPost(postUrl, comment);
    
    res.json({ success: true, message: 'Comment posted successfully' });
  } catch (error) {
    console.error('Comment error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to post comment' });
  } finally {
    if (bot) await bot.close().catch(e => console.error('Close error:', e.message));
  }
});

router.post('/share', async (req, res) => {
  let bot;
  try {
    const { accountId, postUrl, commentary, userId } = req.body;
    
    if (!accountId || !postUrl) {
      return res.status(400).json({ error: 'Account ID and Post URL are required' });
    }
    
    const account = await LinkedInAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'LinkedIn account not found' });
    }
    
    if (!account.linkedinEmail || !account.linkedinPassword) {
      return res.status(400).json({ error: 'Credentials required. Please add email/password in Engagement Hub.' });
    }
    
    const password = account.decryptPassword();
    if (!password) {
      return res.status(400).json({ error: 'Failed to decrypt password. Please re-enter credentials.' });
    }
    
    bot = new LinkedInAutomation(accountId);
    await bot.login(account.linkedinEmail, password);
    await bot.sharePost(postUrl, commentary || '');
    
    res.json({ success: true, message: 'Post shared successfully' });
  } catch (error) {
    console.error('Share error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to share post' });
  } finally {
    if (bot) await bot.close().catch(e => console.error('Close error:', e.message));
  }
});

module.exports = router;
