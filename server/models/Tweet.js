const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 280
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'posted', 'failed'],
    default: 'scheduled'
  },
  linkedinId: String,
  platform: {
    type: String,
    enum: ['linkedin'],
    default: 'linkedin'
  },
  errorMessage: String,
  imageUrl: String,
  hasImage: {
    type: Boolean,
    default: false
  },
  postType: {
    type: String,
    enum: ['dynamic', 'static'],
    default: 'static'
  },
  engagementFeatures: {
    hasQuestion: { type: Boolean, default: false },
    hasCall2Action: { type: Boolean, default: false },
    hasHashtags: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Post', postSchema);