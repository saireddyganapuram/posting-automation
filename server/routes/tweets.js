const express = require('express');
const Post = require('../models/Post');
const router = express.Router();

// Schedule a new LinkedIn post
router.post('/schedule', async (req, res) => {
  try {
    const { userId, content, scheduledTime, imageUrl, hasImage, postType, engagementFeatures } = req.body;

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
      platform: 'linkedin'
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Get scheduled posts for a user
router.get('/scheduled/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ 
      userId: req.params.userId,
      status: { $in: ['scheduled', 'failed'] }
    }).sort({ scheduledTime: 1 });
    
    res.json(posts || []);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts', data: [] });
  }
});

// Update a scheduled post
router.put('/:postId', async (req, res) => {
  try {
    const { content, scheduledTime } = req.body;
    
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      { content, scheduledTime: new Date(scheduledTime) },
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