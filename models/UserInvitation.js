const mongoose = require('mongoose');

const UserInvitationSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ['guest', 'editor', 'admin'], required: true },
  isReusable: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  usedAt: { type: Date, default: null },
  lastUsedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastUsedAt: { type: Date, default: null },
  redemptionCount: { type: Number, default: 0, min: 0 },
  disabledAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.models.UserInvitation || mongoose.model('UserInvitation', UserInvitationSchema);