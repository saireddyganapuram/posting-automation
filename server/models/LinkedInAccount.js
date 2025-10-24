const mongoose = require('mongoose');

const linkedInAccountSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  linkedinId: {
    type: String,
    required: true
  },
  linkedinName: String,
  linkedinAccessToken: String,
  linkedinRefreshToken: String,
  linkedinMemberUrn: String,
  accountType: {
    type: String,
    enum: ['personal', 'company', 'business'],
    default: 'personal'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
linkedInAccountSchema.index({ userId: 1, isDefault: 1 });

module.exports = mongoose.model('LinkedInAccount', linkedInAccountSchema);