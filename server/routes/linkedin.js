const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const { ensureUser } = require('../middleware/auth');
const router = express.Router();

// Import LinkedInAccount model
const LinkedInAccount = require('../models/LinkedInAccount');

// In-memory state store (replace with Redis in production)
const stateStore = new Map();

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
    const userId = req.params.clerkId;
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state temporarily (expires in 10 minutes)
    stateStore.set(state, { userId, timestamp: Date.now() });
    
    // Clean up expired states
    setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);
    
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=w_member_social%20r_liteprofile&prompt=login&approval_prompt=force`;
    
    console.log('🔐 Generated LinkedIn auth:');
    console.log('- User:', userId);
    console.log('- State:', state);
    console.log('- Redirect URI:', redirectUri);
    console.log('- Client ID:', process.env.LINKEDIN_CLIENT_ID);
    console.log('- Auth URL:', authUrl.substring(0, 150) + '...');
    
    res.json({ url: authUrl });
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    res.status(500).json({ error: 'Failed to generate LinkedIn auth URL' });
  }
});

// LinkedIn OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  console.log('🔄 LinkedIn callback received:', {
    hasCode: !!code,
    state: state?.substring(0, 10) + '...',
    error,
    error_description,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI
  });
  
  // Validate state
  const stateData = stateStore.get(state);
  if (!stateData) {
    console.error('❌ Invalid state - not found in store:', state);
    return res.send(`<script>console.log('State validation failed'); setTimeout(() => window.close(), 5000);</script>`);
  }
  
  const userId = stateData.userId;
  console.log('✅ State validated for user:', userId);
  
  // Don't delete state immediately - keep for debugging
  // stateStore.delete(state);
  
  if (error) {
    console.error('❌ LinkedIn OAuth error:', error, error_description);
    return res.send(`<script>console.log('OAuth error: ${error}'); setTimeout(() => { window.opener.postMessage({type: 'linkedin-auth', status: 'error', error: '${error_description || error}'}, '*'); window.close(); }, 3000);</script>`);
  }
  
  try {
    console.log('🔄 Processing LinkedIn callback for user:', userId);
    
    if (!code) {
      return res.send(`<script>window.opener.postMessage({type: 'linkedin-auth', status: 'error', error: 'Missing authorization code'}, '*'); window.close();</script>`);
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log('🎫 Token received for user:', userId);
    const accessToken = tokenResponse.data.access_token;

    // Get LinkedIn profile
    let profile, linkedinName, memberUrn;
    try {
      const userResponse = await axios.get('https://api.linkedin.com/v2/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      profile = { id: userResponse.data.id };
      memberUrn = `urn:li:person:${profile.id}`;
      
      // Get profile name
      try {
        const profileResponse = await axios.get('https://api.linkedin.com/v2/people/~:(id,localizedFirstName,localizedLastName)', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        const firstName = profileResponse.data.localizedFirstName || '';
        const lastName = profileResponse.data.localizedLastName || '';
        linkedinName = `${firstName} ${lastName}`.trim() || `LinkedIn User ${profile.id.slice(-4)}`;
      } catch {
        linkedinName = `LinkedIn User ${profile.id.slice(-4)}`;
      }
      
    } catch (profileError) {
      // Generate unique fallback to prevent conflicts
      const fallbackId = `linkedin_user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      profile = { id: fallbackId };
      linkedinName = `LinkedIn User ${fallbackId.slice(-8)}`;
      memberUrn = `urn:li:person:${fallbackId}`;
    }

    // Check if this LinkedIn account already exists
    const existingAccount = await LinkedInAccount.findOne({
      userId,
      linkedinId: profile.id,
      isActive: true
    });
    
    if (existingAccount) {
      // Update existing account
      await LinkedInAccount.findByIdAndUpdate(existingAccount._id, {
        linkedinAccessToken: accessToken,
        linkedinMemberUrn: memberUrn,
        linkedinName
      });
    } else {
      // Create new account
      const accountCount = await LinkedInAccount.countDocuments({ userId, isActive: true });
      
      await LinkedInAccount.create({
        userId,
        linkedinId: profile.id,
        linkedinName,
        linkedinAccessToken: accessToken,
        linkedinMemberUrn: memberUrn,
        accountType: 'personal',
        isDefault: accountCount === 0,
        isActive: true
      });
    }
    
    // Update user connection status
    await User.findOneAndUpdate(
      { clerkId: userId },
      { isLinkedinConnected: true },
      { upsert: true }
    );

    console.log('✅ LinkedIn account connected:', linkedinName);
    
    // Clean up state after successful processing
    stateStore.delete(state);
    
    // Keep popup open temporarily for debugging
    res.send(`
      <script>
        console.log('LinkedIn OAuth Success!');
        console.log('Connected account:', '${linkedinName}');
        console.log('User ID:', '${userId}');
        console.log('Profile ID:', '${profile.id}');
        
        // Send success message and close after delay
        window.opener.postMessage({
          type: 'linkedin-auth', 
          status: 'connected', 
          name: '${linkedinName}',
          profileId: '${profile.id}',
          userId: '${userId}'
        }, '*');
        
        // Auto-close after 3 seconds (remove this line to keep open indefinitely)
        setTimeout(() => window.close(), 3000);
      </script>
    `);
  } catch (error) {
    console.error('❌ LinkedIn callback error:', error.response?.data || error.message);
    
    // Clean up state on error
    stateStore.delete(state);
    
    res.send(`
      <script>
        console.error('LinkedIn OAuth Error:', '${error.message}');
        console.error('Error details:', ${JSON.stringify(error.response?.data || {})});
        
        setTimeout(() => {
          window.opener.postMessage({
            type: 'linkedin-auth', 
            status: 'error', 
            error: 'Connection failed: ${error.message}'
          }, '*');
          window.close();
        }, 3000);
      </script>
    `);
  }
});

// Get detailed LinkedIn accounts info
router.get('/accounts/:clerkId', ensureUser, async (req, res) => {
  try {
    console.log('Fetching LinkedIn accounts for user:', req.params.clerkId);
    
    const accounts = await LinkedInAccount.find({ 
      userId: req.params.clerkId, 
      isActive: true 
    }).select('_id linkedinId linkedinName accountType isDefault createdAt');
    
    console.log('Found accounts:', accounts.length);
    console.log('Account details:', accounts);
    
    // Also check legacy user account
    const user = await User.findOne({ clerkId: req.params.clerkId });
    console.log('User legacy LinkedIn connection:', {
      connected: user?.isLinkedinConnected,
      name: user?.linkedinName,
      id: user?.linkedinId
    });
    
    const accountsWithDetails = accounts.map(acc => ({
      id: acc._id,
      linkedinId: acc.linkedinId,
      name: acc.linkedinName,
      type: acc.accountType,
      isDefault: acc.isDefault,
      connectedAt: acc.createdAt,
      status: 'active'
    }));
    
    // Add legacy account if exists and no new accounts
    if (accountsWithDetails.length === 0 && user?.isLinkedinConnected) {
      accountsWithDetails.push({
        id: 'legacy',
        linkedinId: user.linkedinId,
        name: user.linkedinName || 'LinkedIn User (Legacy)',
        type: 'personal',
        isDefault: true,
        connectedAt: user.createdAt,
        status: 'active',
        isLegacy: true
      });
    }
    
    console.log('Returning accounts:', accountsWithDetails);
    
    res.json({
      accounts: accountsWithDetails,
      totalAccounts: accountsWithDetails.length,
      defaultAccount: accountsWithDetails.find(acc => acc.isDefault) || accountsWithDetails[0] || null
    });
  } catch (error) {
    console.error('Get LinkedIn accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch LinkedIn accounts' });
  }
});

// Check LinkedIn connection status
router.get('/status/:clerkId', ensureUser, async (req, res) => {
  try {
    const accounts = await LinkedInAccount.find({ 
      userId: req.params.clerkId, 
      isActive: true 
    });
    
    const defaultAccount = accounts.find(acc => acc.isDefault);
    
    res.json({ 
      connected: accounts.length > 0,
      accountCount: accounts.length,
      accounts: accounts.map(acc => ({
        id: acc._id,
        name: acc.linkedinName,
        isDefault: acc.isDefault
      })),
      defaultAccount: defaultAccount ? {
        id: defaultAccount._id,
        name: defaultAccount.linkedinName
      } : null
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

// Disconnect specific LinkedIn account or all accounts
router.post('/disconnect/:clerkId', ensureUser, async (req, res) => {
  try {
    const { accountId } = req.body;
    
    if (accountId && accountId !== 'null') {
      // Disconnect specific account
      await LinkedInAccount.findByIdAndUpdate(accountId, { isActive: false });
      
      // If this was the default account, set another as default
      const remainingAccounts = await LinkedInAccount.find({ 
        userId: req.params.clerkId, 
        isActive: true 
      });
      
      if (remainingAccounts.length > 0 && !remainingAccounts.some(acc => acc.isDefault)) {
        await LinkedInAccount.findByIdAndUpdate(remainingAccounts[0]._id, { isDefault: true });
      }
      
      res.json({ message: 'LinkedIn account disconnected successfully' });
    } else {
      // Disconnect all accounts (when accountId is null, undefined, or 'null')
      const result = await LinkedInAccount.updateMany(
        { userId: req.params.clerkId },
        { isActive: false }
      );
      
      // Also clear legacy user LinkedIn connection
      await User.findOneAndUpdate(
        { clerkId: req.params.clerkId },
        {
          linkedinId: null,
          linkedinName: null,
          linkedinAccessToken: null,
          linkedinRefreshToken: null,
          linkedinMemberUrn: null,
          isLinkedinConnected: false,
          defaultLinkedInAccount: null
        }
      );
      
      console.log(`Disconnected ${result.modifiedCount} LinkedIn accounts for user ${req.params.clerkId}`);
      res.json({ message: `All LinkedIn accounts disconnected successfully (${result.modifiedCount} accounts)` });
    }
  } catch (error) {
    console.error('LinkedIn disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect LinkedIn account' });
  }
});

// Set default LinkedIn account
router.post('/set-default/:clerkId', ensureUser, async (req, res) => {
  try {
    const { accountId } = req.body;
    
    // Remove default from all accounts
    await LinkedInAccount.updateMany(
      { userId: req.params.clerkId },
      { isDefault: false }
    );
    
    // Set new default
    await LinkedInAccount.findByIdAndUpdate(accountId, { isDefault: true });
    
    res.json({ message: 'Default LinkedIn account updated successfully' });
  } catch (error) {
    console.error('Set default account error:', error);
    res.status(500).json({ error: 'Failed to set default account' });
  }
});

// Clean up expired OAuth states (optional maintenance endpoint)
router.post('/cleanup-states', async (req, res) => {
  try {
    const result = await OAuthState.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    res.json({ message: `Cleaned up ${result.deletedCount} expired states` });
  } catch (error) {
    console.error('State cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup states' });
  }
});

module.exports = router;