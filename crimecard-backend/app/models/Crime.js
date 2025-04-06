const mongoose = require('mongoose');

const crimeSchema = new mongoose.Schema({
  inputMethod: {
    type: String,
    enum: ['manual', 'paste', 'upload'],
    required: true
  },
  rawText: String,
  source: {
    type: String,
    required: true
  },
  manualData: {
    crimeType: String,
    victim: String,
    suspect: String,
    location: String,
    date: String,
    weapon: String,
    description: String
  },
  fileName: String,
  extractedText: String,
  summary: String,
  entities: {
    persons: [String],
    locations: [String],
    dates: [String],
    weapons: [String]
  },
  classification: String,
  severityScore: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Crime', crimeSchema);