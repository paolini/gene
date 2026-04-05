const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true, index: true },
  image: String,
  role: { type: String, enum: ['guest', 'editor', 'admin'], default: null },
  provider: { type: String, default: 'google' },
  providerAccountId: { type: String, index: true },
  emailVerified: { type: Boolean, default: false },
  lastLoginAt: Date
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);