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
  // Legacy fields - kept for backward compatibility
  linkedinId: String,
  linkedinName: String,
  linkedinAccessToken: String,
  linkedinRefreshToken: String,
  linkedinMemberUrn: String,
  isLinkedinConnected: {
    type: Boolean,
    default: false
  },
  // New multi-account support
  defaultLinkedInAccount: String, // Reference to LinkedInAccount _id
  // Temporary OAuth data for session reliability
  tempCodeVerifier: String,
  tempState: String,
  tempStateExpiry: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);