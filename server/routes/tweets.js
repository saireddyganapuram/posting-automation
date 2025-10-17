const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const LinkedInAccount = require('../models/LinkedInAccount');
const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/images';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Schedule a new LinkedIn post
router.post('/schedule', async (req, res) => {
  try {
    const { userId, content, scheduledTime, imageUrl, hasImage, postType, engagementFeatures, linkedinAccountId } = req.body;

    if (!userId || !content || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (content.length > 3000) {
      return res.status(400).json({ error: 'Post content exceeds 3000 characters' });
    }

    const post = new Post({
      userId,
      content,
      scheduledTime: new Date(scheduledTime),
      imageUrl: imageUrl || null,
      hasImage: hasImage || false,
      postType: postType || 'static',
      engagementFeatures: engagementFeatures || {},
      linkedinAccountId: linkedinAccountId || null,
      platform: 'linkedin'
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Schedule post to all connected LinkedIn accounts
router.post('/schedule-all', async (req, res) => {
  try {
    const { userId, content, scheduledTime, imageUrl, hasImage, postType, engagementFeatures } = req.body;

    if (!userId || !content || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (content.length > 3000) {
      return res.status(400).json({ error: 'Post content exceeds 3000 characters' });
    }

    // Get all active LinkedIn accounts for the user
    const accounts = await LinkedInAccount.find({ 
      userId: userId, 
      isActive: true 
    });

    if (accounts.length === 0) {
      return res.status(400).json({ error: 'No LinkedIn accounts connected' });
    }

    // Create single post for all accounts
    const post = new Post({
      userId,
      content,
      scheduledTime: new Date(scheduledTime),
      imageUrl: imageUrl || null,
      hasImage: hasImage || false,
      postType: postType || 'static',
      engagementFeatures: engagementFeatures || {},
      linkedinAccountIds: accounts.map(acc => acc._id.toString()),
      isMultiAccount: true,
      platform: 'linkedin'
    });

    await post.save();

    res.status(201).json({ 
      message: `Post scheduled to ${accounts.length} LinkedIn accounts`,
      post: post,
      accountCount: accounts.length
    });
  } catch (error) {
    console.error('Schedule all posts error:', error);
    res.status(500).json({ error: 'Failed to schedule posts to all accounts' });
  }
});

// Get user's LinkedIn accounts
router.get('/linkedin-accounts/:userId', async (req, res) => {
  try {
    const accounts = await LinkedInAccount.find({ 
      userId: req.params.userId,
      isActive: true 
    }).select('_id linkedinName accountType isDefault');
    
    res.json(accounts || []);
  } catch (error) {
    console.error('Get LinkedIn accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch LinkedIn accounts', data: [] });
  }
});

// Get scheduled posts for a user
router.get('/scheduled/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ 
      userId: req.params.userId,
      status: { $in: ['scheduled', 'failed', 'posted'] }
    }).populate('linkedinAccountId', 'linkedinName accountType')
      .sort({ scheduledTime: 1 });
    
    res.json(posts || []);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts', data: [] });
  }
});

// Upload image endpoint
router.post('/upload-image', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      const imageUrl = `/uploads/images/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });
});

// Update a scheduled post
router.put('/:postId', async (req, res) => {
  try {
    const { content, scheduledTime, imageUrl, hasImage } = req.body;
    
    const updateData = {
      content,
      scheduledTime: new Date(scheduledTime)
    };
    
    if (hasImage !== undefined) {
      updateData.hasImage = hasImage;
      updateData.imageUrl = hasImage ? imageUrl : null;
    }
    
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      updateData,
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a scheduled post
router.delete('/:postId', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Manual trigger for testing scheduled posts
router.post('/trigger-scheduler', async (req, res) => {
  try {
    const { checkAndPostScheduledPosts } = require('../services/tweetScheduler');
    await checkAndPostScheduledPosts();
    res.json({ message: 'Scheduler triggered manually' });
  } catch (error) {
    console.error('Manual scheduler trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger scheduler' });
  }
});

module.exports = router;