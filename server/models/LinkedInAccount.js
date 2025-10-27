const mongoose = require('mongoose');
const crypto = require('crypto');

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
  linkedinEmail: String,
  linkedinPassword: String,
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

// Encryption key from environment or default
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'change-this-32-character-key!!!';
const algorithm = 'aes-256-cbc';

// Encrypt password
linkedInAccountSchema.methods.encryptPassword = function(password) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt password
linkedInAccountSchema.methods.decryptPassword = function() {
  if (!this.linkedinPassword) return null;
  try {
    const parts = this.linkedinPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
};

module.exports = mongoose.model('LinkedInAccount', linkedInAccountSchema);