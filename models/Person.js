const mongoose = require('mongoose');

const PersonMediaSchema = new mongoose.Schema({
  file: String,
  format: String,
  title: String,
  isPrimary: Boolean,
  type: String
}, { _id: false });

const PersonSchema = new mongoose.Schema({
  gedId: { type: String, index: true },
  name: String,
  sex: String,
  birthDate: String,
  deathDate: String,
  media: { type: [PersonMediaSchema], default: [] },
  fams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Family' }],
  famc: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Family' }]
}, { timestamps: true });

module.exports = mongoose.models.Person || mongoose.model('Person', PersonSchema);
