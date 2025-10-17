const mongoose = require('mongoose');

const oauthStateSchema = new mongoose.Schema({
  state: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0 // TTL index - MongoDB will auto-delete expired documents
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OAuthState', oauthStateSchema);