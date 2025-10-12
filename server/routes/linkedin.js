const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const { ensureUser } = require('../middleware/auth');
const router = express.Router();

// Function to fetch LinkedIn member URN
async function fetchLinkedInMemberUrn(accessToken) {
  try {
    const response = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    // Extract user ID and create person URN
    const userId = response.data.id;
    const memberUrn = `urn:li:person:${userId}`;
    console.log('LinkedIn member URN fetched:', memberUrn);
    return memberUrn;
  } catch (error) {
    console.error('Failed to fetch LinkedIn member URN:', error.response?.data || error.message);
    return null;
  }
}

// LinkedIn OAuth login
router.get('/auth/:clerkId', ensureUser, async (req, res) => {
  try {
    console.log('Starting LinkedIn auth for:', req.params.clerkId);
    
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    const scope = 'r_liteprofile w_member_social';
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${req.params.clerkId}`;
    
    res.json({ authUrl });
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    res.status(500).json({ error: 'Failed to generate LinkedIn auth URL' });
  }
});

// LinkedIn OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state: clerkId, error, error_description } = req.query;
    console.log('LinkedIn callback received:', { code: !!code, clerkId, error, error_description });
    
    if (error) {
      console.error('LinkedIn OAuth error:', error, error_description);
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({type: 'linkedin-auth', status: 'denied', error: '${error_description || error}'}, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }
    
    if (!code || !clerkId) {
      console.error('Missing code or clerkId:', { code: !!code, clerkId });
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({type: 'linkedin-auth', status: 'error', error: 'Missing authorization code'}, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    // Exchange code for access token
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET
    });

    console.log('Exchanging code for token...');
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', tokenData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log('Token response received:', { hasAccessToken: !!tokenResponse.data.access_token });
    const { access_token, refresh_token } = tokenResponse.data;

    // Get LinkedIn user info and member URN
    console.log('Getting LinkedIn user info...');
    let profile, linkedinName, memberUrn;
    try {
      const userResponse = await axios.get('https://api.linkedin.com/v2/people/~', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      profile = { id: userResponse.data.id };
      linkedinName = 'LinkedIn User';
      console.log('LinkedIn user ID obtained:', profile.id);
      
      // Fetch member URN
      memberUrn = await fetchLinkedInMemberUrn(access_token);
    } catch (profileError) {
      console.log('Could not get LinkedIn profile, using fallback');
      profile = { id: 'linkedin_user' };
      linkedinName = 'LinkedIn User';
      memberUrn = null;
    }

    // Update user in database
    console.log('Updating user in database:', clerkId);
    const updatedUser = await User.findOneAndUpdate(
      { clerkId },
      {
        linkedinId: profile.id,
        linkedinName: linkedinName,
        linkedinAccessToken: access_token,
        linkedinRefreshToken: refresh_token,
        linkedinMemberUrn: memberUrn,
        isLinkedinConnected: true
      },
      { new: true, upsert: true }
    );
    console.log('User updated successfully:', { clerkId, linkedinName, memberUrn });

    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({type: 'linkedin-auth', status: 'connected', name: '${linkedinName}'}, '*');
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({type: 'linkedin-auth', status: 'error'}, '*');
            window.close();
          </script>
        </body>
      </html>
    `);
  }
});

// Check LinkedIn connection status
router.get('/status/:clerkId', ensureUser, async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.params.clerkId });
    res.json({ 
      connected: user?.isLinkedinConnected || false,
      name: user?.linkedinName 
    });
  } catch (error) {
    console.error('LinkedIn status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test LinkedIn posting with image
router.post('/test-post/:clerkId', ensureUser, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    const user = await User.findOne({ clerkId: req.params.clerkId });
    
    if (!user || !user.linkedinAccessToken) {
      return res.status(400).json({ error: 'LinkedIn not connected' });
    }

    if (!user.linkedinMemberUrn) {
      return res.status(400).json({ error: 'LinkedIn member URN not found. Please reconnect.' });
    }

    console.log('Testing LinkedIn post with content:', content);
    console.log('Image URL:', imageUrl);
    
    // Upload image if provided
    let assetUrn = null;
    if (imageUrl) {
      const path = require('path');
      const fs = require('fs');
      const imagePath = path.join(__dirname, '..', imageUrl.replace('/uploads/', 'uploads/'));
      
      if (fs.existsSync(imagePath)) {
        // Register upload
        const registerResponse = await axios.post(
          'https://api.linkedin.com/v2/assets?action=registerUpload',
          {
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: user.linkedinMemberUrn,
              serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }]
            }
          },
          { headers: { 'Authorization': `Bearer ${user.linkedinAccessToken}`, 'Content-Type': 'application/json' } }
        );
        
        const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const asset = registerResponse.data.value.asset;
        
        const imageBuffer = fs.readFileSync(imagePath);
        const contentType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        await axios.put(uploadUrl, imageBuffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Length': imageBuffer.length
          }
        });
        assetUrn = asset;
        console.log('✅ Image uploaded successfully, asset URN:', assetUrn);
      }
    }

    const postData = {
      author: user.linkedinMemberUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content || 'Test post from LinkedIn scheduler' },
          shareMediaCategory: assetUrn ? 'IMAGE' : 'NONE'
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    };

    if (assetUrn) {
      postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
        {
          status: 'READY',
          description: { text: 'Test image' },
          media: assetUrn,
          title: { text: 'Test Image' }
        }
      ];
    }


    const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
      headers: {
        'Authorization': `Bearer ${user.linkedinAccessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    res.json({ 
      success: true,
      postId: response.data.id,
      message: 'Test post created successfully',
      hasImage: !!assetUrn
    });
  } catch (error) {
    console.error('LinkedIn test post error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to create test post',
      details: error.response?.data || error.message
    });
  }
});

// Disconnect LinkedIn account
router.post('/disconnect/:clerkId', ensureUser, async (req, res) => {
  try {
    await User.findOneAndUpdate(
      { clerkId: req.params.clerkId },
      {
        linkedinId: null,
        linkedinName: null,
        linkedinAccessToken: null,
        linkedinRefreshToken: null,
        linkedinMemberUrn: null,
        isLinkedinConnected: false
      }
    );
    
    res.json({ message: 'LinkedIn account disconnected successfully' });
  } catch (error) {
    console.error('LinkedIn disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect LinkedIn account' });
  }
});

module.exports = router;