const mongoose = require('mongoose');

const businessContextSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  businessName: String,
  industry: String,
  targetAudience: String,
  businessDescription: String,
  tone: {
    type: String,
    enum: ['professional', 'casual', 'friendly', 'authoritative', 'creative'],
    default: 'professional'
  },
  keywords: [String],
  goals: [String],
  contentPreferences: {
    includeHashtags: { type: Boolean, default: true },
    includeEmojis: { type: Boolean, default: true },
    preferredLength: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BusinessContext', businessContextSchema);