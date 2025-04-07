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
  headline: String,  // Add this
  entities: {
    persons: [String],
    locations: [String],
    dates: [String],
    weapons: [String],
    actions: [String],
    victims: [String],  // Add this
    suspects: [String], // Add this
    officers: [String], // Add this
    ages: Object        // Add this
  },
  // Add these fields at the root level
  primary_victim: String,
  primary_suspect: String,
  assigned_officer: String,
  weapon: String,
  location: String,
  date: String,
  confidence: Number,  // Add this too
  classification: String,
  severityScore: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Crime', crimeSchema);