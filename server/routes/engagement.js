const express = require('express');
const LinkedInAutomation = require('../services/linkedinAutomation');
const LinkedInAccount = require('../models/LinkedInAccount');
const User = require('../models/User'); // added fallback user lookup
const mongoose = require('mongoose');
const router = express.Router();

// Search posts route
router.post('/search-posts', async (req, res) => {
  let bot;
  try {
    const { accountId, topic } = req.body;
    
    if (!accountId || !topic) {
      return res.status(400).json({ error: 'Account ID and topic are required' });
    }
    
    // Resolve account either by LinkedInAccount._id or by clerkId -> findOne({ userId: clerkId })
    let account = null;
    if (mongoose.Types.ObjectId.isValid(accountId)) {
      account = await LinkedInAccount.findById(accountId);
    }
    if (!account) {
      account = await LinkedInAccount.findOne({ userId: accountId, isActive: true });
    }
    
    if (!account) {
      return res.status(404).json({ error: 'No active LinkedIn account found for this user' });
    }
    
    // Determine credentials to use for Puppeteer login.
    // Prefer LinkedInAccount's stored email/password (encrypted), otherwise fall back to User legacy fields.
    let loginEmail = null;
    let loginPassword = null;
    
    if (account.linkedinEmail && account.linkedinPassword) {
      loginEmail = account.linkedinEmail;
      // decryptPassword should be a method on the LinkedInAccount model
      try {
        loginPassword = account.decryptPassword ? account.decryptPassword() : null;
      } catch (e) {
        console.warn('Could not decrypt LinkedIn account password:', e.message);
        loginPassword = null;
      }
    }
    
    if (!loginEmail || !loginPassword) {
      // try legacy User record
      const userRecord = await User.findOne({ clerkId: account.userId || account.clerkId || account.userId });
      if (userRecord && userRecord.linkedinEmail && userRecord.linkedinPassword) {
        loginEmail = loginEmail || userRecord.linkedinEmail;
        loginPassword = loginPassword || userRecord.linkedinPassword;
      }
    }
    
    if (!loginEmail || !loginPassword) {
      return res.status(400).json({ error: 'LinkedIn account credentials not found. Please save email and password in the Engagement Hub.' });
    }
    
    bot = new LinkedInAutomation();
    await bot.login(loginEmail, loginPassword);
    const posts = await bot.searchPosts(topic);
    
    // Take debug screenshot if no posts found
    if (posts.length === 0) {
      console.log('[Search Posts] No posts found, taking debug screenshot...');
      await bot.takeDebugScreenshot(`search-debug-${Date.now()}.png`);
    }
    
    console.log(`[Search Posts] Successfully found ${posts.length} posts`);
    res.json({ posts, count: posts.length });
  } catch (error) {
    console.error('[Search Posts] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to search posts' });
  } finally {
    if (bot) await bot.close().catch(console.error);
  }
});

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

router.post('/engage-multiple', async (req, res) => {
  let bot;
  try {
    const { accountId, posts, actions = { like: true, comment: false }, commentText } = req.body;
    
    if (!accountId || !posts?.length) {
      return res.status(400).json({ error: 'Account ID and posts are required' });
    }
    
    // Resolve account by ObjectId or by clerkId (stored in userId)
    let account = null;
    if (mongoose.Types.ObjectId.isValid(accountId)) {
      account = await LinkedInAccount.findById(accountId);
    }
    if (!account) {
      account = await LinkedInAccount.findOne({ userId: accountId, isActive: true });
    }
    if (!account || account.isActive === false) {
      return res.status(404).json({ error: 'No active LinkedIn account found' });
    }
    
    // Validate credentials
    if (!account.linkedinEmail || !account.linkedinPassword) {
      return res.status(400).json({ error: 'Credentials required. Please add email/password in Engagement Hub.' });
    }
    const decrypted = account.decryptPassword && account.decryptPassword();
    if (!decrypted) {
      return res.status(400).json({ error: 'Failed to decrypt password. Please re-enter credentials.' });
    }
    
    bot = new LinkedInAutomation();
    await bot.login(account.linkedinEmail, decrypted);
    const results = await bot.engageWithPosts(posts, actions, commentText);
    
    const successful = results.filter(r => r.success).length;
    res.json({ 
      message: `Successfully engaged with ${successful} out of ${posts.length} posts`,
      results 
    });
  } catch (error) {
    console.error('Bulk engagement error:', error);
    res.status(500).json({ error: error.message || 'Failed to engage with posts' });
  } finally {
    if (bot) await bot.close().catch(console.error);
  }
});

module.exports = router;
