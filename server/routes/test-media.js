const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Test media upload
router.post('/test-upload/:clerkId', async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.params.clerkId });
    
    if (!user || !user.twitterAccessToken) {
      return res.status(400).json({ error: 'Twitter not connected' });
    }

    const twitterClient = new TwitterApi(user.twitterAccessToken);
    
    // Test with a simple image
    const testImagePath = path.join(__dirname, '../uploads');
    const files = fs.readdirSync(testImagePath);
    const imageFile = files.find(f => f.endsWith('.png'));
    
    if (!imageFile) {
      return res.status(400).json({ error: 'No test image found' });
    }

    const imagePath = path.join(testImagePath, imageFile);
    const imageBuffer = fs.readFileSync(imagePath);
    
    console.log('Testing media upload...');
    const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, {
      mimeType: 'image/png'
    });
    
    console.log('Media uploaded successfully:', mediaId);
    res.json({ success: true, mediaId });
    
  } catch (error) {
    console.error('Media upload test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;