const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const User = require('../models/User');
const { ensureUser } = require('../middleware/auth');
const router = express.Router();

// OAuth 1.0a authentication for media uploads
router.get('/auth1/:clerkId', ensureUser, async (req, res) => {
  try {
    console.log('Starting OAuth 1.0a auth for:', req.params.clerkId);
    
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });

    const authLink = await client.generateAuthLink(
      process.env.TWITTER_REDIRECT_URI.replace('/callback', '/callback1'),
      { linkMode: 'authorize' }
    );
    
    // Store oauth_token_secret for callback
    req.session.oauth_token_secret = authLink.oauth_token_secret;
    req.session.clerkId = req.params.clerkId;
    
    console.log('OAuth 1.0a auth link generated');
    res.json({ authUrl: authLink.url });
  } catch (error) {
    console.error('OAuth 1.0a auth error:', error);
    res.status(500).json({ error: 'Failed to generate OAuth 1.0a auth URL' });
  }
});

// OAuth 1.0a callback
router.get('/callback1', async (req, res) => {
  try {
    const { oauth_token, oauth_verifier, denied } = req.query;
    
    if (denied) {
      return res.redirect(`${process.env.CLIENT_URL}/dashboard?twitter=denied`);
    }
    
    const { oauth_token_secret, clerkId } = req.session || {};

    if (!oauth_token_secret || !clerkId) {
      return res.redirect(`${process.env.CLIENT_URL}/dashboard?twitter=session_error`);
    }

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    });

    const { accessToken, accessSecret, screenName, userId } = await client.login(oauth_verifier);

    // Update user with OAuth 1.0a tokens
    await User.findOneAndUpdate(
      { clerkId },
      {
        twitterId: userId,
        twitterUsername: screenName,
        twitterAccessToken: accessToken,
        twitterRefreshToken: accessSecret, // OAuth 1.0a secret
        isTwitterConnected: true,
        authType: 'oauth1' // Mark as OAuth 1.0a
      }
    );

    res.redirect(`${process.env.CLIENT_URL}/dashboard?twitter=connected`);
  } catch (error) {
    console.error('OAuth 1.0a callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/dashboard?twitter=error`);
  }
});

module.exports = router;