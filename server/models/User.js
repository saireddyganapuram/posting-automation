const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  linkedinId: String,
  linkedinName: String,
  linkedinAccessToken: String,
  linkedinRefreshToken: String,
  linkedinMemberUrn: String, // Store urn:li:member:123456789
  isLinkedinConnected: {
    type: Boolean,
    default: false
  },
  // Temporary OAuth data for session reliability
  tempCodeVerifier: String,
  tempState: String,
  tempStateExpiry: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);