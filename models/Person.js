const mongoose = require('mongoose');

const PersonSchema = new mongoose.Schema({
  gedId: { type: String, index: true },
  name: String,
  sex: String,
  birthDate: String,
  deathDate: String,
  fams: [String],
  famc: [String]
}, { timestamps: true });

module.exports = mongoose.models.Person || mongoose.model('Person', PersonSchema);
