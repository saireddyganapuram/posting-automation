const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  linkedinAccountId: {
    type: String,
    required: false // Optional for backward compatibility
  },
  linkedinAccountIds: [{
    type: String,
    required: false // For multi-account posts
  }],
  isMultiAccount: {
    type: Boolean,
    default: false
  },
  postedAccounts: [{
    accountId: String,
    status: { type: String, enum: ['posted', 'failed'], default: 'posted' },
    postedAt: Date,
    errorMessage: String
  }],
  content: {
    type: String,
    required: true,
    maxlength: 3000 // LinkedIn character limit
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
  linkedinId: String, // Legacy field
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