const mongoose = require('mongoose');

const FamilySchema = new mongoose.Schema({
  gedId: { type: String, index: true },
  husband: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', default: null },
  wife: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', default: null },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Person' }],
  events: { type: Object, default: {} },
  notes: [{ type: String }],
  raw: Object
}, { timestamps: true });

module.exports = mongoose.models.Family || mongoose.model('Family', FamilySchema);
