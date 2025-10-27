const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const LinkedInAccount = require('../models/LinkedInAccount');
const { ensureUser } = require('../middleware/auth');
const router = express.Router();

// Get all LinkedIn accounts for a user
router.get('/:clerkId', ensureUser, async (req, res) => {
  try {
    const accounts = await LinkedInAccount.find({ 
      userId: req.params.clerkId, 
      isActive: true 
    }).sort({ isDefault: -1, createdAt: -1 });
    
    res.json(accounts);
  } catch (error) {
    console.error('Get LinkedIn accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch LinkedIn accounts' });
  }
});

// Connect additional LinkedIn account
router.get('/connect/:clerkId', ensureUser, async (req, res) => {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    const scope = 'r_liteprofile w_member_social';
    
    // Add parameters to force new connection and account selection
    const timestamp = Date.now();
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${req.params.clerkId}&prompt=select_account&approval_prompt=force&access_type=offline&t=${timestamp}`;
    
    res.json({ authUrl });
  } catch (error) {
    console.error('LinkedIn connect error:', error);
    res.status(500).json({ error: 'Failed to generate LinkedIn auth URL' });
  }
});

// Set default account
router.put('/default/:clerkId/:accountId', ensureUser, async (req, res) => {
  try {
    // Remove default from all accounts for this user
    await LinkedInAccount.updateMany(
      { userId: req.params.clerkId, isActive: true },
      { isDefault: false }
    );
    
    // Set new default
    const account = await LinkedInAccount.findOneAndUpdate(
      { _id: req.params.accountId, userId: req.params.clerkId, isActive: true },
      { isDefault: true },
      { new: true }
    );
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Update user's default account reference
    await User.findOneAndUpdate(
      { clerkId: req.params.clerkId },
      { defaultLinkedInAccount: req.params.accountId }
    );
    
    res.json({ message: 'Default account updated', account });
  } catch (error) {
    console.error('Set default account error:', error);
    res.status(500).json({ error: 'Failed to set default account' });
  }
});

// Update account credentials
router.put('/credentials/:accountId', async (req, res) => {
  try {
    console.log('PUT /credentials/:accountId called');
    console.log('Account ID:', req.params.accountId);
    console.log('Body:', { email: req.body.email, hasPassword: !!req.body.password });
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const account = await LinkedInAccount.findById(req.params.accountId);
    console.log('Account found:', !!account);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Update email and encrypt password
    account.linkedinEmail = email;
    account.linkedinPassword = account.encryptPassword(password);
    await account.save();
    
    console.log('Credentials saved successfully');
    res.json({ message: 'Credentials updated successfully', account });
  } catch (error) {
    console.error('Update credentials error:', error);
    res.status(500).json({ error: 'Failed to update credentials' });
  }
});

// Delete account credentials
router.delete('/credentials/:accountId', async (req, res) => {
  try {
    console.log('DELETE /credentials/:accountId called');
    console.log('Account ID:', req.params.accountId);
    
    const account = await LinkedInAccount.findById(req.params.accountId);
    console.log('Account found:', !!account);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    account.linkedinEmail = '';
    account.linkedinPassword = '';
    await account.save();
    
    console.log('Credentials deleted successfully');
    res.json({ message: 'Credentials deleted successfully' });
  } catch (error) {
    console.error('Delete credentials error:', error);
    res.status(500).json({ error: 'Failed to delete credentials' });
  }
});

// Disconnect LinkedIn account
router.delete('/:clerkId/:accountId', ensureUser, async (req, res) => {
  try {
    const account = await LinkedInAccount.findOneAndUpdate(
      { _id: req.params.accountId, userId: req.params.clerkId },
      { isActive: false },
      { new: true }
    );
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // If this was the default account, clear the default
    if (account.isDefault) {
      await User.findOneAndUpdate(
        { clerkId: req.params.clerkId },
        { defaultLinkedInAccount: null }
      );
    }
    
    res.json({ message: 'LinkedIn account disconnected' });
  } catch (error) {
    console.error('Disconnect account error:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

module.exports = router;