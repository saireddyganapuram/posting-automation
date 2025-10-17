const express = require('express');
const axios = require('axios');
const LinkedInAccount = require('../models/LinkedInAccount');
const { ensureUser } = require('../middleware/auth');
const router = express.Router();

// Like a LinkedIn post
router.post('/like/:clerkId', ensureUser, async (req, res) => {
  try {
    const { postUrn, accountId } = req.body;
    
    const account = await LinkedInAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'LinkedIn account not found' });
    }

    const likeData = {
      actor: account.linkedinMemberUrn,
      object: postUrn
    };

    await axios.post('https://api.linkedin.com/v2/reactions', likeData, {
      headers: {
        'Authorization': `Bearer ${account.linkedinAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, message: 'Post liked successfully' });
  } catch (error) {
    console.error('Like error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Comment on a LinkedIn post
router.post('/comment/:clerkId', ensureUser, async (req, res) => {
  try {
    const { postUrn, comment, accountId } = req.body;
    
    const account = await LinkedInAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'LinkedIn account not found' });
    }

    const commentData = {
      actor: account.linkedinMemberUrn,
      object: postUrn,
      message: { text: comment }
    };

    await axios.post('https://api.linkedin.com/v2/socialActions/comments', commentData, {
      headers: {
        'Authorization': `Bearer ${account.linkedinAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, message: 'Comment posted successfully' });
  } catch (error) {
    console.error('Comment error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to comment on post' });
  }
});

// Share a LinkedIn post
router.post('/share/:clerkId', ensureUser, async (req, res) => {
  try {
    const { postUrn, commentary, accountId } = req.body;
    
    const account = await LinkedInAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'LinkedIn account not found' });
    }

    const shareData = {
      author: account.linkedinMemberUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: commentary || '' },
          shareMediaCategory: 'NONE',
          media: [{
            status: 'READY',
            originalUrl: postUrn
          }]
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    };

    await axios.post('https://api.linkedin.com/v2/ugcPosts', shareData, {
      headers: {
        'Authorization': `Bearer ${account.linkedinAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, message: 'Post shared successfully' });
  } catch (error) {
    console.error('Share error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to share post' });
  }
});

module.exports = router;